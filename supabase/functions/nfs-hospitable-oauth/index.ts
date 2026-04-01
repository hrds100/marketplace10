// nfstay Hospitable OAuth Edge Function
// Handles Hospitable Partner Connect OAuth flow for operators
//
// Endpoints:
//   GET  /nfs-hospitable-oauth?action=authorize&operator_id=...&profile_id=... → Redirects to Hospitable
//   GET  /nfs-hospitable-oauth?action=callback&code=...&state=... → Handles OAuth callback
//   POST /nfs-hospitable-oauth { action: 'disconnect', operator_id: '...' } → Disconnects
//
// Requires: NFS_HOSPITABLE_PARTNER_ID, NFS_HOSPITABLE_PARTNER_SECRET

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NFS_HOSPITABLE_PARTNER_ID = Deno.env.get('NFS_HOSPITABLE_PARTNER_ID');
const NFS_HOSPITABLE_PARTNER_SECRET = Deno.env.get('NFS_HOSPITABLE_PARTNER_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// n8n webhook URL for triggering initial sync after successful connection
const N8N_BASE_URL = Deno.env.get('NFS_N8N_WEBHOOK_URL') || 'https://n8n.srv886554.hstgr.cloud';
const N8N_INIT_SYNC_PATH = '/webhook/nfs-hospitable-init-sync';

const HOSPITABLE_OAUTH_URL = 'https://connect.hospitable.com';
const HOSPITABLE_API_URL = 'https://api.connect.hospitable.com';

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
      JSON.stringify({ error: 'Hospitable credentials not configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);

  try {
    // ── GET: authorize or callback ──
    if (req.method === 'GET') {
      const action = url.searchParams.get('action');

      // ── AUTHORIZE: Generate Hospitable OAuth URL ──
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

        // Generate a random state for CSRF protection
        const state = crypto.randomUUID();

        // Upsert nfs_hospitable_connections with pending state
        // Store redirect_origin in user_metadata so callback knows where to send the user
        await supabase
          .from('nfs_hospitable_connections')
          .upsert({
            operator_id: operatorId,
            profile_id: profileId,
            hospitable_customer_id: '', // Will be set on callback
            auth_code: state, // Reuse auth_code field for CSRF state
            auth_code_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min expiry
            status: 'pending',
            sync_status: 'pending',
            user_metadata: { redirect_origin: origin },
          }, { onConflict: 'operator_id' });

        const redirectUri = `${SUPABASE_URL}/functions/v1/nfs-hospitable-oauth?action=callback`;
        const oauthUrl = `${HOSPITABLE_OAUTH_URL}/oauth/authorize?` +
          `partner_id=${encodeURIComponent(NFS_HOSPITABLE_PARTNER_ID)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&state=${state}`;

        return new Response(
          JSON.stringify({ url: oauthUrl }),
          { status: 200, headers: corsHeaders }
        );
      }

      // ── CALLBACK: Handle Hospitable OAuth redirect ──
      if (action === 'callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const errorParam = url.searchParams.get('error');

        // For early errors (before we can look up connection row), try to resolve origin from state
        // If state is missing, fall back to DEFAULT_ORIGIN
        const resolveRedirectOrigin = (meta: Record<string, unknown> | null): string => {
          const stored = meta && typeof meta === 'object' ? (meta as Record<string, string>).redirect_origin : null;
          return resolveOrigin(stored || null);
        };

        if (errorParam) {
          // Try to look up origin from connection row if state is available
          let redirectOrigin = DEFAULT_ORIGIN;
          if (state) {
            const { data: errRow } = await supabase
              .from('nfs_hospitable_connections')
              .select('user_metadata')
              .eq('auth_code', state)
              .single();
            redirectOrigin = resolveRedirectOrigin(errRow?.user_metadata);
          }
          return new Response(null, {
            status: 302,
            headers: { Location: buildRedirectUrl(redirectOrigin, { error: errorParam }) },
          });
        }

        if (!code || !state) {
          return new Response(null, {
            status: 302,
            headers: { Location: buildRedirectUrl(DEFAULT_ORIGIN, { error: 'missing_params' }) },
          });
        }

        // Verify state matches (CSRF protection)
        const { data: connectionRow } = await supabase
          .from('nfs_hospitable_connections')
          .select('id, operator_id, profile_id, auth_code_expires_at, user_metadata')
          .eq('auth_code', state)
          .single();

        // Resolve redirect origin from the stored connection metadata
        const redirectOrigin = resolveRedirectOrigin(connectionRow?.user_metadata);

        if (!connectionRow) {
          return new Response(null, {
            status: 302,
            headers: { Location: buildRedirectUrl(DEFAULT_ORIGIN, { error: 'invalid_state' }) },
          });
        }

        // Check state hasn't expired
        if (connectionRow.auth_code_expires_at && new Date(connectionRow.auth_code_expires_at) < new Date()) {
          return new Response(null, {
            status: 302,
            headers: { Location: buildRedirectUrl(redirectOrigin, { error: 'state_expired' }) },
          });
        }

        // Exchange auth code for customer/connection details with Hospitable API
        const tokenResponse = await fetch(`${HOSPITABLE_API_URL}/v1/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`${NFS_HOSPITABLE_PARTNER_ID}:${NFS_HOSPITABLE_PARTNER_SECRET}`)}`,
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${SUPABASE_URL}/functions/v1/nfs-hospitable-oauth?action=callback`,
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          await supabase
            .from('nfs_hospitable_connections')
            .update({
              status: 'failed',
              last_error: { message: 'Token exchange failed', detail: errorText },
              auth_code: null,
            })
            .eq('id', connectionRow.id);

          return new Response(null, {
            status: 302,
            headers: { Location: buildRedirectUrl(redirectOrigin, { error: 'token_exchange_failed' }) },
          });
        }

        const tokenData = await tokenResponse.json();

        // Extract customer and connection info from Hospitable response
        const customerId = tokenData.customer_id || tokenData.data?.customer_id || '';
        const connectionId = tokenData.connection_id || tokenData.data?.connection_id || '';
        const connectedPlatforms = tokenData.connected_platforms || tokenData.data?.connected_platforms || [];
        const userMetadata = tokenData.user || tokenData.data?.user || {};

        // Merge redirect_origin into user_metadata so it persists alongside Hospitable data
        const existingMeta = (connectionRow.user_metadata && typeof connectionRow.user_metadata === 'object')
          ? connectionRow.user_metadata as Record<string, unknown>
          : {};
        const mergedMetadata = { ...existingMeta, ...userMetadata };

        // Update nfs_hospitable_connections with successful connection
        await supabase
          .from('nfs_hospitable_connections')
          .update({
            hospitable_customer_id: customerId,
            hospitable_connection_id: connectionId,
            status: 'connected',
            is_active: true,
            connected_at: new Date().toISOString(),
            connected_platforms: connectedPlatforms,
            user_metadata: mergedMetadata,
            auth_code: null, // Clear CSRF state
            auth_code_expires_at: null,
            last_error: null,
            health_status: 'healthy',
          })
          .eq('id', connectionRow.id);

        // Trigger n8n initial sync workflow
        try {
          await fetch(`${N8N_BASE_URL}${N8N_INIT_SYNC_PATH}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operator_id: connectionRow.operator_id,
              connection_id: connectionRow.id,
              hospitable_customer_id: customerId,
              hospitable_connection_id: connectionId,
            }),
          });
        } catch {
          // n8n trigger failure is non-blocking — sync can be triggered manually later
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

        if (connectionRow?.hospitable_connection_id) {
          try {
            // Notify Hospitable of disconnection
            await fetch(
              `${HOSPITABLE_API_URL}/v1/connections/${connectionRow.hospitable_connection_id}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Basic ${btoa(`${NFS_HOSPITABLE_PARTNER_ID}:${NFS_HOSPITABLE_PARTNER_SECRET}`)}`,
                },
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
