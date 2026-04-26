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
import { parseSseChunk, createThrottledWriter } from './coach-stream.ts';

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
  speaker: 'caller' | 'agent',
  priorCards: string[] = [],
  onChunk: (accumulated: string, isFirst: boolean) => void = () => {},
  isAborted: () => boolean = () => false
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
    'You are the live teleprompter for an NFSTAY sales rep. Your job is NOT to invent a new sales style. Your job is to follow the NFSTAY call script as closely as possible, using plain UK English, unless the caller asks a direct question or raises an objection.',
    '',
    'CORE RULES',
    '- Default to the script. Do not freestyle unless needed.',
    '- Use the exact structure the human reps use: OPEN → QUALIFY → PERMISSION TO PITCH → PITCH → RETURNS → SMS CLOSE → FOLLOW-UP LOCK.',
    '- Keep the line simple, direct, and easy to read aloud.',
    '- Sound like a normal UK salesperson, not a coach, not a therapist, not a copywriter.',
    '- NEVER output labels or acting notes like [warm], [reasonable man], [firm], [low], [you could say], or anything similar.',
    '- NEVER try to sound "clever".',
    '- NEVER analyse the caller\'s psychology out loud.',
    '- NEVER say things like "you\'re open, not desperate".',
    '- NEVER create multiple variants.',
    '- Output ONE line only, ready to read aloud.',
    '- Prefer the actual script wording over novelty.',
    '- If the current moment matches the script, reuse the script wording almost exactly.',
    '- Only deviate when answering a direct caller question or handling an objection.',
    '- Keep to 1–3 short sentences.',
    '- Use UK English.',
    '- No bullets. No quotation marks. No labels.',
    '',
    'PRIMARY OBJECTIVE',
    'Get the lead interested enough to accept the SMS, then lock a follow-up for tomorrow.',
    '',
    'OPEN-ENDED DEFAULT (read this every time)',
    'Most lines should end with a question or a light invitation that keeps the conversation moving:',
    '  - "What\'s pulled you toward property at the moment?"',
    '  - "Are you looking more at cashflow or growth?"',
    '  - "Want me to give you the quick version?"',
    '  - "Does that make sense?"',
    '  - "Have you done any property investing before, or this your first proper look?"',
    'If the caller is short or blunt, match their energy with a short, natural reply — don\'t over-warm.',
    '',
    'EARNED-CLOSE RULE',
    'Only fire the SMS-close + tomorrow lock when ALL of the following are true:',
    '  1. You\'ve delivered the PITCH and RETURNS steps already.',
    '  2. The caller has shown interest (asked a relevant question, agreed, or stayed engaged for more than two exchanges).',
    '  3. The caller has NOT refused the SMS in this call.',
    'If any of those are missing, default to a question that moves the conversation forward — not a close.',
    '',
    'DEFAULT SCRIPT TO FOLLOW',
    '',
    'OPEN',
    'Hey, is that [Name]? It\'s [Your Name] from NFSTAY — I saw you in the property WhatsApp group. Quick one, are you looking at Airbnb deals at the moment, or just watching the market?',
    '',
    'IF YES',
    'Perfect, I\'ll be quick.',
    '',
    'IF NO',
    'No worries — are you open to hearing one deal if the numbers make sense?',
    '',
    'IF NO AGAIN',
    'All good, appreciate your time.',
    '',
    'QUALIFY',
    'Are you currently running Airbnbs and investing already, or just exploring?',
    '',
    'IF INVESTING',
    'Nice, so you already get how this works.',
    '',
    'IF EXPLORING',
    'Perfect, this is a simple way to get started without running it yourself.',
    '',
    'PERMISSION TO PITCH',
    'Great. Would it be okay if I explain quickly how our deals work?',
    '',
    'IF YES',
    'Proceed.',
    '',
    'IF NO',
    'No problem, appreciate your time.',
    '',
    'PITCH',
    'So we run Airbnb properties and bring partners into deals as a Joint Venture Partnership.',
    'Instead of going alone, we group partners together and fund it jointly — so you have a share without having to run the property by yourself.',
    'We handle everything: setup, bookings, management, and operations.',
    'Right now we\'ve got a 15-bed property in Liverpool already running.',
    'Entry starts from around £500 for a small participation in the deal.',
    '',
    'RETURNS',
    'Income comes in monthly, costs are covered, and the remaining profit is distributed based on your participation.',
    'You can track your holdings and payouts directly on the platform, and if you ever want to exit, you can sell your allocations there, subject to demand.',
    'Does that make sense?',
    '',
    'SMS CLOSE',
    'To keep it simple and not run through all the numbers on this call, would it be okay if I send you the full breakdown so you can see everything properly?',
    '',
    'IF YES',
    'Perfect — can you confirm your name so I can add you properly here?',
    'Great, you\'ll receive the SMS right after this call.',
    '',
    'IF NO',
    'No problem, appreciate your time.',
    '',
    'FOLLOW-UP LOCK',
    'I\'ll keep it short today.',
    'After you check it, I\'ll give you a quick call tomorrow to go through it properly.',
    'Will tomorrow work?',
    '',
    'IF YES',
    'Nice — morning or afternoon?',
    '',
    'IF NO',
    'No problem, what suits you better?',
    '',
    'IF REFUSE',
    'All good, you\'ve got the info anyway.',
    '',
    'OBJECTIONS / DIRECT QUESTIONS',
    'If the caller asks a direct question, answer directly in one short sentence, then return to the script.',
    '',
    'Approved answers:',
    '- How many properties? → Just under 100 across Manchester and Liverpool.',
    '- Where are you based? → Manchester, 9 Owen Street.',
    '- Can I visit the office? → It\'s not open to the public — we run everything online.',
    '- Can I visit the property? → Yes, we can usually arrange that.',
    '- How do I get paid? → Monthly payouts via the platform.',
    '- How long is the agreement? → It\'s a 5-year agreement on this property.',
    '- Sounds too good / legit? → Fair — that\'s why I send the full breakdown first.',
    '',
    'AFTER ANSWERING AN OBJECTION',
    'Loop back simply:',
    'So I\'ll send it now, you check it, and we speak tomorrow, yeah?',
    '…unless the EARNED-CLOSE RULE above isn\'t met yet, in which case ask an open-ended question instead.',
    '',
    'STYLE',
    '- Plain.',
    '- Direct.',
    '- Commercial.',
    '- UK.',
    '- Human.',
    '- No fluff.',
    '- No fancy reframes.',
    '- No motivational language.',
    '- No tonal annotations.',
    '- No meta commentary.',
    '',
    'ANTI-REPETITION',
    'The user message includes "YOUR LAST FEW COACH CARDS". Don\'t ship a card whose opening words match a recent one. Script fidelity outranks variation — but if you\'re already past a script step, move forward, don\'t loop the same line.',
    '',
    'OUTPUT FORMAT',
    'Return exactly one read-aloud line for the rep to say next.',
  ].join('\n');

  // Prefer the DB-stored prompt (editable in Settings); fall back to the
  // default if the column is empty or whitespace-only.
  const trimmed = (systemPromptOverride ?? '').trim();
  const systemPrompt = trimmed.length > 0 ? trimmed : DEFAULT_COACH_PROMPT;

  // Last few coach cards passed back to the model so it doesn't echo
  // openers / structures it just produced. Without this, the model has
  // no memory across calls — Hugo 2026-04-28: "Yeah fair enough" was
  // appearing on 4 of 4 cards in a row.
  const priorCardsBlock =
    priorCards.length === 0
      ? '(none yet — this is your first card on this call)'
      : priorCards.map((c, i) => `${i + 1}. "${c}"`).join('\n');

  const userMsg = [
    'Recent conversation (most recent line at bottom):',
    recentTranscript || '(no prior context yet)',
    '',
    '=== YOUR LAST FEW COACH CARDS (most recent first) ===',
    'Don\'t ship a card whose opening matches a recent one. Move forward through the script — don\'t loop the same line.',
    priorCardsBlock,
    '',
    `Caller just said: "${latestUtterance}"`,
    '',
    'Return ONE script-faithful read-aloud line for the rep to say next. Plain UK English. No labels. No quotation marks. No acting notes. No variants. Just the line.',
  ].join('\n');

  try {
    return await streamCoachInternal({
      apiKey,
      model: liveCoachModel,
      systemPrompt,
      userMsg,
      onChunk,
      isAborted,
    });
  } catch (e) {
    console.warn('[wk-voice-transcription] openai chat threw', e);
    return null;
  }
}

