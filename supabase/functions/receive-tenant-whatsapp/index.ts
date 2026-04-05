// receive-tenant-whatsapp — Orchestrator (thin)
// Calls 5 small modules in sequence. Each module is independent and testable.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseBody, parseMessage } from './parse-message.ts'
import { findProperty } from './find-property.ts'
import { createInquiry } from './create-inquiry.ts'
import { notifyAdmin, notifyTenantEmail } from './notify.ts'
import { enrollReply } from './enroll-reply.ts'

const GHL_TOKEN = Deno.env.get('GHL_BEARER_TOKEN') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Parse
    const bodyText = await req.text()
    console.log('[receive-tenant-whatsapp] Body:', bodyText.substring(0, 300))
    const raw = parseBody(bodyText)
    const parsed = parseMessage(raw)

    if ('skip' in parsed) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: parsed.reason }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if ('error' in parsed) {
      return new Response(JSON.stringify({ error: parsed.error }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { tenant_phone, tenant_name, message_body, property_ref, property_id, tenant_email } = parsed

    // 2. Find property
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const property = await findProperty(supabase, message_body, property_id, property_ref)

    if (!property) {
      // GHL follow-up replies won't have a property ref — just enroll for reply
      const rawBody = (raw.body as Record<string, unknown>) || raw
      const isGhlWebhook = !!(rawBody.contactName || rawBody.contact_name || rawBody.contactEmail || rawBody.contact_email || rawBody.contactPhone)

      if (isGhlWebhook) {
        enrollReply(tenant_phone, 'your property', GHL_TOKEN).catch(() => {})
        return new Response(JSON.stringify({
          success: true,
          ghl_reply_only: true,
          message: 'GHL follow-up reply — enrolled for WhatsApp response',
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Cold inbound without property ref — still reject
      return new Response(JSON.stringify({
        error: 'Could not identify property from message',
        hint: 'Include a /deals/ link or reference number in the message',
        received: { property_ref, property_id, message_preview: (message_body || '').slice(0, 200) },
      }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Create inquiry (with dedup + auto-auth)
    const { inquiryId, isDuplicate } = await createInquiry(
      supabase, property, tenant_phone, tenant_name, tenant_email, message_body
    )

    // 4. Notify (non-blocking — don't fail if these fail)
    if (!isDuplicate) {
      notifyAdmin(supabase, property.name, property.id, tenant_name).catch(() => {})
      if (tenant_email) {
        notifyTenantEmail(supabase, tenant_email, tenant_name, property.name, property.id, property.contact_name || 'Property Lister').catch(() => {})
      }
    }

    // 5. Enroll in WhatsApp reply workflow
    enrollReply(tenant_phone, property.name || 'your property', GHL_TOKEN).catch(() => {})

    // Respond immediately — notifications and enrollment run in background
    return new Response(JSON.stringify({
      success: true,
      inquiry_id: inquiryId,
      property_name: property.name,
      deduplicated: isDuplicate,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[receive-tenant-whatsapp] Error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
