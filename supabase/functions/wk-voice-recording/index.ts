// wk-voice-recording — Twilio recording webhook.
//
// Twilio POSTs here when a recording completes (recordingStatusCallback="completed"):
//   RecordingSid, RecordingUrl, RecordingDuration, CallSid, ...
//
// We:
//   1. Validate signature.
//   2. Insert wk_recordings row pointing at Twilio's media URL (storage_path
//      stays NULL until wk-jobs-worker downloads + uploads to Supabase storage).
//   3. Enqueue a wk_jobs row (kind='recording_ingest') so the worker grabs the
//      audio asynchronously — keeps this webhook fast and idempotent.
//
// AUTH: validates Twilio signature only. Public function (verify_jwt = false).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) data += key + params[key];
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return signature === expected;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const url = req.url;
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((v, k) => { params[k] = v.toString(); });

    const sig = req.headers.get('x-twilio-signature') ?? '';
    if (!TWILIO_AUTH_TOKEN || !sig
        || !(await validateTwilioSignature(TWILIO_AUTH_TOKEN, sig, url, params))) {
      console.warn('wk-voice-recording: invalid signature');
      return new Response('forbidden', { status: 403 });
    }

    const callSid = params.CallSid ?? '';
    const recordingSid = params.RecordingSid ?? '';
    const recordingUrl = params.RecordingUrl ?? '';     // Twilio media URL (no extension)
    const recordingDuration = parseInt(params.RecordingDuration ?? '0', 10) || 0;
    const recordingChannels = parseInt(params.RecordingChannels ?? '1', 10) || 1;

    if (!recordingSid || !recordingUrl) {
      return new Response('ok', { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Resolve the wk_calls row by sid (best-effort — the call row may not
    // exist yet if a webhook arrives out of order; the recording can still
    // be ingested and linked later).
    let callId: string | null = null;
    if (callSid) {
      const { data: call } = await supabase
        .from('wk_calls')
        .select('id')
        .eq('twilio_call_sid', callSid)
        .maybeSingle();
      callId = call?.id ?? null;
    }

    // Recording row needs a non-null call_id (FK NOT NULL). If we couldn't
    // resolve the parent call, write to outbox and let the worker retry.
    if (!callId) {
      try {
        await supabase.from('wk_webhook_outbox').insert({
          event_kind: 'voice_recording',
          payload: { callSid, recordingSid, recordingUrl, recordingDuration, recordingChannels },
          status: 'pending',
        });
      } catch (e) {
        console.error('outbox insert failed:', e);
      }
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Insert recording row (idempotent on twilio_sid).
    const { error: recErr } = await supabase
      .from('wk_recordings')
      .upsert({
        call_id: callId,
        twilio_sid: recordingSid,
        twilio_media_url: recordingUrl,
        duration_sec: recordingDuration,
        channels: recordingChannels,
        status: 'pending',
      }, { onConflict: 'twilio_sid' });

    if (recErr) {
      console.warn('wk_recordings upsert failed, writing to outbox:', recErr.message);
      try {
        await supabase.from('wk_webhook_outbox').insert({
          event_kind: 'voice_recording',
          payload: { callSid, recordingSid, recordingUrl, recordingDuration, recordingChannels },
          status: 'pending',
        });
      } catch (e2) {
        console.error('outbox insert also failed:', e2);
      }
    } else {
      // Enqueue ingest job (download Twilio media → upload to Supabase storage)
      try {
        await supabase.from('wk_jobs').insert({
          kind: 'recording_ingest',
          payload: { recording_sid: recordingSid, call_sid: callSid },
          status: 'pending',
        });
      } catch (e) {
        console.warn('wk_jobs insert failed (non-fatal):', e);
      }
    }

    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (e) {
    console.error('wk-voice-recording error', e);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
