// PR 153 (Hugo 2026-04-29): live session-scoped counts for the v3
// SessionFooter. Reads `wk_calls` filtered by `agent_id = me AND
// started_at >= sessionStartedAt`, derived from realtime updates so
// the numbers don't lag.
//
// Hugo Rule 13: if the source can't be queried (RLS denial / network
// drop), expose `error` so the SessionFooter can render `—` per cell
// instead of fake zeros.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDialerSession } from './useDialerSession';
import { useCurrentAgent } from './useCurrentAgent';

export interface SessionStats {
  /** Calls that ended (any outcome) in this session window. */
  done: number;
  /** wk_calls.status = 'completed' AND duration_sec >= 5. */
  connected: number;
  /** wk_calls.status = 'voicemail'. */
  voicemail: number;
  /** wk_calls.status = 'no_answer'. */
  noAnswer: number;
  /** wk_calls.status = 'failed' (or canceled). */
  failed: number;
  /** wk_calls.status = 'busy'. */
  busy: number;
}

export interface UseSessionStatsResult {
  stats: SessionStats | null;
  loading: boolean;
  error: string | null;
}

interface CallRow {
  status: string;
  duration_sec: number | null;
  ended_at: string | null;
  started_at: string;
}

const ZERO_STATS: SessionStats = {
  done: 0,
  connected: 0,
  voicemail: 0,
  noAnswer: 0,
  failed: 0,
  busy: 0,
};

function summarise(rows: CallRow[]): SessionStats {
  const stats = { ...ZERO_STATS };
  for (const r of rows) {
    if (r.ended_at === null) continue;
    stats.done++;
    if (r.status === 'completed' && (r.duration_sec ?? 0) >= 5) {
      stats.connected++;
    } else if (r.status === 'voicemail') {
      stats.voicemail++;
    } else if (r.status === 'no_answer') {
      stats.noAnswer++;
    } else if (r.status === 'busy') {
      stats.busy++;
    } else if (r.status === 'failed' || r.status === 'canceled') {
      stats.failed++;
    }
  }
  return stats;
}

export function useSessionStats(): UseSessionStatsResult {
  const session = useDialerSession();
  const { agent } = useCurrentAgent();
  const agentId = agent?.id ?? null;
  const startedAt = session.startedAt;

  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId || !startedAt) {
      setStats(null);
      setLoading(false);
      return;
    }
    const startedAtIso = new Date(startedAt).toISOString();
    let cancelled = false;

    async function reload() {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase.from('wk_calls' as any) as any)
        .select('status, duration_sec, ended_at, started_at')
        .eq('agent_id', agentId)
        .gte('started_at', startedAtIso);
      if (cancelled) return;
      if (err) {
        console.warn('[useSessionStats] load failed', err.message);
        setError(err.message);
        setStats(null);
        setLoading(false);
        return;
      }
      setError(null);
      setStats(summarise((data ?? []) as CallRow[]));
      setLoading(false);
    }
    void reload();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel(`session-stats:${agentId}:${startedAt}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wk_calls',
          filter: `agent_id=eq.${agentId}`,
        },
        () => {
          if (!cancelled) void reload();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }, [agentId, startedAt]);

  return { stats, loading, error };
}
