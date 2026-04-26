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
import {
  parseSseChunk,
  createThrottledWriter,
  retrieveFacts,
  type CoachFact,
} from './coach-stream.ts';

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

// Hugo 2026-04-29: replaced the single mega-prompt with three independently
// editable layers (style / script / knowledge base). The model receives them
// as separate system messages so each can evolve in isolation. See
// docs/runbooks/COACH_PROMPT_LAYERS.md for the full architecture.

interface CoachLayers {
  stylePrompt: string;   // wk_ai_settings.coach_style_prompt
  scriptPrompt: string;  // wk_ai_settings.coach_script_prompt
  facts: CoachFact[];    // wk_coach_facts (active rows)
}

interface CoachOptions {
  apiKey: string;
  model: string;
  layers: CoachLayers;
  recentTranscript: string;
  latestUtterance: string;
  speaker: 'caller' | 'agent';
  priorCards: string[];
  onChunk: (accumulated: string, isFirst: boolean) => void;
  isAborted: () => boolean;
}

async function generateCoachSuggestion(
  opts: CoachOptions
): Promise<string | null> {
  const {
    apiKey,
    model: modelOverride,
    layers,
    recentTranscript,
    latestUtterance,
    speaker,
    priorCards,
    onChunk,
    isAborted,
  } = opts;
  if (!apiKey || !latestUtterance || speaker !== 'caller') return null;

  // Model is admin-editable via /smsv2/settings → AI coach. Fallback used
  // only when the DB column is empty.
  const DEFAULT_LIVE_COACH_MODEL = 'gpt-5.4-mini';
  const trimmedModel = (modelOverride ?? '').trim();
  const liveCoachModel = trimmedModel.length > 0 ? trimmedModel : DEFAULT_LIVE_COACH_MODEL;

  // ----- LAYER FALLBACKS (used only if DB columns / facts are empty) -----
  //
  // The canonical content lives in
  // supabase/migrations/20260429000000_smsv2_coach_three_layer.sql. These
  // constants must stay in sync — keep one as the canonical, copy to the
  // other when changing.

  const DEFAULT_STYLE_PROMPT = [
    'You are voicing the lines an NFSTAY sales rep will read aloud, mid-call. Output ONE primary line, ready to read.',
    '',
    'VOICE',
    '- UK English. Plain, commercial, natural — like a real human salesperson, not a coach, therapist, or copywriter.',
    '- Short lines: 1–3 short sentences. Up to ~50 words for explanations, fewer for everything else.',
    '- Use light fillers (right, yeah, fair enough, no worries) only when they earn their place. Never use the same opener twice in a row.',
    '- If the caller is short or blunt, match their energy. Don\'t over-warm.',
    '- Every line should move the conversation forward.',
    '',
    'ABSOLUTE BANS',
    '- No style labels or acting notes ([warm], [firm], [low], [reasonable man], [you could say], etc.).',
    '- No coaching-language metaphors ("you\'re open, not desperate"). No therapist tone.',
    '- No multiple variants. ONE primary line.',
    '- No bullets. No quotation marks around your line. No labels.',
    '- No instructional verbs (Reintroduce, Ask, Describe, Tell them, Explain, Suggest, Confirm, Probe, Pivot, Mention, Address, Acknowledge). You are WRITING the line, not directing it.',
    '- No American/corporate slop ("reach out", "circle back", "for sure", "absolutely", "appreciate that", "that\'s a great question", "going forward").',
    '',
    'OUTPUT',
    'Return exactly one read-aloud line. Nothing else.',
  ].join('\n');

  const DEFAULT_SCRIPT_PROMPT = [
    'You follow the NFSTAY call script. Default to script wording. Only deviate when the caller asks a direct factual question or raises an objection.',
    '',
    'OPEN-ENDED DEFAULT',
    'Most lines end with a question or invitation that keeps the conversation moving:',
    '- "What\'s pulled you toward property at the moment?"',
    '- "Are you looking more at cashflow or growth?"',
    '- "Want me to give you the quick version?"',
    '- "Does that make sense?"',
    '- "Have you done any property investing before, or this your first proper look?"',
    'If the caller is short or blunt, match their energy.',
    '',
    'CALL STAGES (always know which one you\'re in)',
    'OPEN → QUALIFY → PERMISSION TO PITCH → PITCH → RETURNS → SMS CLOSE → FOLLOW-UP LOCK',
    '',
    'EARNED-CLOSE RULE',
    'Fire the SMS-close + tomorrow lock ONLY when ALL of these are true:',
    '1. PITCH and RETURNS already delivered.',
    '2. The caller has shown interest (asked a relevant question, agreed, or stayed engaged for more than two exchanges).',
    '3. The caller has NOT refused the SMS in this call.',
    'Otherwise default to a question that moves the conversation forward.',
    '',
    'DIRECT FACTUAL QUESTIONS',
    'If the caller asks a factual question (numbers, locations, structure, agreement length, payouts, etc.), answer ONLY from the KNOWLEDGE BASE that the system message provides. Do not invent. If the fact is not in the KNOWLEDGE BASE, say "I\'ll check that and come back to you" — never guess.',
    '',
    'OBJECTIONS',
    'If the caller pushes back, use the matching approved answer from the KNOWLEDGE BASE. Then return to the next open-ended question — NOT immediately to a close (see EARNED-CLOSE RULE).',
    '',
    'ANTI-REPETITION',
    'The user message includes "YOUR LAST FEW COACH CARDS". Don\'t ship a card whose opening words match a recent one. Move forward through the script — don\'t loop the same line.',
    '',
    'DEFAULT SCRIPT (use these phrasings almost verbatim where the moment fits)',
    '',
    'OPEN',
    'Hey, is that [Name]? It\'s [Your Name] from NFSTAY — I saw you in the property WhatsApp group. Quick one, are you looking at Airbnb deals at the moment, or just watching the market?',
    '',
    'QUALIFY',
    'Are you currently running Airbnbs and investing already, or just exploring?',
    '',
    'PERMISSION TO PITCH',
    'Great. Would it be okay if I explain quickly how our deals work?',
    '',
    'PITCH',
    'We run Airbnb properties as Joint Venture Partnerships — partners pool money, we run the property, you take a monthly share. Right now we\'ve got a 15-bed in Liverpool, entry from £500.',
    '',
    'RETURNS',
    'Income comes in monthly via the platform, costs covered, profit distributed by participation. You can track your holdings and payouts on the platform, and exit by selling allocations subject to demand. Does that make sense?',
    '',
    'SMS CLOSE',
    'To keep it simple and not run all the numbers on this call, would it be okay if I send you the full breakdown?',
    '',
    'FOLLOW-UP LOCK',
    'After you check it, I\'ll give you a quick call tomorrow. Will tomorrow work?',
    '',
    'OUTPUT',
    'Return exactly one read-aloud line for the next thing the rep should say.',
  ].join('\n');

  // Resolve each layer: prefer DB content, fall back to canonical default.
  const stylePrompt =
    (layers.stylePrompt ?? '').trim().length > 0
      ? layers.stylePrompt.trim()
      : DEFAULT_STYLE_PROMPT;
  const scriptPrompt =
    (layers.scriptPrompt ?? '').trim().length > 0
      ? layers.scriptPrompt.trim()
      : DEFAULT_SCRIPT_PROMPT;

  // Render the knowledge base as a flat block. Empty list → tells the
  // model the KB is empty and it must defer rather than guess.
  const factsBlock =
    layers.facts.length === 0
      ? '(no facts loaded — if asked a factual question, say "I\'ll check that and come back to you" rather than guessing.)'
      : layers.facts
          .map((f) => `- ${f.label}: ${f.value}`)
          .join('\n');

  const knowledgeBaseSystemPrompt =
    `=== NFSTAY KNOWLEDGE BASE ===\nThese are the only facts you may quote. Do NOT invent figures or new facts. If the answer isn't here, say "I'll check that and come back to you".\n\n${factsBlock}`;

  // Retrieval: highlight facts whose keywords match the caller's last
  // utterance so the model focuses on the most likely-relevant ones.
  const matched = retrieveFacts(latestUtterance, layers.facts);
  const relevantFactsHint =
    matched.length === 0
      ? '(no specific fact keyword matched — answer from the script unless the caller is asking for a fact in the KB above.)'
      : matched
          .map((f) => `- ${f.label}: ${f.value}`)
          .join('\n');

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
    '=== POSSIBLY RELEVANT FACTS (matched to the caller\'s last utterance) ===',
    relevantFactsHint,
    '',
    `Caller just said: "${latestUtterance}"`,
    '',
    'Return ONE script-faithful read-aloud line for the rep to say next. Plain UK English. No labels. No quotation marks. No acting notes. No variants. Just the line.',
  ].join('\n');

  try {
    return await streamCoachInternal({
      apiKey,
      model: liveCoachModel,
      systemMessages: [stylePrompt, scriptPrompt, knowledgeBaseSystemPrompt],
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
  /** Three-layer system messages — style, script, knowledge base.
   *  OpenAI accepts multiple system messages; treating each as a
   *  separate message gives cleaner separation than one big concatenated
   *  prompt. */
  systemMessages: string[];
  userMsg: string;
  onChunk: (accumulated: string, isFirst: boolean) => void;
  isAborted: () => boolean;
}): Promise<string | null> {
  const { apiKey, model, systemMessages, userMsg, onChunk, isAborted } = args;

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
        ...systemMessages
          .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
          .map((content) => ({ role: 'system' as const, content })),
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

          // 2. Read AI settings (now includes the three-layer prompts).
          const { data: ai } = await supa
            .from('wk_ai_settings')
            .select('ai_enabled, live_coach_enabled, openai_api_key, live_coach_system_prompt, coach_style_prompt, coach_script_prompt, live_coach_model')
            .limit(1)
            .maybeSingle();
          if (!ai?.ai_enabled || !ai?.live_coach_enabled || !ai?.openai_api_key) {
            log('ai disabled — bailing');
            return;
          }

          // 3. Read recent transcripts + prior cards + coach facts in parallel.
          const [recentRes, priorCardsRes, factsRes] = await Promise.all([
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
            supa
              .from('wk_coach_facts')
              .select('key, label, value, keywords, sort_order')
              .eq('is_active', true)
              .order('sort_order', { ascending: true }),
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

          // 7. Resolve the three layers (style + script + KB facts).
          //    Hugo 2026-04-29: each layer is independently editable
          //    via Settings UI. The legacy live_coach_system_prompt is
          //    only used as a back-compat fallback if BOTH new layer
          //    columns are empty.
          const dbStyle = (ai.coach_style_prompt as string | null) ?? '';
          const dbScript = (ai.coach_script_prompt as string | null) ?? '';
          const legacyPrompt = (ai.live_coach_system_prompt as string | null) ?? '';
          const layers = {
            stylePrompt:
              dbStyle.trim().length > 0
                ? dbStyle
                : dbScript.trim().length > 0
                  ? '' // script set, style empty — let the in-fn DEFAULT_STYLE_PROMPT apply
                  : legacyPrompt, // both new layers empty — fall back to the old single prompt
            scriptPrompt:
              dbScript.trim().length > 0
                ? dbScript
                : dbStyle.trim().length > 0
                  ? '' // style set, script empty — DEFAULT_SCRIPT_PROMPT
                  : '', // legacy prompt is fine in stylePrompt slot; let script default apply
            facts: ((factsRes.data ?? []) as CoachFact[]),
          };
          log('layers loaded', `style=${layers.stylePrompt.length}c script=${layers.scriptPrompt.length}c facts=${layers.facts.length}`);

          // 8. Build the user message + run streaming.
          let firstToken = true;
          const cleaned = await generateCoachSuggestion({
            apiKey: ai.openai_api_key as string,
            model: (ai.live_coach_model as string) ?? '',
            layers,
            recentTranscript: ctx,
            latestUtterance: transcriptText,
            speaker,
            priorCards,
            onChunk: (accumulated) => {
              if (firstToken) {
                log('first token');
                firstToken = false;
              }
              writer.schedule(accumulated);
            },
            isAborted: () => aborted,
          });

          // 9. Flush any pending UPDATE so the final body lands.
          await writer.flush();

          if (aborted) {
            log('aborted (superseded mid-stream)');
            return;
          }

          // 10. Finalize: post-processor either keeps the row (status
          //     = 'final', body = cleaned) or deletes it.
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
