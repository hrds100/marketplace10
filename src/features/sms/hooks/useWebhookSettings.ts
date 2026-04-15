import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsWebhookSettings } from '../types';

interface DbRow {
  id: string;
  enabled: boolean;
  numbers_per_hour: number;
  delay_seconds: number;
  workflow_name: string;
  trigger_stages: string[];
  move_to_stage_id: string | null;
  updated_at: string;
}

function mapRow(row: DbRow): SmsWebhookSettings {
  return {
    id: row.id,
    enabled: row.enabled,
    numbersPerHour: row.numbers_per_hour,
    delaySeconds: row.delay_seconds,
    workflowName: row.workflow_name,
    triggerStages: row.trigger_stages ?? [],
    moveToStageId: row.move_to_stage_id,
    updatedAt: row.updated_at,
  };
}

async function fetchSettings(): Promise<SmsWebhookSettings | null> {
  const { data, error } = await (supabase
    .from('sms_webhook_settings' as never)
    .select(
      'id, enabled, numbers_per_hour, delay_seconds, workflow_name, trigger_stages, move_to_stage_id, updated_at'
    )
    .limit(1)
    .maybeSingle() as never);

  if (error) throw error;
  return data ? mapRow(data as DbRow) : null;
}

export interface UpdateSettingsPayload {
  enabled?: boolean;
  numbersPerHour?: number;
  delaySeconds?: number;
  workflowName?: string;
  triggerStages?: string[];
  moveToStageId?: string | null;
}

export function useWebhookSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sms-webhook-settings'],
    queryFn: fetchSettings,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateSettingsPayload) => {
      if (!query.data) throw new Error('Settings row missing');
      const updates: Record<string, unknown> = {};
      if (payload.enabled !== undefined) updates.enabled = payload.enabled;
      if (payload.numbersPerHour !== undefined) updates.numbers_per_hour = payload.numbersPerHour;
      if (payload.delaySeconds !== undefined) updates.delay_seconds = payload.delaySeconds;
      if (payload.workflowName !== undefined) updates.workflow_name = payload.workflowName;
      if (payload.triggerStages !== undefined) updates.trigger_stages = payload.triggerStages;
      if (payload.moveToStageId !== undefined) updates.move_to_stage_id = payload.moveToStageId;

      const { error } = await (supabase
        .from('sms_webhook_settings' as never)
        .update(updates as never)
        .eq('id', query.data.id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-webhook-settings'] });
      toast.success('Settings saved');
    },
    onError: (err: Error) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  const backfillMutation = useMutation({
    mutationFn: async () => {
      if (!query.data) throw new Error('Settings row missing');
      const stages = query.data.triggerStages;
      if (stages.length === 0) {
        throw new Error('No trigger stages selected');
      }

      // Pull contacts in selected stages
      const { data: contacts, error: cErr } = await (supabase
        .from('sms_contacts' as never)
        .select('id, phone_number, pipeline_stage_id, opted_out')
        .in('pipeline_stage_id', stages as never)
        .eq('opted_out', false) as never);

      if (cErr) throw cErr;

      const rows = (contacts as {
        id: string;
        phone_number: string;
        pipeline_stage_id: string;
      }[] ?? []).map((c) => ({
        contact_id: c.id,
        phone: c.phone_number.replace(/\D/g, ''),
        stage_id: c.pipeline_stage_id,
      })).filter((r) => r.phone.length > 0);

      if (rows.length === 0) return { enqueued: 0 };

      // Insert with onConflict do nothing (unique phone constraint blocks dupes)
      const { error: insErr } = await (supabase
        .from('sms_webhook_queue' as never)
        .upsert(rows as never, { onConflict: 'phone', ignoreDuplicates: true }) as never);

      if (insErr) throw insErr;

      return { enqueued: rows.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sms-webhook-queue-stats'] });
      toast.success(`Queued ${result.enqueued} contacts for dispatch`);
    },
    onError: (err: Error) => {
      toast.error(`Backfill failed: ${err.message}`);
    },
  });

  return {
    settings: query.data ?? null,
    isLoading: query.isLoading,
    updateSettings: updateMutation.mutateAsync,
    backfill: backfillMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    isBackfilling: backfillMutation.isPending,
  };
}
