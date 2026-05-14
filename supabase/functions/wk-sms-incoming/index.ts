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
    const { e164: toE164, variants: toVariants } = phoneVariants(rawTo);

    // ---- ROUTING DECISION (Hugo 2026-05-14) ----
    // The number can be registered in /sms (sms_contacts), /crm
    // (wk_contacts), both, or neither. Inbound mirrors to wherever the
    // contact lives so the reply shows up in the relevant inbox:
    //   • only in sms_contacts → write to /sms tables only (skip /crm)
    //   • only in wk_contacts  → write to /crm tables only (current behaviour)
    //   • in both              → write to BOTH
    //   • in neither           → default to /crm (so the message isn't lost)
    // Each pipeline owns its own automation trigger independently —
    // /sms fires sms-automation-run if its conversation has automation
    // enabled. /crm's AI flow runs as before.

    const { data: smsContactRow } = await supa
      .from('sms_contacts')
      .select('id, phone_number, opted_out')
      .in('phone_number', fromVariants)
      .limit(1)
      .maybeSingle();

    const { data: wkContactRow } = await supa
      .from('wk_contacts')
      .select('id')
      .in('phone', fromVariants)
      .limit(1)
      .maybeSingle();

    const inSms = !!smsContactRow?.id;
    const inWk = !!wkContactRow?.id;
    // Write to /crm if the contact is already registered there OR if it's
    // registered nowhere (default destination). Skip /crm when the contact
    // is /sms-only.
    const writeToWk = inWk || !inSms;
    const writeToSms = inSms;

    console.log(
      `[wk-sms-incoming] routing decision from=${fromE164} inSms=${inSms} inWk=${inWk} writeToWk=${writeToWk} writeToSms=${writeToSms}`,
    );

    // ---- Collect media URLs (used by both pipelines) ----
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const u = params[`MediaUrl${i}`];
      if (u) mediaUrls.push(u);
    }

    // ==========================================================
    // PATH A: /crm pipeline (wk_*) — original behaviour
    // ==========================================================
    let contactId: string | null = wkContactRow?.id ?? null;

    if (writeToWk) {
      // 1. Find or create wk_contacts row for this caller.
      if (!contactId) {
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
        } else {
          contactId = inserted.id as string;
          console.log(`[wk-sms-incoming] created wk_contact ${contactId} for ${fromE164}`);
        }
      }

      // 2. Insert wk_sms_messages — idempotent on twilio_sid (UNIQUE).
      if (contactId) {
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
          const code = (msgErr as { code?: string }).code;
          if (code === '23505') {
            console.log(`[wk-sms-incoming] /crm duplicate sid=${messageSid} — idempotent skip`);
          } else {
            console.error('[wk-sms-incoming] wk_sms_messages insert failed', msgErr);
          }
        } else {
          console.log(
            `[wk-sms-incoming] /crm saved contact=${contactId} sid=${messageSid} bodyLen=${body.length}`,
          );
        }

        // 3. Bump wk_contacts.last_contact_at.
        await supa
          .from('wk_contacts')
          .update({ last_contact_at: new Date().toISOString() })
          .eq('id', contactId);
      }
    } else {
      console.log(`[wk-sms-incoming] skipping /crm write — contact is /sms-only`);
    }

    // ==========================================================
    // PATH B: /sms pipeline (sms_*) — mirror to legacy when the
    // sender is registered in sms_contacts. This is what surfaces
    // the message in /sms/inbox and lets sms-automation-run pick
    // up the reply for an active automation.
    // ==========================================================
    if (writeToSms && smsContactRow?.id) {
      const smsContactId = smsContactRow.id as string;
      const isOptedOut = !!(smsContactRow as { opted_out?: boolean }).opted_out;

      // Find the sms_numbers row for the *to* address (the number that
      // received the SMS) so we can stamp number_id on the conversation.
      const { data: numberRow } = await supa
        .from('sms_numbers')
        .select('id, channel')
        .in('phone_number', toVariants)
        .limit(1)
        .maybeSingle();

      const numberId = (numberRow as { id?: string } | null)?.id ?? null;
      const channel = (numberRow as { channel?: string } | null)?.channel ?? 'sms';

      // 1. Idempotency — skip if this sid already landed in sms_messages.
      const { data: dupe } = await supa
        .from('sms_messages')
        .select('id')
        .eq('twilio_sid', messageSid)
        .maybeSingle();

      let smsMessageId: string | null = (dupe as { id?: string } | null)?.id ?? null;

      if (!smsMessageId) {
        const { data: smsMsg, error: smsMsgErr } = await supa
          .from('sms_messages')
          .insert({
            twilio_sid: messageSid,
            from_number: fromE164,
            to_number: toE164 || null,
            body,
            direction: 'inbound',
            status: 'received',
            media_urls: mediaUrls,
            number_id: numberId,
            contact_id: smsContactId,
            channel,
          })
          .select('id')
          .single();

        if (smsMsgErr) {
          const code = (smsMsgErr as { code?: string }).code;
          if (code === '23505') {
            console.log(`[wk-sms-incoming] /sms duplicate sid=${messageSid} — idempotent skip`);
          } else {
            console.error('[wk-sms-incoming] sms_messages insert failed', smsMsgErr);
          }
        } else {
          smsMessageId = (smsMsg as { id: string }).id;
          console.log(`[wk-sms-incoming] /sms saved sid=${messageSid} contact=${smsContactId}`);
        }
      }

      // 2. Mark contact as responded.
      await supa
        .from('sms_contacts')
        .update({ response_status: 'responded', updated_at: new Date().toISOString() })
        .eq('id', smsContactId);

      // 3. Upsert sms_conversations so /sms/inbox shows it.
      if (numberId) {
        const preview = body.length > 100 ? body.substring(0, 100) + '...' : body;

        const { data: existingConv } = await supa
          .from('sms_conversations')
          .select('id, automation_id, automation_enabled, unread_count')
          .eq('contact_id', smsContactId)
          .eq('number_id', numberId)
          .eq('channel', channel)
          .maybeSingle();

        let convId: string | null = (existingConv as { id?: string } | null)?.id ?? null;
        let automationId: string | null = (existingConv as { automation_id?: string | null } | null)?.automation_id ?? null;
        let automationEnabled = !!(existingConv as { automation_enabled?: boolean } | null)?.automation_enabled;

        if (existingConv) {
          await supa
            .from('sms_conversations')
            .update({
              last_message_at: new Date().toISOString(),
              last_message_preview: preview,
              unread_count: ((existingConv as { unread_count?: number }).unread_count ?? 0) + 1,
              is_archived: false,
            })
            .eq('id', convId!);
        } else {
          // Try to auto-attach an active 'new_message' automation, mirroring
          // sms-webhook-incoming's existing behaviour.
          const { data: activeAuto } = await supa
            .from('sms_automations')
            .select('id')
            .eq('is_active', true)
            .eq('trigger_type', 'new_message')
            .limit(1)
            .maybeSingle();

          if (activeAuto) {
            automationId = (activeAuto as { id: string }).id;
            automationEnabled = true;
          }

          const { data: newConv } = await supa
            .from('sms_conversations')
            .insert({
              contact_id: smsContactId,
              number_id: numberId,
              channel,
              last_message_at: new Date().toISOString(),
              last_message_preview: preview,
              unread_count: 1,
              automation_id: automationId,
              automation_enabled: automationEnabled,
            })
            .select('id')
            .single();
          convId = (newConv as { id?: string } | null)?.id ?? null;
        }

        // 4. Trigger sms-automation-run if this conversation has an
        //    active automation. Fire-and-forget, mirrors what
        //    sms-webhook-incoming does. Skip if opted-out.
        if (convId && smsMessageId && automationEnabled && automationId && !isOptedOut) {
          const runUrl = `${SUPABASE_URL}/functions/v1/sms-automation-run`;
          fetch(runUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({
              message_id: smsMessageId,
              conversation_id: convId,
              contact_id: smsContactId,
              from_number: fromE164,
              to_number: toE164,
              body,
              number_id: numberId,
            }),
          }).catch((err) => console.error('[wk-sms-incoming] sms-automation-run trigger failed:', err));
          console.log(`[wk-sms-incoming] /sms automation triggered conv=${convId} auto=${automationId}`);
        }
      } else {
        console.warn(`[wk-sms-incoming] /sms: no sms_numbers row found for to=${toE164} — message saved but conversation skipped`);
      }
    }

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
