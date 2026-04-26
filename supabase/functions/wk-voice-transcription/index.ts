// wk-voice-transcription — Twilio Real-Time Transcription webhook receiver.
//
// Why this exists:
//   The earlier <Start><Stream> + Supabase WebSocket bridge approach
//   failed reliably (Twilio error 31920) because Supabase Edge Functions'
//   WebSocket layer is unreliable for inbound Twilio Media Streams
//   connections. We've switched to Twilio's native Real-Time Transcription
//   verb which delivers transcripts over HTTP POST — no WebSocket needed.
//
// Flow:
//   1. wk-voice-twiml-outgoing emits <Start><Transcription
//      statusCallbackUrl="…/wk-voice-transcription" track="both_tracks"/>
//   2. Twilio transcribes both legs of the call in real time and POSTs
//      transcript chunks here as they're produced.
//   3. We INSERT each chunk into wk_live_transcripts (LiveTranscriptPane
//      subscribes via Supabase realtime → live UI).
//   4. For caller utterances, we async-POST the rolling transcript to
//      OpenAI Chat to generate coaching suggestions and INSERT them into
//      wk_live_coach_events (AI coach pane subscribes via realtime).
//
// AUTH: Twilio HMAC-SHA1 signature. URL is public (verify_jwt = false).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-twilio-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ----------------------------------------------------------------------------
// Twilio signature validation — same pattern as wk-voice-twiml-outgoing.
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// Coaching — fire OpenAI Chat per caller utterance, in the background. We
// don't want to block returning 200 to Twilio (which may retry or get noisy).
// ----------------------------------------------------------------------------

