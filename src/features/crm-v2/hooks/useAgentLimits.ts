// crm-v2 useAgentLimits — daily spend + daily limit + admin flag,
// realtime via wk_voice_agent_limits.
//
// Returns null when the row doesn't exist for the agent. UI renders
// `—` in that case (Hugo Rule 13).

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { realtime } from '../data/realtime';
import type { AgentLimitsRow } from '../data/types';

export interface AgentLimits {
  dailySpendPence: number;
  dailyLimitPence: number | null;
  isAdmin: boolean;
  /** Spend has reached or exceeded the limit; UI gates the dial CTA. */
  blocked: boolean;
}

export function useAgentLimits(agentId: string | null): {
  limits: AgentLimits | null;
  loading: boolean;
} {
  const [limits, setLimits] = useState<AgentLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setLimits(null);
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (
        supabase.from('wk_voice_agent_limits' as any) as any
      )
        .select('agent_id, daily_limit_pence, daily_spend_pence, is_admin')
        .eq('agent_id', agentId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setLimits(null);
        setLoading(false);
        return;
      }
      const row = data as AgentLimitsRow;
      const blocked =
        row.daily_limit_pence !== null &&
        row.daily_spend_pence >= row.daily_limit_pence;
      setLimits({
        dailySpendPence: row.daily_spend_pence,
        dailyLimitPence: row.daily_limit_pence,
        isAdmin: row.is_admin,
        blocked,
      });
      setLoading(false);
    };

    void load();
    const unsub = realtime.agentLimits(agentId, () => void load());
    return () => {
      cancelled = true;
      unsub();
    };
  }, [agentId]);

  return { limits, loading };
}
