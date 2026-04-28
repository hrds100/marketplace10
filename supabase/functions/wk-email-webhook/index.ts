// wk-email-webhook — inbound email webhook from Resend.
// PR 62 (multi-channel PR 3), Hugo 2026-04-27.
//
// Public endpoint (verify_jwt = false). Resend posts here on email.received.
// MX records for mail.nfstay.com (Resend EU region, verified 2026-04-27)
// point at Resend so inbound CRM email lands in this handler.
// Earlier plan (PR 60) was to use inbox.nfstay.com — superseded by
// mail.nfstay.com once Hugo confirmed EU-region verification.
//
// PR 102 (Hugo 2026-04-28): Resend's INBOUND email.received webhooks
// DO include the full body (html + text + headers) in the payload.
// The `GET /emails/{id}` endpoint is OUTBOUND-only — for inbound IDs it
// returns 404. Earlier code always fetched, got 404, dropped the
// message. Now we use payload fields directly. Outbound delivery
// events still land here (email.bounced, email.delivered) but we
// only persist email.received.
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
  // PR 102: Resend's email.received payload carries the full email
  // inline. Fields below cover both the documented shape and minor
  // variations seen in production (string vs object addresses,
  // headers as array vs map).
  data?: {
    email_id?: string;
    id?: string;
    from?: string | { address?: string; name?: string };
    to?: Array<string | { address?: string; name?: string }>;
    subject?: string;
    html?: string;
    text?: string;
    headers?: Array<{ name?: string; value?: string }> | Record<string, string>;
    created_at?: string;
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
      // PR 100 (Hugo 2026-04-28): was returning 200 here so Resend wouldn't
      // retry. That meant any inbound email that arrived during a secret-
      // mismatch window was silently lost forever (Hugo's reply on
      // 2026-04-28 was lost this way). Now returns 401 so Resend retries
      // with backoff while we fix the secret. Resend caps retries at a few
      // attempts over hours; if the secret stays broken past that, it'll
      // dead-letter — which is still correct behaviour for a sustained
      // misconfiguration.
      return new Response(
        JSON.stringify({ error: 'invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
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

  const d = event.data ?? {};
  // Resend has used both `email_id` and `id` for the inbound email
  // identifier. Either is fine — we just need it for idempotency.
  const emailId = d.email_id || d.id || '';
  if (!emailId) {
    console.warn('[wk-email-webhook] missing email_id in event payload');
    return ok({ note: 'no email_id' });
  }

  // PR 102: extract from/to/subject/body from the payload directly.
  // Earlier code did a GET /emails/{id} which is outbound-only —
  // returned 404 for inbound IDs and dropped every inbound message.
  const fromRaw = d.from;
  const fromAddr =
    typeof fromRaw === 'string'
      ? fromRaw
      : (fromRaw?.address ?? '');
  const fromName =
    typeof fromRaw === 'string' ? '' : (fromRaw?.name ?? '');

  let toAddr = '';
  if (Array.isArray(d.to) && d.to.length > 0) {
    const first = d.to[0];
    toAddr = typeof first === 'string' ? first : (first?.address ?? '');
  }

  const fromEmail = fromAddr.toLowerCase().trim();
  if (!fromEmail) {
    console.warn('[wk-email-webhook] missing from address in payload', JSON.stringify(d).slice(0, 300));
    return ok({ note: 'no from' });
  }

  const subject = d.subject ?? '';
  const html = d.html ?? '';
  const text = d.text ?? '';
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
