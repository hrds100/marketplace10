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

export function useQueuePro(campaignId: string | null) {
  const [queue, setQueue] = useState<QueueLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    const nowIso = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from('wk_dialer_queue' as any) as any)
      .select(
        'id, contact_id, campaign_id, priority, attempts, scheduled_for, status, ' +
        'wk_contacts:contact_id ( id, name, phone, pipeline_column_id )',
        { count: 'exact' }
      )
      .eq('status', 'pending')
      .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
      .order('priority', { ascending: false, nullsFirst: false })
      .order('scheduled_for', { ascending: true, nullsFirst: true })
      .order('attempts', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(200);

    if (campaignId && campaignId.trim() !== '') {
      q = q.eq('campaign_id', campaignId);
    }

    const { data: rows, error, count } = await q;

    if (error) {
      console.warn('[dialer-pro] queue fetch error', error);
      setLoading(false);
      return;
    }

    const leads = ((rows ?? []) as QueueRow[])
      .map(rowToLead)
      .filter((l): l is QueueLead => l !== null);

    setQueue(leads);
    setTotalCount(count ?? leads.length);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  // Realtime subscription — no campaign filter so we catch all queue changes
  useEffect(() => {
    const channelName = campaignId ? `dialer-pro-queue-${campaignId}` : 'dialer-pro-queue-all';
    const channel = supabase
      .channel(channelName)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'wk_dialer_queue',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, () => {
        void fetchQueue();
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [campaignId, fetchQueue]);

  const removeLocal = useCallback((contactId: string) => {
    setQueue((prev) => prev.filter((l) => l.contactId !== contactId));
    setTotalCount((prev) => Math.max(0, prev - 1));
  }, []);

  return {
    queue,
    totalCount,
    nextLead: queue[0] ?? null,
    refresh: fetchQueue,
    removeLocal,
    loading,
  };
}
