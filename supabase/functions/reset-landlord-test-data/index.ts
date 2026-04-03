import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Verify caller is admin
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the caller is an admin
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const adminEmails = ['admin@hub.nfstay.com', 'hugo@nfstay.com']
    if (!adminEmails.includes(user.email || '')) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { phone } = await req.json()
    if (!phone) {
      return new Response(JSON.stringify({ error: 'Phone required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cleanPhone = phone.replace(/\D/g, '')
    const internalEmail = `landlord_${cleanPhone}@nfstay.internal`
    const results: string[] = []

    // 1. Find landlord profile by phone
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('whatsapp', phone)
      .maybeSingle()

    // 2. Find properties by phone
    const { data: properties } = await supabaseAdmin
      .from('properties')
      .select('id')
      .or(`contact_phone.eq.${phone},landlord_whatsapp.eq.${phone}`)
    const propIds = (properties || []).map((p: { id: string }) => p.id)

    // 3. Delete inquiries by lister_phone + property_id
    if (propIds.length > 0 || profile?.id) {
      const filters: string[] = [`lister_phone.eq.${phone}`]
      if (profile?.id) filters.push(`lister_id.eq.${profile.id}`)

      const { count } = await supabaseAdmin
        .from('inquiries')
        .delete({ count: 'exact' })
        .or(filters.join(','))
      results.push(`Deleted ${count ?? 0} inquiries`)
    }

    // 4. Clear property ownership
    if (propIds.length > 0) {
      await supabaseAdmin
        .from('properties')
        .update({ submitted_by: null } as Record<string, unknown>)
        .in('id', propIds)

      // 5. Reset outreach_sent
      await supabaseAdmin
        .from('properties')
        .update({ outreach_sent: false, outreach_sent_at: null } as Record<string, unknown>)
        .in('id', propIds)

      results.push(`Reset ${propIds.length} properties`)
    }

    // 6. Revert auth email + profile to unclaimed
    if (profile?.id) {
      // RPC to change auth email (direct GoTrue has a 500 bug)
      const { error: rpcErr } = await supabaseAdmin.rpc('claim_landlord_email', {
        p_user_id: profile.id,
        p_new_email: internalEmail,
      })
      if (rpcErr) {
        console.error('RPC failed:', rpcErr.message)
        results.push('Auth email revert failed: ' + rpcErr.message)
      } else {
        results.push('Auth email reverted to ' + internalEmail)
      }

      // Revert profile email
      await supabaseAdmin
        .from('profiles')
        .update({ email: internalEmail })
        .eq('id', profile.id)
      results.push('Profile email reverted')
    } else {
      results.push('No profile found for phone')
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
