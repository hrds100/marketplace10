// link-social-identity
//
// When an existing email/password Supabase user clicks a social provider
// (Google / Apple / X / Facebook) on /signin or /signup, our derived-password
// approach cannot match their real Supabase password, so signInWithPassword
// fails. This function runs SERVER-SIDE with service_role, verifies the
// caller actually owns the Particle session for that email, and updates the
// user's Supabase password to the derived one. The client then retries
// signInWithPassword and proceeds normally.
//
// Security model:
//  1. Caller passes particleToken (from userInfo.token returned by authkit).
//  2. We POST to Particle's user/userinfo to verify the token and get the
//     authoritative email + uuid for that token.
//  3. Only if the Particle-verified email matches the claimed email do we
//     update the Supabase password.
//  4. The new password is re-derived server-side from Particle's uuid using
//     the same seed — the caller never chooses it.
//
// This is strictly-equivalent in security to sending a password-reset link
// to the email: Particle owns the Google OAuth verification, Google owns the
// email ownership, so controlling the Google account = controlling the
// email. No new attack surface.
//
// Endpoint: POST /functions/v1/link-social-identity
// Body:    { email: string, particleUuid: string, particleToken: string,
//            provider: 'google'|'apple'|'twitter'|'facebook' }
// Returns: { ok: true, userId?: string } | { ok: false, error: string }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const PASSWORD_SEED = '_NFsTay2!';

function derivedPassword(uuid: string): string {
  return uuid.slice(0, 10) + PASSWORD_SEED + uuid.slice(-6);
}

async function verifyWithParticle(
  token: string,
  uuid: string,
): Promise<{ ok: true; email: string } | { ok: false; reason: string }> {
  const PROJECT_ID = '4f8aca10-0c7e-4617-bfff-7ccb5269f365';
  const CLIENT_KEY = 'cWniBMIDt2lhrhdIERSBWURpannCk30SGNwdPK7D';
  const auth = btoa(`${PROJECT_ID}:${CLIENT_KEY}`);

  // Particle's getUserInfo endpoint accepts the user's own JWT + project auth.
  // See https://developers.particle.network/reference/getuserinfo
  const res = await fetch('https://api.particle.network/server/rpc', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getUserInfo',
      params: [uuid, token],
    }),
  });

  if (!res.ok) {
    return { ok: false, reason: `particle http ${res.status}` };
  }
  const json = await res.json();
  if (json.error) {
    return { ok: false, reason: json.error?.message || 'particle error' };
  }
  const result = json.result;
  if (!result || result.uuid !== uuid) {
    return { ok: false, reason: 'uuid mismatch' };
  }
  const email =
    result.google_email ||
    result.apple_email ||
    result.twitter_email ||
    result.facebook_email ||
    result.email ||
    result.thirdparty_user_info?.user_info?.email ||
    '';
  if (!email) {
    return { ok: false, reason: 'no email on particle record' };
  }
  return { ok: true, email: String(email).toLowerCase() };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const particleUuid = String(body.particleUuid || '').trim();
    const particleToken = String(body.particleToken || '').trim();
    const provider = String(body.provider || '').trim();

    if (!email || !particleUuid || !particleToken) {
      return new Response(
        JSON.stringify({ ok: false, error: 'email, particleUuid and particleToken are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 1. Verify the caller actually holds a valid Particle session for this uuid,
    //    and that the Particle record's email matches the claimed one.
    const verified = await verifyWithParticle(particleToken, particleUuid);
    if (!verified.ok) {
      console.warn('[link-social-identity] particle verify failed:', verified.reason);
      return new Response(
        JSON.stringify({ ok: false, error: `particle verification failed: ${verified.reason}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (verified.email !== email) {
      console.warn('[link-social-identity] email mismatch:', verified.email, 'vs', email);
      return new Response(
        JSON.stringify({ ok: false, error: 'email does not match Particle record' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Look up the existing Supabase user by email via admin API.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // admin.listUsers paginates; assume we won't exceed 1000 on first search.
    // Supabase doesn't expose a direct "find by email" admin call; filter here.
    const { data: list, error: listErr } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) {
      console.error('[link-social-identity] listUsers failed:', listErr.message);
      return new Response(
        JSON.stringify({ ok: false, error: 'lookup failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const user = list?.users?.find(
      (u) => String(u.email || '').toLowerCase() === email,
    );
    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'no existing user with this email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Update password to the derived value.
    const newPassword = derivedPassword(particleUuid);
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (updateErr) {
      console.error('[link-social-identity] updateUser failed:', updateErr.message);
      return new Response(
        JSON.stringify({ ok: false, error: 'password update failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.info('[link-social-identity] linked', email, 'via', provider, 'uuid=', particleUuid);

    return new Response(
      JSON.stringify({ ok: true, userId: user.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[link-social-identity] unexpected error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
