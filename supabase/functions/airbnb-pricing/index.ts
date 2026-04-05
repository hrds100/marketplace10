// airbnb-pricing — Estimate Airbnb nightly rate + occupancy
// Replaces n8n /webhook/airbnb-pricing
// Input: { city, postcode, bedrooms, bathrooms, type, rent, propertyId }
// Output: { estimated_nightly_rate, estimated_occupancy, estimated_monthly_revenue,
//           airbnb_url_7d, airbnb_url_30d, airbnb_url_90d }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `You are an Airbnb pricing analyst for UK properties.

Given property details, estimate realistic nightly rate and occupancy for a serviced accommodation (Airbnb) listing.

Base your estimates on typical UK short-let market rates for the area. Be conservative — landlords prefer under-promise over-deliver.

Return ONLY valid JSON with these exact fields:
{
  "estimated_nightly_rate": number (GBP, whole number),
  "estimated_occupancy": number (percentage 0-100, whole number),
  "estimated_monthly_revenue": number (GBP, nightly_rate × occupancy/100 × 30),
  "reasoning": "one sentence explaining the estimate"
}

Do not include markdown or extra text.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { city, postcode, bedrooms, bathrooms, type, rent, propertyId } = body

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')

    // Check ai_settings for custom model
    let model = DEFAULT_MODEL
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data } = await supabase.from('ai_settings').select('model').eq('task', 'pricing').single()
      if (data?.model) model = data.model
    } catch {
      // ai_settings table may not exist — use default
    }

    const details = [
      city ? `City: ${city}` : '',
      postcode ? `Postcode: ${postcode}` : '',
      bedrooms ? `Bedrooms: ${bedrooms}` : '',
      bathrooms ? `Bathrooms: ${bathrooms}` : '',
      type ? `Property type: ${type}` : '',
      rent ? `Monthly rent: £${rent}` : '',
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
          { role: 'user', content: details },
        ],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[airbnb-pricing] OpenAI error:', res.status, errText)
      throw new Error(`OpenAI error: ${res.status}`)
    }

    const data = await res.json()
    let text = data.choices?.[0]?.message?.content?.trim() || ''

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      // Try stripping markdown fences
      text = text.replace(/```(?:json)?\s*/gi, '').replace(/```/gi, '').trim()
      parsed = JSON.parse(text)
    }

    // Generate Airbnb search URLs for the area
    const searchCity = encodeURIComponent(city || 'London')
    const airbnb_url_7d = `https://www.airbnb.co.uk/s/${searchCity}/homes?checkin=${getFutureDate(7)}&checkout=${getFutureDate(14)}&adults=2`
    const airbnb_url_30d = `https://www.airbnb.co.uk/s/${searchCity}/homes?checkin=${getFutureDate(7)}&checkout=${getFutureDate(37)}&adults=2`
    const airbnb_url_90d = `https://www.airbnb.co.uk/s/${searchCity}/homes?checkin=${getFutureDate(7)}&checkout=${getFutureDate(97)}&adults=2`

    // Save pricing to properties table if propertyId provided
    if (propertyId) {
      try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        await supabase.from('properties').update({
          estimated_nightly_rate: parsed.estimated_nightly_rate,
          estimated_occupancy: parsed.estimated_occupancy,
          estimated_monthly_revenue: parsed.estimated_monthly_revenue,
          airbnb_url_7d,
          airbnb_url_30d,
          airbnb_url_90d,
        }).eq('id', propertyId)
      } catch (e) {
        console.error('[airbnb-pricing] Failed to save pricing to DB:', e)
      }
    }

    return new Response(JSON.stringify({
      ...parsed,
      airbnb_url_7d,
      airbnb_url_30d,
      airbnb_url_90d,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[airbnb-pricing] Error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function getFutureDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split('T')[0]
}
