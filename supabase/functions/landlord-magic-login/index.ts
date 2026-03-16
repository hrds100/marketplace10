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

    // 1. Validate token — must exist and not be expired
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from('landlord_invites')
      .select('thread_id, phone, expires_at, landlord_user_id')
      .eq('magic_token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (inviteErr || !invite) {
      return new Response(
        JSON.stringify({ error: 'This link has expired or is invalid. Ask the operator to send a new message.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let userId: string = invite.landlord_user_id || ''

    if (!userId) {
      // 2. First tap — create Supabase account for this landlord
      const phone: string = invite.phone || ''
      // Internal email — landlord never sees or uses this
      const internalEmail = `landlord_${phone.replace(/\D/g, '')}@nfstay.internal`

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

      // 3. Create profile — whatsapp_verified:true bypasses OTP gate
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        name: phone,
        whatsapp: phone,
        whatsapp_verified: true,
        claimed: false,
      })

      // 4. Link the thread to this landlord so loadThreads() finds it
      await supabaseAdmin
        .from('chat_threads')
        .update({ landlord_id: userId })
        .eq('id', invite.thread_id)

      // 5. Store user ID in invite — future taps skip account creation
      await supabaseAdmin
        .from('landlord_invites')
        .update({ landlord_user_id: userId })
        .eq('magic_token', token)
    }

    // 6. Create a fresh session
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
