// crm-v2 useDialerQueue — pending leads for a campaign, in dial order.
//
// Source of truth: wk_dialer_queue (server). Realtime subscription on
// campaign_id refreshes when rows enter/exit pending.
//
// Hugo's lesson from the smsv2 dialer: there is exactly ONE queue
// truth. No Zustand mirror, no CSV-import side queue. If you need
// the head, slice [0]. If you need the next, take [1]. Plain array.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { realtime } from '../data/realtime';

export interface QueueLead {
  contactId: string;
  queueId: string;
  name: string;
  phone: string;
  pipelineColumnId: string | null;
  priority: number;
  attempts: number;
}

interface QueueRowJoined {
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

export interface DialerQueueState {
  rows: QueueLead[];
  loading: boolean;
  error: string | null;
}

export function useDialerQueue(opts: {
  campaignId: string | null;
  agentId: string | null;
  /** Cap. Default 1000 — more than any real queue. */
  limit?: number;
}): DialerQueueState {
  const { campaignId, agentId, limit = 1000 } = opts;
  const [state, setState] = useState<DialerQueueState>({
    rows: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!campaignId) {
      setState({ rows: [], loading: false, error: null });
      return;
    }
    let cancelled = false;

    const load = async () => {
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

      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        setState({ rows: [], loading: false, error: error.message });
        return;
      }
      const mapped: QueueLead[] = ((data ?? []) as QueueRowJoined[])
        .filter((r) => r.wk_contacts)
        .map((r) => ({
          contactId: r.wk_contacts!.id,
          queueId: r.id,
          name: r.wk_contacts!.name ?? r.wk_contacts!.phone ?? 'Unknown',
          phone: r.wk_contacts!.phone ?? '',
          pipelineColumnId: r.wk_contacts!.pipeline_column_id,
          priority: r.priority,
          attempts: r.attempts,
        }));
      setState({ rows: mapped, loading: false, error: null });
    };

    void load();

    // Debounce realtime — bulk inserts (CSV import) shouldn't slam the
    // panel with 50 reloads.
    let pending: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        if (!cancelled) void load();
      }, 400);
    };

    const unsub = realtime.campaignQueue(campaignId, refresh);
    return () => {
      cancelled = true;
      if (pending) clearTimeout(pending);
      unsub();
    };
  }, [campaignId, agentId, limit]);

  return state;
}
