// wk-test-transcribe — diagnostic endpoint that proves OpenAI Whisper + the
// frontend render path work, with Twilio Media Streams REMOVED from the
// equation entirely.
//
// Flow:
//   1. Browser /smsv2/test page records ~5s of mic audio.
//   2. Browser POSTs the audio blob here as multipart/form-data ("audio").
//   3. We forward it to OpenAI's whisper-1 audio.transcriptions API.
//   4. We async-call gpt-4o-mini for a coach tip on the transcript.
//   5. Return { transcript, tip, ms } so the page can render instantly.
//
// AUTH: Supabase JWT — agent must be authenticated. No Twilio signature
// because Twilio doesn't touch this path.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function whisperTranscribe(apiKey: string, audio: File): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', audio);
  fd.append('model', 'whisper-1');
  fd.append('language', 'en');
  fd.append('response_format', 'json');

  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: fd,
  });
  if (!r.ok) {
    const txt = await r.text();
    console.warn('[wk-test-transcribe] whisper failed', r.status, txt.slice(0, 200));
    return null;
  }
  const j = await r.json();
  return String(j.text ?? '').trim() || null;
}

async function coachTip(apiKey: string, prompt: string, utterance: string): Promise<string | null> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 60,
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content:
            `Caller said: "${utterance}". Give the agent ONE actionable coaching tip in <14 words. Always provide a tip.`,
        },
      ],
    }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  const text = String(j?.choices?.[0]?.message?.content ?? '').trim();
  return text || null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }
  const t0 = Date.now();

  try {
    const auth = req.headers.get('authorization') ?? '';
    const jwt = auth.replace(/^Bearer\s+/i, '');
    if (!jwt) return jsonResponse(401, { error: 'Missing bearer token' });

    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: userResp, error: userErr } = await supa.auth.getUser(jwt);
    if (userErr || !userResp?.user) return jsonResponse(401, { error: 'Invalid token' });

    // Pull the OpenAI key from wk_ai_settings so this matches the same
    // configuration the live transcription path uses.
    const { data: ai } = await supa
      .from('wk_ai_settings')
      .select('openai_api_key, live_coach_system_prompt')
      .limit(1)
      .maybeSingle();
    const apiKey = (ai?.openai_api_key as string | null) ?? '';
    if (!apiKey) return jsonResponse(503, { error: 'OPENAI_API_KEY not configured in wk_ai_settings' });

    const formData = await req.formData();
    const audio = formData.get('audio');
    if (!(audio instanceof File)) {
      return jsonResponse(400, { error: 'audio field missing or not a File' });
    }

    const transcript = await whisperTranscribe(apiKey, audio);
    if (!transcript) {
      return jsonResponse(502, { error: 'Whisper returned no transcript' });
    }

    const tip = await coachTip(
      apiKey,
      (ai?.live_coach_system_prompt as string) ||
        'You are a sales coach for a UK property landlord.',
      transcript
    );

    return jsonResponse(200, {
      transcript,
      tip: tip ?? null,
      ms: Date.now() - t0,
    });
  } catch (e) {
    console.error('[wk-test-transcribe] error', e);
    return jsonResponse(500, { error: e instanceof Error ? e.message : 'unknown' });
  }
});
