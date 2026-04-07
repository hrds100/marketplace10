// sms-ai-respond — calls OpenAI to generate an AI reply for SMS automation
// Supports two modes:
//   Mode 1 (simple): system_prompt + user_message → { reply }
//   Mode 2 (pathway classification): adds pathways[] → { reply, chosen_pathway, confidence }
// Called internally by sms-automation-run
// Source of truth: supabase/config.toml (verify_jwt = false)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Pathway {
  edge_id: string;
  label: string;
  description?: string;
}

interface ConversationMessage {
  role: string;
  content: string;
}

interface AiRespondRequest {
  system_prompt: string;
  user_message: string;
  contact_name: string;
  model: string;
  temperature: number;
  max_tokens?: number;
  conversation_history?: ConversationMessage[];
  pathways?: Pathway[];
}

// Models — April 2026 current. Fallback to gpt-5.4-mini.
const SUPPORTED_MODELS = [
  // GPT-5.4 (current flagship, March 2026)
  'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano',
  // GPT-5 series
  'gpt-5', 'gpt-5-mini', 'gpt-5-nano',
  // Reasoning models
  'o3', 'o3-mini', 'o4-mini',
  // Legacy (still in API but deprecated)
  'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
  'gpt-4o', 'gpt-4o-mini',
];
const FALLBACK_MODEL = 'gpt-5.4-mini';

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
      model = 'gpt-5.4-mini',
      temperature = 0.7,
      max_tokens: requestedMaxTokens,
      conversation_history = [],
      pathways,
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

    // Validate model — use requested if supported, otherwise fallback
    const resolvedModel = SUPPORTED_MODELS.includes(model) ? model : FALLBACK_MODEL;

    // Personalise system prompt with contact name if available
    // CRITICAL: SMS is plain text — never use markdown formatting
    const smsRules = `\n\nIMPORTANT RULES FOR SMS REPLIES:
- This is an SMS conversation. NEVER use markdown formatting (no [text](url), no **bold**, no *italic*, no bullet points).
- Write URLs as plain text: https://example.com (NOT [example.com](https://example.com))
- Keep replies concise — SMS messages should be short and natural.
- Write like a human texting, not a chatbot.`;

    let finalSystemPrompt = contact_name
      ? `${system_prompt}${smsRules}\n\nThe contact's name is ${contact_name}.`
      : `${system_prompt}${smsRules}`;

    // Mode 2: pathway classification — append pathway instructions
    const hasPathways = pathways && pathways.length > 0;

    if (hasPathways) {
      const pathwayList = pathways
        .map((p) => `- PATHWAY "${p.label}" (edge_id: "${p.edge_id}"): ${p.description || p.label}`)
        .join('\n');

      finalSystemPrompt += `\n\nYou are in a conversational flow. After responding to the user, you must decide which pathway to follow next.

Available pathways:
${pathwayList}

Respond to the user naturally, then classify which pathway matches their response best.

Return JSON ONLY with this exact structure:
{"reply": "your response to the user", "chosen_pathway": "edge_id_here", "confidence": 0.9}

The "chosen_pathway" MUST be one of the edge_id values listed above. The "confidence" must be a number between 0 and 1.`;
    }

    console.log(
      `AI respond: model=${resolvedModel}, temp=${temperature}, contact=${contact_name || 'unknown'}, pathways=${hasPathways ? pathways!.length : 0}, history=${conversation_history.length}`
    );

    // Build messages array with conversation history
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: finalSystemPrompt },
    ];

    // Add conversation history (already ordered oldest-first by caller)
    for (const msg of conversation_history) {
      messages.push({
        role: msg.role === 'inbound' || msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Add the current user message
    messages.push({ role: 'user', content: user_message });

    // Build OpenAI request
    const defaultMaxTokens = hasPathways ? 500 : 300;
    const maxTokens = requestedMaxTokens || defaultMaxTokens;

    const openaiBody: Record<string, unknown> = {
      model: resolvedModel,
      temperature,
      max_tokens: maxTokens,
      messages,
    };

    // Use structured JSON output for pathway mode
    if (hasPathways) {
      openaiBody.response_format = { type: 'json_object' };
    }

    // Call OpenAI with fallback on model_not_found
    let openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openaiBody),
    });

    let openaiData = await openaiRes.json();

    // If model not found, retry with fallback model
    if (!openaiRes.ok && openaiData.error?.code === 'model_not_found' && resolvedModel !== FALLBACK_MODEL) {
      console.warn(`Model ${resolvedModel} not available, retrying with ${FALLBACK_MODEL}`);
      openaiBody.model = FALLBACK_MODEL;
      openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(openaiBody),
      });
      openaiData = await openaiRes.json();
    }

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

    const rawContent = openaiData.choices?.[0]?.message?.content?.trim() || '';

    if (!rawContent) {
      console.error('OpenAI returned empty reply:', openaiData);
      return new Response(
        JSON.stringify({ error: 'OpenAI returned empty reply' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode 2: parse JSON response with pathway classification
    if (hasPathways) {
      try {
        const parsed = JSON.parse(rawContent);
        const reply = parsed.reply || '';
        const chosenPathway = parsed.chosen_pathway || '';
        const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;

        // Validate the chosen pathway is one of the provided edge_ids
        const validEdgeIds = pathways!.map((p) => p.edge_id);
        const isValidPathway = validEdgeIds.includes(chosenPathway);

        if (!isValidPathway) {
          console.warn(
            `AI chose invalid pathway "${chosenPathway}", valid options: ${validEdgeIds.join(', ')}. Falling back to first.`
          );
        }

        const finalPathway = isValidPathway ? chosenPathway : validEdgeIds[0];
        const finalConfidence = isValidPathway ? confidence : 0;

        console.log(
          `AI pathway reply: "${reply.substring(0, 60)}..." → pathway=${finalPathway} (confidence=${finalConfidence})`
        );

        return new Response(
          JSON.stringify({
            reply,
            chosen_pathway: finalPathway,
            confidence: finalConfidence,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (parseErr) {
        console.error('Failed to parse AI JSON response:', rawContent, parseErr);
        // Fallback: use raw content as reply, pick first pathway
        return new Response(
          JSON.stringify({
            reply: rawContent,
            chosen_pathway: pathways![0].edge_id,
            confidence: 0,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Mode 1: simple response
    console.log(`AI reply generated: "${rawContent.substring(0, 80)}..."`);

    return new Response(
      JSON.stringify({ reply: rawContent }),
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
