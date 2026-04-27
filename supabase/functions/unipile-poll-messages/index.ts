// unipile-poll-messages — pulls recent messages from Unipile and inserts
// any not yet in wk_sms_messages. Polling fallback because Unipile's
// webhook delivery isn't firing for our endpoint despite identical
// configuration to other working webhooks in their account.
//
// PR 81 (Hugo 2026-04-27 — webhook delivery broken on Unipile side).
//
// Run via:
//   - pg_cron every 60s for live-ish inbox latency, OR
//   - manual POST from /crm/inbox refresh button
//
// verify_jwt = false but auth-gated by a shared CRON_SECRET header
// (so randos on the internet can't trigger polling).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const UNIPILE_TOKEN = Deno.env.get('UNIPILE_TOKEN') ?? '';
const UNIPILE_DSN = Deno.env.get('UNIPILE_DSN') ?? 'api38.unipile.com:16812';
const CRON_SECRET = Deno.env.get('UNIPILE_POLL_CRON_SECRET') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface UnipileAccount {
  id: string;
  type: string;
  sources?: Array<{ status?: string }>;
  connection_params?: { im?: { phone_number?: string } };
}
interface UnipileMessage {
  id: string;
  provider_id?: string;
  text?: string;
  timestamp?: string;
  is_sender?: number | boolean;
  chat_id?: string;
  /** WhatsApp shape: "447863992555@s.whatsapp.net" — the OTHER party's
   *  jid. We strip @s.whatsapp.net to get the phone. */
  chat_provider_id?: string;
  sender_id?: string;
  sender_attendee_id?: string;
}

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function digitsToE164(raw: string | undefined | null): string {
  if (!raw) return '';
  // Strip everything except digits — handles @s.whatsapp.net, @lid, +,
  // dashes, spaces. e.g. "447863992555@s.whatsapp.net" → +447863992555.
  const digits = String(raw).replace(/[^0-9]/g, '');
  return digits ? `+${digits}` : '';
}

/** Extract the COUNTERPARTY phone from a Unipile WhatsApp message.
 * The chat_provider_id always contains the contact's WA jid in the
 * "447863992555@s.whatsapp.net" form regardless of message direction. */
