import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_EMAILS = ['admin@hub.nfstay.com', 'hugo@nfstay.com']
const DELETE_PIN = '5891'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { propertyId, pin } = await req.json()
    if (!propertyId || !pin) {
      return new Response(JSON.stringify({ error: 'propertyId and pin are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (pin !== DELETE_PIN) {
      return new Response(JSON.stringify({ error: 'Incorrect PIN' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller is admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )
    const { data: { user: caller }, error: callerErr } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (callerErr || !caller || !ADMIN_EMAILS.includes(caller.email || '')) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get property name for audit log before deleting
    const { data: prop } = await supabaseAdmin
      .from('properties')
      .select('name, city')
      .eq('id', propertyId)
      .maybeSingle()

    // Clean FK-linked data
    // 1. Get chat threads for this property
    const { data: threads } = await supabaseAdmin
      .from('chat_threads')
      .select('id')
      .eq('property_id', propertyId)

    const threadIds = (threads || []).map((t: { id: string }) => t.id)

    // 2. Delete messages in those threads
    if (threadIds.length > 0) {
      await supabaseAdmin.from('chat_messages').delete().in('thread_id', threadIds)
      await supabaseAdmin.from('landlord_invites').delete().in('thread_id', threadIds)
      await supabaseAdmin.from('agreement_acceptances').delete().in('thread_id', threadIds)
    }

    // 3. Delete chat threads
    await supabaseAdmin.from('chat_threads').delete().eq('property_id', propertyId)

    // 4. Delete CRM deals linked to this property
    await supabaseAdmin.from('crm_deals').delete().eq('property_id', propertyId)

    // 5. Delete user favourites for this property
    await supabaseAdmin.from('user_favourites').delete().eq('property_id', propertyId)

    // 6. Delete notifications for this property
    await supabaseAdmin.from('notifications').delete().eq('property_id', propertyId)

    // 7. Delete the property itself
    const { error: delErr } = await supabaseAdmin.from('properties').delete().eq('id', propertyId)
    if (delErr) {
      return new Response(JSON.stringify({ error: 'Delete failed: ' + delErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Audit log
    await supabaseAdmin.from('admin_audit_log').insert({
      user_id: caller.id,
      action: 'hard_delete_property',
      target_table: 'properties',
      target_id: propertyId,
      metadata: { name: prop?.name, city: prop?.city },
    }).then(() => {})

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
