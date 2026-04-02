// nfstay Hospitable Connect Edge Function
// Implements the official Hospitable Connect partner flow:
//   1. Create a Hospitable Connect customer (POST /api/v1/customers)
//   2. Create an auth code for that customer (POST /api/v1/auth-codes)
//   3. Redirect operator to the returned `return_url`
//   4. Handle the return from Hospitable after operator completes auth
//
// Endpoints:
//   GET  ?action=authorize&operator_id=...&profile_id=...&origin=... -> Returns { url } for redirect
//   GET  ?action=callback&customer_id=...&status=...                 -> Handles Hospitable return
//   POST { action: 'disconnect', operator_id: '...' }               -> Disconnects
//   POST { action: 'resync', operator_id: '...' }                   -> Triggers manual sync
//
// Requires env vars:
//   NFS_HOSPITABLE_PARTNER_ID     - Partner identifier from Hospitable Partner Portal
//   NFS_HOSPITABLE_PARTNER_SECRET - Bearer token for Connect API auth
//
// Hospitable Connect docs references:
//   - Create a customer:  POST https://connect.hospitable.com/api/v1/customers
//   - Create auth code:   POST https://connect.hospitable.com/api/v1/auth-codes
//   - Partner Portal:     https://developer.hospitable.com/docs/public-api-docs/03fvv8cmnjlqw-partner-portal

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NFS_HOSPITABLE_PARTNER_ID = Deno.env.get('NFS_HOSPITABLE_PARTNER_ID');
const NFS_HOSPITABLE_PARTNER_SECRET = Deno.env.get('NFS_HOSPITABLE_PARTNER_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// n8n webhook URL for triggering initial sync after successful connection
const N8N_BASE_URL = Deno.env.get('NFS_N8N_WEBHOOK_URL') || 'https://n8n.srv886554.hstgr.cloud';
const N8N_INIT_SYNC_PATH = '/webhook/nfs-hospitable-init-sync';

// Hospitable Connect API base - all endpoints are under this domain
// NOTE: api.connect.hospitable.com does NOT resolve. Use connect.hospitable.com/api/v1/...
const HOSPITABLE_CONNECT_BASE = 'https://connect.hospitable.com/api/v1';

// Connect-Version header - required by Hospitable Connect API
// Verify this version in your Partner Portal if requests fail
const CONNECT_VERSION = '2024-01-01';

// Whitelist of allowed redirect origins for OAuth callback
const ALLOWED_ORIGINS = ['https://hub.nfstay.com', 'https://nfstay.app'];
const DEFAULT_ORIGIN = 'https://hub.nfstay.com';

function resolveOrigin(raw: string | null): string {
  if (raw && ALLOWED_ORIGINS.includes(raw)) return raw;
  return DEFAULT_ORIGIN;
}

function buildRedirectUrl(origin: string, params: Record<string, string>): string {
  // hub uses /operator/settings?tab=hospitable, bookingsite uses /nfstay/oauth-callback?provider=hospitable
  const isHub = origin === 'https://hub.nfstay.com';
  const basePath = isHub ? '/operator/settings' : '/nfstay/oauth-callback';
  const qs = new URLSearchParams(isHub ? { tab: 'hospitable', ...params } : { provider: 'hospitable', ...params });
  return `${origin}${basePath}?${qs.toString()}`;
}

/** Standard headers for Hospitable Connect API requests */
function connectHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${NFS_HOSPITABLE_PARTNER_SECRET}`,
    'Connect-Version': CONNECT_VERSION,
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!NFS_HOSPITABLE_PARTNER_ID || !NFS_HOSPITABLE_PARTNER_SECRET) {
    return new Response(
      JSON.stringify({
        error: 'Hospitable credentials not configured. Set NFS_HOSPITABLE_PARTNER_ID and NFS_HOSPITABLE_PARTNER_SECRET in Supabase edge function secrets.',
      }),
      { status: 500, headers: corsHeaders }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);

  try {
    // ── GET: authorize or callback ──
    if (req.method === 'GET') {
      const action = url.searchParams.get('action');

      // ══════════════════════════════════════════════════════════════════
      // AUTHORIZE: Create Hospitable Connect customer + auth code
      // ══════════════════════════════════════════════════════════════════
      if (action === 'authorize') {
        const operatorId = url.searchParams.get('operator_id');
        const profileId = url.searchParams.get('profile_id');
        const origin = resolveOrigin(url.searchParams.get('origin'));

        if (!operatorId || !profileId) {
          return new Response(
            JSON.stringify({ error: 'operator_id and profile_id required' }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Look up operator details for Hospitable customer creation
        // Hospitable requires: id, email, name
        const { data: operatorRow } = await supabase
          .from('nfs_operators')
          .select('contact_email, first_name, last_name, brand_name')
          .eq('id', operatorId)
          .single();

        // Fall back to auth email if operator has no contact_email
        let operatorEmail = operatorRow?.contact_email || '';
        if (!operatorEmail) {
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', profileId)
            .single();
          operatorEmail = profileRow?.email || `operator-${operatorId}@nfstay.com`;
        }

        const operatorName = operatorRow?.brand_name
          || [operatorRow?.first_name, operatorRow?.last_name].filter(Boolean).join(' ')
          || `NFStay Operator`;

        // Step 1: Create (or retrieve) a Hospitable Connect customer
        // Hospitable Connect requires: id (unique), email, name
        const customerRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/customers`, {
          method: 'POST',
          headers: connectHeaders(),
          body: JSON.stringify({
            id: operatorId,
            email: operatorEmail,
            name: operatorName,
          }),
        });

        if (!customerRes.ok) {
          const errText = await customerRes.text();
          // Log for debugging - check Partner Portal logs for details
          console.error('[Hospitable] Customer creation failed:', customerRes.status, errText);

          // Update connection record with the error
          await supabase
            .from('nfs_hospitable_connections')
            .upsert({
              operator_id: operatorId,
              profile_id: profileId,
              hospitable_customer_id: '',
              status: 'failed',
              last_error: {
                message: 'Failed to create Hospitable customer',
                status: customerRes.status,
                detail: errText,
                hint: customerRes.status === 401
                  ? 'NFS_HOSPITABLE_PARTNER_SECRET may be invalid. Check Partner Portal.'
                  : customerRes.status === 403
                    ? 'Partner account may not have Connect access. Check Partner Portal permissions.'
                    : 'Check Hospitable Partner Portal logs for details.',
              },
            }, { onConflict: 'operator_id' });

          return new Response(
            JSON.stringify({
              error: 'Failed to create Hospitable customer',
              hint: customerRes.status === 401
                ? 'Check NFS_HOSPITABLE_PARTNER_SECRET in Supabase edge function secrets.'
                : `Hospitable returned ${customerRes.status}. Check Partner Portal logs.`,
            }),
            { status: 502, headers: corsHeaders }
          );
        }

        const customerData = await customerRes.json();
        const customerId = customerData.id || customerData.data?.id || '';

        if (!customerId) {
          console.error('[Hospitable] Customer response missing id:', JSON.stringify(customerData));
          return new Response(
            JSON.stringify({ error: 'Hospitable customer created but no customer ID returned. Check Partner Portal.' }),
            { status: 502, headers: corsHeaders }
          );
        }

        // Step 2: Create an auth code for this customer
        // The auth code response includes a `return_url` where we redirect the operator
        // Our `redirect_url` is where Hospitable sends the operator back after auth
        const callbackUrl = `${SUPABASE_URL}/functions/v1/nfs-hospitable-oauth?action=callback`;

        const authCodeRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/auth-codes`, {
          method: 'POST',
          headers: connectHeaders(),
          body: JSON.stringify({
            customer_id: customerId,
            redirect_url: callbackUrl,
          }),
        });

        if (!authCodeRes.ok) {
          const errText = await authCodeRes.text();
          console.error('[Hospitable] Auth code creation failed:', authCodeRes.status, errText);

          await supabase
            .from('nfs_hospitable_connections')
            .upsert({
              operator_id: operatorId,
              profile_id: profileId,
              hospitable_customer_id: customerId,
              status: 'failed',
              last_error: {
                message: 'Failed to create Hospitable auth code',
                status: authCodeRes.status,
                detail: errText,
              },
            }, { onConflict: 'operator_id' });

          return new Response(
            JSON.stringify({
              error: 'Failed to create Hospitable auth code',
              hint: `Hospitable returned ${authCodeRes.status}. Verify redirect_url is whitelisted in Partner Portal.`,
            }),
            { status: 502, headers: corsHeaders }
          );
        }

        const authCodeData = await authCodeRes.json();
        // The response should contain a return_url where we send the operator
        const returnUrl = authCodeData.return_url || authCodeData.data?.return_url || '';

        if (!returnUrl) {
          console.error('[Hospitable] Auth code response missing return_url:', JSON.stringify(authCodeData));
          return new Response(
            JSON.stringify({
              error: 'Hospitable auth code created but no return_url provided',
              hint: 'Check Partner Portal configuration. The auth-codes endpoint should return a return_url.',
            }),
            { status: 502, headers: corsHeaders }
          );
        }

        // Step 3: Store pending connection state
        // Use a CSRF state token so callback can look up the right connection
        const state = crypto.randomUUID();

        await supabase
          .from('nfs_hospitable_connections')
          .upsert({
            operator_id: operatorId,
            profile_id: profileId,
            hospitable_customer_id: customerId,
            auth_code: state,
            auth_code_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min expiry
            status: 'pending',
            sync_status: 'pending',
            user_metadata: { redirect_origin: origin },
            last_error: null,
          }, { onConflict: 'operator_id' });

        // Return the Hospitable return_url to the frontend for redirect
        return new Response(
          JSON.stringify({ url: returnUrl }),
          { status: 200, headers: corsHeaders }
        );
      }

      // ══════════════════════════════════════════════════════════════════
      // CALLBACK: Handle return from Hospitable after operator auth
      // Hospitable redirects the operator back here after they complete
      // the Connect authorization flow.
      // ══════════════════════════════════════════════════════════════════
      if (action === 'callback') {
        // Hospitable Connect returns status-based params, not an OAuth code
        const status = url.searchParams.get('status');
        const customerId = url.searchParams.get('customer_id');
        const errorParam = url.searchParams.get('error');

        // Try to find the pending connection by customer_id or by recent pending state
        let connectionRow: Record<string, unknown> | null = null;
        let redirectOrigin = DEFAULT_ORIGIN;

        if (customerId) {
          const { data } = await supabase
            .from('nfs_hospitable_connections')
            .select('id, operator_id, profile_id, hospitable_customer_id, auth_code_expires_at, user_metadata')
            .eq('hospitable_customer_id', customerId)
            .single();
          connectionRow = data;
        }

        // Fallback: look up by most recent pending connection if no customer_id
        if (!connectionRow) {
          const { data } = await supabase
            .from('nfs_hospitable_connections')
            .select('id, operator_id, profile_id, hospitable_customer_id, auth_code_expires_at, user_metadata')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          connectionRow = data;
        }

        // Resolve redirect origin from stored metadata
        if (connectionRow?.user_metadata && typeof connectionRow.user_metadata === 'object') {
          const meta = connectionRow.user_metadata as Record<string, string>;
          redirectOrigin = resolveOrigin(meta.redirect_origin || null);
        }

        // Handle errors from Hospitable
        if (errorParam || status === 'error') {
          if (connectionRow) {
            await supabase
              .from('nfs_hospitable_connections')
              .update({
                status: 'failed',
                last_error: { message: errorParam || 'Authorization failed at Hospitable', source: 'hospitable_callback' },
                auth_code: null,
              })
              .eq('id', connectionRow.id);
          }

          return new Response(null, {
            status: 302,
            headers: { Location: buildRedirectUrl(redirectOrigin, { error: errorParam || 'auth_failed' }) },
          });
        }

        // If no connection row found, we can't proceed
        if (!connectionRow) {
          return new Response(null, {
            status: 302,
            headers: { Location: buildRedirectUrl(DEFAULT_ORIGIN, { error: 'no_pending_connection' }) },
          });
        }

        // Check state hasn't expired (15 min window)
        if (connectionRow.auth_code_expires_at && new Date(connectionRow.auth_code_expires_at as string) < new Date()) {
          return new Response(null, {
            status: 302,
            headers: { Location: buildRedirectUrl(redirectOrigin, { error: 'state_expired' }) },
          });
        }

        // Verify the connection with Hospitable by fetching customer details
        const resolvedCustomerId = customerId || (connectionRow.hospitable_customer_id as string);
        let connectionId = '';
        let connectedPlatforms: string[] = [];
        let customerMeta: Record<string, unknown> = {};

        if (resolvedCustomerId) {
          try {
            const verifyRes = await fetch(`${HOSPITABLE_CONNECT_BASE}/customers/${resolvedCustomerId}`, {
              method: 'GET',
              headers: connectHeaders(),
            });

            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              connectionId = verifyData.connection_id || verifyData.data?.connection_id || '';
              connectedPlatforms = verifyData.connected_platforms || verifyData.data?.connected_platforms || [];
              customerMeta = verifyData.user || verifyData.data?.user || verifyData.metadata || {};
            } else {
              console.error('[Hospitable] Customer verify failed:', verifyRes.status, await verifyRes.text());
            }
          } catch (err) {
            console.error('[Hospitable] Customer verify error:', err);
          }
        }

        // Merge redirect_origin into user_metadata
        const existingMeta = (connectionRow.user_metadata && typeof connectionRow.user_metadata === 'object')
          ? connectionRow.user_metadata as Record<string, unknown>
          : {};
        const mergedMetadata = { ...existingMeta, ...customerMeta };

        // Update connection as successful
        await supabase
          .from('nfs_hospitable_connections')
          .update({
            hospitable_customer_id: resolvedCustomerId,
            hospitable_connection_id: connectionId,
            status: 'connected',
            is_active: true,
            connected_at: new Date().toISOString(),
            connected_platforms: connectedPlatforms,
            user_metadata: mergedMetadata,
            auth_code: null,
            auth_code_expires_at: null,
            last_error: null,
            health_status: 'healthy',
          })
          .eq('id', connectionRow.id);

        // Trigger n8n initial sync workflow (non-blocking)
        try {
          await fetch(`${N8N_BASE_URL}${N8N_INIT_SYNC_PATH}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operator_id: connectionRow.operator_id,
              connection_id: connectionRow.id,
              hospitable_customer_id: resolvedCustomerId,
              hospitable_connection_id: connectionId,
            }),
          });
        } catch {
          // n8n trigger failure is non-blocking - sync can be triggered manually later
          await supabase
            .from('nfs_hospitable_connections')
            .update({
              sync_status: 'failed',
              last_sync_error: 'Failed to trigger initial sync workflow',
            })
            .eq('id', connectionRow.id);
        }

        // Redirect back to the originating app with success
        return new Response(null, {
          status: 302,
          headers: { Location: buildRedirectUrl(redirectOrigin, { status: 'success', success: 'connected' }) },
        });
      }
    }

    // ── POST: disconnect or manual sync ──
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

        // Fetch connection details
        const { data: connectionRow } = await supabase
          .from('nfs_hospitable_connections')
          .select('id, hospitable_customer_id, hospitable_connection_id')
          .eq('operator_id', operatorId)
          .single();

        // Notify Hospitable of disconnection via Connect API
        if (connectionRow?.hospitable_customer_id) {
          try {
            await fetch(
              `${HOSPITABLE_CONNECT_BASE}/customers/${connectionRow.hospitable_customer_id}`,
              {
                method: 'DELETE',
                headers: connectHeaders(),
              }
            );
          } catch {
            // If disconnect fails on Hospitable side, continue local cleanup
          }
        }

        // Update local record
        await supabase
          .from('nfs_hospitable_connections')
          .update({
            status: 'disconnected',
            is_active: false,
            disconnected_at: new Date().toISOString(),
            sync_status: 'pending',
            auth_code: null,
          })
          .eq('operator_id', operatorId);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: corsHeaders }
        );
      }

      // Manual resync trigger
      if (body.action === 'resync') {
        const operatorId = body.operator_id;
        if (!operatorId) {
          return new Response(
            JSON.stringify({ error: 'operator_id required' }),
            { status: 400, headers: corsHeaders }
          );
        }

        const { data: connectionRow } = await supabase
          .from('nfs_hospitable_connections')
          .select('id, hospitable_customer_id, hospitable_connection_id, status')
          .eq('operator_id', operatorId)
          .single();

        if (!connectionRow || connectionRow.status !== 'connected') {
          return new Response(
            JSON.stringify({ error: 'No active Hospitable connection' }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Update sync status
        await supabase
          .from('nfs_hospitable_connections')
          .update({ sync_status: 'syncing', last_sync_error: null })
          .eq('id', connectionRow.id);

        // Trigger n8n manual sync workflow
        try {
          await fetch(`${N8N_BASE_URL}/webhook/nfs-hospitable-manual-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operator_id: operatorId,
              connection_id: connectionRow.id,
              hospitable_customer_id: connectionRow.hospitable_customer_id,
              hospitable_connection_id: connectionRow.hospitable_connection_id,
            }),
          });
        } catch {
          await supabase
            .from('nfs_hospitable_connections')
            .update({
              sync_status: 'failed',
              last_sync_error: 'Failed to trigger manual sync workflow',
            })
            .eq('id', connectionRow.id);

          return new Response(
            JSON.stringify({ error: 'Failed to trigger sync' }),
            { status: 500, headers: corsHeaders }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Sync triggered' }),
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
