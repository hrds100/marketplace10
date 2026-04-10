// airbnb-pricing — Estimate Airbnb nightly rate + occupancy via OpenAI web search
// Uses OpenAI Responses API with web_search to check REAL Airbnb listings
// Method: 7-day stays at 3 windows (30, 60, 90 days out) → median nightly rate
// Input: { city, postcode, bedrooms, bathrooms, type, rent, propertyId }
// Output: { estimated_nightly_rate, estimated_occupancy, estimated_monthly_revenue,
//           airbnb_url_30d, airbnb_url_60d, airbnb_url_90d }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MODEL = 'gpt-4o'

// Build Airbnb search URL — filters by bedrooms, bathrooms, entire home, adults = 1 per bedroom
function buildAirbnbUrl(city: string, checkin: string, checkout: string, bedrooms: number, bathrooms: number, monthlyStart: string, monthlyEnd: string): string {
  const query = encodeURIComponent(city || 'London')
  const minBeds = bedrooms || 1
  const minBath = bathrooms || 1
  const adults = minBeds // 1 person per bedroom
  return `https://www.airbnb.co.uk/s/${query}/homes?refinement_paths%5B%5D=%2Fhomes&date_picker_type=calendar&checkin=${checkin}&checkout=${checkout}&search_type=filter_change&query=${query}&flexible_trip_lengths%5B%5D=one_week&monthly_start_date=${monthlyStart}&monthly_length=3&monthly_end_date=${monthlyEnd}&search_mode=regular_search&price_filter_input_type=1&price_filter_num_nights=7&channel=EXPLORE&min_bedrooms=${minBeds}&min_beds=${minBeds}&min_bathrooms=${minBath}&room_types%5B%5D=Entire%20home%2Fapt&adults=${adults}`
}

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

    const minBeds = bedrooms || 1
    const minBath = bathrooms || 1

    // Build 3 Airbnb search URLs: 7-day stays at 30, 60, 90 days out
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

    const systemPrompt = `You are an Airbnb pricing analyst. You ONLY use Airbnb data. No other platform.

TASK: Find real Airbnb prices for a ${minBeds}-bedroom, ${minBath}-bathroom ${type || 'house'} in ${city || 'the given area'}${postcode ? ` (${postcode})` : ''}.

Airbnb is a public website. No login is needed. Anyone can search and see prices.

SEARCH THESE AIRBNB URLS — they are filtered by ${minBeds}+ bedrooms, ${minBath}+ bathrooms, entire home only:
- ${airbnb_url_30d}
- ${airbnb_url_60d}
- ${airbnb_url_90d}

Also try these searches:
- Search: "airbnb ${city} ${minBeds} bedroom entire home"
- Search: "airbnb.co.uk ${city} ${minBeds} bed house"
- Search: "site:airbnb.co.uk ${city} ${minBeds} bedroom"

If one search fails, try another. Airbnb is public — keep trying.

WHAT TO COLLECT:
For each URL/search, find real Airbnb listings and note:
- The listing name
- The total price shown for 7 nights
- Number of bedrooms

You need prices from at least 2-3 listings.

CALCULATION:
1. Take each 7-night total price, divide by 7 = nightly rate
2. Take the MEDIAN nightly rate across all listings you found
3. Monthly revenue = nightly_rate × occupancy% / 100 × 30

RULES:
- ONLY Airbnb. No Booking.com, no VRBO, no other platform.
- Only ENTIRE HOME listings (not private rooms or shared rooms)
- Match: ${minBeds}+ bedrooms, ${minBath}+ bathrooms
- Prefer ${type || 'house'} types
- Be conservative — under-promise over-deliver
- Occupancy: 65-75% for London/Greater London, 55-65% for other UK cities
- DO NOT guess from your training data. Only use prices you found on Airbnb right now.

CONFIDENCE:
- "high" = found 3+ real Airbnb listings with prices
- "medium" = found 1-2 real Airbnb listings with prices
- "low" = could not find real Airbnb prices (return error below)

If after trying ALL searches above you truly cannot find any Airbnb prices:
RETURN: { "confidence": "low", "error": "no_real_data", "estimated_nightly_rate": 0, "estimated_occupancy": 0, "estimated_monthly_revenue": 0, "reasoning": "Could not access Airbnb listings after multiple attempts" }

Return ONLY valid JSON:
{
  "estimated_nightly_rate": number (GBP, whole number — median from real Airbnb listings),
  "estimated_occupancy": number (percentage 0-100, whole number),
  "estimated_monthly_revenue": number (GBP, nightly_rate × occupancy/100 × 30),
  "confidence": "high" | "medium" | "low",
  "reasoning": "list the Airbnb listings you found, their prices, and how you got the median"
}

Do not include markdown or extra text.`

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

    // Extract text from Responses API output
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
      // Try stripping markdown fences
      text = text.replace(/```(?:json)?\s*/gi, '').replace(/```/gi, '').trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Could not parse JSON from response')
      }
    }

    // If AI couldn't access real data, return the error without saving
    if (parsed.error === 'no_real_data' || parsed.estimated_nightly_rate === 0) {
      return new Response(JSON.stringify({
        ...parsed,
        confidence: 'low',
        error: 'no_real_data',
        notes: parsed.reasoning || 'Could not access real Airbnb listing data. Use the links below to check manually.',
        airbnb_url_7d: airbnb_url_30d,
        airbnb_url_30d: airbnb_url_60d,
        airbnb_url_90d: airbnb_url_90d,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Save pricing to properties table if propertyId provided
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
          airbnb_url_7d: airbnb_url_30d,
          airbnb_url_30d: airbnb_url_60d,
          airbnb_url_90d: airbnb_url_90d,
        }).eq('id', propertyId)
      } catch (e) {
        console.error('[airbnb-pricing] Failed to save pricing to DB:', e)
      }
    }

    return new Response(JSON.stringify({
      ...parsed,
      estimated_monthly_revenue: parsed.estimated_monthly_revenue || 0,
      confidence: parsed.confidence || (parsed.estimated_occupancy >= 70 ? 'high' : parsed.estimated_occupancy >= 50 ? 'medium' : 'low'),
      notes: parsed.reasoning || parsed.notes || '',
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
