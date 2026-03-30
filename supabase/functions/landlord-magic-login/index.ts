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

    // 1. Validate token — must exist (tokens never expire)
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from('landlord_invites')
      .select('id, thread_id, created_at, phone, lister_type')
      .eq('magic_token', token)
      .maybeSingle()

    if (inviteErr || !invite) {
      return new Response(
        JSON.stringify({ error: 'This link has expired or is invalid. Ask the operator to send a new message.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1b. Track magic link click timestamp
    await supabaseAdmin.from('landlord_invites').update({ used: true, used_at: new Date().toISOString() }).eq('id', invite.id)

    // 2. Get phone - from invite directly (new lead flow) or from thread → property (legacy inbox flow)
    let phone = ((invite as Record<string, unknown>).phone as string || '').trim()

    if (!phone && invite.thread_id) {
      const { data: thread } = await supabaseAdmin
        .from('chat_threads')
        .select('property_id')
        .eq('id', invite.thread_id)
        .maybeSingle()

      if (thread?.property_id) {
        const { data: property } = await supabaseAdmin
          .from('properties')
          .select('contact_phone, contact_whatsapp, landlord_whatsapp')
          .eq('id', thread.property_id)
          .maybeSingle()
        phone = (property?.contact_phone || property?.contact_whatsapp || property?.landlord_whatsapp || '').trim()
      }
    }

    const cleanPhone = phone.replace(/\D/g, '')
    const internalEmail = `landlord_${cleanPhone}@nfstay.internal`

    // 3. Look up existing landlord by phone in profiles (try multiple formats)
    let userId = ''
    let loginEmail = internalEmail

    if (cleanPhone) {
      const phoneVariants = [
        phone,
        '+' + cleanPhone,
        cleanPhone,
        '0' + cleanPhone.slice(2),
      ].filter(Boolean)

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

    // Fallback: check if internal email already exists in auth
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

    if (!userId) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: internalEmail,
        email_confirm: true,
        user_metadata: { phone, is_landlord: true, whatsapp: phone },
      })

      if (createErr) {
        return new Response(JSON.stringify({ error: 'Failed to create account: ' + createErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      userId = created.user.id
    }

    // Ensure profile has whatsapp_verified:true (bypasses OTP gate)
    const inviteRole = (invite as Record<string, unknown>).lister_type as string || null
    if (loginEmail === internalEmail) {
      await supabaseAdmin.from('profiles').upsert({
        id: userId, name: phone, whatsapp: phone, whatsapp_verified: true,
        ...(inviteRole ? { role: inviteRole } : {}),
      }, { onConflict: 'id', ignoreDuplicates: false })
    } else {
      await supabaseAdmin.from('profiles')
        .update({ whatsapp: phone, whatsapp_verified: true, ...(inviteRole ? { role: inviteRole } : {}) })
        .eq('id', userId)
    }

    // 4. Link the thread to this landlord
    await supabaseAdmin
      .from('chat_threads')
      .update({ landlord_id: userId })
      .eq('id', invite.thread_id)

    // 5. Session via generateLink + GoTrue /verify (createSession not in esm.sh@2)
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: loginEmail,
    })

    if (linkErr || !linkData?.properties?.hashed_token) {
      return new Response(JSON.stringify({ error: 'Failed to generate link: ' + linkErr?.message }), {
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
      return new Response(JSON.stringify({ error: 'Failed to verify token: ' + errBody }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const sessionData = await verifyRes.json()

    return new Response(JSON.stringify({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
      thread_id: invite.thread_id,
      user_id: userId,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error: ' + String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
