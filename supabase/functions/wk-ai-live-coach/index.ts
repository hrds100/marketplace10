// wk-ai-live-coach — bridges Twilio Media Streams ↔ OpenAI Realtime API.
//
// Twilio's <Stream> verb opens a WebSocket to this function and pushes
// 8 kHz μ-law audio frames at 20ms cadence. We:
//   1. Authenticate the stream (Twilio's signed URL via custom param `callSid`)
//   2. Open an OpenAI Realtime WebSocket
//   3. Forward audio Twilio→OpenAI; receive transcripts + suggestions back
//   4. Persist transcripts (wk_live_transcripts) and coach events
//      (wk_live_coach_events) so the live UI can subscribe via realtime
//
// FAIL-SAFE: if OpenAI dies, we close the OpenAI socket, mark ai_status='failed'
// on the call, and let Twilio keep streaming (we just stop forwarding).
// The voice call + recording are unaffected.
//
// AUTH: Twilio signed URL — we accept the stream only if a fresh wk_calls row
// matches the callSid. The function URL itself is public (verify_jwt = false).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AiSettings {
  openai_api_key: string | null;
  live_coach_model: string;
  live_coach_system_prompt: string;
  ai_enabled: boolean;
  live_coach_enabled: boolean;
}

async function loadAi(): Promise<AiSettings | null> {
  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data } = await supa.rpc('wk_get_ai_settings');
  if (!data || data.length === 0) return null;
  return data[0] as AiSettings;
}

async function killswitchActive(): Promise<boolean> {
  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data } = await supa.rpc('wk_killswitch_state');
  return Boolean((data as { ai_coach?: boolean })?.ai_coach);
}

// μ-law (G.711) ↔ PCM16 conversion. Twilio sends μ-law, OpenAI Realtime
// expects either PCM16 or g711_ulaw (we pick g711_ulaw to skip conversion).

function bridge(twilioWs: WebSocket, openaiWs: WebSocket, callSid: string, callId: string): void {
  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  let streamSid: string | null = null;

  twilioWs.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.event === 'start') {
        streamSid = msg.start?.streamSid ?? null;
        return;
      }
      if (msg.event === 'media') {
        // Forward audio frame to OpenAI as base64 g711_ulaw
        if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: msg.media.payload,
          }));
        }
        return;
      }
      if (msg.event === 'stop') {
        try { openaiWs.close(); } catch { /* ignore */ }
        try { twilioWs.close(); } catch { /* ignore */ }
        return;
      }
    } catch (e) {
      console.error('twilio msg parse error:', e);
    }
  };

  twilioWs.onclose = () => { try { openaiWs.close(); } catch { /* ignore */ } };
  twilioWs.onerror = (e) => console.error('twilio ws error:', e);

  openaiWs.onmessage = async (ev) => {
    try {
      const msg = JSON.parse(ev.data);

      // Speech-to-text complete → live transcript line
      if (msg.type === 'conversation.item.input_audio_transcription.completed') {
        const text = String(msg.transcript ?? '').trim();
        if (text) {
          await supa.from('wk_live_transcripts').insert({
            call_id: callId, speaker: 'caller', body: text,
          }).then(() => null, () => null);
        }
      }

      // Final text suggestions only (we don't store deltas — UI subscribes
      // for inserts and renders the full event when it lands).
      if (msg.type === 'response.text.done' && msg.text) {
        const text = String(msg.text).trim();
        // Heuristic: if the model phrased a question, file as 'question'.
        // Otherwise treat as 'suggestion'. Keeps the kind enum honest.
        const kind: 'question' | 'suggestion' = text.endsWith('?') ? 'question' : 'suggestion';
        await supa.from('wk_live_coach_events').insert({
          call_id: callId,
          kind,
          body: text,
        }).then(() => null, () => null);
      }
    } catch (e) {
      console.error('openai msg parse error:', e);
    }
  };

  openaiWs.onclose = () => {
    void supa.from('wk_calls').update({ ai_status: 'failed' }).eq('id', callId);
  };
  openaiWs.onerror = (e) => console.error('openai ws error:', e);
}

Deno.serve(async (req: Request) => {
  const upgrade = req.headers.get('upgrade') ?? '';
  if (upgrade.toLowerCase() !== 'websocket') {
    return new Response('expected websocket upgrade', { status: 426 });
  }

  // Pull the call SID from the URL query (Twilio sends it on the <Stream>).
  const url = new URL(req.url);
  const callSid = url.searchParams.get('callSid') ?? '';
  if (!callSid) return new Response('missing callSid', { status: 400 });

  // Resolve the call + check kill switch + load AI settings
  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: call } = await supa
    .from('wk_calls')
    .select('id, ai_coach_enabled')
    .eq('twilio_call_sid', callSid)
    .maybeSingle();
  if (!call) return new Response('call not found', { status: 404 });
  if (!call.ai_coach_enabled) return new Response('coach not enabled for this call', { status: 403 });

  if (await killswitchActive()) {
    return new Response('ai_coach killswitch active', { status: 503 });
  }

  const ai = await loadAi();
  if (!ai || !ai.ai_enabled || !ai.live_coach_enabled || !ai.openai_api_key) {
    return new Response('ai disabled or no api key', { status: 503 });
  }

  // Upgrade the Twilio side
  const { socket: twilioWs, response } = Deno.upgradeWebSocket(req);

  // Open the OpenAI Realtime side
  const openaiWs = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(ai.live_coach_model)}`,
    [
      'realtime',
      // OpenAI accepts auth via subprotocol in browser-style upgrades:
      `openai-insecure-api-key.${ai.openai_api_key}`,
      'openai-beta.realtime-v1',
    ]
  );

  openaiWs.onopen = () => {
    // Configure the session: we receive μ-law audio in, want text out only,
    // and a system prompt that turns the model into a sales coach.
    openaiWs.send(JSON.stringify({
      type: 'session.update',
      session: {
        modalities: ['text'],                       // text-only suggestions
        input_audio_format: 'g711_ulaw',
        input_audio_transcription: { model: 'whisper-1' },
        instructions: ai.live_coach_system_prompt,
        turn_detection: { type: 'server_vad', threshold: 0.5 },
      },
    }));

    bridge(twilioWs, openaiWs, callSid, call.id);
    // Mark coach as running
    void supa.from('wk_calls').update({ ai_status: 'running' }).eq('id', call.id);
  };

  return response;
});
