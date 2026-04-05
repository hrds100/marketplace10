// process-inquiry — Handle tenant EMAIL inquiry submission
// Trigger: POST from frontend when tenant submits inquiry via email
// Input: { property_id, channel: 'email', message, tenant_name, tenant_email, tenant_phone }
// Output: { success, inquiry_id }
// NOTE: WhatsApp inquiries are handled by receive-tenant-whatsapp (GHL webhook → edge function)
// DEPLOY NOTE: This function must have verify_jwt=false (it handles JWT internally).
// Every Supabase deploy resets verify_jwt to true. After deploy, patch via Management API:
// curl -X PATCH -H "Authorization: Bearer <PAT>" -H "Content-Type: application/json" \
//   -d '{"verify_jwt": false}' \
//   "https://api.supabase.com/v1/projects/asazddtvjvmckouxcmmo/functions/process-inquiry"

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GHL_TOKEN = Deno.env.get('GHL_BEARER_TOKEN') || ''
const GHL_LOCATION_ID = 'eFBsWXY3BmWDGIRez13x'
const GHL_BASE = 'https://services.leadconnectorhq.com'
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

    // WhatsApp inquiries are created by the inbound route (receive-tenant-whatsapp).
    // This edge function handles email inquiries only.
    if (channel === 'whatsapp') {
      return new Response(JSON.stringify({ error: 'WhatsApp inquiries use the inbound route, not process-inquiry' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
    const propertyName = ((property as Record<string, unknown>).name as string || 'Property').replace(/\s*\(\s*\)\s*$/, '').trim()
    const ndaRequired = (property as Record<string, unknown>).nda_required as boolean || false
    const firstLandlordInquiry = (property as Record<string, unknown>).first_landlord_inquiry as boolean || false

    // 3. Idempotency: same tenant_email + property_id within 5 minutes -> return existing
    if (tenant_email) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: recentDup } = await supabaseAdmin
        .from('inquiries')
        .select('id')
        .eq('tenant_email', tenant_email)
        .eq('property_id', property_id)
        .gte('created_at', fiveMinAgo)
        .limit(1)
      if (recentDup && recentDup.length > 0) {
        return new Response(JSON.stringify({
          success: true,
          inquiry_id: recentDup[0].id,
          deduplicated: true,
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // 3b. Check if always_authorised for this lister phone (same as receive-tenant-whatsapp)
    const effectiveListerPhone = landlordWhatsapp || listerPhone
    let autoAuth = false
    let autoAuthType: string | null = null
    if (effectiveListerPhone) {
      const { data: existing } = await supabaseAdmin
        .from('inquiries')
        .select('always_authorised, authorisation_type')
        .eq('lister_phone', effectiveListerPhone)
        .eq('always_authorised', true)
        .limit(1)
      if (existing && existing.length > 0) {
        autoAuth = true
        autoAuthType = existing[0].authorisation_type || null
      }
    }

    // 4. Generate a unique token and insert inquiry
    const inquiryToken = crypto.randomUUID()

    const { data: inquiry, error: insertErr } = await supabaseAdmin
      .from('inquiries')
      .insert({
        tenant_id: user.id,
        property_id,
        lister_type: listerType,
        lister_phone: effectiveListerPhone,
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
        authorized: autoAuth,
        always_authorised: autoAuth,
        authorisation_type: autoAuthType,
      } as Record<string, unknown>)
      .select('id')
      .single()

    if (insertErr) {
      console.error('Insert error:', insertErr)
      return new Response(JSON.stringify({ error: 'Failed to create inquiry' }), {
        status: 500, headers: corsHeaders,
      })
    }

    // 4a. Notify admin via bell notification (non-blocking)
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: null,
        type: 'new_inquiry',
        title: `New inquiry for ${propertyName}`,
        body: `${tenant_name || 'Someone'} inquired about ${propertyName} via ${channel}`,
        property_id: property_id,
      } as Record<string, unknown>);
    } catch (e) {
      console.error('[process-inquiry] Failed to create admin notification:', e);
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

    // 5. WhatsApp auto-reply via GHL workflow enrollment
    // Workflow cf089a15 sends the templated WhatsApp with buttons
    if (resolvedTenantPhone && GHL_TOKEN) {
      const INQUIRY_WORKFLOW = 'cf089a15-1d42-4d9a-85d1-ab35b82b4ad5'
      try {
        const ghlHeaders = {
          'Authorization': `Bearer ${GHL_TOKEN}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        }

        // Find or create GHL contact
        let contactId = ''
        const searchRes = await fetch(
          `${GHL_BASE}/contacts/?query=${encodeURIComponent(resolvedTenantPhone)}&locationId=${GHL_LOCATION_ID}`,
          { headers: { 'Authorization': ghlHeaders.Authorization, 'Version': ghlHeaders.Version } }
        )
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          contactId = searchData?.contacts?.[0]?.id || ''
        }

        if (!contactId) {
          const createRes = await fetch(`${GHL_BASE}/contacts/`, {
            method: 'POST',
            headers: ghlHeaders,
            body: JSON.stringify({
              locationId: GHL_LOCATION_ID,
              phone: resolvedTenantPhone,
              name: tenant_name || resolvedTenantPhone,
              tags: ['nfstay', 'tenant'],
            }),
          })
          if (createRes.ok) {
            const createData = await createRes.json()
            contactId = createData?.contact?.id || ''
          }
        }

        if (contactId) {
          // Set property name custom field so the workflow template includes it
          await fetch(`${GHL_BASE}/contacts/${contactId}`, {
            method: 'PUT',
            headers: ghlHeaders,
            body: JSON.stringify({
              customFields: [{ id: 'Z0thvOTyoO2KxTMt5sP8', field_value: propertyName }],
            }),
          })

          // Remove from workflow first (idempotent), then re-enroll
          await fetch(`${GHL_BASE}/contacts/${contactId}/workflow/${INQUIRY_WORKFLOW}`, {
            method: 'DELETE', headers: { 'Authorization': ghlHeaders.Authorization, 'Version': ghlHeaders.Version },
          }).catch(() => {})

          // Enroll in workflow — GHL sends the templated WhatsApp
          const enrollRes = await fetch(`${GHL_BASE}/contacts/${contactId}/workflow/${INQUIRY_WORKFLOW}`, {
            method: 'POST', headers: ghlHeaders, body: '{}',
          })
          if (!enrollRes.ok) {
            console.error('[process-inquiry] Workflow enrollment failed:', enrollRes.status)
          }
        }
      } catch (e) {
        console.error('[process-inquiry] GHL workflow enrollment error:', e)
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
