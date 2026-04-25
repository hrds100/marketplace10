// wk-create-agent — admin manages workspace agents.
//
// Actions (POST body):
//   { action: 'list' }
//     → returns { agents: [...] } — every profile with workspace_role set,
//        joined with wk_voice_agent_limits for spend.
//
//   { action: 'create', email, password, name, extension?, role?, daily_limit_pence? }
//     → creates auth user (or rotates password if email exists), upserts
//        profile + wk_voice_agent_limits, audits.
//
//   { action: 'delete', user_id, hard? }
//     → removes the agent. Default soft-delete: clears workspace_role +
//        agent_extension on profiles + deletes wk_voice_agent_limits.
//        hard=true also deletes the auth.users row (irreversible).
//
//   Legacy: if `action` is missing but `email`+`password` present → 'create'.
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

interface CreateBody {
  action?: 'create';
  email: string;
  password: string;
  name: string;
  extension?: string;
  role?: 'agent' | 'admin' | 'viewer';
  daily_limit_pence?: number;
}
interface ListBody {
  action: 'list';
}
interface DeleteBody {
  action: 'delete';
  user_id: string;
  hard?: boolean;
}
type Body = CreateBody | ListBody | DeleteBody;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

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

    const { data: isAdmin, error: adminErr } = await caller.rpc('wk_is_admin');
    if (adminErr) return json(500, { error: adminErr.message });
    if (!isAdmin) return json(403, { error: 'Admin only' });

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const action =
      'action' in body && body.action
        ? body.action
        : 'email' in body && 'password' in body
          ? 'create'
          : null;
    if (!action) return json(400, { error: 'Missing action' });

    // ---- list -------------------------------------------------------
    if (action === 'list') {
      const { data: profiles, error } = await admin
        .from('profiles')
        .select('id, email, name, workspace_role, agent_extension, agent_status')
        .not('workspace_role', 'is', null)
        .order('workspace_role', { ascending: true })
        .order('name', { ascending: true });
      if (error) return json(500, { error: error.message });

      const ids = (profiles ?? []).map((p) => p.id);
      const { data: limits } = ids.length
        ? await admin
            .from('wk_voice_agent_limits')
            .select('agent_id, daily_limit_pence, daily_spend_pence, is_admin')
            .in('agent_id', ids)
        : { data: [] };
      const limitsByAgent = new Map<string, {
        daily_limit_pence: number | null;
        daily_spend_pence: number;
        is_admin: boolean;
      }>();
      for (const l of limits ?? []) {
        limitsByAgent.set(l.agent_id, {
          daily_limit_pence: l.daily_limit_pence,
          daily_spend_pence: l.daily_spend_pence,
          is_admin: l.is_admin,
        });
      }

      return json(200, {
        agents: (profiles ?? []).map((p) => {
          const lim = limitsByAgent.get(p.id);
          return {
            id: p.id,
            email: p.email,
            name: p.name ?? p.email,
            role: p.workspace_role,
            extension: p.agent_extension,
            status: p.agent_status ?? 'offline',
            spend_pence: lim?.daily_spend_pence ?? 0,
            limit_pence: lim?.daily_limit_pence ?? null,
            is_admin: lim?.is_admin ?? p.workspace_role === 'admin',
          };
        }),
      });
    }

    // ---- delete -----------------------------------------------------
    if (action === 'delete') {
      const b = body as DeleteBody;
      const targetId = (b.user_id ?? '').trim();
      if (!targetId) return json(400, { error: 'user_id required' });
      if (targetId === userResp.user.id)
        return json(400, { error: 'Cannot delete yourself' });

      // Always remove workspace fields + spend row
      const { error: profileErr } = await admin
        .from('profiles')
        .update({
          workspace_role: null,
          agent_extension: null,
          agent_status: 'offline',
        })
        .eq('id', targetId);
      if (profileErr) return json(500, { error: `Profile update: ${profileErr.message}` });

      const { error: limitErr } = await admin
        .from('wk_voice_agent_limits')
        .delete()
        .eq('agent_id', targetId);
      if (limitErr) return json(500, { error: `Limit delete: ${limitErr.message}` });

      if (b.hard) {
        const { error: authErr } = await admin.auth.admin.deleteUser(targetId);
        if (authErr) return json(500, { error: `Auth delete: ${authErr.message}` });
      }

      await admin.from('wk_audit_log').insert({
        actor_id: userResp.user.id,
        action: b.hard ? 'agent_deleted_hard' : 'agent_deleted',
        entity_type: 'profile',
        entity_id: targetId,
        meta: { hard: !!b.hard },
      });

      return json(200, { user_id: targetId, hard: !!b.hard });
    }

    // ---- create -----------------------------------------------------
    const c = body as CreateBody;
    const email = (c.email ?? '').trim().toLowerCase();
    const password = c.password ?? '';
    const name = (c.name ?? '').trim();
    const extension = (c.extension ?? '').trim() || null;
    const role = c.role ?? 'agent';
    const limitPence =
      typeof c.daily_limit_pence === 'number' && c.daily_limit_pence >= 0
        ? c.daily_limit_pence
        : 1000;

    if (!email || !email.includes('@')) return json(400, { error: 'Valid email required' });
    if (password.length < 8) return json(400, { error: 'Password must be ≥ 8 chars' });
    if (!name) return json(400, { error: 'Name required' });
    if (!['agent', 'admin', 'viewer'].includes(role))
      return json(400, { error: 'Bad role' });

    let userId: string | null = null;
    const { data: createData, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createErr) {
      const msg = createErr.message ?? '';
      const lower = msg.toLowerCase();
      const alreadyExists =
        lower.includes('already') || lower.includes('registered') || lower.includes('exists');
      if (!alreadyExists) return json(500, { error: msg });

      const { data: list, error: listErr } = await admin.auth.admin.listUsers();
      if (listErr) return json(500, { error: listErr.message });
      const existing = list?.users?.find((u) => (u.email ?? '').toLowerCase() === email);
      if (!existing) return json(500, { error: 'Email exists but lookup failed' });
      userId = existing.id;
      const { error: pwErr } = await admin.auth.admin.updateUserById(userId, { password });
      if (pwErr) return json(500, { error: `Password rotate failed: ${pwErr.message}` });
    } else {
      userId = createData.user?.id ?? null;
    }

    if (!userId) return json(500, { error: 'No user id returned' });

    const { error: profileErr } = await admin.from('profiles').upsert(
      {
        id: userId,
        email,
        name,
        workspace_role: role,
        agent_extension: extension,
        agent_status: 'offline',
      },
      { onConflict: 'id' }
    );
    if (profileErr) return json(500, { error: `Profile upsert: ${profileErr.message}` });

    const { error: limitErr } = await admin.from('wk_voice_agent_limits').upsert(
      {
        agent_id: userId,
        daily_limit_pence: limitPence,
        daily_spend_pence: 0,
        is_admin: role === 'admin',
      },
      { onConflict: 'agent_id' }
    );
    if (limitErr) return json(500, { error: `Limit upsert: ${limitErr.message}` });

    await admin.from('wk_audit_log').insert({
      actor_id: userResp.user.id,
      action: 'agent_created',
      entity_type: 'profile',
      entity_id: userId,
      meta: { email, role, extension },
    });

    return json(200, {
      user_id: userId,
      email,
      role,
      extension,
      daily_limit_pence: limitPence,
    });
  } catch (e) {
    console.error('wk-create-agent error', e);
    return json(500, { error: e instanceof Error ? e.message : 'Internal error' });
  }
});
