import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsAutomation } from '../types';

interface AutomationRow {
  id: string;
  name: string;
  description: string | null;
  flow_json: Record<string, unknown> | null;
  trigger_type: 'new_message' | 'keyword' | 'time_based';
  trigger_config: Record<string, unknown>;
  is_active: boolean;
  last_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: AutomationRow): SmsAutomation {
  const config = (row.trigger_config ?? {}) as SmsAutomation['triggerConfig'];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    flowJson: row.flow_json,
    triggerType: row.trigger_type,
    triggerConfig: config,
    isActive: row.is_active,
    lastRunAt: row.last_run_at,
    runCount: row.run_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchAutomations(): Promise<SmsAutomation[]> {
  const { data, error } = await (supabase
    .from('sms_automations' as never)
    .select('id, name, description, flow_json, trigger_type, trigger_config, is_active, last_run_at, run_count, created_at, updated_at')
    .order('created_at', { ascending: false }) as never);

  if (error) throw error;
  return ((data as AutomationRow[]) ?? []).map(mapRow);
}

export function useAutomations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sms-automations'],
    queryFn: fetchAutomations,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      trigger_type: string;
      trigger_config: Record<string, unknown>;
      flow_json?: Record<string, unknown>;
    }) => {
      const { data, error } = await (supabase
        .from('sms_automations' as never)
        .insert(payload as never)
        .select('id')
        .single() as never);
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-automations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create automation');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      description?: string | null;
      trigger_type?: string;
      trigger_config?: Record<string, unknown>;
      is_active?: boolean;
    }) => {
      const { id, ...fields } = payload;
      const { error } = await (supabase
        .from('sms_automations' as never)
        .update({ ...fields, updated_at: new Date().toISOString() } as never)
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-automations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update automation');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (automationId: string) => {
      const { error } = await (supabase
        .from('sms_automations' as never)
        .delete()
        .eq('id', automationId) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-automations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete automation');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (payload: { id: string; is_active: boolean }) => {
      const { error } = await (supabase
        .from('sms_automations' as never)
        .update({ is_active: payload.is_active, updated_at: new Date().toISOString() } as never)
        .eq('id', payload.id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-automations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle automation');
    },
  });

  return {
    automations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createAutomation: createMutation.mutateAsync,
    updateAutomation: updateMutation.mutateAsync,
    deleteAutomation: deleteMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
  };
}