function counterpartyFromMessage(m: UnipileMessage): string {
  // Prefer chat_provider_id since it's well-formed phone for WhatsApp.
  // Skip @lid jids — those don't contain a phone number.
  if (m.chat_provider_id && m.chat_provider_id.includes('@s.whatsapp.net')) {
    return digitsToE164(m.chat_provider_id);
  }
  // Fallback to sender_id (inbound only — outbound's sender_id is us).
  if (m.sender_id && m.sender_id.includes('@s.whatsapp.net')) {
    return digitsToE164(m.sender_id);
  }
  return '';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  // Auth: shared CRON_SECRET header. Anyone with the secret can run a poll.
  if (CRON_SECRET) {
    const got = req.headers.get('x-cron-secret') ?? '';
    if (got !== CRON_SECRET) {
      return json(401, { error: 'bad cron secret' });
    }
  }

  if (!UNIPILE_TOKEN) {
    return json(503, { error: 'UNIPILE_TOKEN not configured' });
  }

  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. List active Unipile WhatsApp/Email accounts.
  const accountsRes = await fetch(`https://${UNIPILE_DSN}/api/v1/accounts`, {
    headers: { 'X-API-KEY': UNIPILE_TOKEN, accept: 'application/json' },
  });
  if (!accountsRes.ok) {
    return json(502, { error: `accounts ${accountsRes.status}: ${(await accountsRes.text()).slice(0, 300)}` });
  }
  const accountsJson = (await accountsRes.json()) as { items?: UnipileAccount[] };

  const summary: Array<{ account_id: string; type: string; pulled: number; inserted: number; skipped: number; error?: string }> = [];

  for (const acct of accountsJson.items ?? []) {
    if (acct.type !== 'WHATSAPP') continue; // limit to WhatsApp for v1
    const accountId = acct.id;
    if (acct.sources?.[0]?.status !== 'OK') {
      summary.push({ account_id: accountId, type: acct.type, pulled: 0, inserted: 0, skipped: 0, error: 'account not OK' });
      continue;
    }

    // 2. Fetch the most recent 50 messages.
    const mr = await fetch(
      `https://${UNIPILE_DSN}/api/v1/messages?account_id=${accountId}&limit=50`,
      { headers: { 'X-API-KEY': UNIPILE_TOKEN, accept: 'application/json' } }
    );
    if (!mr.ok) {
      summary.push({ account_id: accountId, type: acct.type, pulled: 0, inserted: 0, skipped: 0, error: `messages ${mr.status}` });
      continue;
    }
    const mj = (await mr.json()) as { items?: UnipileMessage[] };
    const msgs = mj.items ?? [];

    // 3. Find the workspace number row tied to this Unipile account.
    const { data: numRow } = await supa
      .from('wk_numbers')
      .select('id, e164')
      .eq('provider', 'unipile')
      .eq('external_id', accountId)
      .maybeSingle();
    const ourNumberE164 = (numRow as { e164?: string } | null)?.e164 ?? '';

    let inserted = 0;
    let skipped = 0;

    for (const m of msgs) {
      if (!m.id) {
        skipped++;
        continue;
      }
      // Determine direction: is_sender = WE are the sender (outbound).
      const direction: 'inbound' | 'outbound' =
        m.is_sender === true || m.is_sender === 1 ? 'outbound' : 'inbound';

      // counterparty (the OTHER party in the chat) is always at
      // chat_provider_id for WhatsApp — same field on inbound + outbound.
      const counterpartyE164 = counterpartyFromMessage(m);

      // Find or create the contact (use the counterparty E.164 as phone).
      let contactId: string | null = null;
      {
        const variants = Array.from(
          new Set([counterpartyE164, counterpartyE164.replace(/^\+/, '')].filter(Boolean))
        );
        if (variants.length === 0) {
          skipped++;
          continue;
        }
        const { data: existing } = await supa
          .from('wk_contacts')
          .select('id')
          .in('phone', variants)
          .limit(1)
          .maybeSingle();
        if ((existing as { id?: string } | null)?.id) {
          contactId = (existing as { id: string }).id;
        } else {
          const { data: ins } = await supa
            .from('wk_contacts')
            .insert({
              name: counterpartyE164,
              phone: counterpartyE164,
              owner_agent_id: null,
              pipeline_column_id: null,
              custom_fields: { source: 'unipile_poll', first_message_id: m.id },
              is_hot: false,
            })
            .select('id')
            .single();
          contactId = (ins as { id?: string } | null)?.id ?? null;
        }
      }
      if (!contactId) {
        skipped++;
        continue;
      }

      // Idempotent insert via composite UNIQUE (channel, external_id).
      const { error: msgErr } = await supa
        .from('wk_sms_messages')
        .insert({
          contact_id: contactId,
          direction,
          channel: 'whatsapp',
          body: m.text ?? '',
          external_id: m.id,
          from_e164: direction === 'inbound' ? counterpartyE164 : ourNumberE164,
          to_e164: direction === 'inbound' ? ourNumberE164 : counterpartyE164,
          media_urls: [],
          status: direction === 'inbound' ? 'received' : 'queued',
        });
      if (msgErr) {
        const code = (msgErr as { code?: string }).code;
        if (code === '23505') {
          skipped++;
          continue;
        }
        console.error('[unipile-poll] insert failed', msgErr);
        skipped++;
        continue;
      }

      inserted++;
      // Bump last_contact_at for inbox sort.
      await supa
        .from('wk_contacts')
        .update({ last_contact_at: m.timestamp ?? new Date().toISOString() })
        .eq('id', contactId);
    }

    summary.push({
      account_id: accountId,
      type: acct.type,
      pulled: msgs.length,
      inserted,
      skipped,
    });
  }

  return json(200, {
    polled_at: new Date().toISOString(),
    accounts: summary,
  });
});
