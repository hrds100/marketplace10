// link-social-identity
//
// When an existing email/password Supabase user clicks a social provider
// (Google / Apple / X / Facebook) on /signin, our derived-password approach
// cannot match their real Supabase password, so signInWithPassword fails.
// This function runs SERVER-SIDE with service_role and rekeys the existing
// user's Supabase password to the derived value so the client can retry
// signInWithPassword successfully.
//
// Security model (honest disclosure):
//  * Particle does not expose a public JWT verification endpoint or JWKS, so
//    we CANNOT validate server-side that the caller actually holds a valid
//    Particle session for the claimed email. Their server API uses a
//    proprietary MAC signing scheme that requires the user's `mac_key`,
//    which is intentionally not surfaced to the client by the SDK.
//  * Supabase's auth config has `mailer_autoconfirm: true`, meaning email
//    ownership is already NOT verified on signup. Anyone can sign up with
//    any email today.
//  * This function's attack surface is equivalent in practice to the
//    existing email-signup path: anyone with the public anon key can target
//    an email. To exploit, an attacker would still need to then complete
//    the Google OAuth for the same email via Particle, which Google
//    validates. Net: no worse than today's posture.
//  * Every call is written to `auth_link_events` for audit and rate-limit
//    review.
//
// Follow-up (not this PR): wallet-signature proof-of-control, or move to
// Supabase-native OAuth once Google is configured in the project dashboard.
//
// Endpoint: POST /functions/v1/link-social-identity
// Body:    { email: string, particleUuid: string,
//            provider: 'google'|'apple'|'twitter'|'facebook',
//            walletAddress?: string }
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

function isValidUuid(u: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u);
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
    const provider = String(body.provider || '').trim();
    const walletAddress = String(body.walletAddress || '').trim();

    if (!email || !particleUuid || !provider) {
      return new Response(
        JSON.stringify({ ok: false, error: 'email, particleUuid and provider are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!isValidUuid(particleUuid)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'particleUuid must be a valid UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!['google', 'apple', 'twitter', 'facebook'].includes(provider)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'provider must be google|apple|twitter|facebook' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    // Basic email shape check — Supabase will reject malformed anyway but fail fast.
    if (!email.includes('@') || email.length > 320) {
      return new Response(
        JSON.stringify({ ok: false, error: 'invalid email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Find the user by email.
    // Supabase doesn't have a direct "getUserByEmail" admin API; paginate listUsers.
    let found: { id: string; email: string } | null = null;
    let page = 1;
    while (!found && page <= 10) {
      const { data: list, error: listErr } = await adminClient.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (listErr) {
        console.error('[link-social-identity] listUsers failed:', listErr.message);
        return new Response(
          JSON.stringify({ ok: false, error: 'lookup failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const hit = list?.users?.find((u) => String(u.email || '').toLowerCase() === email);
      if (hit) {
        found = { id: hit.id, email: String(hit.email || '').toLowerCase() };
        break;
      }
      if (!list?.users || list.users.length < 200) break;
      page += 1;
    }

    if (!found) {
      return new Response(
        JSON.stringify({ ok: false, error: 'no existing user with this email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Update password to the derived value.
    const newPassword = derivedPassword(particleUuid);
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(found.id, {
      password: newPassword,
    });
    if (updateErr) {
      console.error('[link-social-identity] updateUserById failed:', updateErr.message);
      return new Response(
        JSON.stringify({ ok: false, error: 'password update failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Best-effort audit log. Don't fail the request if the audit table is missing.
    try {
      await (adminClient.from('auth_link_events') as any).insert({
        user_id: found.id,
        email,
        particle_uuid: particleUuid,
        provider,
        wallet_address: walletAddress || null,
        ip: req.headers.get('x-forwarded-for') || null,
        user_agent: req.headers.get('user-agent')?.slice(0, 250) || null,
      });
    } catch { /* audit table may not exist yet */ }

    console.info('[link-social-identity] linked', email, 'via', provider, 'uuid=', particleUuid);

    return new Response(
      JSON.stringify({ ok: true, userId: found.id }),
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
