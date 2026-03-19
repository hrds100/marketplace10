// NFStay Stripe Webhook Edge Function
// Handles payment events from Stripe (platform + Connect account events)
//
// Flow:
//   Stripe → POST /nfs-stripe-webhook → Verify signature → Process event → Update DB
//
// Idempotency: Checks nfs_webhook_events.external_event_id before processing
// Requires: NFS_STRIPE_SECRET_KEY, NFS_STRIPE_WEBHOOK_SECRET, NFS_STRIPE_CONNECT_WEBHOOK_SECRET

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const NFS_STRIPE_SECRET_KEY = Deno.env.get('NFS_STRIPE_SECRET_KEY');
const NFS_STRIPE_WEBHOOK_SECRET = Deno.env.get('NFS_STRIPE_WEBHOOK_SECRET');
const NFS_STRIPE_CONNECT_WEBHOOK_SECRET = Deno.env.get('NFS_STRIPE_CONNECT_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
      },
    });
  }

  if (!NFS_STRIPE_SECRET_KEY || !NFS_STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Stripe secrets not configured' }), { status: 500 });
  }

  const stripe = new Stripe(NFS_STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Verify webhook signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, NFS_STRIPE_WEBHOOK_SECRET);
    } catch (platformErr) {
      if (NFS_STRIPE_CONNECT_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(body, signature, NFS_STRIPE_CONNECT_WEBHOOK_SECRET);
      } else {
        throw platformErr;
      }
    }

    // Idempotency check
    const { data: existing } = await supabase
      .from('nfs_webhook_events')
      .select('id')
      .eq('external_event_id', event.id)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }

    // Record event
    await supabase.from('nfs_webhook_events').insert({
      source: 'stripe',
      external_event_id: event.id,
      event_type: event.type,
      data: event.data.object as Record<string, unknown>,
      processed: false,
    });

    // Process based on event type
    let processed = true;
    let errorMsg: string | null = null;

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const reservationId = session.metadata?.nfs_reservation_id;

          if (reservationId) {
            await supabase
              .from('nfs_reservations')
              .update({
                payment_status: 'paid',
                status: 'confirmed',
                stripe_payment_intent_id: typeof session.payment_intent === 'string'
                  ? session.payment_intent
                  : session.payment_intent?.id || null,
                stripe_charge_id: null, // Will be set by charge.succeeded
                payment_processed_at: new Date().toISOString(),
                payment_amounts: {
                  amount_total: session.amount_total,
                  currency: session.currency,
                },
              })
              .eq('id', reservationId);
          }
          break;
        }

        case 'payment_intent.succeeded': {
          const pi = event.data.object as Stripe.PaymentIntent;
          const reservationId = pi.metadata?.nfs_reservation_id;

          if (reservationId) {
            await supabase
              .from('nfs_reservations')
              .update({
                payment_status: 'paid',
                status: 'confirmed',
                stripe_payment_intent_id: pi.id,
                payment_processed_at: new Date().toISOString(),
              })
              .eq('id', reservationId);
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const pi = event.data.object as Stripe.PaymentIntent;
          const reservationId = pi.metadata?.nfs_reservation_id;

          if (reservationId) {
            await supabase
              .from('nfs_reservations')
              .update({
                payment_status: 'failed',
              })
              .eq('id', reservationId);
          }
          break;
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          const pi = charge.payment_intent;
          const piId = typeof pi === 'string' ? pi : pi?.id;

          if (piId) {
            // Find reservation by payment_intent
            const { data: res } = await supabase
              .from('nfs_reservations')
              .select('id, total_amount')
              .eq('stripe_payment_intent_id', piId)
              .single();

            if (res) {
              const refundedCents = charge.amount_refunded || 0;
              const totalCents = Math.round(Number(res.total_amount) * 100);
              const isFullRefund = refundedCents >= totalCents;

              await supabase
                .from('nfs_reservations')
                .update({
                  payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
                  refund_amount: refundedCents / 100,
                  refund_status: 'completed',
                  refund_at: new Date().toISOString(),
                  stripe_refund_id: charge.id,
                })
                .eq('id', res.id);
            }
          }
          break;
        }

        case 'account.updated': {
          // Connect account status change
          const account = event.data.object as Stripe.Account;
          const accountId = account.id;

          await supabase
            .from('nfs_stripe_accounts')
            .update({
              details_submitted: account.details_submitted || false,
              payouts_enabled: account.payouts_enabled || false,
              charges_enabled: account.charges_enabled || false,
              onboarding_completed: (account.details_submitted && account.charges_enabled) || false,
            })
            .eq('connect_account_id', accountId);
          break;
        }

        case 'transfer.created': {
          const transfer = event.data.object as Stripe.Transfer;
          const destAccount = typeof transfer.destination === 'string'
            ? transfer.destination
            : transfer.destination?.id;

          if (destAccount) {
            // Update earnings for the operator
            const { data: stripeAccount } = await supabase
              .from('nfs_stripe_accounts')
              .select('id, total_transferred')
              .eq('connect_account_id', destAccount)
              .single();

            if (stripeAccount) {
              const newTotal = Number(stripeAccount.total_transferred || 0) + (transfer.amount / 100);
              await supabase
                .from('nfs_stripe_accounts')
                .update({ total_transferred: newTotal })
                .eq('id', stripeAccount.id);
            }
          }
          break;
        }

        default:
          // Unhandled event type — log but don't fail
          break;
      }
    } catch (processError) {
      processed = false;
      errorMsg = String(processError);
    }

    // Mark event as processed
    await supabase
      .from('nfs_webhook_events')
      .update({
        processed,
        success: processed && !errorMsg,
        error: errorMsg,
        processed_at: new Date().toISOString(),
      })
      .eq('external_event_id', event.id);

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200 }
    );
  } catch (err) {
    // Signature verification failure or other error
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400 }
    );
  }
});
