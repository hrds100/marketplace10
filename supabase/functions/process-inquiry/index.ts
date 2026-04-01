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

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify the JWT to get the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401, headers: corsHeaders,
      })
    }

    const { property_id, channel, message, tenant_name, tenant_email, tenant_phone, property_url } = await req.json()

    // Resolve tenant phone: prefer explicit value, fall back to profiles.whatsapp
    let resolvedTenantPhone = tenant_phone || null
    if (!resolvedTenantPhone && user.id) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('whatsapp')
          .eq('id', user.id)
          .single()
        if (profile?.whatsapp) {
          resolvedTenantPhone = profile.whatsapp
        }
      } catch {
        // Non-blocking - continue without phone
      }
    }

    if (!property_id || !channel) {
      return new Response(JSON.stringify({ error: 'Missing required fields: property_id, channel' }), {
        status: 400, headers: corsHeaders,
      })
    }

    // 2. Look up the property to get lister details
    const { data: property, error: propErr } = await supabaseAdmin
      .from('properties')
      .select('name, contact_phone, contact_email, contact_name, lister_type, landlord_whatsapp, city, nda_required, first_landlord_inquiry')
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
    const ndaRequired = (property as Record<string, unknown>).nda_required as boolean || false
    const firstLandlordInquiry = (property as Record<string, unknown>).first_landlord_inquiry as boolean || false

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
        tenant_phone: resolvedTenantPhone,
        token: inquiryToken,
        status: 'new',
        nda_required: ndaRequired,
      } as Record<string, unknown>)
      .select('id')
      .single()

    if (insertErr) {
      console.error('Insert error:', insertErr)
      return new Response(JSON.stringify({ error: 'Failed to create inquiry' }), {
        status: 500, headers: corsHeaders,
      })
    }

    // 4b. Create a landlord_invites entry for the magic link (never expires)
    // GHL "Open NFsTay" button uses /inbox?token=... which calls landlord-magic-login
    let magicToken = crypto.randomUUID()
    try {
      const { error: inviteErr } = await supabaseAdmin.from('landlord_invites').insert({
        magic_token: magicToken,
        phone: landlordWhatsapp || listerPhone,
        lister_type: listerType,
      } as Record<string, unknown>)
      if (inviteErr) {
        console.error('Failed to create landlord invite:', inviteErr)
        magicToken = '' // Continue without magic token
      }
    } catch (e) {
      console.error('landlord_invites insert error:', e)
      magicToken = ''
    }

    // 5. Send WhatsApp courtesy reply to tenant (if they inquired via WhatsApp)
    if (channel === 'whatsapp' && resolvedTenantPhone) {
      try {
        await fetch(`${N8N_BASE}/webhook/inquiry-tenant-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: resolvedTenantPhone,
            tenant_name: tenant_name || 'there',
            property_name: propertyName,
            lister_type: listerType,
          }),
        })
        console.log(`Tenant WhatsApp reply sent to ${resolvedTenantPhone}`)
      } catch (e) {
        console.error('Failed to send tenant WhatsApp reply:', e)
      }
    }

    // 6. Send confirmation email to tenant
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
