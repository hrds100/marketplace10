// wk-voice-token — mints a Twilio Voice SDK access token for an authenticated agent.
//
// AUTH MODEL:
//   - Caller MUST send Authorization: Bearer <supabase_jwt>
//   - We resolve the user from the JWT, confirm workspace_role IN ('agent','admin'),
//     and use profiles.id (uuid) as the Twilio Client identity.
//
// CREDS REQUIRED:
//   - TWILIO_ACCOUNT_SID         (already in env from /sms)
//   - TWILIO_API_KEY_SID         (NEW — created in Twilio console)
//   - TWILIO_API_KEY_SECRET      (NEW — created in Twilio console)
//   - TWILIO_TWIML_APP_SID       (NEW — TwiML App pointing to wk-voice-twiml-outgoing)
//
// If any of the three new vars are missing, returns 503 with a clear message.
// Source of truth: supabase/config.toml (verify_jwt = false; we check JWT manually).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_API_KEY_SID = Deno.env.get('TWILIO_API_KEY_SID') ?? '';
const TWILIO_API_KEY_SECRET = Deno.env.get('TWILIO_API_KEY_SECRET') ?? '';
const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID') ?? '';

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---- Minimal HS256 JWT signer (Twilio Access Tokens use HS256 with API Key Secret) ----
function base64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function signJwt(payload: Record<string, unknown>, secret: string, header: Record<string, unknown>): Promise<string> {
  const enc = new TextEncoder();
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return `${data}.${base64url(new Uint8Array(sig))}`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Cred presence check — return clear 503 instead of cryptic crash
  const missing: string[] = [];
  if (!TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
  if (!TWILIO_API_KEY_SID) missing.push('TWILIO_API_KEY_SID');
  if (!TWILIO_API_KEY_SECRET) missing.push('TWILIO_API_KEY_SECRET');
  if (!TWILIO_TWIML_APP_SID) missing.push('TWILIO_TWIML_APP_SID');
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({
        error: 'Voice SDK not configured',
        missing_env: missing,
        hint: 'Create Twilio API Key + TwiML App, then set these as Supabase secrets.',
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Resolve calling user from Supabase JWT
    const auth = req.headers.get('authorization') ?? '';
    const jwt = auth.replace(/^Bearer\s+/i, '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing bearer token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: userResp, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userResp?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userResp.user;

    // Confirm workspace role
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, workspace_role, agent_extension')
      .eq('id', user.id)
      .maybeSingle();
    if (profileErr) {
      return new Response(JSON.stringify({ error: 'Profile lookup failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const isAdmin = ['admin@hub.nfstay.com', 'hugo@nfstay.com'].includes(user.email ?? '');
    const role = profile?.workspace_role;
    if (!isAdmin && role !== 'agent' && role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Not a workspace agent' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PR 143 (Hugo 2026-04-28): suffix the identity with a per-tab session
    // UUID so multiple tabs of the same user don't collide at the gateway.
    //
    // Twilio's documented behaviour: a new client registering with an
    // existing identity evicts the older one (`error 31005 HANGUP`).
    // Hugo had ~30 tabs open including several hub.nfstay.com ones — every
    // tab's voice-token refresh re-asserted `identity = user.id`, evicting
    // the previously-active tab. Calls dropped mid-ring with repeated
    // 31005 errors.
    //
    // New scheme: identity = `${user.id}:${sessionId}` where sessionId is
    // a fresh UUID per token mint. Each tab is its own gateway client, no
    // collisions. We UPSERT (user_id, session_id) into wk_voice_sessions
    // so wk-voice-twiml-incoming and wk-voice-twiml-outgoing can dial the
    // most recent session.
    const sessionId = crypto.randomUUID();
    const identity = `${user.id}:${sessionId}`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upErr } = await (supabase.from('wk_voice_sessions' as any) as any)
        .upsert(
          {
            user_id: user.id,
            session_id: sessionId,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      if (upErr) {
        console.warn('[wk-voice-token] wk_voice_sessions upsert failed:', upErr.message);
      }
    } catch (e) {
      console.warn('[wk-voice-token] wk_voice_sessions upsert threw:', e);
    }

    const now = Math.floor(Date.now() / 1000);

    // Twilio Access Token JWT format (per Twilio docs)
    const header = { alg: 'HS256', typ: 'JWT', cty: 'twilio-fpa;v=1' };
    const payload = {
      jti: `${TWILIO_API_KEY_SID}-${now}`,
      iss: TWILIO_API_KEY_SID,
      sub: TWILIO_ACCOUNT_SID,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
      grants: {
        identity,
        voice: {
          incoming: { allow: true },
          outgoing: { application_sid: TWILIO_TWIML_APP_SID },
        },
      },
    };
    const token = await signJwt(payload, TWILIO_API_KEY_SECRET, header);

    return new Response(
      JSON.stringify({
        token,
        identity,
        ttl_seconds: TOKEN_TTL_SECONDS,
        extension: profile?.agent_extension ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('wk-voice-token error', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
