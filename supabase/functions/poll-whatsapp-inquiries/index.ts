// poll-whatsapp-inquiries — Reads recent GHL WhatsApp conversations
// and creates inquiry records in Supabase for the admin gate.
//
// WHY: GHL Custom Webhook action is broken (steps get skipped).
// This function bypasses GHL webhooks entirely by polling the
// GHL conversations API directly.
//
// CALLED BY: Vercel cron (every 2 minutes) or manual invocation.
// DOES NOT send replies — GHL workflow cf089a15 handles that.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_LOCATION_ID = 'eFBsWXY3BmWDGIRez13x'
const POLL_WINDOW_MS = 10 * 60 * 1000 // look back 10 minutes

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const GHL_TOKEN = Deno.env.get('GHL_BEARER_TOKEN') || ''
  if (!GHL_TOKEN) {
    return new Response(JSON.stringify({ error: 'GHL_BEARER_TOKEN not set' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const ghlHeaders = { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-07-28' }

  const results: Array<{ phone: string; property: string; action: string }> = []

  try {
    // 1. Fetch recent conversations from GHL
    const convRes = await fetch(
      `${GHL_BASE}/conversations/search?locationId=${GHL_LOCATION_ID}&limit=20&sort=desc&sortBy=last_message_date`,
      { headers: ghlHeaders }
    )
    if (!convRes.ok) {
      const errText = await convRes.text()
      console.error('[poll] GHL conversations API failed:', convRes.status, errText)
      return new Response(JSON.stringify({ error: 'GHL API failed', status: convRes.status }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const convData = await convRes.json()
    const conversations = convData?.conversations || []
    console.log(`[poll] Found ${conversations.length} recent conversations`)

    // 2. For each conversation, check for recent inbound nfstay messages
    for (const conv of conversations) {
      if (!conv.id) continue

      // Get recent messages
      const msgRes = await fetch(
        `${GHL_BASE}/conversations/${conv.id}/messages?limit=5`,
        { headers: ghlHeaders }
      )
      if (!msgRes.ok) continue

      const msgData = await msgRes.json()
      const messages = msgData?.messages?.messages || msgData?.messages || []

      // Find inbound messages containing "nfstay" within the poll window
      const cutoff = Date.now() - POLL_WINDOW_MS
      for (const msg of messages) {
        if (msg.direction !== 'inbound') continue

        const msgDate = new Date(msg.dateAdded || msg.createdAt).getTime()
        if (msgDate < cutoff) continue

        const body = msg.body || msg.message || ''
        if (!body.includes('/deals/')) continue

        const phone = conv.phone || conv.contactPhone || ''
        if (!phone) continue

        console.log(`[poll] Found nfstay inquiry from ${phone}: ${body.substring(0, 100)}`)

        // 3. Parse property from message
        const property = await findPropertyFromMessage(supabase, body)
        if (!property) {
          console.log(`[poll] Could not match property for ${phone}`)
          results.push({ phone, property: 'unknown', action: 'no_property_match' })
          continue
        }

        // 4. Dedup check — same phone + property within 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data: existing } = await supabase
          .from('inquiries')
          .select('id')
          .eq('tenant_phone', phone)
          .eq('property_id', property.id)
          .gte('created_at', oneDayAgo)
          .limit(1)

        if (existing && existing.length > 0) {
          console.log(`[poll] Duplicate inquiry — ${phone} already inquired about ${property.name}`)
          results.push({ phone, property: property.name, action: 'duplicate' })
          continue
        }

        // 5. Create inquiry
        const contactName = conv.contactName || conv.contact_name || null
        const contactEmail = conv.contactEmail || conv.contact_email || null
        const listerPhone = property.landlord_whatsapp || property.contact_phone || null

        // Check auto-auth
        let autoAuth = false
        let autoAuthType: string | null = null
        if (listerPhone) {
          const { data: authCheck } = await supabase
            .from('inquiries')
            .select('always_authorised, authorisation_type')
            .eq('lister_phone', listerPhone)
            .eq('always_authorised', true)
            .limit(1)
          if (authCheck && authCheck.length > 0) {
            autoAuth = true
            autoAuthType = authCheck[0].authorisation_type || null
          }
        }

        const token = crypto.randomUUID()
        const { data: inquiry, error } = await supabase
          .from('inquiries')
          .insert({
            property_id: property.id,
            lister_type: property.lister_type || 'landlord',
            lister_phone: listerPhone,
            lister_email: property.contact_email || null,
            lister_name: property.contact_name || null,
            channel: 'whatsapp',
            message: body,
            tenant_name: contactName,
            tenant_phone: phone,
            tenant_email: contactEmail,
            token,
            status: 'new',
            nda_required: property.nda_required || false,
            authorized: autoAuth,
            always_authorised: autoAuth,
            authorisation_type: autoAuthType,
          })
          .select('id')
          .single()

        if (error) {
          console.error(`[poll] Failed to create inquiry for ${phone}:`, error.message)
          results.push({ phone, property: property.name, action: `error: ${error.message}` })
          continue
        }

        // 6. Notify admin (non-blocking)
        supabase.from('notifications').insert({
          type: 'new_inquiry',
          title: `New WhatsApp inquiry for ${property.name}`,
          body: `From ${contactName || phone}`,
          metadata: { property_id: property.id, inquiry_id: inquiry.id },
        }).then(() => {}).catch(() => {})

        console.log(`[poll] Created inquiry ${inquiry.id} for ${phone} → ${property.name}`)
        results.push({ phone, property: property.name, action: 'created' })
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[poll] Error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// --- Property lookup (same logic as receive-tenant-whatsapp/find-property.ts) ---

async function findPropertyFromMessage(supabase: any, messageBody: string): Promise<any | null> {
  // A: Extract from /deals/ link
  const slugMatch = messageBody.match(/\/deals\/([^\s\n]+)/i)
  if (slugMatch) {
    const slugOrId = slugMatch[1]
    const { data: bySlug } = await supabase.from('properties').select('id, name, lister_type, landlord_whatsapp, contact_phone, contact_email, contact_name, nda_required').eq('slug', slugOrId).single()
    if (bySlug) return bySlug
    const { data: byId } = await supabase.from('properties').select('id, name, lister_type, landlord_whatsapp, contact_phone, contact_email, contact_name, nda_required').eq('id', slugOrId).single()
    if (byId) return byId
  }

  // B: Extract reference number
  const refMatch = messageBody.match(/Ref(?:erence)?\s*(?:no\.)?[:#]?\s*([A-Z0-9]{5})/i)
  if (refMatch) {
    const shortRef = refMatch[1].toLowerCase()
    const { data: candidates } = await supabase.from('properties').select('id, name, lister_type, landlord_whatsapp, contact_phone, contact_email, contact_name, nda_required').ilike('id', `${shortRef}%`)
    if (candidates && candidates.length === 1) return candidates[0]
  }

  // C: Extract UUID
  const idMatch = messageBody.match(/ID:\s*([0-9a-f-]{36})/i)
  if (idMatch) {
    const { data } = await supabase.from('properties').select('id, name, lister_type, landlord_whatsapp, contact_phone, contact_email, contact_name, nda_required').eq('id', idMatch[1]).single()
    if (data) return data
  }

  return null
}
