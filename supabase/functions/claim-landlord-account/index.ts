import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, name } = await req.json()
    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'Email and name are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the calling user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )
    const { data: { user }, error: userErr } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const phone: string = user.user_metadata?.phone || user.user_metadata?.whatsapp || ''

    // 1. Update auth email (admin API — no confirmation email needed, phone verified via WhatsApp)
    const { error: emailErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email,
      email_confirm: true,
    })
    if (emailErr) {
      return new Response(
        JSON.stringify({ error: emailErr.message.includes('already') ? 'That email is already in use.' : emailErr.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Update profile
    await supabaseAdmin
      .from('profiles')
      .update({ name, claimed: true })
      .eq('id', user.id)

    // 3. Link ALL property threads matching this landlord's phone to their account
    if (phone) {
      const { data: props } = await supabaseAdmin
        .from('properties')
        .select('id')
        .or(`contact_phone.eq.${phone},contact_whatsapp.eq.${phone},landlord_whatsapp.eq.${phone}`)
      if (props && props.length > 0) {
        const ids = props.map((p: { id: string }) => p.id)
        await supabaseAdmin
          .from('chat_threads')
          .update({ landlord_id: user.id })
          .in('property_id', ids)
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
