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

    // 1. Validate token — must exist and not older than 30 days
    const expiryDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from('landlord_invites')
      .select('id, thread_id, created_at')
      .eq('magic_token', token)
      .gt('created_at', expiryDate)
      .maybeSingle()

    if (inviteErr || !invite) {
      return new Response(
        JSON.stringify({ error: 'This link has expired or is invalid. Ask the operator to send a new message.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Get phone from thread → property (no phone column in invite needed)
    const { data: thread } = await supabaseAdmin
      .from('chat_threads')
      .select('property_id')
      .eq('id', invite.thread_id)
      .maybeSingle()

    let phone = ''
    if (thread?.property_id) {
      const { data: property } = await supabaseAdmin
        .from('properties')
        .select('contact_phone, contact_whatsapp, landlord_whatsapp')
        .eq('id', thread.property_id)
        .maybeSingle()
      phone = (property?.contact_phone || property?.contact_whatsapp || property?.landlord_whatsapp || '').trim()
    }

    const cleanPhone = phone.replace(/\D/g, '')
    const internalEmail = `landlord_${cleanPhone}@nfstay.internal`

    // 3. Look up existing landlord by phone in profiles (whatsapp field)
    //    This handles re-taps without needing a landlord_user_id column
    let userId = ''

    if (cleanPhone) {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('whatsapp', phone)
        .maybeSingle()
      if (existingProfile?.id) userId = existingProfile.id
    }

    if (!userId) {
      // First tap — create Supabase account for this landlord
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

      // Create profile — whatsapp_verified:true bypasses OTP gate
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        name: phone,
        whatsapp: phone,
        whatsapp_verified: true,
      })
    }

    // 4. Link the thread to this landlord so loadThreads() finds it
    await supabaseAdmin
      .from('chat_threads')
      .update({ landlord_id: userId })
      .eq('id', invite.thread_id)

    // 5. Create a fresh session
    const { data: sessionData, error: sessionErr } = await supabaseAdmin.auth.admin.createSession({
      user_id: userId,
    })

    if (sessionErr || !sessionData?.session) {
      return new Response(JSON.stringify({ error: 'Failed to create session' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      thread_id: invite.thread_id,
      user_id: userId,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error: ' + String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
