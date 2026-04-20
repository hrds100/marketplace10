// ghl-signup-sync — Push a new signup to GoHighLevel.
//
// Called from VerifyOtp.tsx (email path) and ParticleAuthCallback.tsx (social path)
// immediately after the Particle wallet is created. Creates or updates the GHL
// contact with name, email, phone, tag `nfstay-signup`, and the Wallet Address
// custom field (ID: VTlstZfxHCFaDlEYSgDv).
//
// No workflow enrollment in v1 — optional workflowId is accepted but unused
// unless Hugo later provides a signup workflow ID.
//
// Input: { user_id, name, email, phone, wallet_address?, workflowId? }
// Output: { success, contactId, created } or { error }
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
const WALLET_FIELD_ID = 'VTlstZfxHCFaDlEYSgDv'
const SIGNUP_TAG = 'nfstay-signup'

/** Normalise any phone to E.164 (+XXXXXXXXXXX). UK numbers get full cleanup;
 *  non-UK numbers are accepted as-is if they start with + and contain digits. */
function normalisePhone(raw: string): string | null {
  if (!raw) return null
  const stripped = raw.replace(/[\s\-().]/g, '')
  // UK path
  let digits = stripped.startsWith('00') ? stripped.slice(2) : stripped
  digits = digits.startsWith('+') ? digits.slice(1) : digits
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '44' + digits.slice(1)
  }
  if (/^44\d{10}$/.test(digits)) {
    return '+' + digits
  }
  // Generic E.164: accept any + followed by 7-15 digits
  if (/^\+\d{7,15}$/.test(stripped)) {
    return stripped
  }
  if (/^\d{7,15}$/.test(stripped)) {
    return '+' + stripped
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!GHL_TOKEN) {
      return new Response(JSON.stringify({ error: 'GHL_BEARER_TOKEN secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { user_id, name, email, phone, wallet_address, workflowId } = await req.json()

    if (!email && !phone) {
      return new Response(JSON.stringify({ error: 'Missing email and phone — at least one is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalisedPhone = phone ? normalisePhone(phone) : null
    const cleanEmail = email ? String(email).trim().toLowerCase() : ''
    const cleanName = name ? String(name).trim() : ''

    // 1. Search for existing contact — phone first, then email
    let contactId: string | null = null

    if (normalisedPhone) {
      const searchVariants = [normalisedPhone, normalisedPhone.slice(1)]
      if (normalisedPhone.startsWith('+44')) {
        searchVariants.push('0' + normalisedPhone.slice(3))
      }
      for (const variant of searchVariants) {
        const searchUrl = `${GHL_BASE}/contacts/?query=${encodeURIComponent(variant)}&locationId=${GHL_LOCATION_ID}`
        const searchRes = await fetch(searchUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-07-28' },
        })
        if (!searchRes.ok) continue
        const searchData = await searchRes.json()
        const contacts = searchData.contacts || []
        if (contacts.length > 0) {
          contactId = contacts[0].id
          break
        }
      }
    }

    if (!contactId && cleanEmail) {
      const searchUrl = `${GHL_BASE}/contacts/?query=${encodeURIComponent(cleanEmail)}&locationId=${GHL_LOCATION_ID}`
      const searchRes = await fetch(searchUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-07-28' },
      })
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        const contacts = searchData.contacts || []
        if (contacts.length > 0) contactId = contacts[0].id
      }
    }

    // 2. Create contact if missing
    let created = false
    if (!contactId) {
      const createBody: Record<string, unknown> = {
        locationId: GHL_LOCATION_ID,
        source: 'nfstay-signup',
      }
      if (cleanEmail) createBody.email = cleanEmail
      if (normalisedPhone) createBody.phone = normalisedPhone
      if (cleanName) {
        createBody.name = cleanName
        const parts = cleanName.split(/\s+/)
        createBody.firstName = parts[0]
        if (parts.length > 1) createBody.lastName = parts.slice(1).join(' ')
      }

      const createRes = await fetch(`${GHL_BASE}/contacts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GHL_TOKEN}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createBody),
      })

      if (!createRes.ok) {
        const body = await createRes.text()
        console.error(`[ghl-signup-sync] Contact create failed (${createRes.status}): ${body}`)
        return new Response(JSON.stringify({ error: 'Failed to create GHL contact', detail: body }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const createData = await createRes.json()
      contactId = createData.contact?.id || null
      if (!contactId) {
        return new Response(JSON.stringify({ error: 'GHL returned no contact ID', detail: JSON.stringify(createData) }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      created = true
    }

    // 3. Update contact with tag + wallet custom field + name/email sync
    const updateBody: Record<string, unknown> = {}
    const customFields: Array<{ id: string; field_value: string }> = []
    if (wallet_address) {
      customFields.push({ id: WALLET_FIELD_ID, field_value: String(wallet_address) })
    }
    if (customFields.length > 0) updateBody.customFields = customFields
    updateBody.tags = [SIGNUP_TAG]
    if (cleanName && !created) {
      updateBody.name = cleanName
      const parts = cleanName.split(/\s+/)
      updateBody.firstName = parts[0]
      if (parts.length > 1) updateBody.lastName = parts.slice(1).join(' ')
    }
    if (cleanEmail && !created) updateBody.email = cleanEmail

    const updateRes = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateBody),
    })
    if (!updateRes.ok) {
      const body = await updateRes.text()
      console.error(`[ghl-signup-sync] Contact update failed (${updateRes.status}): ${body}`)
      // Non-fatal — contact exists and is reachable via phone/email even if custom field failed
    }

    // 4. Optional workflow enrollment (only if Hugo later provides a workflowId)
    if (workflowId && typeof workflowId === 'string') {
      const enrollRes = await fetch(`${GHL_BASE}/contacts/${contactId}/workflow/${workflowId}`, {
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
        console.error(`[ghl-signup-sync] Workflow enrollment failed (${enrollRes.status}): ${body}`)
      }
    }

    console.log(`[ghl-signup-sync] user=${user_id} contact=${contactId} created=${created} wallet=${wallet_address ? 'yes' : 'no'}`)

    return new Response(JSON.stringify({ success: true, contactId, created }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[ghl-signup-sync] Internal error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
