// wk-email-webhook — inbound email webhook from Resend.
// PR 62 (multi-channel PR 3), Hugo 2026-04-27.
//
// Public endpoint (verify_jwt = false). Resend posts here on email.received
// after MX records for inbox.nfstay.com are pointed at Resend.
//
// IMPORTANT: Resend webhook payloads contain METADATA only — no body.
// We must follow up with GET /emails/{id} to fetch html + text.
// Adds ~200ms per inbound email; acceptable.
//
// Signature verification — Svix HMAC-SHA256 over the raw request body:
//   svix-id          → event id
//   svix-timestamp   → ISO 8601
//   svix-signature   → "v1,<base64-sig>" (or comma-list of versions)
//   secret           → from wk_channel_credentials (provider='resend')
//                       or RESEND_WEBHOOK_SECRET env
//   sig_basis        = svix-id + "." + svix-timestamp + "." + raw-body
//
// We verify against the raw body, not parsed JSON, because Svix signs
// the exact bytes Resend sent.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_WEBHOOK_SECRET_ENV = Deno.env.get('RESEND_WEBHOOK_SECRET') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ok = (payload: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ ok: true, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface ResendInboundEvent {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: { address?: string; name?: string };
    to?: Array<{ address?: string }>;
    subject?: string;
  };
}

interface ResendFullEmail {
  id?: string;
  from?: string | { address?: string; name?: string };
  to?: string[] | Array<{ address?: string }>;
  subject?: string;
  html?: string;
  text?: string;
  created_at?: string;
}

async function loadWebhookSecret(supa: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await supa
    .from('wk_channel_credentials')
    .select('secret')
    .eq('provider', 'resend')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const dbKey = (data as { secret?: string } | null)?.secret ?? '';
  return dbKey || RESEND_WEBHOOK_SECRET_ENV;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifySvixSignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  rawBody: string,
): Promise<boolean> {
  if (!secret || !svixId || !svixTimestamp || !svixSignature) return false;

  // Svix secrets often arrive prefixed with "whsec_" — strip if present
  // and base64-decode. If decoding fails (custom plain string secret),
  // fall back to using the secret as raw bytes.
  let keyBytes: Uint8Array;
  const cleaned = secret.replace(/^whsec_/, '');
  try {
    const bin = atob(cleaned);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    keyBytes = bytes;
  } catch {
    keyBytes = new TextEncoder().encode(secret);
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const data = new TextEncoder().encode(`${svixId}.${svixTimestamp}.${rawBody}`);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data);
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // svixSignature header may be "v1,sig1 v1,sig2" (space-separated),
  // each entry is "<version>,<base64-sig>". Match any.
  const tokens = svixSignature.split(/\s+/);
  for (const tok of tokens) {
    const [, sigPart] = tok.split(',');
    if (!sigPart) continue;
    const a = new TextEncoder().encode(sigPart);
    const b = new TextEncoder().encode(expected);
    if (timingSafeEqual(a, b)) return true;
  }
  return false;
}

