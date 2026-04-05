// receive-tenant-whatsapp -- Create inquiry from inbound tenant WhatsApp via GHL
// Input: { tenant_phone, tenant_name, message_body, property_ref, property_id, tenant_email? }
// Output: { success, inquiry_id } or { error }
// Inquiry appears in Admin > Outreach > Tenant Requests. Nothing sent to landlord.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BASE_URL = 'https://hub.nfstay.com'
const GHL_TOKEN = Deno.env.get('GHL_BEARER_TOKEN') || ''
const GHL_LOCATION_ID = 'eFBsWXY3BmWDGIRez13x'
const GHL_BASE = 'https://services.leadconnectorhq.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const raw = await req.json()

    // Accept BOTH formats:
    // A) Our edge function format: { tenant_phone, tenant_name, message_body, ... }
    // B) GHL raw webhook format: { phone, contactPhone, message, body, contactId, ... }
    let tenant_phone: string
    let tenant_name: string | null
    let message_body: string
    let property_ref: string | null
    let property_id: string | null
    let tenant_email: string | null

    if (raw.tenant_phone) {
      // Format A — already parsed (legacy n8n or direct call)
      tenant_phone = raw.tenant_phone
      tenant_name = raw.tenant_name || null
      message_body = raw.message_body || ''
      property_ref = raw.property_ref || null
      property_id = raw.property_id || null
      tenant_email = raw.tenant_email || null
    } else {
      // Format B — raw GHL webhook payload (direct from GHL, no n8n)
      const ghlBody = raw.body || raw
      message_body = ghlBody.message || ghlBody.body || ghlBody.text || ''
      tenant_phone = (ghlBody.phone || ghlBody.contactPhone || ghlBody.from || '').replace(/[^0-9+]/g, '')
      tenant_name = ghlBody.contactName || ghlBody.contact_name || null
      tenant_email = ghlBody.contactEmail || ghlBody.contact_email || null

      // Parse property reference from message (e.g. "Reference no.: A1B2C")
      const refMatch = message_body.match(/Ref(?:erence)?\s*(?:no\.)?[:#]?\s*([A-Z0-9]{5})/i)
      property_ref = refMatch ? refMatch[1].toUpperCase() : null

      // Parse property UUID from "ID: xxxxxxxx-..." in message
      const idMatch = message_body.match(/ID:\s*([0-9a-f-]{36})/i)
      property_id = idMatch ? idMatch[1] : null

      // Check if this is actually an nfstay inquiry
      const isInquiry = message_body.toLowerCase().includes('nfstay') || property_ref || property_id
        || message_body.match(/\/deals\//)
      if (!isInquiry) {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: 'Not an nfstay inquiry' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    if (!tenant_phone) {
      return new Response(JSON.stringify({ error: 'Missing tenant_phone' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 1. Find property via multiple strategies
    let property: any = null

    // A: Direct property_id (full UUID from n8n)
    if (property_id) {
      const { data } = await supabase.from('properties').select('*').eq('id', property_id).single()
      if (data) property = data
    }

    // B: Extract from /deals/ link in message (primary - tenant message always has this)
    if (!property && message_body) {
      const slugMatch = message_body.match(/\/deals\/([^\s\n]+)/i)
      if (slugMatch) {
        const slugOrId = slugMatch[1]
        const { data: bySlug } = await supabase.from('properties').select('*').eq('slug', slugOrId).single()
        if (bySlug) {
          property = bySlug
        } else {
          const { data: byId } = await supabase.from('properties').select('*').eq('id', slugOrId).single()
          if (byId) property = byId
        }
      }
    }

    // C: Extract short reference from message (e.g. "Reference no.: A1B2C")
    if (!property && message_body) {
      const refMatch = message_body.match(/Ref(?:erence)?\s*(?:no\.)?[:#]?\s*([A-Z0-9]{5})/i)
      if (refMatch) {
        const shortRef = refMatch[1].toLowerCase()
        const { data: candidates } = await supabase.from('properties').select('*').ilike('id', `${shortRef}%`)
        if (candidates && candidates.length === 1) property = candidates[0]
      }
    }

    // D: property_ref from n8n payload (short ref fallback)
    if (!property && property_ref) {
      const { data: candidates } = await supabase.from('properties').select('*').ilike('id', `${property_ref}%`)
      if (candidates && candidates.length === 1) property = candidates[0]
    }

    if (!property) {
      return new Response(JSON.stringify({
        error: 'Could not identify property from message',
        hint: 'Include a /deals/ link or reference number in the message',
        received: { property_ref, property_id, message_preview: (message_body || '').slice(0, 200) },
      }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Idempotency: if the same tenant_phone + property_id was created within 5 minutes, return existing
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentDup } = await supabase
      .from('inquiries')
      .select('id')
      .eq('tenant_phone', tenant_phone)
      .eq('property_id', property.id)
      .gte('created_at', fiveMinAgo)
      .limit(1)

    if (recentDup && recentDup.length > 0) {
      return new Response(JSON.stringify({
        success: true,
        inquiry_id: recentDup[0].id,
        property_name: property.name,
        auto_authorised: false,
        deduplicated: true,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Check if always_authorised for this lister phone
    const listerPhone = property.landlord_whatsapp || property.contact_phone || null
    let autoAuth = false
    let autoAuthType: string | null = null

    if (listerPhone) {
      const { data: existing } = await supabase
        .from('inquiries')
        .select('always_authorised, authorisation_type')
        .eq('lister_phone', listerPhone)
        .eq('always_authorised', true)
        .limit(1)
      if (existing && existing.length > 0) {
        autoAuth = true
        autoAuthType = existing[0].authorisation_type || null
      }
    }

    // 4. Insert inquiry -- authorized = false unless auto-authorised
    const token = crypto.randomUUID()
    const { data: inquiry, error: insertErr } = await supabase
      .from('inquiries')
      .insert({
        property_id: property.id,
        lister_type: property.lister_type || 'landlord',
        lister_phone: listerPhone,
        lister_email: property.contact_email || null,
        lister_name: property.contact_name || null,
        channel: 'whatsapp',
        message: message_body || '',
        tenant_name: tenant_name || null,
        tenant_phone: tenant_phone,
        tenant_email: tenant_email || null,
        token,
        status: 'new',
        nda_required: property.nda_required || false,
        authorized: autoAuth,
        always_authorised: autoAuth,
        authorisation_type: autoAuthType,
      })
      .select('id')
      .single()

    if (insertErr) {
      return new Response(JSON.stringify({ error: 'Failed to create inquiry', detail: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5a. Admin bell notification (non-blocking, same pattern as process-inquiry)
    try {
      await supabase.from('notifications').insert({
        user_id: null,
        type: 'new_inquiry',
        title: `New inquiry for ${property.name}`,
        body: `${tenant_name || 'Someone'} inquired about ${property.name} via whatsapp`,
        property_id: property.id,
      } as Record<string, unknown>);
    } catch (e) {
      console.error('[receive-tenant-whatsapp] Failed to create admin notification:', e);
    }

    // 5b. Tenant confirmation email (non-blocking, same pattern as process-inquiry)
    if (tenant_email) {
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'inquiry-tenant-confirmation',
            data: {
              tenant_name: tenant_name || 'there',
              tenant_email,
              property_name: property.name,
              property_url: `${BASE_URL}/deals/${property.id}`,
              lister_name: property.contact_name || 'Property Lister',
            },
          },
        })
        console.log(`[receive-tenant-whatsapp] Tenant confirmation email sent to ${tenant_email}`)
      } catch (e) {
        console.error('[receive-tenant-whatsapp] Failed to send tenant confirmation email:', e)
      }
    }

    // 5c. WhatsApp auto-reply REMOVED — GHL workflow cf089a15 is the single
    // sender for inbound WhatsApp auto-replies. Code must NOT also send one.

    return new Response(JSON.stringify({
      success: true,
      inquiry_id: inquiry.id,
      property_name: property.name,
      auto_authorised: autoAuth,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
