import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { QueueLead } from './types';

interface QueueRow {
  id: string;
  contact_id: string;
  campaign_id: string;
  priority: number;
  attempts: number;
  scheduled_for: string | null;
  status: string;
  wk_contacts: {
    id: string;
    name: string | null;
    phone: string | null;
    pipeline_column_id: string | null;
  } | null;
}

function rowToLead(row: QueueRow): QueueLead | null {
  const contact = row.wk_contacts;
  if (!contact || !contact.phone) return null;
  return {
    id: contact.id,
    contactId: contact.id,
    phone: contact.phone,
    name: contact.name ?? contact.phone,
    priority: row.priority ?? 0,
    attempts: row.attempts ?? 0,
    scheduledFor: row.scheduled_for,
    status: row.status as QueueLead['status'],
    campaignId: row.campaign_id,
    pipelineColumnId: contact.pipeline_column_id ?? null,
    queueRowId: row.id,
  };
}

export function useQueuePro(campaignId: string | null, agentId: string | null) {
  const [queue, setQueue] = useState<QueueLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    if (!campaignId) {
      setQueue([]);
      setLoading(false);
      return;
    }
    const nowIso = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (supabase.from('wk_dialer_queue' as any) as any)
      .select(
        'id, contact_id, campaign_id, priority, attempts, scheduled_for, status, ' +
        'wk_contacts:contact_id ( id, name, phone, pipeline_column_id )'
      )
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
      .or(agentId ? `agent_id.eq.${agentId},agent_id.is.null` : 'agent_id.is.null')
      .order('priority', { ascending: false, nullsFirst: false })
      .order('scheduled_for', { ascending: true, nullsFirst: true })
      .order('attempts', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.warn('[dialer-pro] queue fetch error', error);
      setLoading(false);
      return;
    }

    const leads = ((rows ?? []) as QueueRow[])
      .map(rowToLead)
      .filter((l): l is QueueLead => l !== null);

    setQueue(leads);
    setLoading(false);
  }, [campaignId, agentId]);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  // Realtime subscription
  useEffect(() => {
    if (!campaignId) return;
    const channel = supabase
      .channel(`dialer-pro-queue-${campaignId}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'wk_dialer_queue',
        filter: `campaign_id=eq.${campaignId}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, () => {
        void fetchQueue();
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [campaignId, fetchQueue]);

  return {
    queue,
    nextLead: queue[0] ?? null,
    refresh: fetchQueue,
    loading,
  };
}
