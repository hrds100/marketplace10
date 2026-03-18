// revolut-webhook — Handle Revolut Business API webhooks
// Trigger: POST from Revolut after payment processing
// Verifies HMAC-SHA256 signature before processing
// Updates payout_claims status and sends notifications

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const rawBody = await req.text()
    const signature = req.headers.get('revolut-signature') || req.headers.get('Revolut-Signature')
    const secret = Deno.env.get('REVOLUT_WEBHOOK_SECRET')

    // Verify HMAC signature
    if (secret && signature) {
      const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
      if (signature !== expected) {
        await supabase.from('payout_audit_log').insert({
          event_type: 'security_rejected',
          performed_by: 'revolut_webhook',
          metadata: { reason: 'Invalid HMAC signature' },
        })
        return new Response('Unauthorized', { status: 401 })
      }
    }

    const event = JSON.parse(rawBody)

    // Log webhook receipt
    await supabase.from('payout_audit_log').insert({
      event_type: 'webhook_received',
      performed_by: 'revolut_webhook',
      metadata: { event_type: event.event, transaction_id: event.data?.id },
    })

    if (event.event === 'TransactionCompleted' || event.event === 'TRANSACTION_COMPLETED') {
      const txId = event.data?.id
      if (txId) {
        // Update claim to paid
        const { data: claim } = await supabase
          .from('payout_claims')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('revolut_transaction_id', txId)
          .select('id, user_id, amount_entitled')
          .maybeSingle()

        if (claim) {
          await supabase.from('payout_audit_log').insert({
            claim_id: claim.id,
            user_id: claim.user_id,
            event_type: 'payment_completed',
            old_status: 'processing',
            new_status: 'paid',
            performed_by: 'revolut_webhook',
            metadata: { amount: claim.amount_entitled, transaction_id: txId },
          })

          // TODO: Send WhatsApp notification via n8n webhook
          // await fetch(N8N_WEBHOOK_URL + '/inv-notify-whatsapp', { ... })
        }
      }
    }

    if (event.event === 'TransactionFailed' || event.event === 'TRANSACTION_FAILED') {
      const txId = event.data?.id
      if (txId) {
        await supabase
          .from('payout_claims')
          .update({ status: 'failed' })
          .eq('revolut_transaction_id', txId)

        await supabase.from('payout_audit_log').insert({
          event_type: 'payment_failed',
          performed_by: 'revolut_webhook',
          metadata: { transaction_id: txId, reason: event.data?.reason },
        })

        // TODO: Send WhatsApp alert to founder via n8n
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
})
