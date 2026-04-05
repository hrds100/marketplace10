// ai-description — Generate property listing description
// Replaces n8n /webhook/ai-generate-listing
// Input: { city, postcode, bedrooms, bathrooms, type, rent, profit, deposit, features, notes }
// Output: { description: string }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MODEL = 'gpt-4o-mini'

const DEFAULT_SYSTEM_PROMPT = `You are a professional UK property copywriter for nfstay, a rent-to-rent marketplace.

Write a compelling property listing description (80-120 words) based on the details provided.
Be factual, professional, and highlight key selling points.
Use British English. Mention the location, property type, and key financial details if available.
Do not invent features that aren't provided.
Return ONLY the description text, no markdown, no JSON wrapper.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { city, postcode, bedrooms, bathrooms, type, rent, profit, deposit, features, notes } = body

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')

    // Check ai_settings for custom model + prompt
    let model = DEFAULT_MODEL
    let systemPrompt = DEFAULT_SYSTEM_PROMPT
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data } = await supabase.from('ai_settings').select('model, prompt').eq('task', 'descriptions').single()
      if (data?.model) model = data.model
      if (data?.prompt) systemPrompt = data.prompt
    } catch {
      // ai_settings table may not exist — use defaults
    }

    const details = [
      city ? `Location: ${city}${postcode ? ` ${postcode}` : ''}` : '',
      type ? `Property type: ${type}` : '',
      bedrooms ? `Bedrooms: ${bedrooms}` : '',
      bathrooms ? `Bathrooms: ${bathrooms}` : '',
      rent ? `Monthly rent: £${rent}` : '',
      profit ? `Estimated monthly profit: £${profit}` : '',
      deposit ? `Deposit: £${deposit}` : '',
      features ? `Features: ${Array.isArray(features) ? features.join(', ') : features}` : '',
      notes ? `Additional notes: ${notes}` : '',
    ].filter(Boolean).join('\n')

    if (!details.trim()) {
      return new Response(JSON.stringify({ error: 'Please provide at least one property detail' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: details },
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[ai-description] OpenAI error:', res.status, errText)
      throw new Error(`OpenAI error: ${res.status}`)
    }

    const data = await res.json()
    const description = data.choices?.[0]?.message?.content?.trim() || ''

    if (!description) {
      return new Response(JSON.stringify({ error: 'AI returned empty description' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[ai-description] Error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
