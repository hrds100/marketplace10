// lead-magic-login — Auto-login a lister via inquiry token, redirect to CRM
// Pattern copied from landlord-magic-login but uses inquiries table instead of landlord_invites

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { token } = await req.json()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Find inquiry by token
    const { data: inquiry, error: inquiryErr } = await supabaseAdmin
      .from('inquiries')
      .select('id, lister_phone, lister_email, lister_name, lister_type, property_id')
      .eq('token', token)
      .maybeSingle()

    if (inquiryErr || !inquiry) {
      return new Response(
        JSON.stringify({ error: 'This link has expired or is invalid.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const phone = (inquiry.lister_phone || '').trim()
    const listerEmail = (inquiry.lister_email || '').trim()
    const listerName = inquiry.lister_name || phone || 'Lister'
    const listerType = inquiry.lister_type || 'landlord'
    const cleanPhone = phone.replace(/\D/g, '')
    const internalEmail = cleanPhone ? `landlord_${cleanPhone}@nfstay.internal` : `lister_${inquiry.id.slice(0, 8)}@nfstay.internal`

    // 2. Find existing user by phone or email
    let userId = ''
    let loginEmail = internalEmail

    // Try phone match first
    if (cleanPhone) {
      const phoneVariants = [phone, '+' + cleanPhone, cleanPhone, '0' + cleanPhone.slice(2)].filter(Boolean)
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('whatsapp', phoneVariants)
        .maybeSingle()
      if (existingProfile?.id) {
        userId = existingProfile.id
        const { data: { user: existingUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (existingUser?.email) loginEmail = existingUser.email
      }
    }

    // Try email match
    if (!userId && listerEmail) {
      const { data: emailProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', listerEmail)
        .maybeSingle()
      if (emailProfile?.id) {
        userId = emailProfile.id
        const { data: { user: existingUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (existingUser?.email) loginEmail = existingUser.email
      }
    }

    // Fallback: check if internal email exists in auth
    if (!userId) {
      const lookupRes = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users?filter=${encodeURIComponent(internalEmail)}&page=1&per_page=1`,
        { headers: { 'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}` } }
      )
      if (lookupRes.ok) {
        const lookupData = await lookupRes.json()
        const matchedUsers = lookupData.users || lookupData
        const existing = Array.isArray(matchedUsers) ? matchedUsers.find((u: { email?: string }) => u.email === internalEmail) : null
        if (existing) {
          userId = existing.id
          loginEmail = internalEmail
        }
      }
    }

    // 3. Create account if none exists
    if (!userId) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: internalEmail,
        email_confirm: true,
        user_metadata: { phone, is_landlord: true, whatsapp: phone, name: listerName },
      })
      if (createErr) {
        return new Response(JSON.stringify({ error: 'Failed to create account: ' + createErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      userId = created.user.id
    }

    // 4. Ensure profile has correct data
    if (loginEmail === internalEmail) {
      await supabaseAdmin.from('profiles').upsert({
        id: userId, name: listerName, whatsapp: phone, whatsapp_verified: true,
        role: listerType,
      }, { onConflict: 'id', ignoreDuplicates: false })
    } else {
      await supabaseAdmin.from('profiles')
        .update({ whatsapp: phone || undefined, whatsapp_verified: true, role: listerType })
        .eq('id', userId)
    }

    // 4b. Backfill lister_id on this inquiry and all matching inquiries for this phone
    await supabaseAdmin.from('inquiries').update({ lister_id: userId }).eq('id', inquiry.id)
    if (phone) {
      await supabaseAdmin.from('inquiries')
        .update({ lister_id: userId })
        .eq('lister_phone', phone)
        .is('lister_id', null)
    }

    // 5. Generate session (same pattern as landlord-magic-login)
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: loginEmail,
    })

    if (linkErr || !linkData?.properties?.hashed_token) {
      return new Response(JSON.stringify({ error: 'Failed to generate session' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const verifyType = linkData.properties.verification_type ?? 'magiclink'
    const verifyRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: verifyType,
        token: linkData.properties.email_otp,
        email: loginEmail,
      }),
    })

    if (!verifyRes.ok) {
      const errBody = await verifyRes.text()
      return new Response(JSON.stringify({ error: 'Failed to verify: ' + errBody }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const sessionData = await verifyRes.json()

    return new Response(JSON.stringify({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
      user_id: userId,
      inquiry_id: inquiry.id,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error: ' + String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
