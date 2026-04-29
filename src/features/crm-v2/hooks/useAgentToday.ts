// crm-v2 useAgentToday — today's call count + answer rate for the
// current agent. Used by the SessionStats footer ("Today: N calls,
// Talk %"). Realtime via wk_calls so badges tick live.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { realtime } from '../data/realtime';
import type { CallRow } from '../data/types';

export interface AgentTodayStats {
  callsToday: number;
  answeredToday: number;
  /** answeredToday / callsToday * 100, rounded. 0 when no calls. */
  talkRatioPercent: number;
}

const ZERO: AgentTodayStats = {
  callsToday: 0,
  answeredToday: 0,
  talkRatioPercent: 0,
};

const ANSWERED = new Set<CallRow['status']>(['completed', 'in_progress', 'voicemail']);

function startOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useAgentToday(agentId: string | null): {
  stats: AgentTodayStats;
  loading: boolean;
} {
  const [stats, setStats] = useState<AgentTodayStats>(ZERO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setStats(ZERO);
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const since = startOfTodayIso();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('wk_calls' as any) as any)
        .select('status')
        .eq('agent_id', agentId)
        .gte('started_at', since);
      if (cancelled) return;
      if (error || !data) {
        setStats(ZERO);
        setLoading(false);
        return;
      }
      const rows = data as Pick<CallRow, 'status'>[];
      const callsToday = rows.length;
      const answeredToday = rows.filter((r) => ANSWERED.has(r.status)).length;
      const talkRatioPercent =
        callsToday > 0 ? Math.round((answeredToday / callsToday) * 100) : 0;
      setStats({ callsToday, answeredToday, talkRatioPercent });
      setLoading(false);
    };

    void load();
    const unsub = realtime.myCalls(agentId, () => void load());
    return () => {
      cancelled = true;
      unsub();
    };
  }, [agentId]);

  return { stats, loading };
}
