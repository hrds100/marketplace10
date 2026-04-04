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

    const body = await req.json()
    const { pin } = body

    // Support single (userId) or bulk (userIds) mode
    const userIds: string[] = body.userIds || (body.userId ? [body.userId] : [])

    if (!pin) {
      return new Response(JSON.stringify({ error: 'pin is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (userIds.length === 0 && !body.userIds) {
      return new Response(JSON.stringify({ error: 'userId or userIds is required' }), {
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

    // Bulk mode: empty array is valid — return ok with deleted: 0
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, deleted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let deleted = 0
    const errors: string[] = []

    for (const userId of userIds) {
      // Prevent deleting yourself
      if (userId === caller.id) continue

      // NULLify references (don't delete these rows, just unlink the user)
      await supabaseAdmin.from('inv_orders').update({ agent_id: null }).eq('agent_id', userId)
      await supabaseAdmin.from('aff_commissions').update({ user_id: null }).eq('user_id', userId)
      await supabaseAdmin.from('aff_commissions').update({ set_by: null }).eq('set_by', userId)
      await supabaseAdmin.from('aff_events').update({ referred_user_id: null }).eq('referred_user_id', userId)
      await supabaseAdmin.from('email_templates').update({ updated_by: null }).eq('updated_by', userId)
      await supabaseAdmin.from('ai_settings').update({ updated_by: null }).eq('updated_by', userId)
      await supabaseAdmin.from('nfs_reservations').update({ created_by: null }).eq('created_by', userId)
      await supabaseAdmin.from('nfs_reservations').update({ linked_user_id: null }).eq('linked_user_id', userId)

      // Clean FK-linked tables (order matters — delete dependents before profile)
      const fkTables = [
        // Core platform
        { table: 'user_favourites', col: 'user_id' },
        { table: 'user_progress', col: 'user_id' },
        { table: 'chat_messages', col: 'sender_id' },
        { table: 'landlord_invites', col: 'thread_id' }, // will handle via threads
        { table: 'notifications', col: 'user_id' },
        { table: 'crm_deals', col: 'user_id' },
        { table: 'admin_audit_log', col: 'user_id' },
        { table: 'pipeline_stages', col: 'user_id' },
        // Investment
        { table: 'inv_shareholders', col: 'user_id' },
        { table: 'inv_orders', col: 'user_id' },
        { table: 'inv_payouts', col: 'user_id' },
        { table: 'inv_votes', col: 'user_id' },
        { table: 'inv_boost_status', col: 'user_id' },
        { table: 'inv_proposals', col: 'proposer_id' },
        { table: 'payout_claims', col: 'user_id' },
        { table: 'user_bank_accounts', col: 'user_id' },
        // Affiliate
        { table: 'aff_profiles', col: 'user_id' },
        { table: 'affiliate_events', col: 'affiliate_id' },
        // NFStay
        { table: 'nfs_hospitable_connections', col: 'profile_id' },
        { table: 'nfs_operator_users', col: 'profile_id' },
      ]

      for (const { table, col } of fkTables) {
        await supabaseAdmin.from(table).delete().eq(col, userId).then(() => {})
      }

      // Clean inquiries (user could be tenant or lister)
      await supabaseAdmin.from('inquiries').delete().eq('tenant_id', userId)
      await supabaseAdmin.from('inquiries').delete().eq('lister_id', userId)

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
        errors.push(`${userId}: ${authErr.message}`)
        continue
      }

      // Audit log (one entry per ID)
      await supabaseAdmin.from('admin_audit_log').insert({
        user_id: caller.id,
        action: 'hard_delete_user',
        target_table: 'auth.users',
        target_id: userId,
      }).then(() => {})

      deleted++
    }

    return new Response(JSON.stringify({
      ok: errors.length === 0,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
