// revolut-check-status — Check Revolut draft status and update claims
// Called: manually by admin OR automatically after approval
// Input: { claim_id } or {} (checks all processing claims)

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

    const body = await req.json().catch(() => ({}))
    const claimId = body.claim_id

    // Get processing claims (with draft IDs)
    let query = supabase
      .from('payout_claims')
      .select('id, user_id, revolut_payment_draft_id, status')
      .eq('status', 'processing')
      .not('revolut_payment_draft_id', 'is', null)

    if (claimId) {
      query = query.eq('id', claimId)
    }

    const { data: claims } = await query
    if (!claims?.length) {
      return new Response(JSON.stringify({ updated: 0, message: 'No processing claims with draft IDs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get fresh Revolut token
    const tokenRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/revolut-token-refresh`, {
      method: 'POST',
      headers: { 'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, 'Content-Type': 'application/json' },
    })
    const tokenData = await tokenRes.json()
    const token = tokenData.access_token
    if (!token) {
      return new Response(JSON.stringify({ error: 'Could not get Revolut token' }), { status: 500, headers: corsHeaders })
    }

    let updated = 0
    const results: any[] = []

    for (const claim of claims) {
      try {
        // Check draft status in Revolut
        const draftRes = await fetch(
          `https://b2b.revolut.com/api/1.0/payment-drafts/${claim.revolut_payment_draft_id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const draft = await draftRes.json()

        // Check if any payment in the draft is COMPLETED
        const payment = draft.payments?.[0]
        const state = payment?.state?.toUpperCase()

        if (state === 'COMPLETED') {
          // Update payout_claims to paid
          await supabase
            .from('payout_claims')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', claim.id)

          // Also update inv_payouts for this user so user sees "paid" not "claimed"
          await supabase
            .from('inv_payouts')
            .update({ status: 'paid', paid_at: new Date().toISOString(), claim_method: 'bank_transfer' })
            .eq('user_id', claim.user_id)
            .eq('status', 'claimed')

          await supabase.from('payout_audit_log').insert({
            claim_id: claim.id,
            event_type: 'payment_completed',
            old_status: 'processing',
            new_status: 'paid',
            performed_by: 'status_check',
            metadata: { draft_id: claim.revolut_payment_draft_id, payment_state: state },
          })

          updated++
          results.push({ claim_id: claim.id, status: 'paid' })
        } else if (state === 'FAILED' || state === 'DECLINED') {
          await supabase
            .from('payout_claims')
            .update({ status: 'failed' })
            .eq('id', claim.id)

          updated++
          results.push({ claim_id: claim.id, status: 'failed' })
        } else {
          results.push({ claim_id: claim.id, status: 'still_processing', revolut_state: state })
        }
      } catch (err) {
        results.push({ claim_id: claim.id, error: (err as Error).message })
      }
    }

    return new Response(JSON.stringify({ updated, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
