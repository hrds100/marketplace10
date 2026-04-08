// cancel-subscription — User-initiated subscription cancellation
// Trigger: POST from SettingsPage (authenticated user)
// Input: { email, phone? }
// Steps:
//   1. Find profile by email
//   2. Set tier → 'free' in Supabase
//   3. Enroll GHL contact in cancel workflow (if phone available)
// Output: { success, previous_tier } or { error }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GHL_TOKEN = Deno.env.get('GHL_BEARER_TOKEN') || ''
const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_LOCATION_ID = 'eFBsWXY3BmWDGIRez13x'
const GHL_CANCEL_WORKFLOW_ID = '33f0ef03-610d-436a-8d53-0fec09e7a14e'

/** Normalize UK phone to E.164. Returns null if invalid. */
function normalizeUKPhone(raw: string): string | null {
  const stripped = raw.replace(/[\s\-().]/g, '')
  let digits = stripped.startsWith('00') ? stripped.slice(2) : stripped
  digits = digits.startsWith('+') ? digits.slice(1) : digits
  if (digits.startsWith('0') && digits.length === 11) digits = '44' + digits.slice(1)
  if (!digits.startsWith('44') || digits.length < 11) return null
  if (!/^\d+$/.test(digits)) return null
  return '+' + digits
}

/** Enroll a GHL contact into the cancel workflow by phone. Non-blocking — errors are logged only. */
async function enrollCancelWorkflow(phone: string, name: string): Promise<void> {
  if (!GHL_TOKEN) { console.warn('[cancel-subscription] GHL_BEARER_TOKEN not set — skipping workflow'); return }

  const normalized = normalizeUKPhone(phone)
  const searchPhone = normalized || phone.replace(/[^0-9+]/g, '')

  // 1. Find GHL contact
  let contactId: string | null = null
  try {
    const res = await fetch(`${GHL_BASE}/contacts/?query=${encodeURIComponent(searchPhone)}&locationId=${GHL_LOCATION_ID}`, {
      headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-07-28' },
    })
    if (res.ok) {
      const data = await res.json()
      contactId = data.contacts?.[0]?.id || null
    }
  } catch (e) { console.error('[cancel-subscription] GHL contact search error:', e) }

  // 2. Create contact if not found
  if (!contactId) {
    try {
      const res = await fetch(`${GHL_BASE}/contacts/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-07-28', 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: GHL_LOCATION_ID, phone: searchPhone, name, source: 'nfstay-cancel' }),
      })
      if (res.ok) {
        const data = await res.json()
        contactId = data.contact?.id || null
      }
    } catch (e) { console.error('[cancel-subscription] GHL contact create error:', e) }
  }

  if (!contactId) { console.warn('[cancel-subscription] Could not find/create GHL contact — skipping workflow'); return }

  // 3. Enroll in cancel workflow
  try {
    const res = await fetch(`${GHL_BASE}/contacts/${contactId}/workflow/${GHL_CANCEL_WORKFLOW_ID}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-07-28', 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (res.ok) {
      console.log(`[cancel-subscription] Enrolled contactId=${contactId} in cancel workflow`)
    } else {
      const body = await res.text()
      console.error(`[cancel-subscription] Workflow enrollment failed (${res.status}): ${body}`)
    }
  } catch (e) { console.error('[cancel-subscription] GHL enroll error:', e) }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const { email, phone } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    // 1. Find profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, tier, name, whatsapp')
      .eq('email', normalizedEmail)
      .single()

    if (profileErr || !profile) {
      console.error(`[cancel-subscription] Profile not found for ${normalizedEmail}`)
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const previousTier = profile.tier || 'free'

    // 2. Set tier → free
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ tier: 'free' })
      .eq('id', profile.id)

    if (updateErr) {
      console.error(`[cancel-subscription] DB update failed:`, updateErr)
      return new Response(JSON.stringify({ error: 'Failed to cancel subscription' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[cancel-subscription] ${normalizedEmail} tier ${previousTier} → free`)

    // 3. Enroll in GHL cancel workflow (non-blocking — don't fail the request if GHL errors)
    const contactPhone = phone || profile.whatsapp || ''
    if (contactPhone) {
      await enrollCancelWorkflow(contactPhone, profile.name || normalizedEmail)
    } else {
      console.warn(`[cancel-subscription] No phone for ${normalizedEmail} — GHL workflow skipped`)
    }

    return new Response(JSON.stringify({ success: true, previous_tier: previousTier, tier: 'free' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[cancel-subscription] Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
