// wk-jobs-worker — pulls pending wk_jobs rows and dispatches them.
//
// Runs from pg_cron every 30s (configured in the migration as a separate task).
// Uses SELECT ... FOR UPDATE SKIP LOCKED so multiple invocations don't double-process.
//
// JOB KINDS handled here (Phase 1 stubs — full implementations land in later steps):
//   - recording_ingest   download Twilio media, upload to call-recordings bucket,
//                        update wk_recordings.storage_path + ingest_status
//   - postcall_ai        Whisper + GPT-4o-mini summary  → wk_transcripts +
//                        wk_call_intelligence  (delegates to wk-ai-postcall when
//                        that function ships)
//   - compute_cost       pull Twilio price + sum AI costs → wk_voice_call_costs
//                        and increment wk_voice_agent_limits.daily_spend_pence
//   - send_sms           outcome automation → enqueues a Twilio SMS via sms-send
//   - outbox_retry       replays a wk_webhook_outbox row that failed earlier
//
// AUTH: callable only by service role (verify_jwt = false but we check the
// Authorization bearer matches SUPABASE_SERVICE_ROLE_KEY — this is the same
// pattern as sms-webhook-dispatch).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';

const BATCH_SIZE = 10;
const RECORDING_BUCKET = 'call-recordings';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Job {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  attempts: number;
}

// ---- recording_ingest ------------------------------------------------------

async function handleRecordingIngest(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>
): Promise<void> {
  const recordingSid = String(payload.recording_sid ?? '');
  if (!recordingSid) throw new Error('missing recording_sid');

  const { data: rec, error: recErr } = await supabase
    .from('wk_recordings')
    .select('id, call_id, twilio_media_url, storage_path')
    .eq('twilio_sid', recordingSid)
    .maybeSingle();

  if (recErr || !rec) throw new Error(`recording not found: ${recErr?.message ?? recordingSid}`);
  if (rec.storage_path) return;                              // already ingested

  // Twilio media URL is unauthenticated for the .mp3 form; we still authenticate
  // to be safe and follow Twilio's recommendation.
  const mediaUrl = `${rec.twilio_media_url}.mp3`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const resp = await fetch(mediaUrl, { headers: { Authorization: `Basic ${auth}` } });
  if (!resp.ok) throw new Error(`twilio media fetch failed: ${resp.status}`);
  const blob = await resp.arrayBuffer();

  const path = `${rec.call_id ?? 'orphan'}/${recordingSid}.mp3`;
  const { error: upErr } = await supabase.storage
    .from(RECORDING_BUCKET)
    .upload(path, blob, { contentType: 'audio/mpeg', upsert: true });
  if (upErr) throw new Error(`storage upload failed: ${upErr.message}`);

  await supabase
    .from('wk_recordings')
    .update({
      storage_path: path,
      status: 'ready',
      size_bytes: blob.byteLength,
      ingested_at: new Date().toISOString(),
    })
    .eq('id', rec.id);
}

// ---- postcall_ai (stub — full implementation in wk-ai-postcall) ------------

async function handlePostcallAi(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>
): Promise<void> {
  // Placeholder: real implementation calls Whisper + GPT-4o-mini.
  // For Phase 1 step B, we only mark the call as "queued for AI" so the UI
  // can show a "Transcribing…" badge.
  const callSid = String(payload.call_sid ?? '');
  if (!callSid) return;
  await supabase
    .from('wk_calls')
    .update({ ai_status: 'queued' })
    .eq('twilio_call_sid', callSid);
}

// ---- compute_cost (stub — full implementation in wk-spend-record) ----------

async function handleComputeCost(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>
): Promise<void> {
  const callSid = String(payload.call_sid ?? '');
  if (!callSid) return;
  // Placeholder row so the spend banner doesn't show NULL.
  // wk-spend-record will replace this with real numbers once it ships.
  const { data: call } = await supabase
    .from('wk_calls')
    .select('id, agent_id, duration_sec')
    .eq('twilio_call_sid', callSid)
    .maybeSingle();
  if (!call) return;
  const estPence = Math.max(1, Math.round(((call.duration_sec ?? 0) / 60) * 4)); // ~4p/min placeholder
  // total_pence is a generated column — only insert the components.
  await supabase.from('wk_voice_call_costs').upsert({
    call_id: call.id,
    carrier_cost_pence: estPence,
    ai_cost_pence: 0,
    computed_at: new Date().toISOString(),
  }, { onConflict: 'call_id' });
}

// ---- send_sms (stub) -------------------------------------------------------

async function handleSendSms(
  _supabase: ReturnType<typeof createClient>,
  _payload: Record<string, unknown>
): Promise<void> {
  // Will call the existing sms-send edge function via service role bearer.
  // Real implementation lands with wk-outcome-apply (Step E).
}

// ---------------------------------------------------------------------------

async function processJob(
  supabase: ReturnType<typeof createClient>,
  job: Job
): Promise<void> {
  switch (job.kind) {
    case 'recording_ingest': return handleRecordingIngest(supabase, job.payload);
    case 'postcall_ai':      return handlePostcallAi(supabase, job.payload);
    case 'compute_cost':     return handleComputeCost(supabase, job.payload);
    case 'send_sms':         return handleSendSms(supabase, job.payload);
    default:
      throw new Error(`unknown job kind: ${job.kind}`);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Service-role bearer check (same pattern as sms-webhook-dispatch)
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (token !== SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Atomic claim of pending jobs using SKIP LOCKED via RPC.
  // (We rely on an RPC `wk_claim_jobs(batch_size int)` defined in the migration.)
  const { data: jobs, error } = await supabase.rpc('wk_claim_jobs', {
    batch_size: BATCH_SIZE,
  });

  if (error) {
    console.error('wk_claim_jobs failed:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const claimed: Job[] = (jobs as Job[]) ?? [];
  const results: Array<{ id: string; ok: boolean; err?: string }> = [];

  for (const job of claimed) {
    try {
      await processJob(supabase, job);
      await supabase
        .from('wk_jobs')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', job.id);
      results.push({ id: job.id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const nextAttempts = (job.attempts ?? 0) + 1;
      const dead = nextAttempts >= 5;
      await supabase
        .from('wk_jobs')
        .update({
          status: dead ? 'dead' : 'pending',
          attempts: nextAttempts,
          last_error: msg,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      results.push({ id: job.id, ok: false, err: msg });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
