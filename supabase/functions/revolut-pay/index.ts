// revolut-pay — Send a single Revolut payment for a payout claim
// Input: { claim_id }
// Fetches claim + bank details, creates counterparty, sends payment

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

    const { claim_id } = await req.json()
    if (!claim_id) {
      return new Response(JSON.stringify({ error: 'Missing claim_id' }), { status: 400, headers: corsHeaders })
    }

    // 1. Get claim + bank details
    const { data: claim, error: claimErr } = await supabase
      .from('payout_claims')
      .select('*, user_bank_accounts:bank_account_id(*)')
      .eq('id', claim_id)
      .single()

    if (claimErr || !claim) {
      return new Response(JSON.stringify({ error: 'Claim not found' }), { status: 404, headers: corsHeaders })
    }

    if (claim.status === 'paid') {
      return new Response(JSON.stringify({ error: 'Already paid' }), { status: 409, headers: corsHeaders })
    }

    const bank = claim.user_bank_accounts
    if (!bank || !bank.sort_code || !bank.account_number) {
      return new Response(JSON.stringify({ error: 'No valid bank details for this claim' }), { status: 400, headers: corsHeaders })
    }

    // 2. Get fresh Revolut token
    const tokenRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/revolut-token-refresh`, {
      method: 'POST',
      headers: { 'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, 'Content-Type': 'application/json' },
    })
    const tokenData = await tokenRes.json()
    const token = tokenData.access_token
    if (!token) {
      return new Response(JSON.stringify({ error: 'Could not get Revolut token' }), { status: 500, headers: corsHeaders })
    }

    // 3. Create counterparty
    const names = (bank.account_name || 'User User').split(' ')
    const cpRes = await fetch('https://b2b.revolut.com/api/1.0/counterparty', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        individual_name: { first_name: names[0] || 'User', last_name: names.slice(1).join(' ') || 'User' },
        bank_country: bank.bank_country || 'GB',
        currency: bank.currency || 'GBP',
        account_no: bank.account_number,
        sort_code: bank.sort_code,
      }),
    })
    const cpData = await cpRes.json()

    if (!cpData.id || !cpData.accounts?.[0]?.id) {
      return new Response(JSON.stringify({ error: `Revolut counterparty failed: ${cpData.message || JSON.stringify(cpData)}` }), { status: 400, headers: corsHeaders })
    }

    // 4. Send payment
    const payRes = await fetch('https://b2b.revolut.com/api/1.0/pay', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: `nfs-${claim_id.slice(0, 8)}-${Date.now()}`,
        account_id: '9e512c4e-ebe5-4389-a20f-5e3be3a912a6', // nfstay shares GBP
        receiver: { counterparty_id: cpData.id, account_id: cpData.accounts[0].id },
        amount: Number(claim.amount_entitled),
        currency: bank.currency || 'GBP',
        reference: 'NFsTay payout',
      }),
    })
    const payData = await payRes.json()

    if (!payData.id) {
      return new Response(JSON.stringify({ error: `Payment failed: ${payData.message || JSON.stringify(payData)}` }), { status: 400, headers: corsHeaders })
    }

    // 5. Update claim to paid
    await supabase
      .from('payout_claims')
      .update({ status: 'paid', paid_at: new Date().toISOString(), revolut_transaction_id: payData.id })
      .eq('id', claim_id)

    // 6. Audit log
    await supabase.from('payout_audit_log').insert({
      claim_id,
      user_id: claim.user_id,
      event_type: 'payment_completed',
      old_status: claim.status,
      new_status: 'paid',
      performed_by: 'admin',
      metadata: { revolut_tx_id: payData.id, amount: claim.amount_entitled },
    })

    return new Response(JSON.stringify({ 
      success: true, 
      tx_id: payData.id, 
      amount: claim.amount_entitled,
      state: payData.state,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
