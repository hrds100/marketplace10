// unipile-create-link — generate a Unipile hosted-auth URL so an admin can
// scan a WhatsApp QR (or connect Email/LinkedIn/etc.) without us rendering
// any QR ourselves.
//
// PR 69 (multi-channel pivot to Unipile), Hugo 2026-04-27.
//
// Hugo's hard rule: Unipile owns the QR-scan UX. Our /crm/settings shows a
// "Connect WhatsApp" button. Click → this function → returns hosted URL →
// frontend opens it in a new tab. User scans QR on Unipile's page. Unipile
// fires `account.connected` to our unipile-webhook, which upserts a
// wk_numbers row.
//
// Body:
//   { provider: 'WHATSAPP' | 'GMAIL' | 'OUTLOOK' | 'MAIL' | 'LINKEDIN' | 'TELEGRAM',
//     label?: string,           // free-text, used as Unipile `name` for round-trip
//     reconnect_account_id?: string  // when refreshing creds on existing account
//   }
//
// Returns: { url: string, expires_at: ISO8601 }
//
// Auth: admin only (JWT email gate, same pattern as wazzup-sync-channels).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const UNIPILE_TOKEN = Deno.env.get('UNIPILE_TOKEN') ?? '';
const UNIPILE_DSN = Deno.env.get('UNIPILE_DSN') ?? 'api38.unipile.com:16812';
const PUBLIC_APP_URL = Deno.env.get('PUBLIC_APP_URL') ?? 'https://hub.nfstay.com';

const ADMIN_EMAILS = ['hugo@nfstay.com', 'admin@hub.nfstay.com'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Body {
  provider: 'WHATSAPP' | 'GMAIL' | 'OUTLOOK' | 'MAIL' | 'LINKEDIN' | 'TELEGRAM';
  label?: string;
  reconnect_account_id?: string;
}

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const auth = req.headers.get('authorization') ?? '';
    const jwt = auth.replace(/^Bearer\s+/i, '');
    if (!jwt) return json(401, { error: 'Missing bearer token' });

    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: userResp, error: userErr } = await supa.auth.getUser(jwt);
    if (userErr || !userResp?.user) return json(401, { error: 'Invalid token' });

    const callerEmail = (userResp.user.email ?? '').toLowerCase();
    if (!ADMIN_EMAILS.includes(callerEmail)) {
      return json(403, { error: 'Admin only' });
    }

    if (!UNIPILE_TOKEN) {
      return json(503, { error: 'UNIPILE_TOKEN env not set on edge function' });
    }

    let payload: Body;
    try {
      payload = (await req.json()) as Body;
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }

    const provider = (payload.provider ?? '').toUpperCase();
    if (!['WHATSAPP', 'GMAIL', 'OUTLOOK', 'MAIL', 'LINKEDIN', 'TELEGRAM'].includes(provider)) {
      return json(400, { error: 'provider must be one of WHATSAPP/GMAIL/OUTLOOK/MAIL/LINKEDIN/TELEGRAM' });
    }

    const label = (payload.label ?? `${provider}-${userResp.user.id.slice(0, 8)}`).slice(0, 80);
    const expiresOn = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    // Webhook-back URL: our unipile-webhook fn handles both account.connected
    // notifications AND messaging events.
    const notifyUrl = `${SUPABASE_URL}/functions/v1/unipile-webhook`;
    // After scan, redirect user back to the Channels tab.
    const successUrl = `${PUBLIC_APP_URL}/crm/settings?unipile=connected`;
    const failureUrl = `${PUBLIC_APP_URL}/crm/settings?unipile=failed`;

    const reqBody: Record<string, unknown> = {
      type: payload.reconnect_account_id ? 'reconnect' : 'create',
      providers: [provider],
      api_url: `https://${UNIPILE_DSN}`,
      expiresOn,
      success_redirect_url: successUrl,
      failure_redirect_url: failureUrl,
      notify_url: notifyUrl,
      name: label,
    };
    if (payload.reconnect_account_id) {
      reqBody.reconnect_account = { account_id: payload.reconnect_account_id };
    }

    const u = await fetch(`https://${UNIPILE_DSN}/api/v1/hosted/accounts/link`, {
      method: 'POST',
      headers: {
        'X-API-KEY': UNIPILE_TOKEN,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(reqBody),
    });
    const uText = await u.text();
    if (!u.ok) {
      console.error('[unipile-create-link] upstream error', u.status, uText);
      return json(200, { error: `Unipile ${u.status}: ${uText.slice(0, 500)}` });
    }
    let uJson: { url?: string; object?: string };
    try {
      uJson = JSON.parse(uText);
    } catch {
      return json(200, { error: 'Could not parse Unipile response', raw: uText.slice(0, 500) });
    }

    if (!uJson.url) {
      return json(200, { error: 'No url field in Unipile response', raw: uText.slice(0, 500) });
    }

    return json(200, {
      url: uJson.url,
      expires_at: expiresOn,
      provider,
      label,
    });
  } catch (e) {
    console.error('[unipile-create-link] threw', e);
    return json(500, { error: e instanceof Error ? e.message : 'Internal error' });
  }
});
