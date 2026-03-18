// inv-samcart-webhook — Handle SamCart order webhooks for share purchases
// Trigger: SamCart Notify URL fires on "Checkout charged" / "Product purchased"
// Process: validate order → create inv_order → update shareholdings → create commission
// SamCart API docs: https://developer.samcart.com/

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()

    // SamCart webhook payload
    const email = body.customer?.email || body.billing_email || body.email
    const phone = body.customer?.phone || body.phone_number || body.phone
    const firstName = body.customer?.first_name || body.first_name
    const lastName = body.customer?.last_name || body.last_name
    const amount = Number(body.order?.total || body.total_amount || body.charge?.amount || 0)
    const transactionId = body.order?.id || body.transaction_id || body.id
    const productName = body.product?.name || body.line_items?.[0]?.name || ''
    const productId = body.product?.id || body.line_items?.[0]?.id || ''

    // Custom fields — SamCart allows custom fields on checkout
    // We use these to pass blockchain-specific data
    const customFields = body.custom_fields || body.order?.custom_fields || {}
    const walletAddress = customFields.wallet_address || customFields.walletAddress || null
    const propertyIdRaw = customFields.property_id || customFields.propertyId || null
    const agentCode = customFields.agent_code || customFields.referral_code || customFields.agentCode || null

    if (!email || !amount || amount <= 0) {
      console.log('Invalid webhook payload:', { email, amount })
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: corsHeaders })
    }

    // Look up user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, wallet_address')
      .ilike('email', email)  // case-insensitive email match
      .maybeSingle()

    // If no profile found, try by phone
    let userId = profile?.id
    if (!userId && phone) {
      const { data: phoneProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('whatsapp', phone.replace(/[^0-9+]/g, ''))
        .maybeSingle()
      userId = phoneProfile?.id
    }

    if (!userId) {
      console.log('User not found for email:', email)
      // Still log the order for manual processing
      await supabase.from('payout_audit_log').insert({
        event_type: 'samcart_user_not_found',
        performed_by: 'system',
        metadata: { email, phone, amount, transactionId, productName },
      })
      return new Response(JSON.stringify({ status: 'logged', message: 'User not found — logged for manual processing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Determine property ID
    let propertyId = propertyIdRaw ? Number(propertyIdRaw) : null
    if (!propertyId) {
      // Try to match by product name → inv_properties title
      const { data: matchedProp } = await supabase
        .from('inv_properties')
        .select('id')
        .ilike('title', `%${productName}%`)
        .maybeSingle()
      propertyId = matchedProp?.id || 1 // Default to first property if no match
    }

    // Get property details for share calculation
    const { data: property } = await supabase
      .from('inv_properties')
      .select('price_per_share, shares_sold, total_shares')
      .eq('id', propertyId)
      .single()

    if (!property) {
      return new Response(JSON.stringify({ error: 'Property not found' }), { status: 400, headers: corsHeaders })
    }

    const sharesRequested = Math.floor(amount / property.price_per_share)
    if (sharesRequested <= 0) {
      return new Response(JSON.stringify({ error: 'Amount too low for 1 share' }), { status: 400, headers: corsHeaders })
    }

    // Look up agent by referral code
    let agentUserId: string | null = null
    if (agentCode) {
      const { data: agentProfile } = await supabase
        .from('aff_profiles')
        .select('user_id')
        .eq('referral_code', agentCode.toUpperCase())
        .maybeSingle()
      agentUserId = agentProfile?.user_id || null
    }

    // Check for duplicate order (idempotency)
    const { data: existingOrder } = await supabase
      .from('inv_orders')
      .select('id')
      .eq('external_order_id', String(transactionId))
      .maybeSingle()

    if (existingOrder) {
      return new Response(JSON.stringify({ status: 'duplicate', order_id: existingOrder.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create order
    const { data: order, error: orderErr } = await supabase
      .from('inv_orders')
      .insert({
        user_id: userId,
        property_id: propertyId,
        shares_requested: sharesRequested,
        amount_paid: amount,
        payment_method: 'card',
        agent_id: agentUserId,
        status: 'completed', // Card payment already processed by SamCart
        external_order_id: String(transactionId),
      })
      .select()
      .single()

    if (orderErr) throw orderErr

    // Update shareholdings (upsert)
    const { data: existing } = await supabase
      .from('inv_shareholdings')
      .select('id, shares_owned, invested_amount')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .maybeSingle()

    if (existing) {
      await supabase.from('inv_shareholdings').update({
        shares_owned: existing.shares_owned + sharesRequested,
        invested_amount: existing.invested_amount + amount,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('inv_shareholdings').insert({
        user_id: userId,
        property_id: propertyId,
        shares_owned: sharesRequested,
        invested_amount: amount,
        current_value: amount,
      })
    }

    // Update property shares_sold
    await supabase.from('inv_properties').update({
      shares_sold: (property.shares_sold || 0) + sharesRequested,
    }).eq('id', propertyId)

    // Create agent commission if applicable
    if (agentUserId) {
      const { data: affProfile } = await supabase
        .from('aff_profiles')
        .select('id')
        .eq('user_id', agentUserId)
        .maybeSingle()

      if (affProfile) {
        // Get rate (user-specific or global)
        const { data: customRate } = await supabase
          .from('aff_commission_settings')
          .select('rate')
          .eq('user_id', agentUserId)
          .eq('commission_type', 'investment_first')
          .maybeSingle()

        const { data: globalRate } = await supabase
          .from('aff_commission_settings')
          .select('rate')
          .is('user_id', null)
          .eq('commission_type', 'investment_first')
          .maybeSingle()

        const rate = customRate?.rate || globalRate?.rate || 0.05
        const commissionAmount = amount * rate

        await supabase.from('aff_commissions').insert({
          affiliate_id: affProfile.id,
          source: 'investment_first',
          source_id: order.id,
          referred_user_id: userId,
          property_id: propertyId,
          gross_amount: amount,
          commission_rate: rate,
          commission_amount: commissionAmount,
          claimable_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        }).then(() => {}).catch(() => {}) // Ignore duplicate
      }
    }

    // Send notification via GHL WhatsApp (through n8n)
    const n8nUrl = Deno.env.get('VITE_N8N_WEBHOOK_URL') || 'https://n8n.srv886554.hstgr.cloud/webhook'
    try {
      await fetch(`${n8nUrl}/inv-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'purchase_confirmed',
          user_name: firstName || profile?.name || 'Investor',
          amount: amount,
          property: productName,
          email,
          phone,
          user_id: userId,
        }),
      })
    } catch (e) {
      // Don't fail the webhook if notification fails
      console.log('Notification failed:', e)
    }

    // Audit log
    await supabase.from('payout_audit_log').insert({
      user_id: userId,
      event_type: 'samcart_order_completed',
      performed_by: 'system',
      metadata: { order_id: order.id, amount, shares: sharesRequested, property_id: propertyId, agent: agentCode },
    })

    return new Response(JSON.stringify({
      status: 'completed',
      order_id: order.id,
      shares: sharesRequested,
      property_id: propertyId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('SamCart webhook error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