// Internal streaming worker — separated so tests / future callers can
// invoke without rebuilding the prompt. Returns the post-processed
// final text or null on rejection.
async function streamCoachInternal(args: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMsg: string;
  onChunk: (accumulated: string, isFirst: boolean) => void;
  isAborted: () => boolean;
}): Promise<string | null> {
  const { apiKey, model, systemPrompt, userMsg, onChunk, isAborted } = args;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      model,
      // Hugo 2026-04-28: "this job needs compliance more than
      // creativity". Low temp + penalties keep the model on the rep
      // script. User message still passes the last 3 cards for
      // anti-repetition.
      temperature: 0.3,
      presence_penalty: 0.3,
      frequency_penalty: 0.2,
      // GPT-5 family rejects `max_tokens` — use max_completion_tokens.
      max_completion_tokens: 120,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
    }),
  });

  if (!resp.ok) {
    let errBody = '';
    try { errBody = await resp.text(); } catch { /* ignore */ }
    console.warn('[wk-voice-transcription] openai chat failed', resp.status, errBody.slice(0, 500));
    return null;
  }
  if (!resp.body) {
    console.warn('[wk-voice-transcription] openai response had no body');
    return null;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let isFirst = true;

  try {
    while (true) {
      if (isAborted()) {
        try { await reader.cancel(); } catch { /* ignore */ }
        return null;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, remaining } = parseSseChunk(buffer);
      buffer = remaining;
      for (const ev of events) {
        if (ev.done) {
          // [DONE] marker — finish naturally.
          break;
        }
        if (ev.delta) {
          accumulated += ev.delta;
          onChunk(accumulated, isFirst);
          isFirst = false;
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }

  // Post-processor on the final accumulated text.
  return postProcessCoachText(accumulated);
}

// Pulled out so streaming and any future non-streaming caller share the
// same rejection rules. Returns null when the line should be dropped.
function postProcessCoachText(raw: string): string | null {
  let text = (raw ?? '').trim();
  if (!text) return null;
  // Strip leading "Tip:" / "Coach:" / leading dash, etc.
  text = text.replace(/^["“”'`]*(tip|coach|suggestion|say|script)\s*[:\-—]\s*/i, '').replace(/^[-•—]\s*/, '').trim();
  text = text.replace(/^["“”'`]+|["“”'`]+$/g, '').trim();
  // Hugo 2026-04-28: prompt v6 forbids acting notes, but defend
  // anyway. Strip leading [warm] / [firm] / [low] / [reasonable man] /
  // any other [bracket-tag] from the start of the line so the agent
  // never reads "[reasonable man] Fair enough..." aloud. Also strip
  // any bracketed tag that survives mid-line at sentence start.
  text = text.replace(/^\s*(?:\[[^\]]+\]\s*)+/, '').trim();
  text = text.replace(/(^|[.!?]\s+)(?:\[[^\]]+\]\s*)+/g, '$1').trim();
  if (!text) return null;
  if (/^skip\.?$/i.test(text)) return null;
  if (/mirror\s+(their|the)\s+energy/i.test(text)) return null; // belt-and-braces
  // Reject instructional output that slipped through.
  if (/^(reintroduce|ask\b|describe\b|pivot\b|mention\b|tell them\b|explain\b|suggest\b|confirm\b|probe\b|emphasi[sz]e\b|highlight\b|address\b|acknowledge\b|reassure\b|offer\b|propose\b|invite\b|encourage\b|remind\b|clarify\b|share\b|present\b|discuss\b|outline\b|summari[sz]e\b)/i.test(text)) {
    console.warn('[wk-voice-transcription] coach produced instructional output, dropping:', text);
    return null;
  }
  return text;
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
    if (!transcriptText) {
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

    // Persist transcript line ONLY for finalized chunks. Hugo
    // 2026-04-28: "Interim chunks for coach only — keep transcript
    // pane clean." Interim chunks would spam the pane with partial
    // re-writes ("Hello", "Hello there", "Hello there um"…).
    if (isFinal) {
      await supa.from('wk_live_transcripts').insert({
        call_id: call.id,
        speaker,
        body: transcriptText,
      });
    }

    // Coaching path — fires on BOTH interim and final chunks for the
    // caller, so the coach card starts streaming within ~400ms of the
    // caller speaking instead of waiting for Twilio to finalize the
    // utterance (which can be 1-3s after the caller stops).
    //
    // Per-call lock + generation_id keep the streams sane:
    //   - interim with a recent active lock → debounced (skipped)
    //   - interim past 400ms debounce → supersedes prior generation
    //   - final → ALWAYS supersedes (force=true); the final transcript
    //     is the most accurate, so the last word goes to it
    //
    // EdgeRuntime.waitUntil keeps the streaming worker alive past the
    // 200 we return to Twilio.
    if (call.ai_coach_enabled && speaker === 'caller') {
      const generationId = crypto.randomUUID();
      const genShort = generationId.slice(0, 8);
      const t0 = Date.now();
      const log = (event: string, extra: string = '') =>
        console.log(`[wk-voice-transcription] [coach gen=${genShort}] ${event} +${Date.now() - t0}ms ${extra}`.trim());
      log('interim received', `final=${isFinal} chars=${transcriptText.length}`);

      const coachPromise = (async () => {
        try {
          // 1. Try to acquire the lock. Interim chunks debounce on
          //    400ms; final chunks force-supersede.
          const { data: lockResult, error: lockErr } = await supa.rpc(
            'wk_acquire_coach_lock',
            {
              p_call_id: call.id,
              p_gen_id: generationId,
              p_force: isFinal,
              p_min_age_ms: 400,
            }
          );
          if (lockErr) {
            console.warn(`[wk-voice-transcription] [coach gen=${genShort}] lock RPC error`, lockErr.message);
            return;
          }
          if (lockResult !== generationId) {
            // Lost the race — another generation is already in flight
            // and the debounce window hasn't elapsed.
            log('lock lost — debounced');
            return;
          }
          log('lock acquired');

          // 2. Read AI settings.
          const { data: ai } = await supa
            .from('wk_ai_settings')
            .select('ai_enabled, live_coach_enabled, openai_api_key, live_coach_system_prompt, live_coach_model')
            .limit(1)
            .maybeSingle();
          if (!ai?.ai_enabled || !ai?.live_coach_enabled || !ai?.openai_api_key) {
            log('ai disabled — bailing');
            return;
          }

          // 3. Read recent transcripts + prior cards in parallel.
          const [recentRes, priorCardsRes] = await Promise.all([
            supa
              .from('wk_live_transcripts')
              .select('speaker, body, ts')
              .eq('call_id', call.id)
              .order('ts', { ascending: false })
              .limit(6),
            supa
              .from('wk_live_coach_events')
              .select('body, ts')
              .eq('call_id', call.id)
              .eq('status', 'final')
              .order('ts', { ascending: false })
              .limit(3),
          ]);
          const ctx = (recentRes.data ?? [])
            .reverse()
            .map((r: { speaker: string; body: string }) =>
              `${r.speaker === 'agent' ? 'Agent' : 'Caller'}: ${r.body}`
            )
            .join('\n');
          const priorCards: string[] = ((priorCardsRes.data ?? []) as { body: string }[])
            .map((c) => c.body)
            .filter((s): s is string => typeof s === 'string' && s.length > 0);

          // 4. Sweep prior streaming placeholders for THIS call (from
          //    superseded generations). They get DELETEd so the client
          //    realtime DELETE event clears the stale card.
          const { data: superseded } = await supa.rpc(
            'wk_supersede_streaming_coach',
            { p_call_id: call.id, p_keep_gen_id: generationId }
          );
          if (typeof superseded === 'number' && superseded > 0) {
            log('superseded prior streaming rows', `count=${superseded}`);
          }

          // 5. Pre-INSERT placeholder so the client gets a card to
          //    morph in place as tokens arrive.
          const { data: placeholder, error: insErr } = await supa
            .from('wk_live_coach_events')
            .insert({
              call_id: call.id,
              kind: 'suggestion',
              body: '…',
              generation_id: generationId,
              status: 'streaming',
            })
            .select('id')
            .single();
          if (insErr || !placeholder) {
            console.warn(`[wk-voice-transcription] [coach gen=${genShort}] placeholder insert failed`, insErr?.message);
            return;
          }
          const placeholderId = placeholder.id as string;
          log('placeholder inserted');

          // 6. Set up the throttled writer. UPDATE the placeholder body
          //    at most every 200ms so we don't hammer the DB. The
          //    eq('id', ...) WITHOUT eq('generation_id', ...) catches
          //    DELETEs (row gone) — UPDATE returns 0 rows when our
          //    placeholder was superseded by a newer generation.
          let aborted = false;
          let firstUpdate = true;
          const writer = createThrottledWriter<string>(async (text) => {
            const { data, error: updErr } = await supa
              .from('wk_live_coach_events')
              .update({ body: text })
              .eq('id', placeholderId)
              .select('id');
            if (updErr) {
              console.warn(`[wk-voice-transcription] [coach gen=${genShort}] update error`, updErr.message);
              aborted = true;
              return;
            }
            if (!data || data.length === 0) {
              // Our placeholder is gone — newer generation deleted it.
              if (!aborted) log('placeholder deleted — superseded, aborting');
              aborted = true;
              return;
            }
            if (firstUpdate) {
              log('first update');
              firstUpdate = false;
            }
          }, 200);

          // 7. Build the user message + run streaming.
          let firstToken = true;
          const cleaned = await generateCoachSuggestion(
            ai.openai_api_key as string,
            (ai.live_coach_system_prompt as string) ?? '',
            (ai.live_coach_model as string) ?? '',
            ctx,
            transcriptText,
            speaker,
            priorCards,
            (accumulated, _isFirst) => {
              if (firstToken) {
                log('first token');
                firstToken = false;
              }
              writer.schedule(accumulated);
            },
            () => aborted
          );

          // 8. Flush any pending UPDATE so the final body lands.
          await writer.flush();

          if (aborted) {
            log('aborted (superseded mid-stream)');
            return;
          }

          // 9. Finalize: post-processor either keeps the row (status
          //    = 'final', body = cleaned) or deletes it.
          if (!cleaned) {
            await supa.from('wk_live_coach_events').delete().eq('id', placeholderId);
            log('rejected by post-processor', 'deleted');
            return;
          }
          const kind = cleaned.endsWith('?') ? 'question' : 'suggestion';
          await supa
            .from('wk_live_coach_events')
            .update({ body: cleaned, status: 'final', kind })
            .eq('id', placeholderId);
          log('final update', `chars=${cleaned.length} kind=${kind}`);
        } catch (e) {
          console.warn(`[wk-voice-transcription] [coach gen=${genShort}] pipeline threw`, e);
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
