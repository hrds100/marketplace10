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

    // 4. Convert USD to GBP via Revolut exchange rate
    const usdAmount = Number(claim.amount_entitled)
    let gbpAmount = usdAmount
    let exchangeRate = 1

    try {
      const rateRes = await fetch(
        `https://b2b.revolut.com/api/1.0/rate?from=USD&to=GBP&amount=${usdAmount}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const rateData = await rateRes.json()
      if (rateData.to?.amount) {
        gbpAmount = rateData.to.amount
        exchangeRate = rateData.rate || (gbpAmount / usdAmount)
      }
    } catch {
      // Fallback: use approximate rate if API fails
      gbpAmount = Math.round(usdAmount * 0.75 * 100) / 100
      exchangeRate = 0.75
    }

    // 5. Create payment DRAFT (requires approval in Revolut app)
    const draftRes = await fetch('https://b2b.revolut.com/api/1.0/payment-drafts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `nfstay Payout — $${usdAmount} → £${gbpAmount}`,
        schedule_for: new Date().toISOString().slice(0, 10),
        payments: [{
          account_id: '9e512c4e-ebe5-4389-a20f-5e3be3a912a6', // nfstay shares GBP
          receiver: { counterparty_id: cpData.id, account_id: cpData.accounts[0].id },
          amount: gbpAmount,
          currency: 'GBP',
          reference: 'nfstay payout',
        }],
      }),
    })
    const draftData = await draftRes.json()

    if (!draftData.id) {
      return new Response(JSON.stringify({ error: `Draft failed: ${draftData.message || JSON.stringify(draftData)}` }), { status: 400, headers: corsHeaders })
    }

    // 6. Update claim to processing (not paid — waiting for Revolut approval)
    await supabase
      .from('payout_claims')
      .update({ status: 'processing', revolut_payment_draft_id: draftData.id })
      .eq('id', claim_id)

    // 7. Audit log
    await supabase.from('payout_audit_log').insert({
      claim_id,
      user_id: claim.user_id,
      event_type: 'draft_created',
      old_status: claim.status,
      new_status: 'processing',
      performed_by: 'admin',
      metadata: { revolut_draft_id: draftData.id, usd_amount: usdAmount, gbp_amount: gbpAmount, exchange_rate: exchangeRate },
    })

    return new Response(JSON.stringify({
      success: true,
      draft_id: draftData.id,
      usd_amount: usdAmount,
      gbp_amount: gbpAmount,
      exchange_rate: exchangeRate,
      state: 'awaiting_approval',
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
