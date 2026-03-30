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
      console.error('Claim error:', emailErr.message, 'userId:', user.id, 'email:', email)
      const msg = emailErr.message.includes('already') || emailErr.message.includes('duplicate')
        ? 'That email is already in use. Try a different email.'
        : emailErr.message.includes('updating user')
          ? 'Could not update your account. The email may already be registered. Try a different email.'
          : `Error: ${emailErr.message}`;
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Update profile (name + email)
    await supabaseAdmin
      .from('profiles')
      .update({ name, email })
      .eq('id', user.id)

    // 3. Link ALL properties, threads, and inquiries matching this landlord's phone
    if (phone) {
      const { data: props } = await supabaseAdmin
        .from('properties')
        .select('id')
        .or(`contact_phone.eq.${phone},contact_whatsapp.eq.${phone},landlord_whatsapp.eq.${phone}`)
      if (props && props.length > 0) {
        const ids = props.map((p: { id: string }) => p.id)
        // Assign properties to this landlord (so they show under My Listings)
        await supabaseAdmin
          .from('properties')
          .update({ submitted_by: user.id } as Record<string, unknown>)
          .in('id', ids)
        // Legacy chat threads
        await supabaseAdmin
          .from('chat_threads')
          .update({ landlord_id: user.id })
          .in('property_id', ids)
      }
      // Update lister_email on inquiries so leads match after claiming
      await supabaseAdmin
        .from('inquiries')
        .update({ lister_email: email } as Record<string, unknown>)
        .eq('lister_phone', phone)
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
