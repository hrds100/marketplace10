// inv-process-order — Process share purchase orders
// Trigger: Called by SamCart webhook handler (n8n) or directly after crypto payment
// Input: { user_id, property_id, shares, amount, payment_method, agent_id?, tx_hash? }
// Output: { order_id, status }

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

    const { user_id, property_id, shares, amount, payment_method, agent_id, tx_hash } = await req.json()

    if (!user_id || !property_id || !shares || !amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders })
    }

    // Resolve agent: use provided agent_id, or fall back to buyer's referred_by
    let resolvedAgentId: string | null = agent_id || null

    if (!resolvedAgentId) {
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', user_id)
        .maybeSingle()

      if (buyerProfile?.referred_by) {
        const { data: affByCode } = await supabase
          .from('aff_profiles')
          .select('user_id')
          .eq('referral_code', buyerProfile.referred_by)
          .maybeSingle()

        if (affByCode?.user_id) {
          resolvedAgentId = affByCode.user_id
          console.log(`Agent resolved from buyer referred_by: ${buyerProfile.referred_by} → ${resolvedAgentId}`)
        }
      }
    }

    // 1. Create order
    const { data: order, error: orderErr } = await supabase
      .from('inv_orders')
      .insert({
        user_id,
        property_id,
        shares_requested: shares,
        amount_paid: amount,
        payment_method: payment_method || 'card',
        agent_id: resolvedAgentId,
        tx_hash: tx_hash || null,
        status: tx_hash ? 'completed' : 'pending',
      })
      .select()
      .single()

    if (orderErr) throw orderErr

    // 2. If completed (crypto with tx_hash), update shareholdings
    if (tx_hash) {
      // Upsert shareholdings
      const { data: existing } = await supabase
        .from('inv_shareholdings')
        .select('id, shares_owned, invested_amount')
        .eq('user_id', user_id)
        .eq('property_id', property_id)
        .maybeSingle()

      if (existing) {
        await supabase.from('inv_shareholdings').update({
          shares_owned: existing.shares_owned + shares,
          invested_amount: existing.invested_amount + amount,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        await supabase.from('inv_shareholdings').insert({
          user_id,
          property_id,
          shares_owned: shares,
          invested_amount: amount,
          current_value: amount,
        })
      }

      // Update property shares_sold
      await supabase.rpc('increment_shares_sold', { p_id: property_id, amount: shares })
        .then(() => {}) // RPC may not exist yet — fallback below
        .catch(async () => {
          // Fallback: read + write
          const { data: prop } = await supabase.from('inv_properties').select('shares_sold').eq('id', property_id).single()
          if (prop) {
            await supabase.from('inv_properties').update({ shares_sold: prop.shares_sold + shares }).eq('id', property_id)
          }
        })
    }

    // 3. Create commission if agent found (works for both pending and completed orders)
    if (resolvedAgentId) {
      await createCommission(supabase, resolvedAgentId, user_id, property_id, amount, order.id)
    }

    return new Response(JSON.stringify({ order_id: order.id, status: order.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create affiliate commission for an agent (with auto-create aff_profiles) */
async function createCommission(
  supabase: any,
  agentUserId: string,
  referredUserId: string,
  propertyId: number,
  amount: number,
  orderId: string,
) {
  try {
    let affProfile = await supabase
      .from('aff_profiles')
      .select('id')
      .eq('user_id', agentUserId)
      .maybeSingle()
      .then((r: any) => r.data)

    if (!affProfile) {
      // Auto-create aff_profiles entry for this agent
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
          total_earned: 0,
          total_claimed: 0,
          pending_balance: 0,
          link_clicks: 0,
          signups: 0,
          paid_users: 0,
        })
        .select('id')
        .single()

      if (affErr) {
        console.log('Failed to auto-create aff_profile:', affErr)
        return
      }
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
  } catch (e) {
    // Don't fail the order if commission creation fails
    console.log('Commission creation failed:', e)
  }
}
