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

    const { email, name, password } = await req.json()
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

    // Verify the calling user's JWT (use admin client for reliability with magic link sessions)
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userErr || !user) {
      console.error('Auth failed:', userErr?.message)
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const phone: string = user.user_metadata?.phone || user.user_metadata?.whatsapp || ''

    // 1. Update email via SQL function (GoTrue admin API has a known 500 bug on email changes)
    const { data: claimResult, error: claimErr } = await supabaseAdmin.rpc('claim_landlord_email', {
      p_user_id: user.id,
      p_new_email: email,
    })
    if (claimErr) {
      console.error('claim_landlord_email failed:', claimErr.message)
      return new Response(
        JSON.stringify({ error: 'Could not update email. Please try again or contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (claimResult === false) {
      return new Response(
        JSON.stringify({ error: 'This email is already registered. Try a different email.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Set password so the user can log in with email + password
    //    Uses raw GoTrue admin API — the JS client's auth.admin.updateUser() silently fails
    //    in Deno edge functions after an RPC email change.
    if (password && typeof password === 'string' && password.length >= 6) {
      const pwRes = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users/${user.id}`,
        {
          method: 'PUT',
          headers: {
            'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        }
      )
      if (!pwRes.ok) {
        const pwBody = await pwRes.text()
        console.error('Failed to set password:', pwRes.status, pwBody)
      }
    }

    // 3. Update profile (name + email)
    await supabaseAdmin
      .from('profiles')
      .update({ name, email })
      .eq('id', user.id)

    // 4. Link ALL properties, threads, and inquiries matching this landlord's phone
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
