// NFStay Stripe Connect OAuth Edge Function
// Handles the Connect OAuth flow for operators to connect their Stripe accounts
//
// Endpoints:
//   GET  /nfs-stripe-connect-oauth?action=authorize&operator_id=... → Redirects to Stripe OAuth
//   GET  /nfs-stripe-connect-oauth?action=callback&code=...&state=... → Handles OAuth callback
//   POST /nfs-stripe-connect-oauth { action: 'disconnect', operator_id: '...' } → Disconnects
//
// Requires: NFS_STRIPE_SECRET_KEY, NFS_STRIPE_CLIENT_ID

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const NFS_STRIPE_SECRET_KEY = Deno.env.get('NFS_STRIPE_SECRET_KEY');
const NFS_STRIPE_CLIENT_ID = Deno.env.get('NFS_STRIPE_CLIENT_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!NFS_STRIPE_SECRET_KEY || !NFS_STRIPE_CLIENT_ID) {
    return new Response(
      JSON.stringify({ error: 'Stripe credentials not configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  const stripe = new Stripe(NFS_STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);

  try {
    // ── GET: authorize or callback ──
    if (req.method === 'GET') {
      const action = url.searchParams.get('action');

      // ── AUTHORIZE: Generate Stripe OAuth URL ──
      if (action === 'authorize') {
        const operatorId = url.searchParams.get('operator_id');
        if (!operatorId) {
          return new Response(
            JSON.stringify({ error: 'operator_id required' }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Generate a random state for CSRF protection
        const state = crypto.randomUUID();

        // Upsert nfs_stripe_accounts with oauth_state
        await supabase
          .from('nfs_stripe_accounts')
          .upsert({
            operator_id: operatorId,
            oauth_state: state,
            connection_status: 'pending',
          }, { onConflict: 'operator_id' });

        const redirectUri = `${SUPABASE_URL}/functions/v1/nfs-stripe-connect-oauth?action=callback`;
        const oauthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${NFS_STRIPE_CLIENT_ID}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

        return new Response(
          JSON.stringify({ url: oauthUrl }),
          { status: 200, headers: corsHeaders }
        );
      }

      // ── CALLBACK: Handle Stripe OAuth redirect ──
      if (action === 'callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const errorParam = url.searchParams.get('error');

        if (errorParam) {
          // Redirect back to settings with error
          return new Response(null, {
            status: 302,
            headers: { Location: `/nfstay/settings?tab=stripe&error=${errorParam}` },
          });
        }

        if (!code || !state) {
          return new Response(null, {
            status: 302,
            headers: { Location: `/nfstay/settings?tab=stripe&error=missing_params` },
          });
        }

        // Verify state matches
        const { data: stripeRow } = await supabase
          .from('nfs_stripe_accounts')
          .select('id, operator_id')
          .eq('oauth_state', state)
          .single();

        if (!stripeRow) {
          return new Response(null, {
            status: 302,
            headers: { Location: `/nfstay/settings?tab=stripe&error=invalid_state` },
          });
        }

        // Exchange code for access token
        const tokenResponse = await stripe.oauth.token({
          grant_type: 'authorization_code',
          code,
        });

        // Update nfs_stripe_accounts with Connect details
        await supabase
          .from('nfs_stripe_accounts')
          .update({
            connect_account_id: tokenResponse.stripe_user_id,
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            stripe_user_id: tokenResponse.stripe_user_id,
            stripe_publishable_key: tokenResponse.stripe_publishable_key,
            connection_status: 'connected',
            account_status: 'active',
            connected_at: new Date().toISOString(),
            oauth_state: null, // Clear state
          })
          .eq('id', stripeRow.id);

        // Fetch account details to update capabilities
        const account = await stripe.accounts.retrieve(tokenResponse.stripe_user_id!);
        await supabase
          .from('nfs_stripe_accounts')
          .update({
            details_submitted: account.details_submitted || false,
            payouts_enabled: account.payouts_enabled || false,
            charges_enabled: account.charges_enabled || false,
            onboarding_completed: (account.details_submitted && account.charges_enabled) || false,
          })
          .eq('id', stripeRow.id);

        // Redirect back to settings with success
        return new Response(null, {
          status: 302,
          headers: { Location: `/nfstay/settings?tab=stripe&success=connected` },
        });
      }
    }

    // ── POST: disconnect ──
    if (req.method === 'POST') {
      const body = await req.json();

      if (body.action === 'disconnect') {
        const operatorId = body.operator_id;
        if (!operatorId) {
          return new Response(
            JSON.stringify({ error: 'operator_id required' }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Fetch the Connect account ID
        const { data: stripeRow } = await supabase
          .from('nfs_stripe_accounts')
          .select('connect_account_id')
          .eq('operator_id', operatorId)
          .single();

        if (stripeRow?.connect_account_id) {
          try {
            // Deauthorize on Stripe side
            await stripe.oauth.deauthorize({
              client_id: NFS_STRIPE_CLIENT_ID,
              stripe_user_id: stripeRow.connect_account_id,
            });
          } catch {
            // If deauthorize fails (already disconnected), continue cleanup
          }
        }

        // Update local record
        await supabase
          .from('nfs_stripe_accounts')
          .update({
            connection_status: 'disconnected',
            account_status: 'disconnected',
            disconnected_at: new Date().toISOString(),
            access_token: null,
            refresh_token: null,
            charges_enabled: false,
            payouts_enabled: false,
          })
          .eq('operator_id', operatorId);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
