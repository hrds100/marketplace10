// Caller — useAgents.
// Lists every profile with a workspace_role set, joined with their
// daily limit row from wk_voice_agent_limits. Admin can update role +
// daily_limit_pence inline.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type WorkspaceRole = 'admin' | 'agent' | 'viewer';

export interface AgentRow {
  id: string;
  name: string;
  email: string;
  workspaceRole: WorkspaceRole | null;
  agentExtension: string | null;
  dailyLimitPence: number | null;
  isAdmin: boolean;
}

interface ProfileDbRow {
  id: string;
  name: string | null;
  email: string | null;
  workspace_role: WorkspaceRole | null;
  agent_extension: string | null;
}

interface LimitDbRow {
  agent_id: string;
  daily_limit_pence: number | null;
  is_admin: boolean;
}

export function useAgents() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profilesRes = await (supabase.from('profiles' as any) as any)
      .select('id, name, email, workspace_role, agent_extension')
      .not('workspace_role', 'is', null);
    if (profilesRes.error) {
      setError(profilesRes.error.message);
      setLoading(false);
      return;
    }
    const profiles = (profilesRes.data ?? []) as ProfileDbRow[];
    const ids = profiles.map((p) => p.id);

    let limits: LimitDbRow[] = [];
    if (ids.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const limRes = await (supabase.from('wk_voice_agent_limits' as any) as any)
        .select('agent_id, daily_limit_pence, is_admin')
        .in('agent_id', ids);
      limits = (limRes.data ?? []) as LimitDbRow[];
    }
    const limByAgent = new Map(limits.map((l) => [l.agent_id, l] as const));

    setAgents(
      profiles.map((p) => {
        const l = limByAgent.get(p.id);
        return {
          id: p.id,
          name: p.name ?? p.email ?? 'Agent',
          email: p.email ?? '',
          workspaceRole: p.workspace_role,
          agentExtension: p.agent_extension,
          dailyLimitPence: l?.daily_limit_pence ?? null,
          isAdmin: l?.is_admin ?? false,
        };
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setRole = useCallback(
    async (id: string, role: WorkspaceRole | null): Promise<{ ok: boolean; error?: string }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: e } = await (supabase.from('profiles' as any) as any)
        .update({ workspace_role: role })
        .eq('id', id);
      if (e) return { ok: false, error: e.message };
      await reload();
      return { ok: true };
    },
    [reload]
  );

  const setDailyLimit = useCallback(
    async (agentId: string, pence: number | null): Promise<{ ok: boolean; error?: string }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: e } = await (supabase.from('wk_voice_agent_limits' as any) as any)
        .upsert(
          { agent_id: agentId, daily_limit_pence: pence },
          { onConflict: 'agent_id' }
        );
      if (e) return { ok: false, error: e.message };
      await reload();
      return { ok: true };
    },
    [reload]
  );

  return { agents, loading, error, reload, setRole, setDailyLimit };
}
