import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SmsLabel } from '../types';

async function fetchLabels(): Promise<SmsLabel[]> {
  const { data, error } = await (supabase
    .from('sms_labels' as never)
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

export function useLabels() {
  const result = useQuery({
    queryKey: ['sms-labels'],
    queryFn: fetchLabels,
  });

  return {
    labels: result.data ?? [],
    isLoading: result.isLoading,
  };
}
