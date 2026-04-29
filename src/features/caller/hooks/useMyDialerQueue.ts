// Caller — useMyDialerQueue hook.
// Ported from src/features/smsv2/hooks/useMyDialerQueue.ts. Fetches the
// real picker order an `agent_id` would receive from wk-leads-next:
// pending rows for the active campaign, scheduled in the past or
// unscheduled, ordered by priority then scheduled_for then attempts.
// Includes a debounced realtime subscription on wk_dialer_queue.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MyQueueLead {
  id: string;
  name: string;
  phone: string;
  pipelineColumnId: string | null;
  queueId: string;
  priority: number;
  attempts: number;
}

interface QueueRow {
  id: string;
  contact_id: string;
  agent_id: string | null;
  status: string;
  priority: number;
  attempts: number;
  scheduled_for: string | null;
  wk_contacts: {
    id: string;
    name: string | null;
    phone: string | null;
    pipeline_column_id: string | null;
  } | null;
}

export function useMyDialerQueue(
  campaignId: string | null,
  agentId: string | null,
  limit = 5
): { items: MyQueueLead[]; loading: boolean; error: string | null } {
  const [items, setItems] = useState<MyQueueLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!campaignId) {
      setItems([]);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);

      const nowIso = new Date().toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase.from('wk_dialer_queue' as any) as any)
        .select(
          'id, contact_id, agent_id, status, priority, attempts, scheduled_for, ' +
            'wk_contacts:contact_id ( id, name, phone, pipeline_column_id )'
        )
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
        .order('priority', { ascending: false })
        .order('scheduled_for', { ascending: true, nullsFirst: true })
        .order('attempts', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(limit);

      if (agentId) {
        q = q.or(`agent_id.eq.${agentId},agent_id.is.null`);
      }

      const { data, error: err } = await q;

      if (cancelled) return;

      if (err) {
        console.warn('[useMyDialerQueue] load failed:', err.message);
        setError(err.message);
        setItems([]);
        setLoading(false);
        return;
      }

      const mapped: MyQueueLead[] = ((data ?? []) as QueueRow[])
        .filter((r) => r.wk_contacts)
        .map((r) => ({
          id: r.wk_contacts!.id,
          name: r.wk_contacts!.name ?? r.wk_contacts!.phone ?? 'Unknown',
          phone: r.wk_contacts!.phone ?? '',
          pipelineColumnId: r.wk_contacts!.pipeline_column_id,
          queueId: r.id,
          priority: r.priority,
          attempts: r.attempts,
        }));

      setItems(mapped);
      setLoading(false);
    }

    void load();

    let pending: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        if (!cancelled) void load();
      }, 400);
    };

    const suffix = `${campaignId}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase
      .channel(`caller-my-dialer-queue-${suffix}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_dialer_queue', filter: `campaign_id=eq.${campaignId}` },
        refresh
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (pending) clearTimeout(pending);
      try { void supabase.removeChannel(ch); } catch { /* ignore */ }
    };
  }, [campaignId, agentId, limit]);

  return { items, loading, error };
}
