import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SmsPipelineStage } from '../types';

async function fetchStages(): Promise<SmsPipelineStage[]> {
  const { data, error } = await (supabase
    .from('sms_pipeline_stages' as never)
    .select('id, name, colour, position')
    .order('position', { ascending: true }) as never);

  if (error) throw error;

  return ((data as { id: string; name: string; colour: string; position: number }[]) ?? []).map(
    (row) => ({
      id: row.id,
      name: row.name,
      colour: row.colour,
      position: row.position,
    })
  );
}

export function useStages() {
  const result = useQuery({
    queryKey: ['sms-pipeline-stages'],
    queryFn: fetchStages,
  });

  return {
    stages: result.data ?? [],
    isLoading: result.isLoading,
  };
}
