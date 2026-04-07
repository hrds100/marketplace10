// sms-ai-respond — calls OpenAI to generate an AI reply for SMS automation
// Called internally by sms-automation-run
// Source of truth: supabase/config.toml (verify_jwt = false)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AiRespondRequest {
  system_prompt: string;
  user_message: string;
  contact_name: string;
  model: string;
  temperature: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const {
      system_prompt,
      user_message,
      contact_name,
      model = 'gpt-4o-mini',
      temperature = 0.7,
    } = (await req.json()) as AiRespondRequest;

    if (!system_prompt || !user_message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: system_prompt, user_message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Personalise system prompt with contact name if available
    const finalSystemPrompt = contact_name
      ? `${system_prompt}\n\nThe contact's name is ${contact_name}.`
      : system_prompt;

    console.log(`AI respond: model=${model}, temp=${temperature}, contact=${contact_name || 'unknown'}`);

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: 300,
        messages: [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: user_message },
        ],
      }),
    });

    const openaiData = await openaiRes.json();

    if (!openaiRes.ok) {
      console.error('OpenAI API error:', openaiData);
      return new Response(
        JSON.stringify({
          error: 'OpenAI API call failed',
          details: openaiData.error?.message || openaiData,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reply = openaiData.choices?.[0]?.message?.content?.trim() || '';

    if (!reply) {
      console.error('OpenAI returned empty reply:', openaiData);
      return new Response(
        JSON.stringify({ error: 'OpenAI returned empty reply' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`AI reply generated: "${reply.substring(0, 80)}..."`);

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('sms-ai-respond error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
