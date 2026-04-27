// wazzup-send — outbound WhatsApp via Wazzup24 personal-WA gateway.
// PR 61 (multi-channel PR 2), Hugo 2026-04-27.
//
// Companion to wk-sms-send (Twilio SMS). Same request/response shape so
// the frontend channel-picker (PR 63) just routes to the right edge fn
// based on the chosen channel.
//
// Body:
//   { contact_id: string, body: string, channel_id?: string }
//
//   - channel_id (optional) — wk_numbers.id for the WhatsApp line to
//     send from. If omitted, picks the first active wk_numbers row
//     where channel='whatsapp' provider='wazzup'.
//
// Flow:
//   1. Verify JWT, look up the agent.
//   2. Resolve wk_contact for the recipient phone.
//   3. Resolve a wk_numbers row (channel='whatsapp', is_active=true) to
//      get the Wazzup channelId UUID.
//   4. Read the Wazzup API key from wk_channel_credentials
//      (provider='wazzup'); fall back to WAZZUP_API_KEY env.
//   5. POST https://api.wazzup24.com/v3/message with chatType='whatsapp'.
//   6. INSERT wk_sms_messages with channel='whatsapp',
//      external_id=<Wazzup messageId>.
//   7. Return { message_id, external_id, status }.
//
// Wazzup24 API spec (verified 2026-04-27 against
// https://wazzup24.com/help/api-en/sending-messages/):
//   - POST /v3/message
//   - Authorization: Bearer <apiKey>
//   - Body: { channelId (UUID), chatId (digits-only phone),
//             chatType: "whatsapp", text, crmMessageId (UUID) }
//   - 201 → { messageId (UUID), chatId }
//   - 400 → INVALID_MESSAGE_DATA / REPEATED_CRM_MESSAGE_ID

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WAZZUP_API_KEY_ENV = Deno.env.get('WAZZUP_API_KEY') ?? '';
const WAZZUP_API_BASE = 'https://api.wazzup24.com/v3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SendBody {
  contact_id: string;
  body: string;
  channel_id?: string;
}

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Wazzup expects digits-only — strip + and any whatsapp: prefix.
function toChatId(phone: string): string {
  return phone.replace(/^whatsapp:/, '').replace(/[^0-9]/g, '');
}

async function loadWazzupApiKey(supa: ReturnType<typeof createClient>): Promise<string> {
  // DB-first (so admins can rotate via Settings UI without redeploying).
  const { data } = await supa
    .from('wk_channel_credentials')
    .select('secret')
    .eq('provider', 'wazzup')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const dbKey = (data as { secret?: string } | null)?.secret ?? '';
  return dbKey || WAZZUP_API_KEY_ENV;
}

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
    const agentId = userResp.user.id;

    let payload: SendBody;
    try {
      payload = (await req.json()) as SendBody;
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }

    const contactId = (payload.contact_id ?? '').trim();
    const body = (payload.body ?? '').trim();
    if (!contactId) return json(400, { error: 'contact_id required' });
    if (!body) return json(400, { error: 'body required' });
    if (body.length > 4096) {
      return json(400, { error: 'body too long (Wazzup max 4096 chars)' });
    }

    // 1. Resolve the contact's phone.
    const { data: contact, error: contactErr } = await supa
      .from('wk_contacts')
      .select('id, phone, name')
      .eq('id', contactId)
      .maybeSingle();
    if (contactErr) return json(500, { error: contactErr.message });
    if (!contact) return json(404, { error: 'Contact not found' });

    const toPhone = (contact.phone as string | null)?.trim();
    if (!toPhone) return json(400, { error: 'Contact has no phone number' });
    const chatId = toChatId(toPhone);
    if (!chatId) return json(400, { error: 'Invalid contact phone' });

    // 2. Resolve a WhatsApp channel row.
    let channelRow: { id: string; e164: string; external_id: string | null } | null = null;
    if (payload.channel_id) {
      const { data } = await supa
        .from('wk_numbers')
        .select('id, e164, external_id, channel, provider, is_active')
        .eq('id', payload.channel_id)
        .maybeSingle();
      if (!data || data.channel !== 'whatsapp' || data.provider !== 'wazzup' || !data.is_active) {
        return json(400, { error: 'channel_id not a valid active Wazzup channel' });
      }
      channelRow = data as typeof channelRow;
    } else {
      const { data } = await supa
        .from('wk_numbers')
        .select('id, e164, external_id')
        .eq('channel', 'whatsapp')
        .eq('provider', 'wazzup')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      channelRow = (data as typeof channelRow) ?? null;
    }
    if (!channelRow) {
      return json(503, {
        error:
          'No active WhatsApp channel configured. Run wazzup-sync-channels first or activate a row in wk_numbers.',
      });
    }
    if (!channelRow.external_id) {
      return json(503, {
        error:
          'WhatsApp channel row has no external_id (Wazzup channelId UUID). Run wazzup-sync-channels.',
      });
    }

    // 3. Load API key.
    const apiKey = await loadWazzupApiKey(supa);
    if (!apiKey) {
      return json(503, {
        error:
          'Wazzup API key not configured. Set WAZZUP_API_KEY env or insert a row into wk_channel_credentials (provider=wazzup).',
      });
    }

    // 4. POST to Wazzup.
    const crmMessageId = crypto.randomUUID();
    const wzResp = await fetch(`${WAZZUP_API_BASE}/message`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelId: channelRow.external_id,
        chatId,
        chatType: 'whatsapp',
        text: body,
        crmMessageId,
      }),
    });

    const wzBody = await wzResp.text();
    if (!wzResp.ok) {
      console.error('[wazzup-send] wazzup error', wzResp.status, wzBody);
      return json(502, {
        error: `Wazzup ${wzResp.status}: ${wzBody.slice(0, 500)}`,
      });
    }

    let wzJson: { messageId?: string; chatId?: string } = {};
    try {
      wzJson = JSON.parse(wzBody);
    } catch {
      console.warn('[wazzup-send] could not parse wazzup response as JSON', wzBody.slice(0, 200));
    }

    // 5. Persist outbound row.
    const { data: inserted, error: insErr } = await supa
      .from('wk_sms_messages')
      .insert({
        contact_id: contactId,
        direction: 'outbound',
        channel: 'whatsapp',
        body,
        external_id: wzJson.messageId ?? null,
        from_e164: channelRow.e164,
        to_e164: toPhone,
        status: 'queued',
        created_by: agentId,
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('[wazzup-send] db insert failed (wazzup sent though)', insErr);
      return json(200, {
        external_id: wzJson.messageId ?? null,
        warning: 'sent via Wazzup but local insert failed',
      });
    }

    // 6. Bump last_contact_at.
    await supa
      .from('wk_contacts')
      .update({ last_contact_at: new Date().toISOString() })
      .eq('id', contactId);

    return json(200, {
      message_id: inserted?.id,
      external_id: wzJson.messageId ?? null,
      crm_message_id: crmMessageId,
      status: 'queued',
    });
  } catch (e) {
    console.error('[wazzup-send] threw', e);
    return json(500, { error: e instanceof Error ? e.message : 'Internal error' });
  }
});
