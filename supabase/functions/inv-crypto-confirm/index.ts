// inv-crypto-confirm — Record a confirmed crypto purchase server-side
// Called by useBlockchain.ts AFTER tx.wait() confirms on-chain
// Uses service role — no user auth token required
// Mirrors inv-samcart-webhook post-order logic exactly

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  // Required for browser preflight from hub.nfstay.com → cross-origin fetch + JSON body
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const { tx_hash, wallet_address, property_id, shares, amount } = await req.json()

    // Validate required fields
    if (!tx_hash || !wallet_address || !property_id || !shares || amount === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields: tx_hash, wallet_address, property_id, shares, amount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Look up user by wallet_address
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, name, referred_by')
      .eq('wallet_address', wallet_address)
      .maybeSingle()

    if (!profile?.id) {
      return new Response(JSON.stringify({ error: `No user found for wallet ${wallet_address}` }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = profile.id
    const userEmail = profile.email || ''
    const userName = profile.name || userEmail.split('@')[0]

    // 2. Deduplicate — check if order with this tx_hash already exists
    const { data: existingOrder } = await supabase
      .from('inv_orders')
      .select('id')
      .eq('tx_hash', tx_hash)
      .maybeSingle()

    if (existingOrder?.id) {
      return new Response(JSON.stringify({ success: true, order_id: existingOrder.id, deduplicated: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Resolve affiliate agent via referred_by (with previous_codes fallback)
    let agentUserId: string | null = null
    if (profile.referred_by) {
      // Primary lookup: exact referral_code match
      const { data: agentByCode } = await supabase
        .from('aff_profiles')
        .select('user_id')
        .eq('referral_code', profile.referred_by.toUpperCase())
        .maybeSingle()

      if (agentByCode?.user_id) {
        agentUserId = agentByCode.user_id
      } else {
        // Fallback: check previous_codes array
        const { data: agentByPrevious } = await supabase
          .from('aff_profiles')
          .select('user_id')
          .contains('previous_codes', [profile.referred_by.toUpperCase()])
          .maybeSingle()
        if (agentByPrevious?.user_id) {
          agentUserId = agentByPrevious.user_id
        }
      }
    }

    // 4. Insert inv_orders
    const { data: order, error: orderErr } = await supabase
      .from('inv_orders')
      .insert({
        user_id: userId,
        property_id,
        shares_requested: shares,
        amount_paid: amount,
        payment_method: 'crypto_usdc',
        status: 'completed',
        tx_hash,
        agent_id: agentUserId,
      })
      .select('id')
      .single()

    if (orderErr) {
      throw new Error(`Order insert failed: ${orderErr.message}`)
    }

    const orderId = order.id

    // 5. Create commission if agent found (same logic as inv-samcart-webhook createCommission)
    let commissionAmount = 0
    if (agentUserId) {
      try {
        await createCommission(supabase, agentUserId, userId, property_id, amount, orderId)
        commissionAmount = amount * 0.05 // approximation for email — real rate from createCommission
      } catch (commErr) {
        console.error('Commission creation failed (non-blocking):', commErr)
      }
    }

    // 6. Fetch property title for emails/notifications
    const { data: propData } = await supabase
      .from('inv_properties')
      .select('title')
      .eq('id', property_id)
      .maybeSingle()
    const propertyTitle = propData?.title || 'Investment Property'

    // 7. Send 3 emails via send-email function
    const sendEmail = (type: string, data: Record<string, unknown>) =>
      fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      }).catch(() => {})

    // Buyer email
    if (userEmail) {
      sendEmail('inv-purchase-buyer', {
        email: userEmail,
        property: propertyTitle,
        amount,
        shares,
      })
    }

    // Admin email
    sendEmail('inv-purchase-admin', {
      buyerName: userName,
      buyerEmail: userEmail,
      property: propertyTitle,
      amount,
      shares,
      agentName: agentUserId ? (await supabase.from('profiles').select('name').eq('id', agentUserId).maybeSingle()).data?.name : null,
      commission: agentUserId ? commissionAmount : null,
    })

    // Agent email
    if (agentUserId) {
      const { data: agentInfo } = await supabase.from('profiles').select('email, name').eq('id', agentUserId).maybeSingle()
      if (agentInfo?.email) {
        sendEmail('inv-purchase-agent', {
          agentEmail: agentInfo.email,
          property: propertyTitle,
          amount,
          commission: commissionAmount,
          rate: 5,
          claimableDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        })
      }
    }

    // 8. Insert notifications
    // Buyer notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'purchase_confirmed',
      title: 'Investment confirmed',
      body: `Your $${amount} crypto investment in ${propertyTitle} is confirmed. Tx: ${tx_hash.slice(0, 10)}...`,
    })
    // Admin notification (no user_id = admin-only)
    await supabase.from('notifications').insert({
      type: 'purchase_confirmed',
      title: 'New crypto investment',
      body: `${userName} (${userEmail}) invested $${amount} in ${propertyTitle} via crypto.`,
    })
    // Agent notification
    if (agentUserId) {
      await supabase.from('notifications').insert({
        user_id: agentUserId,
        type: 'commission_earned',
        title: 'You earned commission!',
        body: `You earned $${commissionAmount.toFixed(2)} from a share purchase in ${propertyTitle}.`,
      })
    }

    // 9. Audit log
    await supabase.from('payout_audit_log').insert({
      user_id: userId,
      event_type: 'crypto_order_confirmed',
      performed_by: 'system',
      metadata: {
        order_id: orderId,
        tx_hash,
        amount,
        shares,
        property_id,
        agent_id: agentUserId,
        wallet: wallet_address,
      },
    })

    return new Response(JSON.stringify({ success: true, order_id: orderId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('inv-crypto-confirm error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ── createCommission — copied from inv-samcart-webhook (single source of truth) ──
async function createCommission(
  supabase: any,
  agentUserId: string,
  referredUserId: string,
  propertyId: number,
  amount: number,
  orderId: string,
) {
  let affProfile = await supabase
    .from('aff_profiles')
    .select('id')
    .eq('user_id', agentUserId)
    .maybeSingle()
    .then((r: any) => r.data)

  if (!affProfile) {
    const { data: agentUser } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', agentUserId)
      .maybeSingle()

    const code = (agentUser?.name || 'AGENT').substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X')
      + Math.random().toString(36).substring(2, 4).toUpperCase()

    const { data: newAff, error: affErr } = await supabase
      .from('aff_profiles')
      .insert({
        user_id: agentUserId,
        referral_code: code,
        full_name: agentUser?.name || agentUser?.email || 'Agent',
        tier: 'standard',
        total_earned: 0, total_claimed: 0, pending_balance: 0,
        link_clicks: 0, signups: 0, paid_users: 0,
      })
      .select('id')
      .single()

    if (affErr) { console.log('Failed to auto-create aff_profile:', affErr); return }
    affProfile = newAff
  }

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
    source_id: orderId,
    referred_user_id: referredUserId,
    property_id: propertyId,
    gross_amount: amount,
    commission_rate: rate,
    commission_amount: commissionAmount,
    claimable_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  })

  // Update agent's aggregate stats
  const { data: current } = await supabase
    .from('aff_profiles')
    .select('total_earned, pending_balance, paid_users')
    .eq('id', affProfile.id)
    .single()

  if (current) {
    await supabase
      .from('aff_profiles')
      .update({
        total_earned: (Number(current.total_earned) || 0) + commissionAmount,
        pending_balance: (Number(current.pending_balance) || 0) + commissionAmount,
        paid_users: (current.paid_users || 0) + 1,
      })
      .eq('id', affProfile.id)
  }
}
