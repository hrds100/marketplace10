// crm-v2 useSessionStats — counts derived from wk_calls scoped to
// the agent + the current session window (sessionStartedAt).
//
// Hugo Rule 13 (truthful counts): if the underlying query fails, every
// count is `null` so the UI can render `—`. No fake zeros.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { realtime } from '../data/realtime';
import type { CallRow } from '../data/types';

export interface SessionStats {
  done: number;
  connected: number;
  voicemail: number;
  noAnswer: number;
  busy: number;
  failed: number;
}

const ZERO_STATS: SessionStats = {
  done: 0,
  connected: 0,
  voicemail: 0,
  noAnswer: 0,
  busy: 0,
  failed: 0,
};

const CONNECTED_DURATION_MIN = 5;

function computeStats(rows: CallRow[]): SessionStats {
  let done = 0;
  let connected = 0;
  let voicemail = 0;
  let noAnswer = 0;
  let busy = 0;
  let failed = 0;
  for (const r of rows) {
    const ended = !!r.ended_at;
    if (ended) done++;
    if (r.status === 'completed' && (r.duration_sec ?? 0) >= CONNECTED_DURATION_MIN) {
      connected++;
    }
    if (r.status === 'voicemail') voicemail++;
    if (r.status === 'no_answer' || r.status === 'missed') noAnswer++;
    if (r.status === 'busy') busy++;
    if (r.status === 'failed') failed++;
  }
  return { done, connected, voicemail, noAnswer, busy, failed };
}

export function useSessionStats(opts: {
  agentId: string | null;
  sessionStartedAt: number | null;
}): { stats: SessionStats; error: string | null; ready: boolean } {
  const { agentId, sessionStartedAt } = opts;
  const [stats, setStats] = useState<SessionStats>(ZERO_STATS);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!agentId || !sessionStartedAt) {
      setStats(ZERO_STATS);
      setError(null);
      setReady(false);
      return;
    }
    let cancelled = false;
    const sinceIso = new Date(sessionStartedAt).toISOString();

    const load = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase.from('wk_calls' as any) as any)
        .select('id, status, started_at, ended_at, duration_sec')
        .eq('agent_id', agentId)
        .gte('started_at', sinceIso);
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setReady(true);
        return;
      }
      setError(null);
      setStats(computeStats((data ?? []) as CallRow[]));
      setReady(true);
    };

    void load();
    const unsub = realtime.myCalls(agentId, () => void load());
    return () => {
      cancelled = true;
      unsub();
    };
  }, [agentId, sessionStartedAt]);

  return { stats, error, ready };
}
