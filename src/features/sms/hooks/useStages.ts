// useStages — lists + CRUD for /sms pipeline stages (columns).
//
// Multi-pipeline support added 2026-05-19: stages now belong to a
// pipeline via pipeline_id FK. Pass `pipelineId` to scope the list to
// one pipeline, or omit to load all (legacy callers).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsPipelineStage } from '../types';

interface StageRow {
  id: string;
  name: string;
  colour: string;
  position: number;
  pipeline_id: string;
}

async function fetchStages(pipelineId?: string): Promise<SmsPipelineStage[]> {
  let q = (supabase
    .from('sms_pipeline_stages' as never)
    .select('id, name, colour, position, pipeline_id')
    .order('position', { ascending: true }) as never);
  if (pipelineId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    q = (q as any).eq('pipeline_id', pipelineId);
  }
  const { data, error } = await q;
  if (error) throw error;
  return ((data as StageRow[]) ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    colour: row.colour,
    position: row.position,
    pipelineId: row.pipeline_id,
  }));
}

export function useStages(pipelineId?: string) {
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: ['sms-pipeline-stages', pipelineId ?? '__all__'],
    queryFn: () => fetchStages(pipelineId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sms-pipeline-stages'] });
    queryClient.invalidateQueries({ queryKey: ['sms-pipeline-contacts'] });
  };

  const createMutation = useMutation({
    mutationFn: async ({ name, colour, pipelineId: pid }: { name: string; colour?: string; pipelineId: string }) => {
      const existing = (result.data ?? []).filter((s) => s.pipelineId === pid);
      const nextPos = existing.length ? Math.max(...existing.map((s) => s.position)) + 1 : 0;
      const { data, error } = await (supabase
        .from('sms_pipeline_stages' as never)
        .insert({
          name: name.trim(),
          colour: colour || '#6B7280',
          position: nextPos,
          pipeline_id: pid,
        } as never)
        .select('id, name, colour, position, pipeline_id')
        .single() as never);
      if (error) throw error;
      return data as StageRow;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Column added');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to add column'),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await (supabase
        .from('sms_pipeline_stages' as never)
        .update({ name: name.trim() } as never)
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to rename column'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Unlink contacts from this stage first.
      await (supabase
        .from('sms_contacts' as never)
        .update({ pipeline_stage_id: null } as never)
        .eq('pipeline_stage_id', id) as never);
      const { error } = await (supabase
        .from('sms_pipeline_stages' as never)
        .delete()
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Column deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete column'),
  });

  return {
    stages: result.data ?? [],
    isLoading: result.isLoading,
    createStage: createMutation.mutateAsync,
    renameStage: renameMutation.mutateAsync,
    deleteStage: deleteMutation.mutateAsync,
  };
}
