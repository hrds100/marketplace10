// wazzup-sync-channels — admin-only sync of paired Wazzup channels into wk_numbers.
// PR 61 (multi-channel PR 2), Hugo 2026-04-27.
//
// Settings → Channels (PR 64) calls this to populate the WhatsApp section of
// the table. Run on demand whenever Hugo pairs a new channel via wazzup24.com.
//
// What it does:
//   1. Verify caller's JWT belongs to an admin (email gate).
//   2. Read Wazzup API key from wk_channel_credentials (provider='wazzup'),
//      fall back to WAZZUP_API_KEY env.
//   3. GET https://api.wazzup24.com/v3/channels (returns paired channels).
//   4. For each channel with transport='whatsapp':
//        - UPSERT wk_numbers WHERE channel='whatsapp' AND external_id=channelId
//          { e164: "+<plainId>", channel: 'whatsapp', provider: 'wazzup',
//            external_id: channelId, is_active: state === 'active',
//            sms_enabled: false, voice_enabled: false }
//   5. Return { synced, channels: [{...}], skipped: [...] }.
//
// Wazzup /v3/channels response (verified 2026-04-27):
//   [{ channelId (UUID), transport: 'whatsapp', plainId: '79865784457',
//      state: 'active' }, ...]

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WAZZUP_API_KEY_ENV = Deno.env.get('WAZZUP_API_KEY') ?? '';
const WAZZUP_API_BASE = 'https://api.wazzup24.com/v3';

const ADMIN_EMAILS = ['hugo@nfstay.com', 'admin@hub.nfstay.com'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WazzupChannel {
  channelId: string;
  transport: string;
  plainId: string;
  state: string;
}

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function loadWazzupApiKey(supa: ReturnType<typeof createClient>): Promise<string> {
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

    const callerEmail = (userResp.user.email ?? '').toLowerCase();
    if (!ADMIN_EMAILS.includes(callerEmail)) {
      return json(403, { error: 'Admin only' });
    }

    const apiKey = await loadWazzupApiKey(supa);
    if (!apiKey) {
      return json(503, {
        error:
          'Wazzup API key not configured. Set WAZZUP_API_KEY env or insert a row into wk_channel_credentials (provider=wazzup).',
      });
    }

    // Fetch channels from Wazzup.
    const wzResp = await fetch(`${WAZZUP_API_BASE}/channels`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!wzResp.ok) {
      const errText = await wzResp.text();
      console.error('[wazzup-sync-channels] wazzup error', wzResp.status, errText);
      return json(502, { error: `Wazzup ${wzResp.status}: ${errText.slice(0, 500)}` });
    }
    const channels = (await wzResp.json()) as WazzupChannel[];

    const synced: Array<{ channelId: string; e164: string; state: string; rowId: string }> = [];
    const skipped: Array<{ channelId: string; reason: string }> = [];

    for (const ch of channels) {
      if (ch.transport !== 'whatsapp') {
        skipped.push({ channelId: ch.channelId, reason: `transport=${ch.transport} (not whatsapp)` });
        continue;
      }
      if (!ch.channelId || !ch.plainId) {
        skipped.push({ channelId: ch.channelId ?? '?', reason: 'missing channelId or plainId' });
        continue;
      }

      const e164 = `+${ch.plainId.replace(/[^0-9]/g, '')}`;
      const isActive = ch.state === 'active';

      // UPSERT keyed on (channel, external_id) — the unique index from PR 60.
      // Use a SELECT-then-INSERT/UPDATE pattern since Supabase upsert needs
      // an explicit target column.
      const { data: existing } = await supa
        .from('wk_numbers')
        .select('id, is_active')
        .eq('channel', 'whatsapp')
        .eq('external_id', ch.channelId)
        .maybeSingle();

      if ((existing as { id?: string } | null)?.id) {
        // Refresh state but preserve admin's manual is_active toggle if they
        // disabled an active channel — only update is_active downward, never
        // upward (Wazzup might transiently report inactive during reconnect).
        const row = existing as { id: string; is_active: boolean };
        const nextActive = isActive ? row.is_active : false;
        await supa
          .from('wk_numbers')
          .update({ e164, is_active: nextActive })
          .eq('id', row.id);
        synced.push({ channelId: ch.channelId, e164, state: ch.state, rowId: row.id });
      } else {
        const { data: inserted, error: insErr } = await supa
          .from('wk_numbers')
          .insert({
            e164,
            channel: 'whatsapp',
            provider: 'wazzup',
            external_id: ch.channelId,
            is_active: isActive,
            sms_enabled: false,
            voice_enabled: false,
            recording_enabled: false,
          })
          .select('id')
          .single();
        if (insErr || !(inserted as { id?: string } | null)?.id) {
          console.error('[wazzup-sync-channels] insert failed for', ch.channelId, insErr);
          skipped.push({ channelId: ch.channelId, reason: insErr?.message ?? 'insert failed' });
          continue;
        }
        synced.push({
          channelId: ch.channelId,
          e164,
          state: ch.state,
          rowId: (inserted as { id: string }).id,
        });
      }
    }

    // Update the wk_channel_credentials row's last_seen_at + is_connected
    // (any successful /v3/channels call counts).
    await supa
      .from('wk_channel_credentials')
      .update({
        last_seen_at: new Date().toISOString(),
        is_connected: synced.some((s) => s.state === 'active'),
      })
      .eq('provider', 'wazzup');

    return json(200, {
      synced_count: synced.length,
      skipped_count: skipped.length,
      synced,
      skipped,
    });
  } catch (e) {
    console.error('[wazzup-sync-channels] threw', e);
    return json(500, { error: e instanceof Error ? e.message : 'Internal error' });
  }
});
