// ghl-enroll -- Enroll a GHL contact into a workflow by phone number
// Trigger: POST from admin frontend
// Input: { phone, workflowId, contactName?, contactData? }
// contactData: { property_name?, tenant_name?, magic_link?, property_city?, property_ref? }
// Output: { success, contactId, created? } or { error }
//
// If no GHL contact exists for the phone, one is created automatically.
// For repeat enrollments, the contact is removed from the workflow first
// (with a short delay) before re-enrolling, so GHL re-triggers all steps.
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

/** Small delay to let GHL process the removal before re-enrollment */
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!GHL_TOKEN) {
      return new Response(JSON.stringify({ error: 'GHL_BEARER_TOKEN secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { phone, workflowId, contactName, contactData } = await req.json()
    // contactData: optional fields to set on the GHL contact before workflow enrollment
    // These populate the WhatsApp template parameters that the workflow uses
    const { property_name, tenant_name, magic_link, property_city, property_ref } = contactData || {} as Record<string, string>

    if (!phone || !workflowId) {
      return new Response(JSON.stringify({ error: 'Missing phone or workflowId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Normalize phone for GHL lookup
    const normalized = normalizeUKPhone(phone)
    if (!normalized) {
      console.error(`[ghl-enroll] Phone normalization failed for: ${phone}`)
    }
    const searchPhone = normalized || phone.replace(/[^0-9+]/g, '')

    // 1. Search for GHL contact by phone (try normalized first, then raw variants)
    const searchVariants = [searchPhone]
    if (normalized) {
      const digits = normalized.slice(1)
      const local = '0' + digits.slice(2)
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

    // 2. If no contact found, create one
    let created = false
    if (!contactId) {
      console.error(`[ghl-enroll] No GHL contact found for any variant: ${searchVariants.join(', ')}`)
      const createRes = await fetch(`${GHL_BASE}/contacts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GHL_TOKEN}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: GHL_LOCATION_ID,
          phone: normalized || searchPhone,
          name: contactName || undefined,
          source: 'nfstay-outreach',
        }),
      })

      if (!createRes.ok) {
        const body = await createRes.text()
        console.error(`[ghl-enroll] Contact creation failed (${createRes.status}): ${body}`)
        return new Response(JSON.stringify({ error: 'Failed to create GHL contact', detail: body }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const createData = await createRes.json()
      contactId = createData.contact?.id || null
      if (!contactId) {
        return new Response(JSON.stringify({ error: 'GHL contact creation returned no ID', detail: JSON.stringify(createData) }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      created = true
    }

    // 2b. Update contact fields so WhatsApp template parameters are populated
    if (contactData && contactId) {
      const updateBody: Record<string, unknown> = {}
      // Standard GHL fields
      if (contactName) updateBody.name = contactName

      // Custom fields for WhatsApp template interpolation
      // GHL custom fields use key-value pairs; we also set standard fields as fallback
      const customFieldUpdates: Array<{ key: string; field_value: string }> = []
      if (property_name) customFieldUpdates.push({ key: 'property_name', field_value: property_name })
      if (tenant_name) customFieldUpdates.push({ key: 'tenant_name', field_value: tenant_name })
      if (magic_link) customFieldUpdates.push({ key: 'magic_link', field_value: magic_link })
      if (property_city) customFieldUpdates.push({ key: 'property_city', field_value: property_city })
      if (property_ref) customFieldUpdates.push({ key: 'property_reference', field_value: property_ref })

      if (customFieldUpdates.length > 0) {
        updateBody.customFields = customFieldUpdates
      }

      // Also set company name to property_name (common GHL template field)
      if (property_name) updateBody.companyName = property_name

      // Set tags for tracking
      updateBody.tags = ['nfstay', 'lead-released']

      if (Object.keys(updateBody).length > 0) {
        try {
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
            console.error(`[ghl-enroll] Contact update failed (${updateRes.status}): ${body}`)
            // Non-blocking — continue with enrollment even if update fails
          } else {
            console.log(`[ghl-enroll] Contact ${contactId} fields updated: ${customFieldUpdates.map(f => f.key).join(', ')}`)
          }
        } catch (e) {
          console.error('[ghl-enroll] Contact update error:', e)
        }
        // Small delay to let GHL process the field update before workflow triggers
        await delay(500)
      }
    }

    // 3. Remove from workflow first (idempotent - ignores 404/errors)
    //    This ensures repeat enrollments re-trigger all workflow steps.
    if (!created) {
      const removeUrl = `${GHL_BASE}/contacts/${contactId}/workflow/${workflowId}`
      try {
        await fetch(removeUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${GHL_TOKEN}`,
            'Version': '2021-07-28',
          },
        })
        // Wait for GHL to process the removal before re-enrolling
        await delay(1500)
      } catch {
        // Non-blocking - removal failure shouldn't prevent enrollment
      }
    }

    // 4. Enroll contact in workflow
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
      console.error(`[ghl-enroll] Workflow enrollment failed (${enrollRes.status}): ${body}`)
      return new Response(JSON.stringify({ error: 'GHL workflow enrollment failed', detail: body }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[ghl-enroll] Successfully enrolled contactId=${contactId} into workflow=${workflowId} (created=${created})`)

    return new Response(JSON.stringify({ success: true, contactId, created }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
