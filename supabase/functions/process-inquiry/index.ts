// process-inquiry — Handle tenant inquiry submission
// Trigger: POST from frontend when tenant submits inquiry (WhatsApp or Email)
// Input: { property_id, channel, message, tenant_name, tenant_email, tenant_phone }
// Output: { success, inquiry_id }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const N8N_BASE = 'https://n8n.srv886554.hstgr.cloud'
const BASE_URL = 'https://hub.nfstay.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Get caller's user ID from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: corsHeaders,
      })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify the JWT to get the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401, headers: corsHeaders,
      })
    }

    const { property_id, channel, message, tenant_name, tenant_email, tenant_phone, property_url } = await req.json()

    if (!property_id || !channel) {
      return new Response(JSON.stringify({ error: 'Missing required fields: property_id, channel' }), {
        status: 400, headers: corsHeaders,
      })
    }

    // 2. Look up the property to get lister details
    const { data: property, error: propErr } = await supabaseAdmin
      .from('properties')
      .select('name, contact_phone, contact_email, contact_name, lister_type, landlord_whatsapp, city')
      .eq('id', property_id)
      .single()

    if (propErr || !property) {
      return new Response(JSON.stringify({ error: 'Property not found' }), {
        status: 404, headers: corsHeaders,
      })
    }

    const listerType = (property as Record<string, unknown>).lister_type as string || 'landlord'
    const listerPhone = (property as Record<string, unknown>).contact_phone as string || null
    const listerEmail = (property as Record<string, unknown>).contact_email as string || null
    const listerName = (property as Record<string, unknown>).contact_name as string || 'Property Lister'
    const landlordWhatsapp = (property as Record<string, unknown>).landlord_whatsapp as string || null
    const propertyName = (property as Record<string, unknown>).name as string || 'Property'

    // 3. Generate a unique token
    const inquiryToken = crypto.randomUUID()

    // 4. Insert into inquiries table
    const { data: inquiry, error: insertErr } = await supabaseAdmin
      .from('inquiries')
      .insert({
        tenant_id: user.id,
        property_id,
        lister_type: listerType,
        lister_phone: listerPhone,
        lister_email: listerEmail,
        lister_name: listerName,
        channel,
        message: message || null,
        tenant_name: tenant_name || null,
        tenant_email: tenant_email || null,
        tenant_phone: tenant_phone || null,
        token: inquiryToken,
        status: 'new',
      } as Record<string, unknown>)
      .select('id')
      .single()

    if (insertErr) {
      console.error('Insert error:', insertErr)
      return new Response(JSON.stringify({ error: 'Failed to create inquiry' }), {
        status: 500, headers: corsHeaders,
      })
    }

    // 5. Determine lister notification type and URL
    const isNdaRequired = listerType === 'deal_sourcer'
    const leadUrl = isNdaRequired
      ? `${BASE_URL}/lead/${inquiryToken}/nda`
      : `${BASE_URL}/lead/${inquiryToken}`

    // 6. Send email to lister if they have an email address
    if (listerEmail) {
      try {
        const emailType = isNdaRequired ? 'inquiry-lister-nda' : 'inquiry-lister-notification'
        const propUrl = property_url || `${BASE_URL}/deals/${property_id}`
        const emailData = isNdaRequired
          ? { lister_name: listerName, lister_email: listerEmail, property_name: propertyName, property_url: propUrl, nda_url: `${BASE_URL}/lead/${inquiryToken}/nda` }
          : { lister_name: listerName, lister_email: listerEmail, tenant_name: tenant_name || 'A tenant', property_name: propertyName, property_url: propUrl, lead_url: `${BASE_URL}/lead/${inquiryToken}` }

        await supabaseAdmin.functions.invoke('send-email', {
          body: { type: emailType, data: emailData },
        })
        console.log(`Lister email sent: ${emailType} to ${listerEmail}`)
      } catch (emailErr) {
        console.error('Failed to send lister email:', emailErr)
        // Non-blocking - continue even if email fails
      }
    }

    // 7. Send WhatsApp to lister if they have a phone number
    // Cold landlord = admin listed with phone only, no email → use 1-landlord_enquiry GHL workflow
    // Registered landlord = has email → use 2-Tenant to Landlord GHL workflow
    const isColdLandlord = !listerEmail
    const whatsappPhone = landlordWhatsapp || listerPhone
    if (whatsappPhone) {
      try {
        await fetch(`${N8N_BASE}/webhook/inquiry-lister-whatsapp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: whatsappPhone,
            lister_name: listerName,
            property_name: propertyName,
            lead_url: leadUrl,
            is_cold: isColdLandlord,
          }),
        })
        console.log(`WhatsApp notification sent to ${whatsappPhone}`)
      } catch (waErr) {
        console.error('Failed to send WhatsApp notification:', waErr)
        // Non-blocking - continue even if WhatsApp fails
      }
    }

    // 9. Send confirmation email to tenant
    if (tenant_email) {
      try {
        await supabaseAdmin.functions.invoke('send-email', {
          body: {
            type: 'inquiry-tenant-confirmation',
            data: {
              tenant_name: tenant_name || 'there',
              tenant_email,
              property_name: propertyName,
              property_url: property_url || `${BASE_URL}/deals/${property_id}`,
              lister_name: listerName,
            },
          },
        })
        console.log(`Tenant confirmation email sent to ${tenant_email}`)
      } catch (tenantEmailErr) {
        console.error('Failed to send tenant confirmation email:', tenantEmailErr)
        // Non-blocking
      }
    }

    // 10. Return success
    return new Response(JSON.stringify({
      success: true,
      inquiry_id: (inquiry as Record<string, unknown>).id,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('process-inquiry error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
