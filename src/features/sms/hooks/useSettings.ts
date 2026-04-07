import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsLabel, SmsPipelineStage, SmsQuickReply } from '../types';

// --- Labels ---
async function fetchLabels(): Promise<SmsLabel[]> {
  const { data, error } = await (supabase
    .from('sms_labels' as never)
    .select('id, name, colour, position')
    .order('position', { ascending: true }) as never);
  if (error) throw error;
  return ((data as { id: string; name: string; colour: string; position: number }[]) ?? []).map(
    (r) => ({ id: r.id, name: r.name, colour: r.colour, position: r.position })
  );
}

// --- Stages ---
async function fetchStages(): Promise<SmsPipelineStage[]> {
  const { data, error } = await (supabase
    .from('sms_pipeline_stages' as never)
    .select('id, name, colour, position')
    .order('position', { ascending: true }) as never);
  if (error) throw error;
  return ((data as { id: string; name: string; colour: string; position: number }[]) ?? []).map(
    (r) => ({ id: r.id, name: r.name, colour: r.colour, position: r.position })
  );
}

// --- Quick Replies ---
async function fetchQuickReplies(): Promise<SmsQuickReply[]> {
  const { data, error } = await (supabase
    .from('sms_quick_replies' as never)
    .select('id, label, body, position')
    .order('position', { ascending: true }) as never);
  if (error) throw error;
  return ((data as { id: string; label: string; body: string; position: number }[]) ?? []).map(
    (r) => ({ id: r.id, label: r.label, body: r.body, position: r.position })
  );
}

export function useSettings() {
  const queryClient = useQueryClient();

  // Queries
  const labelsQuery = useQuery({ queryKey: ['sms-labels'], queryFn: fetchLabels });
  const stagesQuery = useQuery({ queryKey: ['sms-pipeline-stages'], queryFn: fetchStages });
  const repliesQuery = useQuery({ queryKey: ['sms-quick-replies'], queryFn: fetchQuickReplies });

  // --- Label mutations ---
  const addLabelMutation = useMutation({
    mutationFn: async (payload: { name: string; colour: string; position: number }) => {
      const { error } = await (supabase
        .from('sms_labels' as never)
        .insert(payload as never) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-labels'] });
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
    },
    onError: (err) => { toast.error(err instanceof Error ? err.message : 'Failed to add label'); },
  });

  const updateLabelMutation = useMutation({
    mutationFn: async (payload: SmsLabel) => {
      const { id, ...data } = payload;
      const { error } = await (supabase
        .from('sms_labels' as never)
        .update(data as never)
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-labels'] });
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    },
    onError: (err) => { toast.error(err instanceof Error ? err.message : 'Failed to update label'); },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('sms_labels' as never)
        .delete()
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-labels'] });
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
    },
    onError: (err) => { toast.error(err instanceof Error ? err.message : 'Failed to delete label'); },
  });

  // --- Stage mutations ---
  const addStageMutation = useMutation({
    mutationFn: async (payload: { name: string; colour: string; position: number }) => {
      const { error } = await (supabase
        .from('sms_pipeline_stages' as never)
        .insert(payload as never) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-pipeline-stages'] });
    },
    onError: (err) => { toast.error(err instanceof Error ? err.message : 'Failed to add stage'); },
  });

  const updateStageMutation = useMutation({
    mutationFn: async (payload: SmsPipelineStage) => {
      const { id, ...data } = payload;
      const { error } = await (supabase
        .from('sms_pipeline_stages' as never)
        .update(data as never)
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-pipeline-stages'] });
    },
    onError: (err) => { toast.error(err instanceof Error ? err.message : 'Failed to update stage'); },
  });

  const deleteStageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('sms_pipeline_stages' as never)
        .delete()
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-pipeline-stages'] });
    },
    onError: (err) => { toast.error(err instanceof Error ? err.message : 'Failed to delete stage'); },
  });

  // --- Quick reply mutations ---
  const addReplyMutation = useMutation({
    mutationFn: async (payload: { label: string; body: string; position: number }) => {
      const { error } = await (supabase
        .from('sms_quick_replies' as never)
        .insert(payload as never) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-quick-replies'] });
    },
    onError: (err) => { toast.error(err instanceof Error ? err.message : 'Failed to add quick reply'); },
  });

  const updateReplyMutation = useMutation({
    mutationFn: async (payload: SmsQuickReply) => {
      const { id, ...data } = payload;
      const { error } = await (supabase
        .from('sms_quick_replies' as never)
        .update(data as never)
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-quick-replies'] });
    },
    onError: (err) => { toast.error(err instanceof Error ? err.message : 'Failed to update quick reply'); },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('sms_quick_replies' as never)
        .delete()
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-quick-replies'] });
    },
    onError: (err) => { toast.error(err instanceof Error ? err.message : 'Failed to delete quick reply'); },
  });

  return {
    labels: labelsQuery.data ?? [],
    stages: stagesQuery.data ?? [],
    replies: repliesQuery.data ?? [],
    isLoading: labelsQuery.isLoading || stagesQuery.isLoading || repliesQuery.isLoading,

    addLabel: addLabelMutation.mutateAsync,
    updateLabel: updateLabelMutation.mutateAsync,
    deleteLabel: deleteLabelMutation.mutateAsync,

    addStage: addStageMutation.mutateAsync,
    updateStage: updateStageMutation.mutateAsync,
    deleteStage: deleteStageMutation.mutateAsync,

    addReply: addReplyMutation.mutateAsync,
    updateReply: updateReplyMutation.mutateAsync,
    deleteReply: deleteReplyMutation.mutateAsync,
  };
}