async function generateCoachSuggestion(
  apiKey: string,
  _systemPromptIgnoredForNow: string,
  recentTranscript: string,
  latestUtterance: string,
  speaker: 'caller' | 'agent'
): Promise<string | null> {
  if (!apiKey || !latestUtterance || speaker !== 'caller') return null;

  // Teleprompter-style coach. Hugo's feedback (2026-04-26): "you need to say
  // EXACTLY what to say". The previous prompt produced meta-guidance like
  // "Reintroduce yourself and ask if they have a moment to talk" — useful as
  // an instruction but useless on a live call where the agent needs words to
  // read aloud right now. We now demand a verbatim line, first person, ready
  // to speak. No instructional verbs ("Reintroduce / Describe / Ask / Pivot
  // to / Tell them"); the model must write the SCRIPT, not direct it.
  const systemPrompt = [
    'You are a live teleprompter for an NFSTAY rent-to-rent agent on a phone call with a UK landlord.',
    'NFSTAY signs landlords to a 3-5 year lease, then sublets short-term on Airbnb / Booking.com — landlord gets guaranteed rent (often above market), zero void months, no tenant management.',
    '',
    'Your job: write the EXACT next sentence the agent should say out loud, in first person, ready to read verbatim.',
    '',
    'Hard rules:',
    '- Reply with ONE spoken line only, 8-25 words. No bullets, no quotes, no prefix.',
    '- First person ("I", "we", "us"), conversational, plain English. UK spelling.',
    '- NEVER use instructional verbs like "Reintroduce", "Ask", "Describe", "Pivot", "Mention", "Tell them", "Explain", "Suggest", "Confirm". You are writing the line, not giving directions about it.',
    '- React to the SPECIFIC thing the caller just said. If they asked a question, write the answer. If they objected, write the rebuttal. If they shared a fact, write the next probe — all as a sentence the agent says next.',
    '- Never say "Mirror their energy". Never reply with "skip".',
    '',
    'Good examples (teleprompter style):',
    '- "Totally fair — most landlords ask that. We sign a 3-5 year lease and pay you a fixed monthly rent regardless of bookings."',
    '- "Sounds like the boiler is the bottleneck — would you want us to handle that maintenance under our lease?"',
    '- "Perfect, a 2-bed in Manchester city centre normally clears around £2,400 a month for us — could that work for you?"',
    '',
    'Bad examples (NEVER write like this):',
    '- "Reintroduce yourself and ask if they have a moment." (instructional)',
    '- "Describe how NFSTAY maximizes rental income." (instructional)',
    '- "Ask about the property location." (instructional)',
  ].join('\n');

  const userMsg = [
    'Recent conversation (most recent line at bottom):',
    recentTranscript || '(no prior context yet)',
    '',
    `Caller just said: "${latestUtterance}"`,
    '',
    'Write the EXACT next sentence the agent should say (first person, verbatim, no instructions):',
  ].join('\n');

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,            // higher → less repetition across calls
        presence_penalty: 0.6,       // discourage reusing words from prior tips
        frequency_penalty: 0.4,
        max_tokens: 90,              // ~25-word teleprompter line + slack
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg },
        ],
      }),
    });
    if (!resp.ok) {
      console.warn('[wk-voice-transcription] openai chat failed', resp.status);
      return null;
    }
    const j = await resp.json();
    let text = String(j?.choices?.[0]?.message?.content ?? '').trim();
    if (!text) return null;
    // Strip leading "Tip:" / "Coach:" / leading dash, etc.
    text = text.replace(/^["“”'`]*(tip|coach|suggestion|say|script)\s*[:\-—]\s*/i, '').replace(/^[-•—]\s*/, '').trim();
    text = text.replace(/^["“”'`]+|["“”'`]+$/g, '').trim();
    if (!text) return null;
    if (/^skip\.?$/i.test(text)) return null;
    if (/mirror\s+(their|the)\s+energy/i.test(text)) return null; // belt-and-braces
    // Reject instructional output that slipped through. The model still
    // sometimes opens with "Reintroduce…", "Ask…", "Describe…" — drop it
    // rather than mislead the agent. Better no card than a meta-instruction.
    if (/^(reintroduce|ask\b|describe\b|pivot\b|mention\b|tell them\b|explain\b|suggest\b|confirm\b|probe\b|emphasi[sz]e\b|highlight\b|address\b|acknowledge\b|reassure\b|offer\b|propose\b|invite\b|encourage\b|remind\b|clarify\b|share\b|present\b|discuss\b|outline\b|summari[sz]e\b)/i.test(text)) {
      console.warn('[wk-voice-transcription] coach produced instructional output, dropping:', text);
      return null;
    }
    return text;
  } catch (e) {
    console.warn('[wk-voice-transcription] openai chat threw', e);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Main handler
// ----------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Twilio signs the public URL it POSTed to, not the proxied internal URL.
    const url = `${SUPABASE_URL}/functions/v1/wk-voice-transcription`;
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((v, k) => { params[k] = v.toString(); });

    const sig = req.headers.get('x-twilio-signature') ?? '';
    if (!TWILIO_AUTH_TOKEN || !sig
        || !(await validateTwilioSignature(TWILIO_AUTH_TOKEN, sig, url, params))) {
      console.warn('[wk-voice-transcription] invalid Twilio signature');
      return new Response('forbidden', { status: 403, headers: corsHeaders });
    }

    const event = params.TranscriptionEvent ?? '';
    const callSid = params.CallSid ?? '';
    if (!callSid) {
      return new Response('missing CallSid', { status: 200, headers: corsHeaders });
    }

    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Resolve our wk_calls.id once (Twilio sends multiple events per call).
    const { data: call } = await supa
      .from('wk_calls')
      .select('id, ai_coach_enabled')
      .eq('twilio_call_sid', callSid)
      .maybeSingle();

    if (!call) {
      console.warn('[wk-voice-transcription] call not found', callSid);
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    if (event === 'transcription-started') {
      await supa.from('wk_calls').update({ ai_status: 'running' }).eq('id', call.id);
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    if (event === 'transcription-stopped' || event === 'transcription-error') {
      if (event === 'transcription-error') {
        await supa.from('wk_calls').update({ ai_status: 'failed' }).eq('id', call.id);
      }
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    if (event !== 'transcription-content') {
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    // Twilio packs the actual transcript inside a JSON-encoded
    // `TranscriptionData` field on the form body.
    const dataJson = params.TranscriptionData ?? '';
    let transcriptText = '';
    let confidence = 0;
    try {
      const parsed = JSON.parse(dataJson) as { transcript?: string; confidence?: number };
      transcriptText = String(parsed.transcript ?? '').trim();
      confidence = Number(parsed.confidence ?? 0);
    } catch {
      transcriptText = '';
    }
    const isFinal = (params.Final ?? '').toLowerCase() === 'true';
    if (!transcriptText || !isFinal) {
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    // Map Twilio's track label back to our speaker enum. Default labels are
    // "inbound_track" / "outbound_track"; the TwiML can override them with
    // inboundTrackLabel/outboundTrackLabel. From the agent's outbound dial:
    //   - inbound_track  = the caller (the person Twilio dialed)
    //   - outbound_track = the agent (Twilio Client → bridged in)
    const track = (params.Track ?? '').toLowerCase();
    const speaker: 'caller' | 'agent' = track.startsWith('outbound') ? 'agent' : 'caller';

    // Persist transcript line — LiveTranscriptPane subscribes via realtime
    // and renders this within ~250ms.
    await supa.from('wk_live_transcripts').insert({
      call_id: call.id,
      speaker,
      body: transcriptText,
    });

    // Coaching path — only when AI is enabled for THIS call AND the caller
    // (not the agent) just spoke. Use EdgeRuntime.waitUntil so the async
    // pipeline survives past the 200 response to Twilio. A bare `void async`
    // IIFE gets torn down by Deno Deploy / Supabase Edge Functions when the
    // handler returns; transcripts INSERT but coach calls die mid-flight.
    if (call.ai_coach_enabled && speaker === 'caller') {
      const coachPromise = (async () => {
        try {
          const { data: ai } = await supa
            .from('wk_ai_settings')
            .select('ai_enabled, live_coach_enabled, openai_api_key, live_coach_system_prompt')
            .limit(1)
            .maybeSingle();
          if (!ai?.ai_enabled || !ai?.live_coach_enabled || !ai?.openai_api_key) return;

          // Build a rolling 6-line context window from recent transcripts.
          const { data: recent } = await supa
            .from('wk_live_transcripts')
            .select('speaker, body, ts')
            .eq('call_id', call.id)
            .order('ts', { ascending: false })
            .limit(6);
          const ctx = (recent ?? [])
            .reverse()
            .map((r: { speaker: string; body: string }) =>
              `${r.speaker === 'agent' ? 'Agent' : 'Caller'}: ${r.body}`
            )
            .join('\n');

          const tip = await generateCoachSuggestion(
            ai.openai_api_key as string,
            (ai.live_coach_system_prompt as string) || 'You are a sales coach for a UK property landlord. Always reply with one short, useful tip — never reply with "skip".',
            ctx,
            transcriptText,
            speaker
          );
          if (!tip) return;

          const kind = tip.endsWith('?') ? 'question' : 'suggestion';
          await supa.from('wk_live_coach_events').insert({
            call_id: call.id,
            kind,
            body: tip,
          });
        } catch (e) {
          console.warn('[wk-voice-transcription] coach pipeline threw', e);
        }
      })();

      // Supabase Edge Functions expose EdgeRuntime.waitUntil to extend the
      // worker's lifetime past the response. Without this, the OpenAI fetch
      // is killed when the function returns 200 to Twilio.
      // deno-lint-ignore no-explicit-any
      const er = (globalThis as any).EdgeRuntime;
      if (er && typeof er.waitUntil === 'function') {
        er.waitUntil(coachPromise);
      } else {
        // Fallback: still run but no lifetime guarantee.
        void coachPromise;
      }
    }

    return new Response('ok', { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error('[wk-voice-transcription] handler error', e);
    return new Response('ok', { status: 200, headers: corsHeaders });
  }
});
