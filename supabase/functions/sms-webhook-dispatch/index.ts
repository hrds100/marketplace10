// sms-webhook-dispatch — dispatches queued phone numbers from sms_webhook_queue
// to external webhook endpoints (e.g. WAtoolbox). Called once per minute by pg_cron.
// Respects:
//   - global rate limit (sms_webhook_settings.numbers_per_hour, rolling 60min window)
//   - per-send delay (sms_webhook_settings.delay_seconds)
//   - per-endpoint UK time window (send_window_start..send_window_end)
//   - round-robin across active in-window endpoints (fewest sent in last hour wins)
//   - permanent dedupe by phone (enforced by unique index on queue.phone)
//   - max 2 retries before marking failed
//   - optional post-send stage move (sms_webhook_settings.move_to_stage_id)
//   - 45s safety margin — self-invokes if budget remains
// Source of truth: supabase/config.toml (verify_jwt = false)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_EXECUTION_MS = 45_000;
const MAX_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 5 * 60 * 1000; // push failed row's scheduled_for forward 5 min

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Settings {
  enabled: boolean;
  numbers_per_hour: number;
  delay_seconds: number;
  workflow_name: string;
  move_to_stage_id: string | null;
}

interface Endpoint {
  id: string;
  name: string;
  url: string;
  send_window_start: string; // "HH:MM:SS"
  send_window_end: string;
}

interface QueueRow {
  id: string;
  contact_id: string | null;
  phone: string;
  attempts: number;
}

// Convert current UTC time to UK (Europe/London) HH:MM:SS string
function ukTimeNow(): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  // en-GB returns "HH:MM:SS"
  const parts = fmt.format(new Date());
  // Some Node/Deno builds return "HH:MM:SS", others "HH:MM:SS" — normalise
  return parts.replace(/[^\d:]/g, '').padEnd(8, '0');
}

