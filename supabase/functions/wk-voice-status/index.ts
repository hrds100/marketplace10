// wk-voice-status — Twilio call lifecycle webhook.
//
// Twilio POSTs here on:
//   - statusCallback events (initiated, ringing, answered, completed)
//   - <Dial action=...> (when a Dial verb finishes — gives DialCallStatus, DialCallDuration)
//   - <Record action=...> (after recording verb finishes)
//
// We update wk_calls (status, duration, ended_at), enqueue a post-call AI job
// when a call completes, and on any DB failure write to wk_webhook_outbox so
// reconciliation can retry later.
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

// Map Twilio CallStatus → our wk_calls.status enum
function mapStatus(twilioStatus: string): string {
  switch (twilioStatus) {
    case 'queued':
    case 'initiated':
    case 'ringing':
      return 'ringing';
    case 'in-progress':
    case 'answered':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'busy':
      return 'busy';
    case 'no-answer':
      return 'no_answer';
    case 'canceled':
      return 'canceled';
    case 'failed':
      return 'failed';
    default:
      return twilioStatus;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Use the public URL Twilio POSTed to, not req.url (proxied internal).
    const url = `${SUPABASE_URL}/functions/v1/wk-voice-status`;
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((v, k) => { params[k] = v.toString(); });

    const sig = req.headers.get('x-twilio-signature') ?? '';
    if (!TWILIO_AUTH_TOKEN || !sig
        || !(await validateTwilioSignature(TWILIO_AUTH_TOKEN, sig, url, params))) {
      console.warn('wk-voice-status: invalid signature');
      return new Response('forbidden', { status: 403 });
    }

    const callSid = params.CallSid ?? '';
    // Twilio reports the final status under different keys depending on
    // which webhook fired (statusCallback vs Dial action vs Record action).
    const twilioStatus = (
      params.CallStatus ?? params.DialCallStatus ?? params.RecordingStatus ?? ''
    ).trim();
    const duration = parseInt(
      params.CallDuration ?? params.DialCallDuration ?? '0',
      10
    ) || 0;
    const answeredBy = params.AnsweredBy ?? null;        // 'human' | 'machine_*' (AMD)

    if (!callSid) {
      return new Response('ok', { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const mapped = mapStatus(twilioStatus);
    const isTerminal = ['completed', 'busy', 'no_answer', 'canceled', 'failed'].includes(mapped);

    const update: Record<string, unknown> = { status: mapped };
    if (duration > 0) update.duration_sec = duration;
    if (answeredBy) {
      // Map Twilio AnsweredBy values onto our 2-value enum.
      update.answered_by = answeredBy.startsWith('machine') ? 'machine' : 'human';
    }
    if (isTerminal) update.ended_at = new Date().toISOString();

    const { error } = await supabase
      .from('wk_calls')
      .update(update)
      .eq('twilio_call_sid', callSid);

    if (error) {
      console.warn('wk_calls update failed, writing to outbox:', error.message);
      try {
        await supabase.from('wk_webhook_outbox').insert({
          event_kind: 'voice_status',
          payload: { callSid, params, mapped, duration, answeredBy },
          status: 'pending',
        });
      } catch (e2) {
        console.error('outbox insert also failed:', e2);
      }
    }

    // On terminal state → enqueue post-call AI + cost compute.
    if (isTerminal && mapped === 'completed') {
      try {
        await supabase.from('wk_jobs').insert([
          { kind: 'postcall_ai', payload: { call_sid: callSid }, status: 'pending' },
          { kind: 'compute_cost', payload: { call_sid: callSid }, status: 'pending' },
        ]);
      } catch (e) {
        console.warn('wk_jobs insert failed (non-fatal):', e);
      }
    }

    // Twilio expects a 200 with empty TwiML on action callbacks.
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (e) {
    console.error('wk-voice-status error', e);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
