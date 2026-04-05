// ai-chat — University AI consultant
// Replaces n8n /webhook/ai-university-chat
// Input: { message, lessonTitle, moduleTitle, lessonContext, userId? }
// Output: { reply: string }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MODEL = 'gpt-4o-mini'
const FALLBACK_REPLY = 'Our AI consultant is temporarily unavailable. Please try again shortly.'

const SYSTEM_PROMPT = `You are an AI consultant for nfstay University, a UK property education platform focused on rent-to-rent and serviced accommodation.

You are helping a student who is studying a specific lesson. Answer their questions clearly and practically, relating your answers back to the lesson content when relevant.

Keep responses concise (2-3 paragraphs max), practical, and UK-property focused. Use GBP for any monetary examples.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { message, lessonTitle, moduleTitle, lessonContext, userId } = await req.json()

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      console.error('[ai-chat] OPENAI_API_KEY not set')
      return new Response(JSON.stringify({ reply: FALLBACK_REPLY }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check ai_settings for custom model (optional)
    let model = DEFAULT_MODEL
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data } = await supabase.from('ai_settings').select('model').eq('task', 'university').single()
      if (data?.model) model = data.model
    } catch {
      // ai_settings table may not exist yet — use default
    }

    const contextBlock = [
      moduleTitle ? `Module: ${moduleTitle}` : '',
      lessonTitle ? `Lesson: ${lessonTitle}` : '',
      lessonContext ? `Lesson content summary: ${lessonContext}` : '',
    ].filter(Boolean).join('\n')

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...(contextBlock ? [{ role: 'system', content: contextBlock }] : []),
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[ai-chat] OpenAI error:', res.status, errText)
      return new Response(JSON.stringify({ reply: FALLBACK_REPLY }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content?.trim() || FALLBACK_REPLY

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[ai-chat] Error:', err)
    return new Response(JSON.stringify({ reply: FALLBACK_REPLY }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