function isTimeInWindow(now: string, start: string, end: string): boolean {
  // Handles wrap-around (e.g. 22:00 → 02:00)
  if (start <= end) {
    return now >= start && now <= end;
  }
  return now >= start || now <= end;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // ---- Load settings ----
    const { data: settingsRow, error: settingsErr } = await supabase
      .from('sms_webhook_settings')
      .select('enabled, numbers_per_hour, delay_seconds, workflow_name, move_to_stage_id')
      .limit(1)
      .maybeSingle();

    if (settingsErr) {
      console.error('Failed to load settings:', settingsErr);
      return jsonResponse({ ok: false, error: 'settings_load_failed' }, 500);
    }

    const settings: Settings = settingsRow ?? {
      enabled: false,
      numbers_per_hour: 10,
      delay_seconds: 30,
      workflow_name: 'Add to Group - NFSTAY',
      move_to_stage_id: null,
    };

    if (!settings.enabled) {
      return jsonResponse({ ok: true, reason: 'disabled' });
    }

    // ---- Compute rolling-60min budget ----
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: sentLastHour, error: countErr } = await supabase
      .from('sms_webhook_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'success')
      .gte('created_at', windowStart);

    if (countErr) {
      console.error('Failed to count recent logs:', countErr);
    }

    const budget = Math.max(0, settings.numbers_per_hour - (sentLastHour ?? 0));
    if (budget === 0) {
      return jsonResponse({ ok: true, reason: 'rate_limited', sent_last_hour: sentLastHour });
    }

    // ---- Load active endpoints ----
    const { data: endpointsData, error: endpointsErr } = await supabase
      .from('sms_webhook_endpoints')
      .select('id, name, url, send_window_start, send_window_end')
      .eq('status', 'active');

    if (endpointsErr) {
      console.error('Failed to load endpoints:', endpointsErr);
      return jsonResponse({ ok: false, error: 'endpoints_load_failed' }, 500);
    }

    const allEndpoints: Endpoint[] = endpointsData ?? [];

    // Filter by UK time window
    const nowUk = ukTimeNow();
    const inWindow = allEndpoints.filter((e) =>
      isTimeInWindow(nowUk, e.send_window_start, e.send_window_end)
    );

    if (inWindow.length === 0) {
      return jsonResponse({
        ok: true,
        reason: 'no_endpoint_in_window',
        uk_time: nowUk,
        active_count: allEndpoints.length,
      });
    }

    // ---- Compute per-endpoint sent counts (last hour) for round-robin ----
    const sentByEndpoint: Record<string, number> = {};
    for (const ep of inWindow) sentByEndpoint[ep.id] = 0;

    const { data: recentLogs } = await supabase
      .from('sms_webhook_logs')
      .select('endpoint_id')
      .eq('status', 'success')
      .gte('created_at', windowStart);

    for (const log of (recentLogs ?? []) as { endpoint_id: string | null }[]) {
      if (log.endpoint_id && log.endpoint_id in sentByEndpoint) {
        sentByEndpoint[log.endpoint_id]++;
      }
    }

    function pickEndpoint(): Endpoint {
      // Smallest sent count, tie-break by endpoint id for stability
      return [...inWindow].sort((a, b) => {
        const diff = (sentByEndpoint[a.id] ?? 0) - (sentByEndpoint[b.id] ?? 0);
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      })[0];
    }

    // ---- Fetch pending rows up to budget ----
    const { data: pendingRows, error: pendingErr } = await supabase
      .from('sms_webhook_queue')
      .select('id, contact_id, phone, attempts')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(budget);

    if (pendingErr) {
      console.error('Failed to load pending queue:', pendingErr);
      return jsonResponse({ ok: false, error: 'pending_load_failed' }, 500);
    }

    const queue = (pendingRows ?? []) as QueueRow[];
    if (queue.length === 0) {
      return jsonResponse({ ok: true, reason: 'queue_empty' });
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let hitTimeLimit = false;

    // ---- Process loop ----
    for (const row of queue) {
      if (Date.now() - startTime > MAX_EXECUTION_MS) {
        hitTimeLimit = true;
        break;
      }

      const endpoint = pickEndpoint();

      // Mark sending (best effort)
      await supabase
        .from('sms_webhook_queue')
        .update({ status: 'sending', endpoint_id: endpoint.id })
        .eq('id', row.id);

      const attempt = row.attempts + 1;

      // ---- Fire the webhook ----
      let httpStatus: number | null = null;
      let responseBody = '';
      let errorMsg: string | null = null;
      let ok = false;

      try {
        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'run-workflow',
            workflow: settings.workflow_name,
            phone: row.phone,
          }),
        });
        httpStatus = res.status;
        responseBody = (await res.text()).slice(0, 1000); // cap
        ok = res.ok;
        if (!ok) errorMsg = `HTTP ${res.status}`;
      } catch (err) {
        errorMsg = err instanceof Error ? err.message : String(err);
      }

      // ---- Log result ----
      await supabase.from('sms_webhook_logs').insert({
        queue_id: row.id,
        endpoint_id: endpoint.id,
        phone: row.phone,
        status: ok ? 'success' : 'failed',
        http_status: httpStatus,
        response_body: responseBody || null,
        error: errorMsg,
        attempt,
      });

      if (ok) {
        succeeded++;
        sentByEndpoint[endpoint.id] = (sentByEndpoint[endpoint.id] ?? 0) + 1;

        await supabase
          .from('sms_webhook_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempts: attempt,
            last_error: null,
          })
          .eq('id', row.id);

        // Optional: move contact to target stage
        if (settings.move_to_stage_id && row.contact_id) {
          await supabase
            .from('sms_contacts')
            .update({ pipeline_stage_id: settings.move_to_stage_id })
            .eq('id', row.contact_id);
        }
      } else {
        failed++;
        if (attempt >= MAX_ATTEMPTS) {
          await supabase
            .from('sms_webhook_queue')
            .update({
              status: 'failed',
              attempts: attempt,
              last_error: errorMsg,
            })
            .eq('id', row.id);
        } else {
          // Schedule retry
          await supabase
            .from('sms_webhook_queue')
            .update({
              status: 'pending',
              attempts: attempt,
              last_error: errorMsg,
              scheduled_for: new Date(Date.now() + RETRY_BACKOFF_MS).toISOString(),
            })
            .eq('id', row.id);
        }
      }

      processed++;

      // Respect configured delay between sends
      if (processed < queue.length && settings.delay_seconds > 0) {
        const sleepMs = settings.delay_seconds * 1000;
        if (Date.now() - startTime + sleepMs > MAX_EXECUTION_MS) {
          hitTimeLimit = true;
          break;
        }
        await sleep(sleepMs);
      }
    }

    // ---- Self-invoke if time-limited with remaining work ----
    if (hitTimeLimit) {
      fetch(`${SUPABASE_URL}/functions/v1/sms-webhook-dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ reinvoked: true }),
      }).catch((err) => console.error('Self-invoke failed:', err));
    }

    return jsonResponse({
      ok: true,
      processed,
      succeeded,
      failed,
      budget,
      hit_time_limit: hitTimeLimit,
    });
  } catch (err) {
    console.error('sms-webhook-dispatch error:', err);
    return jsonResponse(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
