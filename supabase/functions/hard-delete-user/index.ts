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

    const { userId, pin } = await req.json()
    if (!userId || !pin) {
      return new Response(JSON.stringify({ error: 'userId and pin are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify PIN
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

    // Verify the caller is an admin
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

    // Prevent deleting yourself
    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Clean FK-linked tables (order matters)
    const fkTables = [
      { table: 'user_favourites', col: 'user_id' },
      { table: 'user_progress', col: 'user_id' },
      { table: 'chat_messages', col: 'sender_id' },
      { table: 'landlord_invites', col: 'thread_id' }, // will handle via threads
      { table: 'notifications', col: 'user_id' },
      { table: 'crm_deals', col: 'user_id' },
      { table: 'admin_audit_log', col: 'user_id' },
      { table: 'affiliate_events', col: 'affiliate_id' },
    ]

    for (const { table, col } of fkTables) {
      await supabaseAdmin.from(table).delete().eq(col, userId).then(() => {})
    }

    // Clean chat threads (user could be operator or landlord)
    await supabaseAdmin.from('chat_threads').delete().eq('operator_id', userId)
    await supabaseAdmin.from('chat_threads').delete().eq('landlord_id', userId)

    // Nullify properties.submitted_by
    await supabaseAdmin.from('properties').update({ submitted_by: null }).eq('submitted_by', userId)

    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    // Delete auth user
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authErr) {
      return new Response(JSON.stringify({ error: 'Auth delete failed: ' + authErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Audit log
    await supabaseAdmin.from('admin_audit_log').insert({
      user_id: caller.id,
      action: 'hard_delete_user',
      target_table: 'auth.users',
      target_id: userId,
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
