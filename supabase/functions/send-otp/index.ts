import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GHL_TOKEN = Deno.env.get('GHL_BEARER_TOKEN') || ''
const GHL_LOCATION_ID = 'eFBsWXY3BmWDGIRez13x'
const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_OTP_WORKFLOW = 'baabc69a-a00f-412a-863e-7189ae025091'

const ghlHeaders: Record<string, string> = {
  'Authorization': `Bearer ${GHL_TOKEN}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
}

/** Normalize UK phone to E.164 (+44XXXXXXXXXX) */
function normalizePhone(raw: string): string {
  const stripped = raw.replace(/[\s\-().]/g, '')
  let digits = stripped.startsWith('+') ? stripped.slice(1) : stripped
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0') && digits.length === 11) digits = '44' + digits.slice(1)
  // Fix +4407... → +447... (leading 0 after country code)
  if (digits.startsWith('440') && digits.length === 13) digits = '44' + digits.slice(3)
  return '+' + digits
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!GHL_TOKEN) {
      return new Response(JSON.stringify({ error: 'GHL_BEARER_TOKEN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { phone } = await req.json()
    if (!phone) {
      return new Response(JSON.stringify({ error: 'phone is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalized = normalizePhone(phone)

    // 1. Search for existing GHL contact by phone
    let contactId = ''
    const searchVariants = [normalized, normalized.slice(1)]
    for (const variant of searchVariants) {
      const searchRes = await fetch(
        `${GHL_BASE}/contacts/?query=${encodeURIComponent(variant)}&locationId=${GHL_LOCATION_ID}`,
        { headers: { 'Authorization': ghlHeaders.Authorization, 'Version': ghlHeaders.Version } }
      )
      if (!searchRes.ok) continue
      const searchData = await searchRes.json()
      if (searchData.contacts?.length > 0) {
        contactId = searchData.contacts[0].id
        break
      }
    }

    // 2. Create contact if not found
    if (!contactId) {
      const createRes = await fetch(`${GHL_BASE}/contacts/`, {
        method: 'POST',
        headers: ghlHeaders,
        body: JSON.stringify({
          locationId: GHL_LOCATION_ID,
          phone: normalized,
          name: normalized,
          tags: ['nfstay'],
        }),
      })
      if (!createRes.ok) {
        const body = await createRes.text()
        console.error('[send-otp] Contact creation failed:', createRes.status, body)
        return new Response(JSON.stringify({ error: 'Failed to create contact' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const createData = await createRes.json()
      contactId = createData.contact?.id || ''
    }

    if (!contactId) {
      return new Response(JSON.stringify({ error: 'Could not resolve GHL contact' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Enroll in OTP workflow (GHL sends the WhatsApp template)
    const enrollRes = await fetch(
      `${GHL_BASE}/contacts/${contactId}/workflow/${GHL_OTP_WORKFLOW}`,
      { method: 'POST', headers: ghlHeaders, body: '{}' }
    )

    if (!enrollRes.ok) {
      const body = await enrollRes.text()
      console.error('[send-otp] Workflow enrollment failed:', enrollRes.status, body)
      return new Response(JSON.stringify({ error: 'Failed to send OTP' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[send-otp] OTP workflow triggered for ${normalized} (contactId=${contactId})`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-otp] Error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
