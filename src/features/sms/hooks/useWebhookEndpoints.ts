import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsWebhookEndpoint } from '../types';

interface DbRow {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'inactive';
  send_window_start: string;
  send_window_end: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DbRow): SmsWebhookEndpoint {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    status: row.status,
    sendWindowStart: row.send_window_start,
    sendWindowEnd: row.send_window_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchEndpoints(): Promise<SmsWebhookEndpoint[]> {
  const { data, error } = await (supabase
    .from('sms_webhook_endpoints' as never)
    .select(
      'id, name, url, status, send_window_start, send_window_end, created_at, updated_at'
    )
    .order('created_at', { ascending: true }) as never);

  if (error) throw error;
  return ((data as DbRow[]) ?? []).map(mapRow);
}

export interface CreateEndpointPayload {
  name: string;
  url: string;
  status: 'active' | 'inactive';
  sendWindowStart: string;
  sendWindowEnd: string;
}

export function useWebhookEndpoints() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sms-webhook-endpoints'],
    queryFn: fetchEndpoints,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateEndpointPayload) => {
      const { error } = await (supabase.from('sms_webhook_endpoints' as never).insert({
        name: payload.name,
        url: payload.url,
        status: payload.status,
        send_window_start: payload.sendWindowStart,
        send_window_end: payload.sendWindowEnd,
      } as never) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-webhook-endpoints'] });
      toast.success('Webhook endpoint created');
    },
    onError: (err: Error) => {
      toast.error(`Failed to create endpoint: ${err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateEndpointPayload> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.url !== undefined) dbUpdates.url = updates.url;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.sendWindowStart !== undefined) dbUpdates.send_window_start = updates.sendWindowStart;
      if (updates.sendWindowEnd !== undefined) dbUpdates.send_window_end = updates.sendWindowEnd;

      const { error } = await (supabase
        .from('sms_webhook_endpoints' as never)
        .update(dbUpdates as never)
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-webhook-endpoints'] });
      toast.success('Endpoint updated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('sms_webhook_endpoints' as never)
        .delete()
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-webhook-endpoints'] });
      toast.success('Endpoint deleted');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const testSendMutation = useMutation({
    mutationFn: async ({
      url,
      workflow,
      phone,
    }: {
      url: string;
      workflow: string;
      phone: string;
    }) => {
      const cleaned = phone.replace(/\D/g, '');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-workflow', workflow, phone: cleaned }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      return { status: res.status, body: text.slice(0, 200) };
    },
    onSuccess: (result) => {
      toast.success(`Test sent — ${result.status}`);
    },
    onError: (err: Error) => {
      toast.error(`Test failed: ${err.message}`);
    },
  });

  return {
    endpoints: query.data ?? [],
    isLoading: query.isLoading,
    createEndpoint: createMutation.mutateAsync,
    updateEndpoint: updateMutation.mutateAsync,
    deleteEndpoint: deleteMutation.mutateAsync,
    testSend: testSendMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTesting: testSendMutation.isPending,
  };
}
