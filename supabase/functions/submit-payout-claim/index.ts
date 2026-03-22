// submit-payout-claim — Submit a bank transfer payout claim
// Trigger: User clicks "Claim" → selects "Bank Transfer"
// Input: { user_id, user_type, currency, amount }
// Output: { claim_id, amount, week_ref }
// Amount comes from blockchain rent read (getRentDetails) on the frontend

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getISOWeek(): string {
  const now = new Date()
  const jan1 = new Date(now.getFullYear(), 0, 1)
  const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000)
  const week = Math.ceil((days + jan1.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { user_id, user_type, currency, amount: clientAmount } = await req.json()
    if (!user_id || !user_type || !currency) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders })
    }

    // Check bank details exist
    const { data: bank } = await supabase
      .from('user_bank_accounts')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle()

    if (!bank) {
      return new Response(JSON.stringify({ error: 'No bank details found. Please add bank details first.' }), { status: 400, headers: corsHeaders })
    }

    // Amount from frontend (read from blockchain getRentDetails)
    // Falls back to inv_payouts table if not provided
    let amount = Number(clientAmount) || 0

    if (amount <= 0 && user_type === 'investor') {
      const { data: payouts } = await supabase
        .from('inv_payouts')
        .select('amount')
        .eq('user_id', user_id)
        .eq('status', 'claimable')
      amount = (payouts || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
    }

    if (amount <= 0 && user_type === 'affiliate') {
      const { data: commissions } = await supabase
        .from('aff_commissions')
        .select('commission_amount')
        .eq('status', 'claimable')
        .in('affiliate_id', (
          await supabase.from('aff_profiles').select('id').eq('user_id', user_id)
        ).data?.map((p: { id: string }) => p.id) || [])
      amount = (commissions || []).reduce((sum: number, c: { commission_amount: number }) => sum + c.commission_amount, 0)
    }

    if (amount <= 0) {
      return new Response(JSON.stringify({ error: 'No claimable balance' }), { status: 400, headers: corsHeaders })
    }

    const week_ref = getISOWeek()

    // Create claim (UNIQUE constraint prevents duplicates)
    const { data: claim, error } = await supabase
      .from('payout_claims')
      .insert({
        user_id,
        user_type,
        amount_entitled: amount,
        currency,
        bank_account_id: bank.id,
        week_ref,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'Already claimed this week' }), { status: 409, headers: corsHeaders })
      }
      throw error
    }

    // Log to audit
    await supabase.from('payout_audit_log').insert({
      claim_id: claim.id,
      user_id,
      event_type: 'claim_submitted',
      new_status: 'pending',
      performed_by: 'user',
      metadata: { amount, currency, user_type, week_ref },
    })

    return new Response(JSON.stringify({ claim_id: claim.id, amount, week_ref }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
