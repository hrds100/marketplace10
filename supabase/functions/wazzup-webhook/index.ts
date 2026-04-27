// wazzup-webhook — inbound WhatsApp + delivery receipts via Wazzup24.
// PR 61 (multi-channel PR 2), Hugo 2026-04-27.
//
// Public endpoint (verify_jwt = false). Configured at Wazzup via:
//   PATCH https://api.wazzup24.com/v3/webhooks
//     { webhooksUri: "https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/wazzup-webhook",
//       subscriptions: ["messages", "statuses"] }
//
// Wazzup payloads (verified 2026-04-27 against
// https://wazzup24.com/help/api-en/webhooks/):
//
//   Test handshake (sent once when registering the webhook):
//     { "test": true }   →  must reply 200 within 30s
//
//   Inbound message:
//     { "messages": [{
//         messageId,        // UUID
//         dateTime,         // ISO 8601
//         channelId,        // UUID — must match wk_numbers.external_id
//         chatType,         // "whatsapp" / "instagram" / "telegram"
//         chatId,           // digits-only phone
//         type,             // "text" / "image" / etc.
//         isEcho,           // true if Wazzup echoes our outbound back
//         contact: { name, avatarUri },
//         text,             // message body (text type only)
//         status            // "inbound"
//     }] }
//
//   Status update:
//     { "statuses": [{
//         messageId,
//         timestamp,
//         status            // "delivered" / "read" / etc.
//     }] }
//
// Defence in depth (Wazzup signature scheme is not publicly documented):
//   1. We accept only payloads where channelId matches a known
//      wk_numbers.external_id row (channel='whatsapp').
//   2. INSERT goes via service-role only; no direct frontend access.
//   3. Idempotent on (channel='whatsapp', external_id=messageId)
//      composite UNIQUE — a duplicate webhook delivery is a no-op.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WazzupMessage {
  messageId?: string;
  dateTime?: string;
  channelId?: string;
  chatType?: string;
  chatId?: string;
  type?: string;
  isEcho?: boolean;
  contact?: { name?: string; avatarUri?: string };
  text?: string;
  status?: string;
}

interface WazzupStatus {
  messageId?: string;
  timestamp?: string;
  status?: string;
}

interface WazzupPayload {
  test?: boolean;
  messages?: WazzupMessage[];
  statuses?: WazzupStatus[];
}

const ok = (payload: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ ok: true, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// "79999999999" → "+79999999999". Wazzup digits-only → E.164.
function digitsToE164(digits: string): string {
  const clean = (digits || '').replace(/[^0-9]/g, '');
  return clean ? `+${clean}` : '';
}

async function findOrCreateContact(
  supa: ReturnType<typeof createClient>,
  e164: string,
  contactName: string,
  firstMessageId: string,
): Promise<string | null> {
  const variants = Array.from(
    new Set([e164, e164.replace(/^\+/, ''), e164.replace(/^\+/, '0')].filter(Boolean)),
  );
  const { data: existing } = await supa
    .from('wk_contacts')
    .select('id')
    .in('phone', variants)
    .limit(1)
    .maybeSingle();

  if ((existing as { id?: string } | null)?.id) {
    return (existing as { id: string }).id;
  }

  const { data: inserted, error: insErr } = await supa
    .from('wk_contacts')
    .insert({
      name: contactName || e164,
      phone: e164,
      owner_agent_id: null,
      pipeline_column_id: null,
      custom_fields: {
        source: 'inbound_whatsapp',
        first_message_id: firstMessageId,
      },
      is_hot: false,
    })
    .select('id')
    .single();

  if (insErr || !(inserted as { id?: string } | null)?.id) {
    console.error('[wazzup-webhook] wk_contacts insert failed', insErr);
    return null;
  }
  return (inserted as { id: string }).id;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  let payload: WazzupPayload;
  try {
    payload = (await req.json()) as WazzupPayload;
  } catch (e) {
    console.error('[wazzup-webhook] invalid JSON body', e);
    return ok({ note: 'invalid json — accepted to stop retries' });
  }

  // Test handshake at webhook registration time.
  if (payload.test === true) {
    console.log('[wazzup-webhook] test handshake received — replying 200');
    return ok({ note: 'test handshake' });
  }

  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  let savedMessages = 0;
  let savedStatuses = 0;

  // ---------------------------------------------------------------------------
  // 1. Inbound messages
  // ---------------------------------------------------------------------------
  for (const m of payload.messages ?? []) {
    if (!m.messageId || !m.channelId || !m.chatId) {
      console.warn('[wazzup-webhook] skipping message — missing required field', m);
      continue;
    }

    if (m.isEcho === true) {
      // This is our own outbound being echoed back. The status path
      // (below) will mark it delivered/read; nothing else to do.
      console.log(`[wazzup-webhook] echo ignored sid=${m.messageId}`);
      continue;
    }

    if (m.chatType !== 'whatsapp') {
      console.log(`[wazzup-webhook] non-whatsapp chatType=${m.chatType} ignored sid=${m.messageId}`);
      continue;
    }

    // Validate channelId against our known channels (defence in depth).
    const { data: channelRow } = await supa
      .from('wk_numbers')
      .select('id, e164, is_active')
      .eq('channel', 'whatsapp')
      .eq('provider', 'wazzup')
      .eq('external_id', m.channelId)
      .maybeSingle();
    if (!channelRow) {
      console.warn(
        `[wazzup-webhook] unknown channelId=${m.channelId} — dropping message sid=${m.messageId}`,
      );
      continue;
    }

    const fromE164 = digitsToE164(m.chatId);
    if (!fromE164) {
      console.warn(`[wazzup-webhook] bad chatId=${m.chatId}`);
      continue;
    }

    const contactName = m.contact?.name ?? fromE164;
    const contactId = await findOrCreateContact(supa, fromE164, contactName, m.messageId);
    if (!contactId) continue;

    const { error: msgErr } = await supa
      .from('wk_sms_messages')
      .insert({
        contact_id: contactId,
        direction: 'inbound',
        channel: 'whatsapp',
        body: m.text ?? '',
        external_id: m.messageId,
        from_e164: fromE164,
        to_e164: (channelRow as { e164: string }).e164,
        media_urls: [],
        status: 'received',
      });

    if (msgErr) {
      const code = (msgErr as { code?: string }).code;
      if (code === '23505') {
        console.log(`[wazzup-webhook] duplicate sid=${m.messageId} — idempotent skip`);
      } else {
        console.error('[wazzup-webhook] wk_sms_messages insert failed', msgErr);
      }
    } else {
      savedMessages++;
      await supa
        .from('wk_contacts')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', contactId);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Status updates (delivery receipts)
  // ---------------------------------------------------------------------------
  for (const s of payload.statuses ?? []) {
    if (!s.messageId || !s.status) continue;
    const { error: updErr } = await supa
      .from('wk_sms_messages')
      .update({ status: s.status })
      .eq('channel', 'whatsapp')
      .eq('external_id', s.messageId);
    if (updErr) {
      console.error('[wazzup-webhook] status update failed', updErr);
    } else {
      savedStatuses++;
    }
  }

  console.log(
    `[wazzup-webhook] processed messages=${payload.messages?.length ?? 0} (saved=${savedMessages}) statuses=${payload.statuses?.length ?? 0} (saved=${savedStatuses})`,
  );

  return ok({ saved_messages: savedMessages, saved_statuses: savedStatuses });
});