async function findOrCreateContact(
  supa: ReturnType<typeof createClient>,
  email: string,
  contactName: string,
  firstEmailId: string,
): Promise<string | null> {
  const { data: existing } = await supa
    .from('wk_contacts')
    .select('id')
    .eq('email', email)
    .limit(1)
    .maybeSingle();
  if ((existing as { id?: string } | null)?.id) {
    return (existing as { id: string }).id;
  }

  const { data: inserted, error: insErr } = await supa
    .from('wk_contacts')
    .insert({
      name: contactName || email,
      email,
      phone: `email:${email}`, // wk_contacts.phone is UNIQUE NOT NULL — synthesise a non-conflicting placeholder
      owner_agent_id: null,
      pipeline_column_id: null,
      custom_fields: {
        source: 'inbound_email',
        first_email_id: firstEmailId,
      },
      is_hot: false,
    })
    .select('id')
    .single();

  if (insErr || !(inserted as { id?: string } | null)?.id) {
    console.error('[wk-email-webhook] wk_contacts insert failed', insErr);
    return null;
  }
  return (inserted as { id: string }).id;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Read raw body once — we need it for signature verification AND for
  // JSON parse. After this point, req.body is consumed.
  const rawBody = await req.text();
  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Signature verification (best-effort — log + drop on mismatch).
  const svixId = req.headers.get('svix-id') ?? '';
  const svixTs = req.headers.get('svix-timestamp') ?? '';
  const svixSig = req.headers.get('svix-signature') ?? '';
  const secret = await loadWebhookSecret(supa);

  if (secret) {
    const valid = await verifySvixSignature(secret, svixId, svixTs, svixSig, rawBody);
    if (!valid) {
      console.error(
        `[wk-email-webhook] INVALID Svix signature — dropping event. svix-id=${svixId} ts=${svixTs}`,
      );
      // Reply 200 so Resend stops retrying — it's a security drop, not
      // a transient failure.
      return ok({ note: 'invalid signature — dropped' });
    }
  } else {
    console.warn('[wk-email-webhook] no webhook secret configured — accepting unverified');
  }

  let event: ResendInboundEvent;
  try {
    event = JSON.parse(rawBody) as ResendInboundEvent;
  } catch {
    return ok({ note: 'invalid json — accepted to stop retries' });
  }

  if (event.type !== 'email.received') {
    console.log(`[wk-email-webhook] ignoring event type=${event.type}`);
    return ok({ note: 'ignored event type' });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    console.warn('[wk-email-webhook] missing email_id in event payload');
    return ok({ note: 'no email_id' });
  }

  // Fetch full email body.
  if (!RESEND_API_KEY) {
    console.error('[wk-email-webhook] RESEND_API_KEY missing — cannot fetch body');
    return ok({ note: 'api key missing' });
  }
  const fetchResp = await fetch(`https://api.resend.com/emails/${emailId}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  if (!fetchResp.ok) {
    const txt = await fetchResp.text();
    console.error('[wk-email-webhook] resend fetch failed', fetchResp.status, txt);
    return ok({ note: 'fetch failed', status: fetchResp.status });
  }
  const full = (await fetchResp.json()) as ResendFullEmail;

  // Normalise from / to fields (Resend has returned both shapes in our testing).
  const fromAddr =
    typeof full.from === 'string'
      ? full.from
      : full.from?.address ?? event.data?.from?.address ?? '';
  const fromName =
    typeof full.from === 'string'
      ? ''
      : full.from?.name ?? event.data?.from?.name ?? '';
  const toAddr = Array.isArray(full.to)
    ? typeof full.to[0] === 'string'
      ? (full.to[0] as string)
      : (full.to[0] as { address?: string })?.address ?? ''
    : event.data?.to?.[0]?.address ?? '';

  const fromEmail = fromAddr.toLowerCase().trim();
  if (!fromEmail) {
    console.warn('[wk-email-webhook] missing from address');
    return ok({ note: 'no from' });
  }

  const subject = full.subject ?? event.data?.subject ?? '';
  const html = full.html ?? '';
  const text = full.text ?? '';
  const bodyText = text || html.replace(/<[^>]+>/g, '');

  const contactId = await findOrCreateContact(supa, fromEmail, fromName, emailId);
  if (!contactId) return ok({ note: 'contact resolution failed' });

  const { error: msgErr } = await supa
    .from('wk_sms_messages')
    .insert({
      contact_id: contactId,
      direction: 'inbound',
      channel: 'email',
      body: bodyText,
      external_id: emailId,
      subject,
      from_e164: fromEmail,
      to_e164: toAddr || null,
      media_urls: [],
      status: 'received',
    });

  if (msgErr) {
    const code = (msgErr as { code?: string }).code;
    if (code === '23505') {
      console.log(`[wk-email-webhook] duplicate email_id=${emailId} — idempotent skip`);
    } else {
      console.error('[wk-email-webhook] insert failed', msgErr);
    }
  } else {
    await supa
      .from('wk_contacts')
      .update({ last_contact_at: new Date().toISOString() })
      .eq('id', contactId);
  }

  return ok({ saved: !msgErr, email_id: emailId });
});
