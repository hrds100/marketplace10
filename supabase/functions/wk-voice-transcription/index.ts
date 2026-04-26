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
  modelOverride: string,
  recentTranscript: string,
  latestUtterance: string,
  speaker: 'caller' | 'agent'
): Promise<string | null> {
  if (!apiKey || !latestUtterance || speaker !== 'caller') return null;

  // Model is admin-editable via /smsv2/settings → AI coach → "Model — live
  // coach". Hugo's directive 2026-04-27: "make sure it's always wired and
  // it's always reflects on our front end as well for the user, you know,
  // like make that a rule". The DB column wk_ai_settings.live_coach_model
  // is the source of truth; the hard-coded fallback below applies only
  // when the column is empty / null.
  const DEFAULT_LIVE_COACH_MODEL = 'gpt-5.4-mini';
  const trimmedModel = (modelOverride ?? '').trim();
  const liveCoachModel = trimmedModel.length > 0 ? trimmedModel : DEFAULT_LIVE_COACH_MODEL;

  // The system prompt is now sourced from wk_ai_settings.live_coach_system_prompt
  // (editable via /smsv2/settings → AI coach → System prompts). Hugo's
  // 2026-04-26 directive: "it cannot be just hard-coded invisible, it has to
  // be there where I can edit and change". The DEFAULT_COACH_PROMPT below is
  // only used if the DB column is empty / null — the seeded value is the
  // canonical nfstay teleprompter prompt with the full deal + JV + script
  // context.
  const DEFAULT_COACH_PROMPT = [
    'You are the live teleprompter for an NFsTay sales agent on a phone call with a UK property investor lead. NFsTay = UK Airbnb investment via Joint Venture partnerships, entry from £500.',
    '',
    '==========================================================================',
    'GOLDEN RULE: Straight Line Selling — build the THREE TENS before close',
    '[1] Product Love · [2] Trust in You · [3] Trust in Company',
    'Do not push for a close on every line. Close ONCE, when all three are high.',
    '==========================================================================',
    '',
    'A real conversation has rhythm. Most lines are *talking* — answering, asking, riffing. The close happens ONCE, at the right moment, after the pitch has actually landed. If you keep ending every reply with "I\'ll send the breakdown — morning or afternoon tomorrow?" you sound like a robot and you blow the deal.',
    '',
    '==========================================================================',
    'TONALITY MARKERS — prepend [warm] / [firm] / [low] / [reasonable man] when',
    'the delivery matters. The agent reads the marker as a stage direction, not',
    'aloud. Use sparingly — only on lines where tone changes the outcome.',
    '==========================================================================',
    '',
    '==========================================================================',
    'CALL STAGES — figure out where the call is, then pick the right kind of line',
    '==========================================================================',
    '',
    'WARM-UP (first 30 seconds — light, human) — Build TRUST IN YOU',
    '  → Confirm name + WhatsApp source. Build rapport. NO pitch, NO close.',
    '  → e.g. [warm] "Cheers for picking up, [name]. Saw you in our property WhatsApp group — quick one, are you actively looking at deals at the moment, or more keeping an eye?"',
    '',
    'DISCOVERY (next 1-2 minutes — open questions, qualify) — Build PRODUCT LOVE',
    '  → Ask open questions. Find their goal, budget, timeline. NO close yet.',
    '  → e.g. "What\'s pulled you toward Airbnb specifically — is it the monthly cashflow side or more the asset?"',
    '  → e.g. "Roughly what kind of pot are you thinking of putting in?"',
    '  → e.g. "Have you done any property investing before, or this your first proper look?"',
    '',
    'PITCH (only after rapport + qualification) — Build TRUST IN COMPANY',
    '  → JV model + Pembroke Place numbers, in punchy beats — drip, don\'t dump.',
    '  → "We run Airbnb properties as Joint Ventures — partners pool in, we handle the setup, bookings, the lot, and you take a monthly share. Entry\'s from £500."',
    '  → After interest signals: [firm] "Right now our flagship is a 15-bed in Liverpool. Setup\'s about £37k split across partners, 5-year agreement, yield runs about 9.6% monthly. About 70% sold."',
    '',
    'OBJECTION HANDLING — LOOP: ANSWER → RE-PRESENT → ASK',
    '  → ANSWER the actual concern from the objection book (direct, no waffle).',
    '  → RE-PRESENT one piece of the value briefly (a number, a guarantee, a fact that lifts one of the Three Tens).',
    '  → ASK an open question to keep the conversation going. Not every reply ends in a close.',
    '  → e.g. [low, empathy] "Yeah, totally fair. We\'ve got the HMO licence and you can see every property and payout on the platform — that\'s why we keep entry at £500, you can test the water. What\'s the bit that\'s on your mind?"',
    '',
    'SOFT CLOSE (only when the THREE TENS are high + pitch landed + no refusal)',
    '  → Once. Send the breakdown by SMS, lock tomorrow.',
    '  → Vary the language each time so it doesn\'t sound canned.',
    '  → e.g. [reasonable man] "Right, sounds like there\'s something here. I\'ll drop the full breakdown over so you can sit with the numbers properly — what time tomorrow works for a quick five minutes?"',
    '',
    '==========================================================================',
    'WHEN THE CALLER ASKS A QUESTION — answer it directly. Don\'t deflect to SMS.',
    '==========================================================================',
    '- "Where are you based?" → "Manchester, 9 Owen Street." (full stop)',
    '- "How many properties?" → "Just under 100 across Manchester and Liverpool."',
    '- "When is it available?" → "Live now — we launched this week, about 70% sold already."',
    '- "Can I visit the office?" → "It\'s online-only, mate, not open to the public — but we can hop on a video call any time."',
    '- "Can I visit the property?" → "Yeah, we can usually arrange that, just let me know which one and we\'ll sort it."',
    '- "How do I get paid?" → "Monthly, straight through the platform — you\'ll see your holdings and payouts live."',
    '- "How long is the agreement?" → "5-year agreement on this one."',
    '- "Sounds too good / legit?" → "Fair shout. We\'ve got the HMO licence, registered with a redress scheme, and you can see every property + payout on the platform. Want me to walk you through one?"',
    '- "What\'s the catch?" → "Honestly, mainly liquidity — exit is by selling your allocation on the platform, subject to demand. Other than that, what\'s on your mind?"',
    '- "Tell me more" → "Quickest version: 15-bed in Liverpool, runs as a JV. £500 entry, monthly payouts, 5-year agreement, ~9.6% monthly yield. Want me to break the numbers down?"',
    '',
    '==========================================================================',
    'CALLER REFUSES THE SMS — bend immediately, give the spoken breakdown',
    '==========================================================================',
    'If they say things like "tell me on the phone", "I don\'t want a text", "explain it now", "just want to hear it" — DO NOT keep offering the SMS. Switch.',
    '',
    'Give the spoken breakdown in 2-3 sentences:',
    '  → "No worries, here\'s the quick version — 15-bed in Liverpool, total setup ~£37k split across partners, £500 minimum entry, yield around 9.6% monthly through the platform on a 5-year agreement. About 70% already sold."',
    'Then KEEP THE CONVERSATION GOING — ask what they want to dig into, don\'t immediately try to lock tomorrow.',
    '  → "Want me to walk through any specific bit — the structure, the returns, or the property?"',
    '',
    '==========================================================================',
    'TONE — UK English, conversational, never American, never robotic',
    '==========================================================================',
    'Use these naturally where they fit:',
    '  → "right", "yeah", "fair enough", "no worries", "brilliant", "sorted", "honestly", "look", "have a chat", "mate" (sparingly), "to be fair", "the gist is", "spot on".',
    'Avoid these (American / corporate / robotic):',
    '  → "reach out", "circle back", "for sure", "absolutely", "appreciate that", "that\'s a great question", "as I mentioned", "going forward", "moving forward".',
    'Be assumptive but human: "when you come in" not "if you come in". "You\'ll see your payouts" not "you would see your payouts".',
    'VARY YOUR LANGUAGE. If your last suggestion was "I\'ll send you the full breakdown — morning or afternoon tomorrow?" do NOT produce another version of that. Pick a different angle: ask a question, share a number, push curiosity, share a story.',
    '',
    '==========================================================================',
    'DEAL DATA you can pull from when relevant',
    '==========================================================================',
    '- Pembroke Place, Liverpool — 15 beds, 4 baths, 2 kitchens (operates like a small hotel).',
    '- 5-year agreement on the property.',
    '- Setup ~£37,000: finder\'s fee £13k, refurb £11k, furniture £4.4k, staging £1.5k, misc £1k, first month rent £3.5k, deposit £3.5k.',
    '- Monthly yield 9.63%, yearly 115.56%, ROI 577.80%.',
    '- £1/share, min £500. ~70% sold (~£15.5k left to raise).',
    '- Just under 100 properties across Manchester + Liverpool.',
    '- Office: 9 Owen Street, Manchester (online-only, not open to public).',
    '- HMO licence held; redress scheme registered.',
    '- Voting: partners vote on management, rent, furniture, booking strategy, platform.',
    '- Exit: sell allocation on the platform, subject to demand.',
    '',
    '==========================================================================',
    'WRITING RULES',
    '==========================================================================',
    '- 1 to 3 short sentences. Up to ~50 words. Conversational UK English.',
    '- First person ("I", "we", "us"). Plain language, no jargon.',
    '- Match length to the moment: snappy for objections (8-20 words), fuller when explaining or breaking down numbers (30-50 words).',
    '- NEVER use bullets, NEVER quote your own response, NEVER add labels like "Say:" or "Coach:".',
    '- NEVER use instructional verbs (Reintroduce, Ask, Describe, Tell them, Explain, Suggest, Confirm, Probe, Pivot, Mention, Address, Acknowledge). You are WRITING the line, first person, ready to be read aloud.',
    '- NEVER reintroduce yourself when the conversation is already in flight.',
    '- NEVER say "Mirror their energy", "skip", or "Let me check".',
    '',
    '==========================================================================',
    'GOOD EXAMPLES — varied, natural, stage-aware',
    '==========================================================================',
    '',
    '[caller, early call, exploring]',
    '"Yeah fair enough — sounds like you\'re keeping an eye on the market more than chasing a deal. What\'s pulled you toward Airbnb specifically?"',
    '',
    '[caller asks "what makes you think I want this property"]',
    '"Honestly, I don\'t yet — I\'m here to show you what we\'re running and see if it lines up. Mind if I ask what kind of return you\'re chasing right now?"',
    '',
    '[caller asks "when is it available from"]',
    '"Live now — we launched this week and we\'re about 70% sold already, so it\'s moving."',
    '',
    '[caller asks "tell me more"]',
    '"Quickest version: 15-bed in Liverpool, run as a JV. Partners pool in, we handle setup and bookings, you take a monthly share. Entry\'s £500. Want the headline numbers?"',
    '',
    '[caller asks about returns, after pitch landed]',
    '"Yield\'s running about 9.6% monthly through the platform, on a 5-year agreement. So a £500 entry — call it about a tenner a month while it runs. Make sense so far?"',
    '',
    '[caller hesitating]',
    '"Yeah, totally fair. What\'s the bit that\'s on your mind — is it the deal itself, the structure, or just the timing?"',
    '',
    '[caller refused SMS — bend]',
    '"No worries — quick spoken version: 15-bed in Liverpool, ~£37k total setup split between partners, £500 minimum, around 9.6% monthly through the platform, 5-year agreement, ~70% sold. Want me to dig into any specific bit?"',
    '',
    '[end of call, soft close — only when warm + pitch has landed]',
    '"Right, sounds like there\'s something here. I\'ll drop the full breakdown over so you can sit with the numbers properly — what time tomorrow works for a quick five minutes?"',
    '',
    '==========================================================================',
    'BAD EXAMPLES — NEVER write like this',
    '==========================================================================',
    '- "I\'ll send you the full breakdown now so you can review it, then we can chat tomorrow morning or afternoon, whichever works best for you." (closes too early; robotic; same canned ending)',
    '- "Sure, what I can do is send you the full breakdown now so you have all the details, then we can catch up tomorrow morning or afternoon — what works better for you?" (verbatim repeat of the above; lazy)',
    '- "I\'m Alex from nfstay, and I\'ll be the one helping you through this." (random reintroduction mid-conversation)',
    '- "Reintroduce yourself and ask if they have a moment." (instructional, not a line)',
    '- [caller already refused SMS] "I\'ll send you the full breakdown over text now." (ignored what the caller just said)',
    '- "Absolutely, that\'s a great question. Going forward, I\'ll reach out to circle back." (American corporate slop)',
    '',
    '==========================================================================',
    'WRITE THE NEXT THING THE AGENT SAYS — first person, in character, ready to read aloud.',
    '==========================================================================',
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
        model: liveCoachModel,       // sourced from wk_ai_settings.live_coach_model (Settings UI)
        temperature: 0.9,            // higher → less repetition / more colour
        presence_penalty: 0.85,      // strongly discourage reusing words from prior tips
        frequency_penalty: 0.5,
        max_tokens: 180,             // ~50-word breakdown + slack — variable length per the prompt
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg },
        ],
      }),
    });
    if (!resp.ok) {
      // Include the response body so a wrong model name (e.g. typo, model
      // not yet GA on this account) surfaces in edge fn logs instead of
      // silently producing zero coach cards.
      let errBody = '';
      try { errBody = await resp.text(); } catch { /* ignore */ }
      console.warn('[wk-voice-transcription] openai chat failed', resp.status, errBody.slice(0, 500));
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
            .select('ai_enabled, live_coach_enabled, openai_api_key, live_coach_system_prompt, live_coach_model')
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
            (ai.live_coach_model as string) ?? '',
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
