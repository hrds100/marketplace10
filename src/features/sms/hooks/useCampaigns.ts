import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsCampaign } from '../types';

interface CampaignRow {
  id: string;
  name: string;
  batch_name: string | null;
  templates: string[] | null;
  message_body: string;
  number_ids: string[];
  rotation: boolean;
  template_rotation: boolean;
  include_opt_out: boolean;
  status: string;
  scheduled_at: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  skipped_count: number;
  send_speed: { min: number; max: number } | null;
  batch_size: number | null;
  automation_id: string | null;
  created_at: string;
}

function mapRow(row: CampaignRow): SmsCampaign {
  return {
    id: row.id,
    name: row.name,
    batchName: row.batch_name,
    templates: row.templates ?? [],
    messageBody: row.message_body,
    numberIds: row.number_ids ?? [],
    rotation: row.rotation,
    templateRotation: row.template_rotation ?? false,
    includeOptOut: row.include_opt_out,
    status: row.status as SmsCampaign['status'],
    scheduledAt: row.scheduled_at,
    totalRecipients: row.total_recipients,
    sentCount: row.sent_count,
    deliveredCount: row.delivered_count,
    failedCount: row.failed_count,
    skippedCount: row.skipped_count,
    sendSpeed: row.send_speed ?? null,
    batchSize: row.batch_size ?? null,
    automationId: row.automation_id ?? null,
    createdAt: row.created_at,
  };
}

async function fetchCampaigns(): Promise<SmsCampaign[]> {
  const { data, error } = await (supabase
    .from('sms_campaigns' as never)
    .select(
      'id, name, batch_name, templates, message_body, number_ids, rotation, template_rotation, include_opt_out, status, scheduled_at, total_recipients, sent_count, delivered_count, failed_count, skipped_count, send_speed, batch_size, automation_id, created_at'
    )
    .order('created_at', { ascending: false }) as never);

  if (error) throw error;
  return ((data as CampaignRow[]) ?? []).map(mapRow);
}

interface CreateCampaignPayload {
  name: string;
  batch_name?: string | null;
  templates?: string[];
  message_body: string;
  number_ids: string[];
  rotation: boolean;
  template_rotation?: boolean;
  include_opt_out: boolean;
  scheduled_at?: string | null;
  status?: string;
  contact_ids: string[];
  send_speed?: { min: number; max: number } | null;
  batch_size?: number | null;
  automation_id?: string | null;
}

export function useCampaigns() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sms-campaigns'],
    queryFn: fetchCampaigns,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateCampaignPayload) => {
      const { contact_ids, ...campaignData } = payload;

      // Insert campaign
      const { data, error } = await (supabase
        .from('sms_campaigns' as never)
        .insert({
          ...campaignData,
          total_recipients: contact_ids.length,
        } as never)
        .select('id')
        .single() as never);

      if (error) throw error;
      const campaignId = (data as { id: string }).id;

      // Insert recipients
      if (contact_ids.length > 0) {
        const recipientRows = contact_ids.map((contactId) => ({
          campaign_id: campaignId,
          contact_id: contactId,
          status: 'pending',
        }));

        const { error: recipErr } = await (supabase
          .from('sms_campaign_recipients' as never)
          .insert(recipientRows as never) as never);

        if (recipErr) throw recipErr;
      }

      return campaignId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create campaign');
    },
  });

  const launchMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('sms-bulk-send', {
        body: { campaign_id: campaignId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] });
      toast.success('Campaign launched');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to launch campaign');
    },
  });

  const sendNextBatchMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      // Resume the campaign by setting status back to draft so sms-bulk-send picks it up
      const { error: updateErr } = await (supabase
        .from('sms_campaigns' as never)
        .update({ status: 'draft' } as never)
        .eq('id', campaignId) as never);

      if (updateErr) throw updateErr;

      const { data, error } = await supabase.functions.invoke('sms-bulk-send', {
        body: { campaign_id: campaignId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] });
      toast.success('Next batch started');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to send next batch');
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await (supabase
        .from('sms_campaigns' as never)
        .update({ status: 'paused' } as never)
        .eq('id', campaignId) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] });
      toast.success('Campaign paused');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to pause campaign');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error: updateErr } = await (supabase
        .from('sms_campaigns' as never)
        .update({ status: 'draft' } as never)
        .eq('id', campaignId) as never);

      if (updateErr) throw updateErr;

      const { data, error } = await supabase.functions.invoke('sms-bulk-send', {
        body: { campaign_id: campaignId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] });
      toast.success('Campaign resumed');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to resume campaign');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await (supabase
        .from('sms_campaigns' as never)
        .delete()
        .eq('id', campaignId) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] });
      toast.success('Campaign deleted');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete campaign');
    },
  });

  return {
    campaigns: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createCampaign: createMutation.mutateAsync,
    launchCampaign: launchMutation.mutateAsync,
    sendNextBatch: sendNextBatchMutation.mutateAsync,
    pauseCampaign: pauseMutation.mutateAsync,
    resumeCampaign: resumeMutation.mutateAsync,
    deleteCampaign: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isLaunching: launchMutation.isPending,
    isSendingBatch: sendNextBatchMutation.isPending,
    isPausing: pauseMutation.isPending,
    isResuming: resumeMutation.isPending,
  };
}
