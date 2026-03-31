// ghl-enroll -- Enroll a GHL contact into a workflow by phone number
// Trigger: POST from admin frontend
// Input: { phone, workflowId }
// Output: { success, contactId } or { error }
//
// The GHL bearer token is stored as a Supabase secret (GHL_BEARER_TOKEN),
// never exposed to the frontend.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GHL_TOKEN = Deno.env.get('GHL_BEARER_TOKEN') || ''
const GHL_LOCATION_ID = 'eFBsWXY3BmWDGIRez13x'
const GHL_BASE = 'https://services.leadconnectorhq.com'

/** Normalize UK phone to E.164 (+44XXXXXXXXXX). Returns null if invalid. */
function normalizeUKPhone(raw: string): string | null {
  const stripped = raw.replace(/[\s\-().]/g, '')
  let digits = stripped.startsWith('00') ? stripped.slice(2) : stripped
  digits = digits.startsWith('+') ? digits.slice(1) : digits
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '44' + digits.slice(1)
  }
  if (!digits.startsWith('447') || digits.length !== 12) return null
  if (!/^\d+$/.test(digits)) return null
  return '+' + digits
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!GHL_TOKEN) {
      return new Response(JSON.stringify({ error: 'GHL_BEARER_TOKEN secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { phone, workflowId } = await req.json()

    if (!phone || !workflowId) {
      return new Response(JSON.stringify({ error: 'Missing phone or workflowId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Normalize phone for GHL lookup
    const normalized = normalizeUKPhone(phone)
    const searchPhone = normalized || phone.replace(/[^0-9+]/g, '')

    // 1. Search for GHL contact by phone (try normalized first, then raw variants)
    const searchVariants = [searchPhone]
    // Add fallback variants if normalized
    if (normalized) {
      const digits = normalized.slice(1) // strip leading +
      const local = '0' + digits.slice(2) // 07...
      if (!searchVariants.includes(digits)) searchVariants.push(digits)
      if (!searchVariants.includes(local)) searchVariants.push(local)
    }

    let contactId: string | null = null

    for (const variant of searchVariants) {
      const searchUrl = `${GHL_BASE}/contacts/?query=${encodeURIComponent(variant)}&locationId=${GHL_LOCATION_ID}`
      const searchRes = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${GHL_TOKEN}`,
          'Version': '2021-07-28',
        },
      })

      if (!searchRes.ok) continue

      const searchData = await searchRes.json()
      const contacts = searchData.contacts || []
      if (contacts.length > 0) {
        contactId = contacts[0].id
        break
      }
    }

    if (!contactId) {
      return new Response(JSON.stringify({ error: 'No GHL contact found for this landlord phone', phone: searchPhone, tried: searchVariants }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Enroll contact in workflow
    const enrollUrl = `${GHL_BASE}/contacts/${contactId}/workflow/${workflowId}`
    const enrollRes = await fetch(enrollUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: '{}',
    })

    if (!enrollRes.ok) {
      const body = await enrollRes.text()
      return new Response(JSON.stringify({ error: 'GHL workflow enrollment failed', detail: body }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, contactId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
