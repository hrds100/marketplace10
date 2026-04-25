// useAgents — admin list of workspace agents, backed by wk-create-agent
// (action: 'list' / 'create' / 'delete'). Persisted in profiles + limits.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AgentRow {
  id: string;
  email: string | null;
  name: string;
  role: 'agent' | 'admin' | 'viewer';
  extension: string | null;
  status: 'offline' | 'available' | 'busy' | 'idle' | 'on_call';
  spend_pence: number;
  limit_pence: number | null;
  is_admin: boolean;
}

interface AgentInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data:
      | {
          agents?: AgentRow[];
          user_id?: string;
          error?: string;
        }
      | null;
    error: { message: string } | null;
  }>;
}

export interface CreateAgentInput {
  email: string;
  password: string;
  name: string;
  extension?: string | null;
  role: 'agent' | 'admin' | 'viewer';
  daily_limit_pence: number;
}

export function useAgents() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'create' | 'delete'>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invErr } = await (
        supabase.functions as unknown as AgentInvoke
      ).invoke('wk-create-agent', { body: { action: 'list' } });
      if (invErr) {
        setError(invErr.message);
      } else if (data?.error) {
        setError(data.error);
      } else {
        setAgents(data?.agents ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateAgentInput): Promise<{ ok: boolean; error?: string }> => {
      setBusy('create');
      try {
        const { data, error: invErr } = await (
          supabase.functions as unknown as AgentInvoke
        ).invoke('wk-create-agent', {
          body: {
            action: 'create',
            email: input.email,
            password: input.password,
            name: input.name,
            extension: input.extension,
            role: input.role,
            daily_limit_pence: input.daily_limit_pence,
          },
        });
        if (invErr) return { ok: false, error: invErr.message };
        if (data?.error) return { ok: false, error: data.error };
        await refresh();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
      } finally {
        setBusy(null);
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (user_id: string, hard = false): Promise<{ ok: boolean; error?: string }> => {
      setBusy('delete');
      // optimistic
      const prev = agents;
      setAgents((s) => s.filter((a) => a.id !== user_id));
      try {
        const { data, error: invErr } = await (
          supabase.functions as unknown as AgentInvoke
        ).invoke('wk-create-agent', {
          body: { action: 'delete', user_id, hard },
        });
        if (invErr || data?.error) {
          setAgents(prev); // rollback
          return { ok: false, error: invErr?.message ?? data?.error };
        }
        return { ok: true };
      } catch (e) {
        setAgents(prev);
        return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
      } finally {
        setBusy(null);
      }
    },
    [agents]
  );

  return { agents, loading, busy, error, refresh, create, remove };
}
