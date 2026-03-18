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

    // 1. Create order
    const { data: order, error: orderErr } = await supabase
      .from('inv_orders')
      .insert({
        user_id,
        property_id,
        shares_requested: shares,
        amount_paid: amount,
        payment_method: payment_method || 'card',
        agent_id: agent_id || null,
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

      // 3. If agent, create commission (5% first purchase)
      if (agent_id) {
        // Get agent's affiliate profile
        const { data: affProfile } = await supabase
          .from('aff_profiles')
          .select('id')
          .eq('user_id', agent_id)
          .maybeSingle()

        if (affProfile) {
          // Get commission rate (user-specific or global default)
          const { data: customRate } = await supabase
            .from('aff_commission_settings')
            .select('rate')
            .eq('user_id', agent_id)
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
            referred_user_id: user_id,
            property_id,
            gross_amount: amount,
            commission_rate: rate,
            commission_amount: commissionAmount,
            claimable_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 day holdback
          })
        }
      }
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
