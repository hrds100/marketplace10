// airbnb-pricing — Estimate Airbnb nightly rate + occupancy
// Uses OpenAI Responses API with web_search to find real market data
// Input: { city, postcode, bedrooms, bathrooms, type, rent, propertyId }
// Output: { estimated_nightly_rate, estimated_occupancy, estimated_monthly_revenue, ... }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MODEL = 'gpt-4o'

// Full Airbnb URL for human verification — bedrooms, beds, guests, bathrooms when available
function buildAirbnbUrl(city: string, checkin: string, checkout: string, bedrooms: number, bathrooms: number, monthlyStart: string, monthlyEnd: string): string {
  const query = encodeURIComponent(city || 'London')
  const minBeds = bedrooms || 1
  const adults = minBeds
  let url = `https://www.airbnb.co.uk/s/${query}/homes?refinement_paths%5B%5D=%2Fhomes&date_picker_type=calendar&checkin=${checkin}&checkout=${checkout}&search_type=filter_change&query=${query}&flexible_trip_lengths%5B%5D=one_week&monthly_start_date=${monthlyStart}&monthly_length=3&monthly_end_date=${monthlyEnd}&search_mode=regular_search&price_filter_input_type=1&price_filter_num_nights=7&channel=EXPLORE&min_bedrooms=${minBeds}&min_beds=${minBeds}&room_types%5B%5D=Entire%20home%2Fapt&adults=${adults}`
  if (bathrooms && bathrooms > 0) url += `&min_bathrooms=${bathrooms}`
  return url
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { city, postcode, bedrooms, bathrooms, type, rent, propertyId } = body

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')

    let model = DEFAULT_MODEL
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data } = await supabase.from('ai_settings').select('model').eq('task', 'pricing').single()
      if (data?.model) model = data.model
    } catch { /* ai_settings may not exist */ }

    const minBeds = bedrooms || 1
    const minBath = bathrooms || 0

    const checkin30 = getFutureDate(30)
    const checkout30 = getFutureDate(37)
    const checkin60 = getFutureDate(60)
    const checkout60 = getFutureDate(67)
    const checkin90 = getFutureDate(90)
    const checkout90 = getFutureDate(97)

    const monthlyStart = getFirstOfMonth(30)
    const monthlyEnd = getFirstOfMonth(120)

    const airbnb_url_30d = buildAirbnbUrl(city, checkin30, checkout30, minBeds, minBath, monthlyStart, monthlyEnd)
    const airbnb_url_60d = buildAirbnbUrl(city, checkin60, checkout60, minBeds, minBath, monthlyStart, monthlyEnd)
    const airbnb_url_90d = buildAirbnbUrl(city, checkin90, checkout90, minBeds, minBath, monthlyStart, monthlyEnd)

    const systemPrompt = `You are an Airbnb pricing analyst for UK serviced accommodation.

Estimate the Airbnb nightly rate for:
- Property: ${minBeds}-bedroom${minBath > 0 ? `, ${minBath}-bathroom` : ''} ${type || 'house'} in ${city || 'the given area'}${postcode ? ` (${postcode})` : ''}
- Guests: ${minBeds} (1 per bedroom)

Use web search to find current Airbnb market data for this area. Search for:
- "Airbnb ${city} ${minBeds} bedroom nightly rate"
- "Airbnb average rate ${city} ${minBeds} bed"
- "${city} short let ${minBeds} bedroom price per night"
- "${city} serviced accommodation rates"

Use whatever real data you can find — Airbnb listings, market reports, Airbtics, property articles — to make an informed estimate.

Compare prices for 7-night stays across three windows:
- Window 1: ${checkin30} to ${checkout30}
- Window 2: ${checkin60} to ${checkout60}
- Window 3: ${checkin90} to ${checkout90}

PRICING RULES:
- A ${minBeds}-bedroom property earns more per night than a 1-2 bed. Scale accordingly.
${minBath > 0 ? `- ${minBath} bathrooms adds value — properties with more bathrooms command higher rates.\n` : ''}- Be conservative — landlords prefer under-promise over-deliver.
- Occupancy: 65-75% for London/Greater London, 55-65% for other UK cities.

CALCULATION:
estimated_monthly_revenue = estimated_nightly_rate × estimated_occupancy / 100 × 30

CONFIDENCE:
- "high" = based on real listing data or market reports you found via search
- "medium" = based on area averages scaled by bedroom count
- "low" = very limited data available

Return ONLY valid JSON:
{
  "estimated_nightly_rate": number (GBP, whole number),
  "estimated_occupancy": number (0-100, whole number),
  "estimated_monthly_revenue": number (GBP, whole number),
  "confidence": "high" | "medium" | "low",
  "reasoning": "explain what data you found and how you estimated"
}

No markdown. No extra text.`

    const details = [
      city ? `City: ${city}` : '',
      postcode ? `Postcode: ${postcode}` : '',
      bedrooms ? `Bedrooms: ${bedrooms}` : '',
      bathrooms ? `Bathrooms: ${bathrooms}` : '',
      type ? `Property type: ${type}` : '',
      rent ? `Monthly rent: £${rent}` : '',
    ].filter(Boolean).join('\n')

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        tools: [{ type: 'web_search' }],
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: details },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[airbnb-pricing] OpenAI error:', res.status, errText)
      throw new Error(`OpenAI error: ${res.status}`)
    }

    const data = await res.json()

    let text = ''
    if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === 'message' && Array.isArray(item.content)) {
          for (const block of item.content) {
            if (block.type === 'output_text' && block.text) {
              text = block.text.trim()
              break
            }
          }
          if (text) break
        }
      }
    }

    if (!text) {
      console.error('[airbnb-pricing] No text in response:', JSON.stringify(data).slice(0, 500))
      throw new Error('No text content in OpenAI response')
    }

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      text = text.replace(/```(?:json)?\s*/gi, '').replace(/```/gi, '').trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Could not parse JSON from response')
      }
    }

    // Save to DB
    if (propertyId) {
      try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        const monthlyRev = parsed.estimated_monthly_revenue || 0
        await supabase.from('properties').update({
          estimated_nightly_rate: parsed.estimated_nightly_rate,
          estimated_occupancy: parsed.estimated_occupancy,
          estimated_monthly_revenue: monthlyRev,
          estimated_profit: monthlyRev,
          profit_est: monthlyRev,
          estimation_confidence: parsed.confidence || null,
          estimation_notes: parsed.reasoning || null,
          airbnb_url_7d: airbnb_url_30d,
          airbnb_url_30d: airbnb_url_60d,
          airbnb_url_90d: airbnb_url_90d,
          ai_model_used: model,
        }).eq('id', propertyId)
      } catch (e) {
        console.error('[airbnb-pricing] Failed to save pricing to DB:', e)
      }
    }

    return new Response(JSON.stringify({
      ...parsed,
      estimated_monthly_revenue: parsed.estimated_monthly_revenue || 0,
      confidence: parsed.confidence || 'medium',
      notes: parsed.reasoning || '',
      airbnb_url_7d: airbnb_url_30d,
      airbnb_url_30d: airbnb_url_60d,
      airbnb_url_90d: airbnb_url_90d,
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

function getFirstOfMonth(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
