// wa-webhook-incoming — receives inbound WhatsApp messages from Meta Cloud API
// Handles GET (webhook verification) and POST (messages + status updates)
// Source of truth: supabase/config.toml (verify_jwt = false)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;
const META_VERIFY_TOKEN = Deno.env.get('META_VERIFY_TOKEN')!;

const OPT_OUT_KEYWORDS = ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'];

const headers = {
  'Content-Type': 'application/json',
};

// Verify Meta webhook signature (HMAC-SHA256)
async function verifySignature(secret: string, signature: string, body: string): Promise<boolean> {
  if (!signature || !signature.startsWith('sha256=')) return false;
  const expected = signature.slice(7); // remove "sha256=" prefix

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === expected;
}

serve(async (req: Request) => {
  // ---- GET — Meta webhook verification ----
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
      console.log('Webhook verification successful');
      return new Response(challenge || '', { status: 200 });
    }

    console.error('Webhook verification failed — token mismatch');
    return new Response('Forbidden', { status: 403 });
  }

  // ---- POST — incoming messages and status updates ----
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers });
  }

  try {
    const rawBody = await req.text();

    // Verify webhook signature
    const signature = req.headers.get('x-hub-signature-256') || '';
    if (META_APP_SECRET && signature) {
      const valid = await verifySignature(META_APP_SECRET, signature, rawBody);
      if (!valid) {
        console.error('Invalid Meta webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 403, headers });
      }
    }

    const payload = JSON.parse(rawBody);

    // Meta requires 200 within 20s — process quickly
    if (payload.object !== 'whatsapp_business_account') {
      return new Response('OK', { status: 200, headers });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        const value = change.value;

        // ---- PROCESS STATUS UPDATES ----
        if (value.statuses) {
          for (const status of value.statuses) {
            const wamid = status.id;
            const newStatus = status.status; // sent, delivered, read, failed

            const { error: statusErr } = await supabase
              .from('sms_messages')
              .update({ status: newStatus })
              .eq('twilio_sid', wamid);

            if (statusErr) {
              console.error(`Failed to update status for ${wamid}:`, statusErr);
            } else {
              console.log(`Status update: ${wamid} → ${newStatus}`);
            }
          }
        }

        // ---- PROCESS INCOMING MESSAGES ----
        if (value.messages) {
          const metadata = value.metadata || {};
          const phoneNumberId = metadata.phone_number_id || '';
          const displayPhoneNumber = metadata.display_phone_number || '';
          // Our number in E.164 — build from display_phone_number
          const ourNumber = displayPhoneNumber ? `+${displayPhoneNumber}` : '';

          for (const msg of value.messages) {
            const wamid = msg.id;
            const senderWaId = msg.from; // digits only, e.g. "447863992555"
            const senderE164 = `+${senderWaId}`;
            const msgType = msg.type; // text, image, document, etc.
            const msgBody = msg.text?.body || '';
            const contactName = value.contacts?.[0]?.profile?.name || '';

            // ---- IDEMPOTENCY CHECK ----
            const { data: existingMsg } = await supabase
              .from('sms_messages')
              .select('id')
              .eq('twilio_sid', wamid)
              .maybeSingle();

            if (existingMsg) {
              console.log(`Duplicate webhook for ${wamid}, skipping`);
              continue;
            }

            // ---- OPT-OUT CHECK ----
            const bodyLower = msgBody.trim().toLowerCase();
            if (OPT_OUT_KEYWORDS.includes(bodyLower)) {
              await supabase.from('sms_opt_outs').upsert(
                { phone_number: senderE164, reason: 'keyword_stop' },
                { onConflict: 'phone_number' }
              );

              await supabase
                .from('sms_contacts')
                .update({ opted_out: true, updated_at: new Date().toISOString() })
                .eq('phone_number', senderE164);

              console.log(`Opt-out processed for ${senderE164}`);
              continue;
            }

            // ---- FIND OR CREATE CONTACT ----
            let { data: contact } = await supabase
              .from('sms_contacts')
              .select('id, phone_number, display_name, opted_out')
              .eq('phone_number', senderE164)
              .maybeSingle();

            if (!contact) {
              const { data: newContact, error: contactErr } = await supabase
                .from('sms_contacts')
                .insert({
                  phone_number: senderE164,
                  display_name: contactName || null,
                })
                .select('id, phone_number, display_name, opted_out')
                .single();

              if (contactErr) {
                console.error('Error creating contact:', contactErr);
                continue;
              }
              contact = newContact;
            } else if (contactName && !contact.display_name) {
              // Update display name from WhatsApp profile if we don't have one
              await supabase
                .from('sms_contacts')
                .update({ display_name: contactName })
                .eq('id', contact.id);
            }

            // ---- FIND OUR NUMBER ----
            // Match by twilio_sid column which stores phone_number_id for WhatsApp numbers
            let { data: ourNumberRow } = await supabase
              .from('sms_numbers')
              .select('id')
              .eq('twilio_sid', phoneNumberId)
              .eq('channel', 'whatsapp')
              .maybeSingle();

            // Fallback: match by phone number
            if (!ourNumberRow && ourNumber) {
              const { data: fallback } = await supabase
                .from('sms_numbers')
                .select('id')
                .eq('phone_number', ourNumber)
                .eq('channel', 'whatsapp')
                .maybeSingle();
              ourNumberRow = fallback;
            }

            const numberId = ourNumberRow?.id || null;

            // ---- INSERT MESSAGE ----
            const { data: message, error: msgErr } = await supabase
              .from('sms_messages')
              .insert({
                twilio_sid: wamid,
                from_number: senderE164,
                to_number: ourNumber,
                body: msgBody,
                direction: 'inbound',
                status: 'received',
                number_id: numberId,
                contact_id: contact.id,
                channel: 'whatsapp',
              })
              .select('id')
              .single();

            if (msgErr) {
              console.error('Error inserting message:', msgErr);
              continue;
            }

            // ---- UPSERT CONVERSATION ----
            const preview = msgBody.length > 100 ? msgBody.substring(0, 100) + '...' : msgBody;

            if (numberId) {
              const { data: existingConv } = await supabase
                .from('sms_conversations')
                .select('id, unread_count')
                .eq('contact_id', contact.id)
                .eq('number_id', numberId)
                .eq('channel', 'whatsapp')
                .maybeSingle();

              if (existingConv) {
                await supabase
                  .from('sms_conversations')
                  .update({
                    last_message_at: new Date().toISOString(),
                    last_message_preview: preview,
                    unread_count: existingConv.unread_count + 1,
                    is_archived: false,
                  })
                  .eq('id', existingConv.id);
              } else {
                await supabase
                  .from('sms_conversations')
                  .insert({
                    contact_id: contact.id,
                    number_id: numberId,
                    channel: 'whatsapp',
                    last_message_at: new Date().toISOString(),
                    last_message_preview: preview,
                    unread_count: 1,
                  });
              }
            }

            console.log(`Inbound WhatsApp from ${senderE164}: "${msgBody.substring(0, 50)}..." → message ${message.id}`);

            // ---- TRIGGER AUTOMATION ----
            try {
              if (numberId) {
                const { data: conv } = await supabase
                  .from('sms_conversations')
                  .select('id, automation_id, automation_enabled')
                  .eq('contact_id', contact.id)
                  .eq('number_id', numberId)
                  .maybeSingle();

                if (conv && conv.automation_enabled && conv.automation_id) {
                  const automationUrl = `${SUPABASE_URL}/functions/v1/sms-automation-run`;
                  fetch(automationUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    },
                    body: JSON.stringify({
                      message_id: message.id,
                      conversation_id: conv.id,
                      contact_id: contact.id,
                      from_number: senderE164,
                      to_number: ourNumber,
                      body: msgBody,
                      number_id: numberId,
                    }),
                  }).catch((err) => console.error('Automation trigger error:', err));
                }
              }
            } catch (automationErr) {
              console.error('Failed to trigger automations:', automationErr);
            }
          }
        }
      }
    }

    // Always return 200 — Meta retries aggressively on non-200
    return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers });
  } catch (err) {
    console.error('wa-webhook-incoming error:', err);
    // Still return 200 to prevent Meta retries on parse errors
    return new Response(JSON.stringify({ status: 'error' }), { status: 200, headers });
  }
});
