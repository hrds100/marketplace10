// Caller — useCalls.
// Lists wk_calls (most recent 200) with realtime + agent scoping. Used
// by CallsPage. Phase 4 skeleton: no joins for recording / intelligence
// / cost — those land per phase 5 (recording playback) and reports.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CallListRow {
  id: string;
  contactId: string;
  agentId: string;
  direction: 'inbound' | 'outbound';
  status: string;
  startedAt: string | null;
  durationSec: number | null;
  dispositionColumnId: string | null;
  agentNote: string | null;
}

interface WkCallRow {
  id: string;
  contact_id: string;
  agent_id: string;
  direction: 'inbound' | 'outbound';
  status: string;
  started_at: string | null;
  duration_sec: number | null;
  disposition_column_id: string | null;
  agent_note: string | null;
}

function rowToCall(r: WkCallRow): CallListRow {
  return {
    id: r.id,
    contactId: r.contact_id,
    agentId: r.agent_id,
    direction: r.direction,
    status: r.status,
    startedAt: r.started_at,
    durationSec: r.duration_sec,
    dispositionColumnId: r.disposition_column_id,
    agentNote: r.agent_note,
  };
}

interface Opts {
  /** When set, only calls placed by this agent. */
  agentId?: string | null;
  /** When set, only calls for this contact. */
  contactId?: string | null;
  limit?: number;
}

export function useCalls(opts: Opts = {}) {
  const { agentId = null, contactId = null, limit = 200 } = opts;
  const [calls, setCalls] = useState<CallListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase.from('wk_calls' as any) as any)
        .select(
          'id, contact_id, agent_id, direction, status, started_at, duration_sec, disposition_column_id, agent_note'
        )
        .order('started_at', { ascending: false })
        .limit(limit);

      if (agentId) q = q.eq('agent_id', agentId);
      if (contactId) q = q.eq('contact_id', contactId);

      const { data, error: e } = await q;
      if (cancelled) return;

      if (e) {
        setError(e.message);
        setCalls([]);
        setLoading(false);
        return;
      }
      setCalls(((data ?? []) as WkCallRow[]).map(rowToCall));
      setLoading(false);
    }

    void load();

    let pending: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        if (!cancelled) void load();
      }, 500);
    };

    const ch = supabase
      .channel(`caller-calls-${agentId ?? 'all'}-${contactId ?? 'any'}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_calls' },
        refresh
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (pending) clearTimeout(pending);
      try { void supabase.removeChannel(ch); } catch { /* ignore */ }
    };
  }, [agentId, contactId, limit]);

  return { calls, loading, error };
}
