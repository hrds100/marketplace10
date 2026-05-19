// usePipelines — lists + CRUD for /sms pipelines.
//
// Multi-pipeline support was added 2026-05-19 — sms_pipelines is the
// top-level grouping, sms_pipeline_stages holds the columns. Mirrors
// /crm/pipelines (wk_pipelines + wk_pipeline_columns).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsPipeline } from '../types';

interface PipelineRow {
  id: string;
  name: string;
  position: number;
}

async function fetchPipelines(): Promise<SmsPipeline[]> {
  const { data, error } = await (supabase
    .from('sms_pipelines' as never)
    .select('id, name, position')
    .order('position', { ascending: true }) as never);
  if (error) throw error;
  return ((data as PipelineRow[]) ?? []).map((r) => ({ id: r.id, name: r.name, position: r.position }));
}

export function usePipelines() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sms-pipelines'],
    queryFn: fetchPipelines,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sms-pipelines'] });
    queryClient.invalidateQueries({ queryKey: ['sms-pipeline-stages'] });
  };

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const pipelines = query.data ?? [];
      const nextPos = pipelines.length
        ? Math.max(...pipelines.map((p) => p.position)) + 1
        : 0;
      const { data, error } = await (supabase
        .from('sms_pipelines' as never)
        .insert({ name: name.trim(), position: nextPos } as never)
        .select('id, name, position')
        .single() as never);
      if (error) throw error;
      return data as PipelineRow;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Pipeline created');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create pipeline'),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await (supabase
        .from('sms_pipelines' as never)
        .update({ name: name.trim() } as never)
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Pipeline renamed');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to rename pipeline'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // CASCADE removes child stages; contacts keep their pipeline_stage_id
      // pointing at deleted rows (set NULL via separate update for safety).
      await (supabase
        .from('sms_contacts' as never)
        .update({ pipeline_stage_id: null } as never)
        .in(
          'pipeline_stage_id',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((await (supabase
            .from('sms_pipeline_stages' as never)
            .select('id')
            .eq('pipeline_id', id) as never)).data as { id: string }[] | null ?? []).map((r) => r.id),
        ) as never);
      const { error } = await (supabase
        .from('sms_pipelines' as never)
        .delete()
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Pipeline deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete pipeline'),
  });

  return {
    pipelines: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createPipeline: createMutation.mutateAsync,
    renamePipeline: renameMutation.mutateAsync,
    deletePipeline: deleteMutation.mutateAsync,
  };
}
