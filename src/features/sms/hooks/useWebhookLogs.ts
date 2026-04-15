import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsWebhookLog } from '../types';

interface DbRow {
  id: string;
  queue_id: string | null;
  endpoint_id: string | null;
  phone: string;
  status: 'success' | 'failed';
  http_status: number | null;
  response_body: string | null;
  error: string | null;
  attempt: number;
  created_at: string;
}

function mapRow(row: DbRow): SmsWebhookLog {
  return {
    id: row.id,
    queueId: row.queue_id,
    endpointId: row.endpoint_id,
    phone: row.phone,
    status: row.status,
    httpStatus: row.http_status,
    responseBody: row.response_body,
    error: row.error,
    attempt: row.attempt,
    createdAt: row.created_at,
  };
}

interface QueueStats {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
}

export function useWebhookLogs(limit = 100) {
  const queryClient = useQueryClient();

  const logsQuery = useQuery({
    queryKey: ['sms-webhook-logs', limit],
    queryFn: async (): Promise<SmsWebhookLog[]> => {
      const { data, error } = await (supabase
        .from('sms_webhook_logs' as never)
        .select(
          'id, queue_id, endpoint_id, phone, status, http_status, response_body, error, attempt, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(limit) as never);
      if (error) throw error;
      return ((data as DbRow[]) ?? []).map(mapRow);
    },
    refetchInterval: 30_000,
  });

  const statsQuery = useQuery({
    queryKey: ['sms-webhook-queue-stats'],
    queryFn: async (): Promise<QueueStats> => {
      const statuses: Array<keyof QueueStats> = ['pending', 'sending', 'sent', 'failed'];
      const stats: QueueStats = { pending: 0, sending: 0, sent: 0, failed: 0 };

      for (const status of statuses) {
        const { count } = await (supabase
          .from('sms_webhook_queue' as never)
          .select('id', { count: 'exact', head: true })
          .eq('status', status) as never);
        stats[status] = count ?? 0;
      }

      return stats;
    },
    refetchInterval: 30_000,
  });

  const removeFromHistoryMutation = useMutation({
    mutationFn: async (phone: string) => {
      // Delete log rows + queue row (unlocks the phone for re-send)
      const { error: logErr } = await (supabase
        .from('sms_webhook_logs' as never)
        .delete()
        .eq('phone', phone) as never);
      if (logErr) throw logErr;

      const { error: qErr } = await (supabase
        .from('sms_webhook_queue' as never)
        .delete()
        .eq('phone', phone) as never);
      if (qErr) throw qErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-webhook-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sms-webhook-queue-stats'] });
      toast.success('Removed from history — phone unlocked');
    },
    onError: (err: Error) => {
      toast.error(`Failed to remove: ${err.message}`);
    },
  });

  return {
    logs: logsQuery.data ?? [],
    isLoading: logsQuery.isLoading,
    stats: statsQuery.data ?? { pending: 0, sending: 0, sent: 0, failed: 0 },
    removeFromHistory: removeFromHistoryMutation.mutateAsync,
    isRemoving: removeFromHistoryMutation.isPending,
  };
}
