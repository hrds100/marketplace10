// wk-voice-twiml-incoming — TwiML response when an inbound PSTN call hits a Twilio number.
//
// FLOW:
//   1. Caller dials our Twilio number — Twilio POSTs to this URL.
//   2. We validate the X-Twilio-Signature, look up the called number in wk_numbers,
//      pick a routing target (assigned agent → ring their browser <Client>;
//      otherwise fall back to voicemail).
//   3. We log the inbound leg into wk_calls and return TwiML.
//
// AUTH: validates Twilio signature only. Public function (verify_jwt = false).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const PUBLIC_FN_BASE = Deno.env.get('PUBLIC_FN_BASE')
  ?? `${SUPABASE_URL}/functions/v1`;

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

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Use the public URL Twilio POSTed to, not req.url (proxied internal).
    const url = `${SUPABASE_URL}/functions/v1/wk-voice-twiml-incoming`;
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((v, k) => { params[k] = v.toString(); });

    const sig = req.headers.get('x-twilio-signature') ?? '';
    if (!TWILIO_AUTH_TOKEN || !sig
        || !(await validateTwilioSignature(TWILIO_AUTH_TOKEN, sig, url, params))) {
      console.warn('wk-voice-twiml-incoming: invalid signature');
      return new Response('<Response><Reject/></Response>', {
        status: 403,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const to = (params.To ?? '').trim();          // our Twilio number (E.164)
    const from = (params.From ?? '').trim();      // caller's number
    const callSid = params.CallSid ?? '';

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Look up the called number in wk_numbers (so we know how to route)
    const { data: num } = await supabase
      .from('wk_numbers')
      .select('id, e164, assigned_agent_id, voicemail_greeting_url, unanswered_action, unanswered_message_url')
      .eq('e164', to)
      .maybeSingle();

    // 2026-07-06 (Hugo): per-number unanswered/busy behavior, set in
    // /crm/settings → Channels → Calls. 'message' = play the uploaded
    // audio and hang up (no voicemail). Anything else = legacy voicemail.
    const playMessageInstead =
      num?.unanswered_action === 'message' && !!num?.unanswered_message_url;
    const messageBlock = playMessageInstead
      ? [
          `<Play>${escapeXml(num!.unanswered_message_url as string)}</Play>`,
          `<Hangup/>`,
        ].join('\n')
      : null;

    // 2026-07-06 (Hugo): ring a GROUP, not just the single assigned agent.
    // Targets:
    //   - the number's assigned agent, but ONLY if they're still a
    //     workspace member (both numbers were assigned to Elijah, whose
    //     workspace_role is NULL — his client never registers, so inbound
    //     calls rang nobody for 25s)
    //   - every 'worker' profile (Shyra + Shanto) — Hugo: "call goes to
    //     them if they're logged in"
    // Multiple <Client> nouns in one <Dial> ring simultaneously; the first
    // to answer wins and Twilio cancels the rest. A target whose browser
    // isn't open just never rings — the others are unaffected.
    // Identity = profile UUID (matches what wk-voice-token grants).
    const ringIds = new Set<string>();
    if (num?.assigned_agent_id) {
      const { data: assigned } = await supabase
        .from('profiles')
        .select('id, workspace_role')
        .eq('id', num.assigned_agent_id)
        .maybeSingle();
      if (
        assigned?.workspace_role &&
        ['admin', 'agent', 'worker'].includes(assigned.workspace_role as string)
      ) {
        ringIds.add(assigned.id as string);
      }
    }
    const { data: workerRows } = await supabase
      .from('profiles')
      .select('id')
      .eq('workspace_role', 'worker');
    for (const w of workerRows ?? []) ringIds.add(w.id as string);

    // wk_calls attribution: keep the assigned agent when they're a valid
    // ring target, else null (whoever answers is bridged either way).
    const agentId: string | null =
      num?.assigned_agent_id && ringIds.has(num.assigned_agent_id)
        ? num.assigned_agent_id
        : null;

    // Best-effort log into wk_calls
    try {
      await supabase.from('wk_calls').insert({
        twilio_call_sid: callSid,
        agent_id: agentId,
        number_id: num?.id ?? null,
        direction: 'inbound',
        status: 'in_progress',
        from_e164: from,
        to_e164: to,
        started_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('wk_calls insert failed (continuing):', e);
    }

    const statusUrl = `${PUBLIC_FN_BASE}/wk-voice-status`;
    const recordingUrl = `${PUBLIC_FN_BASE}/wk-voice-recording`;
    const voicemailUrl = `${PUBLIC_FN_BASE}/wk-voicemail-transcribe`;

    // Route 1: agent online → ring their browser. If no answer in 25s,
    // fall through to voicemail.
    if (ringIds.size > 0) {
      // NOTE (2026-07-06): because <Dial> has an action URL, Twilio
      // CONTINUES with the TwiML that wk-voice-status returns when the
      // dial finishes — the verbs after </Dial> below are unreachable.
      // The unanswered/busy behavior (play the admin's uploaded message)
      // therefore lives in wk-voice-status' Dial-action branch, which
      // reads wk_numbers.unanswered_action for this number.
      const clientNouns = Array.from(ringIds).map(
        (id) => `  <Client>${escapeXml(id)}</Client>`
      );
      const dial = [
        `<Dial answerOnBridge="true" timeout="25"`,
        `      record="record-from-answer-dual"`,
        `      recordingStatusCallback="${escapeXml(recordingUrl)}"`,
        `      recordingStatusCallbackEvent="completed"`,
        `      action="${escapeXml(statusUrl)}"`,
        `      method="POST">`,
        ...clientNouns,
        `</Dial>`,
        `<Say voice="alice">Sorry, no agents are available right now. Please leave a message after the beep.</Say>`,
        `<Record maxLength="180" playBeep="true" finishOnKey="#"`,
        `        recordingStatusCallback="${escapeXml(voicemailUrl)}"`,
        `        recordingStatusCallbackEvent="completed"`,
        `        action="${escapeXml(statusUrl)}" method="POST"/>`,
      ].join('\n');
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${dial}\n</Response>`;
      return new Response(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Route 2: nobody to ring. If the number is set to 'message', play the
    // admin's audio and hang up (no voicemail). Otherwise voicemail as before.
    const greeting = num?.voicemail_greeting_url
      ? `<Play>${escapeXml(num.voicemail_greeting_url)}</Play>`
      : `<Say voice="alice">Thanks for calling. Please leave a message after the beep.</Say>`;
    const vm = messageBlock ?? [
      greeting,
      `<Record maxLength="180" playBeep="true" finishOnKey="#"`,
      `        recordingStatusCallback="${escapeXml(voicemailUrl)}"`,
      `        recordingStatusCallbackEvent="completed"`,
      `        action="${escapeXml(statusUrl)}" method="POST"/>`,
    ].join('\n');
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${vm}\n</Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (e) {
    console.error('wk-voice-twiml-incoming error', e);
    return new Response('<Response><Say>System error.</Say></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
