// nfstay Stripe Checkout Edge Function
// Creates a Stripe Checkout Session for traveler bookings
//
// Flow:
//   Frontend → POST /nfs-stripe-checkout → Creates Checkout Session → Returns URL
//   Traveler → Stripe hosted checkout → Pays
//   Stripe → webhook → nfs-stripe-webhook → Updates reservation
//
// Requires: NFS_STRIPE_SECRET_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const NFS_STRIPE_SECRET_KEY = Deno.env.get('NFS_STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface CheckoutRequest {
  reservation_id: string;
  success_url: string;
  cancel_url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!NFS_STRIPE_SECRET_KEY) {
    return new Response(
      JSON.stringify({ error: 'NFS_STRIPE_SECRET_KEY not configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const stripe = new Stripe(NFS_STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { reservation_id, success_url, cancel_url }: CheckoutRequest = await req.json();

    if (!reservation_id) {
      return new Response(
        JSON.stringify({ error: 'reservation_id is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch reservation with property and operator details
    const { data: reservation, error: resError } = await supabase
      .from('nfs_reservations')
      .select('*')
      .eq('id', reservation_id)
      .single();

    if (resError || !reservation) {
      return new Response(
        JSON.stringify({ error: 'Reservation not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (reservation.payment_status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'Reservation is already paid' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch property for description
    const { data: property } = await supabase
      .from('nfs_properties')
      .select('public_title, operator_id')
      .eq('id', reservation.property_id)
      .single();

    // Fetch operator's Stripe Connect account
    const { data: stripeAccount } = await supabase
      .from('nfs_stripe_accounts')
      .select('connect_account_id, charges_enabled, platform_fee_pct')
      .eq('operator_id', reservation.operator_id)
      .single();

    const totalAmountCents = Math.round(Number(reservation.total_amount) * 100);
    const currency = (reservation.payment_currency || 'gbp').toLowerCase();
    const propertyTitle = property?.public_title || 'Vacation Rental';

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: propertyTitle,
              description: `${reservation.check_in} to ${reservation.check_out} · ${reservation.adults} guest${reservation.adults !== 1 ? 's' : ''}`,
            },
            unit_amount: totalAmountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        nfs_reservation_id: reservation_id,
        nfs_operator_id: reservation.operator_id || '',
        nfs_property_id: reservation.property_id,
      },
      customer_email: reservation.guest_email || undefined,
      success_url: success_url || `${req.headers.get('origin')}/nfstay/payment/success?reservation_id=${reservation_id}`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/nfstay/payment/cancel?reservation_id=${reservation_id}`,
    };

    // If operator has Stripe Connect, use destination charge
    if (stripeAccount?.connect_account_id && stripeAccount.charges_enabled) {
      const platformFeePct = stripeAccount.platform_fee_pct || 3.0;
      const applicationFee = Math.round(totalAmountCents * (platformFeePct / 100));

      sessionParams.payment_intent_data = {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: stripeAccount.connect_account_id,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Store the checkout session ID on the reservation
    await supabase
      .from('nfs_reservations')
      .update({
        stripe_payment_intent_id: session.payment_intent || session.id,
        payment_status: 'pending',
      })
      .eq('id', reservation_id);

    return new Response(
      JSON.stringify({
        url: session.url,
        session_id: session.id,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
