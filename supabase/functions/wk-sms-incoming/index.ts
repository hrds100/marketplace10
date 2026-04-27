// wk-sms-incoming — inbound SMS webhook for /crm. PR 50, Hugo 2026-04-27.
//
// REPLACES sms-webhook-incoming for the CRM path. The legacy fn lived
// inside the /sms module, did 8+ DB ops per message, and had been
// patched ten times without fixing the symptom: inbound messages
// didn't surface in /crm/inbox.
//
// This rewrite does ONE thing:
//
//   1. Validate Twilio HMAC-SHA1 signature (when env is present)
//   2. Find or create a wk_contacts row for the From number
//   3. Insert a wk_sms_messages row (idempotent on twilio_sid)
//   4. Return empty TwiML
//
// No opt-out logic, no automation triggers, no conversation table,
// no sms_contacts bridge. Those concerns can be added back as
// separate, independent features once the receive path is rock-solid.
//
// Twilio Console config:
//   Phone Number → Messaging → A MESSAGE COMES IN
//   Webhook: https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/wk-sms-incoming
//   Method: HTTP POST
//
// Authentication:
//   Twilio signs every webhook with HMAC-SHA1 of (URL + sorted form
//   params) keyed on Account Auth Token. We validate that signature
//   when both TWILIO_AUTH_TOKEN and X-Twilio-Signature are present.
//   Missing-env / missing-header cases are accepted with a warn log,
//   so Hugo can curl-test without setting up signing.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-twilio-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TWIML_OK = '<?xml version="1.0" encoding="UTF-8"?><Response/>';

async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) data += k + params[k];
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return signature === expected;
}

// Build the canonical phone variants Twilio might send vs what we
// might already have in wk_contacts.phone. We INSERT into wk_contacts
// using strict E.164 (with leading +). Lookup is by either format.
function phoneVariants(raw: string): { e164: string; digits: string; variants: string[] } {
  const trimmed = raw.replace(/^whatsapp:/, '').trim();
  const digits = trimmed.replace(/[^0-9]/g, '');
  const e164 = trimmed.startsWith('+') ? trimmed : `+${digits}`;
  const variants = Array.from(new Set([trimmed, e164, digits].filter(Boolean)));
  return { e164, digits, variants };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((v, k) => { params[k] = v.toString(); });

    const messageSid = params.MessageSid ?? '';
    const rawFrom = params.From ?? '';
    const rawTo = params.To ?? '';
    const body = params.Body ?? '';
    const numMedia = parseInt(params.NumMedia ?? '0', 10) || 0;

    // Diagnostic log on every entry — Hugo's pain point is silent
    // failure. If this log doesn't show up in Supabase Functions logs
    // when an SMS arrives, the webhook URL on Twilio Console is wrong.
    console.log(
      `[wk-sms-incoming] inbound sid=${messageSid} from=${rawFrom} to=${rawTo} bodyLen=${body.length} media=${numMedia}`,
    );

    if (!rawFrom || !messageSid) {
      console.warn('[wk-sms-incoming] missing From or MessageSid — rejecting');
      return new Response(TWIML_OK, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    // Signature validation. We use the canonical public URL Twilio
    // computed against — req.url returns the proxied internal URL
    // inside Edge Functions, which won't match the signature.
    const sig = req.headers.get('x-twilio-signature') ?? '';
    const publicUrl = `${SUPABASE_URL}/functions/v1/wk-sms-incoming`;

    if (TWILIO_AUTH_TOKEN && sig) {
      const ok = await validateTwilioSignature(TWILIO_AUTH_TOKEN, sig, publicUrl, params);
      if (!ok) {
        console.error(
          `[wk-sms-incoming] INVALID SIGNATURE — url=${publicUrl} authTokenLen=${TWILIO_AUTH_TOKEN.length}. Cause: env TWILIO_AUTH_TOKEN doesn't match the Twilio account that signed the request. Check Supabase Edge Function secrets vs Twilio Console > Account > Auth Token.`,
        );
        // Return 200 anyway so Twilio stops retrying — but the message
        // is dropped. We've logged loudly so Hugo can see it.
        return new Response(TWIML_OK, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        });
      }
    } else if (!TWILIO_AUTH_TOKEN) {
      console.warn('[wk-sms-incoming] TWILIO_AUTH_TOKEN is empty — accepting unverified');
    } else {
      console.warn('[wk-sms-incoming] no x-twilio-signature header — accepting');
    }

    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { e164: fromE164, variants: fromVariants } = phoneVariants(rawFrom);
    const { e164: toE164 } = phoneVariants(rawTo);

    // 1. Find or create wk_contacts row for this caller.
    //    We look up by ANY phone variant Twilio might match against
    //    historical entries (some legacy rows have no leading '+').
    //    On insert we always store the strict E.164 form.
    let contactId: string | null = null;
    {
      const { data: existing } = await supa
        .from('wk_contacts')
        .select('id')
        .in('phone', fromVariants)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        contactId = existing.id as string;
      } else {
        // Insert with permissive defaults — the agent can rename + assign
        // pipeline + owner from /crm/contacts later.
        const { data: inserted, error: insErr } = await supa
          .from('wk_contacts')
          .insert({
            name: fromE164,
            phone: fromE164,
            owner_agent_id: null,
            pipeline_column_id: null,
            custom_fields: {
              source: 'inbound_sms',
              first_message_sid: messageSid,
            },
            is_hot: false,
          })
          .select('id')
          .single();

        if (insErr || !inserted?.id) {
          console.error('[wk-sms-incoming] wk_contacts insert failed', insErr);
          return new Response(TWIML_OK, {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          });
        }
        contactId = inserted.id as string;
        console.log(`[wk-sms-incoming] created wk_contact ${contactId} for ${fromE164}`);
      }
    }

    // 2. Collect media URLs from MediaUrl0..MediaUrl{numMedia-1}.
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const u = params[`MediaUrl${i}`];
      if (u) mediaUrls.push(u);
    }

    // 3. Insert the message — idempotent on twilio_sid (UNIQUE).
    //    The unique index causes duplicate webhooks to fail the insert
    //    with code 23505; we treat that as success.
    const { error: msgErr } = await supa
      .from('wk_sms_messages')
      .insert({
        contact_id: contactId,
        direction: 'inbound',
        body,
        twilio_sid: messageSid,
        from_e164: fromE164,
        to_e164: toE164 || null,
        media_urls: mediaUrls,
        status: 'received',
      });

    if (msgErr) {
      // Postgres unique violation = duplicate webhook delivery, fine.
      // Anything else = real problem; log and move on (Twilio will
      // retry on 5xx; we want to avoid that since the table state is
      // unknown).
      const code = (msgErr as { code?: string }).code;
      if (code === '23505') {
        console.log(`[wk-sms-incoming] duplicate sid=${messageSid} — idempotent skip`);
      } else {
        console.error('[wk-sms-incoming] wk_sms_messages insert failed', msgErr);
      }
    } else {
      console.log(
        `[wk-sms-incoming] saved message contact=${contactId} sid=${messageSid} bodyLen=${body.length}`,
      );
    }

    // 4. Bump wk_contacts.last_contact_at so the inbox sort is correct
    //    even if a thread has only inbound messages.
    await supa
      .from('wk_contacts')
      .update({ last_contact_at: new Date().toISOString() })
      .eq('id', contactId);

    // Empty TwiML — no auto-reply.
    return new Response(TWIML_OK, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });
  } catch (e) {
    console.error('[wk-sms-incoming] threw', e);
    // Always 200 so Twilio doesn't retry an event we can't process.
    return new Response(TWIML_OK, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });
  }
});
