// wk-update-agent — admin edits an existing agent's account.
//
// Companion to wk-create-agent / wk-delete-agent. Lets the admin update
// any combination of: name, email, password, extension, role, daily
// spend limit. Only fields present in the body are touched — unset
// fields stay as they are.
//
// Why this exists (Hugo 2026-04-28): the UI previously had no edit
// path at all. The only way to "fix" a typo'd email or rotate a
// forgotten password was to delete + recreate, which orphaned audit
// trails and forced a re-login. This is the safe in-place edit.
//
// Body: {
//   agent_id: uuid,
//   name?: string,
//   email?: string,
//   password?: string,        // ≥ 8 chars if present
//   extension?: string|null,  // null clears
//   role?: 'agent'|'admin'|'viewer',
//   daily_limit_pence?: number,
// }
//
// Rules (mirror wk-delete-agent so the rails are consistent):
//   - Caller must be admin (wk_is_admin RPC).
//   - If target's CURRENT workspace_role is 'admin', only the super-admin
//     (admin@hub.nfstay.com) may edit them. This protects every other
//     admin from being demoted/locked out by another admin.
//   - Caller cannot demote themselves (refuses role change away from
//     'admin' when agent_id === caller.id) — same self-protect rail.
//
// AUTH: Supabase JWT of an admin (verified via wk_is_admin RPC).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface UpdateAgentBody {
  agent_id: string;
  name?: string;
  email?: string;
  password?: string;
  extension?: string | null;
  role?: 'agent' | 'admin' | 'viewer' | 'worker';
  daily_limit_pence?: number;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const auth = req.headers.get('authorization') ?? '';
    const jwt = auth.replace(/^Bearer\s+/i, '');
    if (!jwt) return json(401, { error: 'Missing bearer token' });

    const caller = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userResp, error: userErr } = await caller.auth.getUser(jwt);
    if (userErr || !userResp?.user) return json(401, { error: 'Invalid token' });
    const callerId = userResp.user.id;
    const callerEmail = (userResp.user.email ?? '').toLowerCase();
    const isSuperAdmin = callerEmail === 'admin@hub.nfstay.com';

    const { data: isAdmin, error: adminErr } = await caller.rpc('wk_is_admin');
    if (adminErr) return json(500, { error: adminErr.message });
    if (!isAdmin) return json(403, { error: 'Admin only' });

    let body: UpdateAgentBody;
    try {
      body = (await req.json()) as UpdateAgentBody;
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }

    const agentId = (body.agent_id ?? '').trim();
    if (!agentId || !isUuid(agentId)) {
      return json(400, { error: 'Valid agent_id (uuid) required' });
    }

    // Validate optional fields up-front (so we don't half-apply on bad input)
    const newEmailRaw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
    if (newEmailRaw !== undefined && (!newEmailRaw || !newEmailRaw.includes('@'))) {
      return json(400, { error: 'email must contain @' });
    }
    const newPassword = typeof body.password === 'string' ? body.password : undefined;
    if (newPassword !== undefined && newPassword.length < 8) {
      return json(400, { error: 'Password must be ≥ 8 chars' });
    }
    const newName = typeof body.name === 'string' ? body.name.trim() : undefined;
    if (newName !== undefined && !newName) {
      return json(400, { error: 'Name cannot be blank' });
    }
    const newRole = body.role;
    if (newRole !== undefined && !['agent', 'admin', 'viewer', 'worker'].includes(newRole)) {
      return json(400, { error: 'Bad role' });
    }
    const newExtension =
      body.extension === null
        ? null
        : typeof body.extension === 'string'
        ? body.extension.trim() || null
        : undefined;
    const newLimitPence =
      typeof body.daily_limit_pence === 'number' && body.daily_limit_pence >= 0
        ? body.daily_limit_pence
        : undefined;

    // Service-role client for privileged work
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Look up target — must exist. Read current workspace_role to apply
    // the admin/super-admin rail.
    const { data: target, error: targetErr } = await admin
      .from('profiles')
      .select('id, email, name, workspace_role')
      .eq('id', agentId)
      .maybeSingle();
    if (targetErr) return json(500, { error: `Lookup: ${targetErr.message}` });
    if (!target) return json(404, { error: 'Agent not found' });

    if (target.workspace_role === 'admin' && !isSuperAdmin) {
      return json(403, {
        error:
          'Only the main admin (admin@hub.nfstay.com) can edit other admins from the UI',
      });
    }

    // Self-demote rail: an admin cannot strip their own admin role.
    if (
      agentId === callerId &&
      newRole !== undefined &&
      newRole !== 'admin' &&
      target.workspace_role === 'admin'
    ) {
      return json(400, { error: 'Cannot demote yourself' });
    }

    // 1. auth.users — email and/or password
    if (newEmailRaw !== undefined || newPassword !== undefined) {
      const updates: { email?: string; password?: string } = {};
      if (newEmailRaw !== undefined) updates.email = newEmailRaw;
      if (newPassword !== undefined) updates.password = newPassword;
      const { error: authErr } = await admin.auth.admin.updateUserById(agentId, updates);
      if (authErr) return json(500, { error: `Auth update: ${authErr.message}` });
    }

    // 2. profiles — only the columns the caller actually changed
    const profilePatch: Record<string, unknown> = {};
    if (newName !== undefined) profilePatch.name = newName;
    if (newEmailRaw !== undefined) profilePatch.email = newEmailRaw;
    if (newExtension !== undefined) profilePatch.agent_extension = newExtension;
    if (newRole !== undefined) profilePatch.workspace_role = newRole;
    if (Object.keys(profilePatch).length > 0) {
      const { error: profErr } = await admin
        .from('profiles')
        .update(profilePatch)
        .eq('id', agentId);
      if (profErr) return json(500, { error: `Profile update: ${profErr.message}` });
    }

    // 3. wk_voice_agent_limits — daily cap and is_admin flag.
    //    Touch only if the caller actually changed the limit or the role
    //    (role change flips is_admin so the spend cap stops/starts being
    //    enforced).
    if (newLimitPence !== undefined || newRole !== undefined) {
      const limitPatch: Record<string, unknown> = { agent_id: agentId };
      if (newLimitPence !== undefined) limitPatch.daily_limit_pence = newLimitPence;
      if (newRole !== undefined) limitPatch.is_admin = newRole === 'admin';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: limErr } = await (admin.from('wk_voice_agent_limits' as any) as any)
        .upsert(limitPatch, { onConflict: 'agent_id' });
      if (limErr) return json(500, { error: `Limit update: ${limErr.message}` });
    }

    // 4. Audit log — record what changed (don't log password/email values,
    //    just the field names — keeps the log searchable without leaking
    //    secrets).
    const changedFields: string[] = [];
    if (newName !== undefined) changedFields.push('name');
    if (newEmailRaw !== undefined) changedFields.push('email');
    if (newPassword !== undefined) changedFields.push('password');
    if (newExtension !== undefined) changedFields.push('extension');
    if (newRole !== undefined) changedFields.push('role');
    if (newLimitPence !== undefined) changedFields.push('daily_limit_pence');
    await admin.from('wk_audit_log').insert({
      actor_id: callerId,
      action: 'agent_updated',
      entity_type: 'profile',
      entity_id: agentId,
      meta: {
        target_email: target.email,
        changed: changedFields,
        new_role: newRole ?? null,
      },
    });

    return json(200, {
      agent_id: agentId,
      changed: changedFields,
      ok: true,
    });
  } catch (e) {
    console.error('wk-update-agent error', e);
    return json(500, { error: e instanceof Error ? e.message : 'Internal error' });
  }
});
