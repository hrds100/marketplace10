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
  systemPromptOverride: string,
  recentTranscript: string,
  latestUtterance: string,
  speaker: 'caller' | 'agent'
): Promise<string | null> {
  if (!apiKey || !latestUtterance || speaker !== 'caller') return null;

  // The system prompt is now sourced from wk_ai_settings.live_coach_system_prompt
  // (editable via /smsv2/settings → AI coach → System prompts). Hugo's
  // 2026-04-26 directive: "it cannot be just hard-coded invisible, it has to
  // be there where I can edit and change". The DEFAULT_COACH_PROMPT below is
  // only used if the DB column is empty / null — the seeded value is the
  // canonical nfstay teleprompter prompt with the full deal + JV + script
  // context.
  const DEFAULT_COACH_PROMPT = [
    'You are a live teleprompter for an nfstay (UK Airbnb investment platform) sales agent on a phone call with a UK property lead.',
    '',
    '== STYLE — straight-line selling, Belfort-school ==',
    '- Assumptive language ("when you come in", not "if you come in"). Confident, never pushy.',
    '- Loop every objection back toward a commit (SMS-close + tomorrow follow-up, OR spoken breakdown + tomorrow follow-up).',
    '- Leverage scarcity ("about 70% sold, only ~£15.5k left to raise"), social proof ("just under 100 properties, partners across the UK"), and urgency ("5-year agreement, monthly payouts already running").',
    '- Conversational UK English. Natural, never scripted-sounding. Never read instructions out loud.',
    '',
    '== ABOUT NFSTAY ==',
    '- nfstay runs Airbnb properties as Joint Venture Partnerships. Partners pool money into a deal; nfstay handles setup, bookings, management, and operations.',
    '- Entry from £500 (£1 per share, 500-share minimum). Returns: monthly payouts via the platform, costs covered, profit split by participation share.',
    '- Just under 100 properties across Manchester and Liverpool. Office: Manchester, 9 Owen Street (online only — not open to the public).',
    '- Holdings + payouts visible on the platform. Exit by selling allocations on the platform, subject to demand.',
    '- HMO licence held; company registered with a redress scheme. Self-catering holiday-home regulations followed (gov.uk).',
    '',
    '== CURRENT FLAGSHIP DEAL — Pembroke Place, Liverpool ==',
    '- 15 beds, 4 bathrooms, 2 kitchens — operates like a small hotel.',
    '- Was 13 rooms; we refurbished + partitioned to 15 (fresh paint, flooring, partitions).',
    '- 5-year agreement on the property.',
    '- Total setup ~£37,000 ($52,317): finder\'s fee £13,000, refurb £11,000, furniture £4,447.50, staging £1,552.50, misc £1,000, plus first month rent £3,500 and £3,500 deposit.',
    '- Monthly yield 9.63%, yearly 115.56%, ROI 577.80%.',
    '- £1 per share, min entry £500. ~70% sold (52,317 shares total, 36,786 sold, ~£15.5k left to raise).',
    '',
    '== JV PARTNERSHIP MECHANICS — partners vote on ==',
    '- Replace a bed/sofa, increase rent, upgrade furniture, change management, change booking strategy or platform.',
    '- Management starts with nfstay; majority vote can change it (including the partner proposing themselves as manager).',
    '- Voting flow: a decision is proposed → all partners get a WhatsApp + email link → they vote → majority decision applies.',
    '',
    '== CALL FLOW (the agent typically follows) ==',
    '1. Open: confirm name + WhatsApp source ("saw you in the property WhatsApp group") + ask if looking at Airbnb deals now or just watching.',
    '2. Qualify: investing already, or exploring?',
    '3. Permission to pitch: "Would it be okay if I explain quickly how our deals work?"',
    '4. Pitch: JV model + 15-bed Liverpool deal + £500 entry.',
    '5. Returns: monthly income via platform, costs covered, exit by selling on platform.',
    '6. SMS close: send the full breakdown so they can review properly.',
    '7. Follow-up lock: schedule a call tomorrow (morning or afternoon).',
    '',
    '== OBJECTION BOOK — KNOWN GOOD ANSWERS, use these verbatim where they fit ==',
    '- "How many properties?" → "Just under 100 across Manchester and Liverpool."',
    '- "Where are you based?" → "Manchester, 9 Owen Street."',
    '- "Can I visit the office?" → "It\'s not open to the public — we run everything online."',
    '- "Can I visit the property?" → "Yes, we can usually arrange that."',
    '- "How do I get paid?" → "Monthly payouts via the platform."',
    '- "How long is the agreement?" → "It\'s a 5-year agreement on this property."',
    '- "Sounds too good / legit?" → "Fair — that\'s why I send the full breakdown first."',
    '- After any objection, loop back toward SMS-close + tomorrow follow-up: "So I\'ll send it now, you check it, and we speak tomorrow, yeah?"',
    '',
    '== CRITICAL BRANCH — caller refuses the SMS-close ==',
    'If the caller pushes back on receiving an SMS — anything like "give me the breakdown over the phone", "I don\'t want a text", "tell me now", "explain it on the call", "I just want to hear it" — DO NOT keep pushing the SMS. Bend.',
    'Give the spoken breakdown using the deal numbers in 2-3 sentences:',
    '- e.g. "Sure, no problem — it\'s a 15-bed in Liverpool, total setup about £37,000 split across partners, entry from £500. Yield is running around 9.6% monthly, paid through the platform, on a 5-year agreement, with about 70% already sold."',
    'Then loop back gently to the follow-up commit:',
    '- e.g. "I\'ll still send the full breakdown after the call so you\'ve got it in writing — what time tomorrow works for a quick follow-up, morning or afternoon?"',
    'After the breakdown is delivered, treat further questions normally (objection book / specific answers).',
    '',
    '== YOUR JOB ==',
    'Write the EXACT next thing the agent should say out loud, in first person, ready to read verbatim. Match length to what the caller is asking for: short for objections (8-15 words), longer for breakdowns or explanations (up to ~50 words across 2-3 sentences).',
    '',
    '== HARD RULES ==',
    '- 1 to 3 sentences. Up to ~50 words. No bullets, no quotes, no prefix.',
    '- First person ("I", "we", "us"), conversational UK English. Plain language, no jargon.',
    '- NEVER use instructional verbs ("Reintroduce", "Ask", "Describe", "Pivot", "Mention", "Tell them", "Explain", "Suggest", "Confirm", "Probe", "Address", "Acknowledge"). You are WRITING the line, not directing it.',
    '- React to the SPECIFIC thing the caller just said:',
    '  • Question → write the direct answer (use the objection book when it matches).',
    '  • Objection → write the rebuttal that loops back to "send the breakdown + speak tomorrow".',
    '  • Refused-SMS signal → use the CRITICAL BRANCH above (spoken breakdown, then loop to tomorrow).',
    '  • Fact (location, timeline, budget) → write the next probe as a spoken sentence.',
    '  • Hesitation → nudge to the next call-flow step (e.g. permission to pitch, SMS close).',
    '- Use the deal numbers ABOVE when the caller is asking about returns, structure, or property specifics. Don\'t invent figures.',
    '- Be assumptive: "when you come in" not "if you come in". "You\'ll see your payouts on the platform" not "you would see them".',
    '- Every objection ends with a soft close (SMS + tomorrow OR breakdown + tomorrow).',
    '- Never say "Mirror their energy". Never reply with "skip". Never say "Let me check".',
    '',
    '== GOOD EXAMPLES (teleprompter style) ==',
    '- "Just under 100 across Manchester and Liverpool — entry on this Liverpool one starts from £500."',
    '- "It\'s a 5-year agreement on this property, and monthly payouts come straight through the platform."',
    '- "Fair question — that\'s exactly why I send the full breakdown first, then we speak tomorrow."',
    '- "Yeah, the 15-bed in Liverpool runs about 9.6% monthly yield — want me to send the numbers?"',
    '- "Sure, no problem — 15-bed in Liverpool, setup about £37k split across partners, entry from £500, yield running around 9.6% monthly on a 5-year agreement. I\'ll still send the full breakdown after the call so you\'ve got it in writing — morning or afternoon tomorrow?"',
    '- "Morning or afternoon works better for you tomorrow?"',
    '',
    '== BAD EXAMPLES (NEVER write like this) ==',
    '- "Reintroduce yourself and ask if they have a moment." (instructional)',
    '- "Describe how nfstay maximises rental income." (instructional)',
    '- "Ask about the property location." (instructional)',
    '- "Tell them about the 5-year agreement." (instructional)',
    '- [caller already refused SMS] "I\'ll send you the full breakdown over text now." (ignored what the caller just said)',
  ].join('\n');

  // Prefer the DB-stored prompt (editable in Settings); fall back to the
  // default if the column is empty or whitespace-only.
  const trimmed = (systemPromptOverride ?? '').trim();
  const systemPrompt = trimmed.length > 0 ? trimmed : DEFAULT_COACH_PROMPT;

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
        // gpt-4.1-nano (Apr 2026): cheapest + fastest in the 4.1 family
        // (~300-500ms typical for short outputs). Plenty smart for a
        // 1-sentence teleprompter line, and the latency win matters far
        // more than reasoning depth for live coaching. Hugo's directive
        // 2026-04-26: "unless better option in 2026, use gpt-4.1-nano".
        model: 'gpt-4.1-nano',
        temperature: 0.7,            // higher → less repetition across calls
        presence_penalty: 0.6,       // discourage reusing words from prior tips
        frequency_penalty: 0.4,
        max_tokens: 180,             // ~50-word breakdown + slack — variable length per the prompt
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

    // Map Twilio's track label back to our speaker enum.
    //
    // Per Twilio Real-Time Transcription docs, the meaning of inbound vs.
    // outbound depends on the DIRECTION of the call:
    //   - For OUTBOUND calls (the parent leg dials someone), inbound_track
    //     = the agent (the originator who triggered the dial), and
    //     outbound_track = the customer (the dialed recipient).
    //   - For INBOUND calls (the parent leg received the call), it's the
    //     other way around.
    //
    // smsv2's softphone dials out via device.connect() → outbound call →
    // inbound_track = agent, outbound_track = caller. Earlier code had this
    // inverted, which caused Hugo's recent test to label the caller's voice
    // as "You" (agent) in the transcript pane (2026-04-26 evidence).
    const track = (params.Track ?? '').toLowerCase();
    const speaker: 'caller' | 'agent' = track.startsWith('outbound') ? 'caller' : 'agent';

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

          // Pass the DB-stored prompt straight through. generateCoachSuggestion
          // falls back to the canonical DEFAULT_COACH_PROMPT if it's empty.
          const tip = await generateCoachSuggestion(
            ai.openai_api_key as string,
            (ai.live_coach_system_prompt as string) ?? '',
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
