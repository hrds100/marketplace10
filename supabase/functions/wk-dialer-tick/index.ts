// wk-dialer-tick — pg_cron-driven background tick (every 30s).
//
// Two responsibilities:
//   1. Re-queue any 'dialing' rows that have been stuck > 90s — likely
//      orphaned because Twilio never reported a final status (network
//      hiccup, function crash). Resetting to 'pending' lets the next
//      lead-pick pick them up cleanly.
//   2. Promote 'pending' queue rows whose `scheduled_for` has passed —
//      these are retry-after-N-hours rows from the outcome engine. They
//      already have `scheduled_for` set; nothing to do here other than
//      let `wk_pick_next_lead` see them. (No update needed.)
//   3. Process the wk_webhook_outbox: re-deliver any failed Twilio
//      webhook events whose retry window has elapsed.
//
// Authentication: service-role bearer (called by pg_cron OR an
// internal cron schedule via pg_net). verify_jwt = false; we check
// the Authorization header against SERVICE_ROLE_KEY ourselves.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Service-role auth check
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.endsWith(SUPABASE_SERVICE_KEY)) {
    return new Response('forbidden', { status: 403 });
  }

  try {
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const out = { unstuck: 0, outbox_retried: 0 };

    // 1. Unstick orphaned 'dialing' rows
    const stuckCutoff = new Date(Date.now() - 90_000).toISOString();
    const { data: stuck } = await supa.from('wk_dialer_queue')
      .update({ status: 'pending', agent_id: null })
      .lt('scheduled_for', stuckCutoff)
      .eq('status', 'dialing')
      .select('id');
    out.unstuck = stuck?.length ?? 0;

    // 2. Re-deliver outbox events (basic retry — caller's webhook URL
    //    lives in payload.endpoint).
    const { data: pending } = await supa.from('wk_webhook_outbox')
      .select('id, event_kind, payload, attempts')
      .eq('status', 'pending')
      .lt('attempts', 5)
      .order('created_at', { ascending: true })
      .limit(20);

    for (const ev of pending ?? []) {
      const endpoint = (ev.payload as { endpoint?: string } | null)?.endpoint;
      if (!endpoint) {
        await supa.from('wk_webhook_outbox')
          .update({ status: 'dead', last_attempt_at: new Date().toISOString() })
          .eq('id', ev.id);
        continue;
      }
      try {
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ev.payload),
        });
        if (r.ok) {
          await supa.from('wk_webhook_outbox').update({
            status: 'done',
            last_attempt_at: new Date().toISOString(),
          }).eq('id', ev.id);
          out.outbox_retried++;
        } else {
          await supa.from('wk_webhook_outbox').update({
            attempts: (ev.attempts ?? 0) + 1,
            last_attempt_at: new Date().toISOString(),
            status: (ev.attempts ?? 0) + 1 >= 5 ? 'dead' : 'pending',
          }).eq('id', ev.id);
        }
      } catch (e) {
        console.warn('outbox retry failed', ev.id, e);
        await supa.from('wk_webhook_outbox').update({
          attempts: (ev.attempts ?? 0) + 1,
          last_attempt_at: new Date().toISOString(),
        }).eq('id', ev.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, ...out }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('wk-dialer-tick error', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
