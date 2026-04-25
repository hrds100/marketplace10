// wk-voice-twiml-outgoing — TwiML response when the browser Voice SDK initiates a dial.
//
// FLOW:
//   1. Agent presses "Call" in the softphone — Voice SDK connects to Twilio.
//   2. Twilio POSTs to this URL (configured on the TwiML App) with form-encoded params:
//      To=<dialed number>, From=client:<identity>, CallSid=<sid>, ...
//   3. We validate the X-Twilio-Signature, log the call into wk_calls, and return TwiML
//      that bridges to the dialed number with the agent's caller-ID and recording on.
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
    const url = req.url;
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((v, k) => { params[k] = v.toString(); });

    // Validate Twilio signature
    const sig = req.headers.get('x-twilio-signature') ?? '';
    if (!TWILIO_AUTH_TOKEN || !sig
        || !(await validateTwilioSignature(TWILIO_AUTH_TOKEN, sig, url, params))) {
      console.warn('wk-voice-twiml-outgoing: invalid signature');
      return new Response('<Response><Reject/></Response>', {
        status: 403,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const to = (params.To ?? '').trim();
    const fromClient = (params.From ?? '').trim();    // expected: "client:<uuid>"
    const callSid = params.CallSid ?? '';
    const identity = fromClient.startsWith('client:') ? fromClient.slice(7) : null;

    if (!to) {
      return new Response('<Response><Say>Missing destination.</Say></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Resolve agent + caller-ID number
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    let callerIdE164: string | null = null;
    let agentId: string | null = null;
    let numberId: string | null = null;

    if (identity) {
      agentId = identity;
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_caller_id_number_id')
        .eq('id', identity)
        .maybeSingle();
      if (profile?.default_caller_id_number_id) {
        const { data: num } = await supabase
          .from('wk_numbers')
          .select('id, e164')
          .eq('id', profile.default_caller_id_number_id)
          .maybeSingle();
        if (num) {
          callerIdE164 = num.e164;
          numberId = num.id;
        }
      }
      // Fallback: first voice-enabled number
      if (!callerIdE164) {
        const { data: anyNum } = await supabase
          .from('wk_numbers')
          .select('id, e164')
          .eq('voice_enabled', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (anyNum) {
          callerIdE164 = anyNum.e164;
          numberId = anyNum.id;
        }
      }
    }

    // Best-effort log into wk_calls (failures don't break the dial)
    try {
      await supabase.from('wk_calls').insert({
        twilio_call_sid: callSid,
        agent_id: agentId,
        number_id: numberId,
        direction: 'outbound',
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('wk_calls insert failed (continuing):', e);
    }

    // Build TwiML — record both legs, hit our status webhook for completion
    const statusUrl = `${PUBLIC_FN_BASE}/wk-voice-status`;
    const recordingUrl = `${PUBLIC_FN_BASE}/wk-voice-recording`;
    const callerId = callerIdE164 ? `callerId="${escapeXml(callerIdE164)}"` : '';
    const dial = [
      `<Dial ${callerId} answerOnBridge="true" record="record-from-answer-dual"`,
      `      recordingStatusCallback="${escapeXml(recordingUrl)}"`,
      `      recordingStatusCallbackEvent="completed"`,
      `      action="${escapeXml(statusUrl)}"`,
      `      method="POST">`,
      `  <Number>${escapeXml(to)}</Number>`,
      `</Dial>`,
    ].join('\n');

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${dial}\n</Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (e) {
    console.error('wk-voice-twiml-outgoing error', e);
    return new Response('<Response><Say>System error.</Say></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
