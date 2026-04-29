// crm-v2 usePipelineColumns — wk_pipeline_columns lookup map.
// Used by RecentCallsList to render the outcome chip from
// wk_calls.disposition_column_id.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PipelineColumnRow } from '../data/types';

export function usePipelineColumns(): {
  columns: PipelineColumnRow[];
  byId: Map<string, { name: string; colour: string | null }>;
  loading: boolean;
} {
  const [columns, setColumns] = useState<PipelineColumnRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (
        supabase.from('wk_pipeline_columns' as any) as any
      )
        .select('id, name, position, colour, icon')
        .order('position', { ascending: true });
      if (cancelled) return;
      if (error || !data) {
        setColumns([]);
        setLoading(false);
        return;
      }
      setColumns(data as PipelineColumnRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, { name: string; colour: string | null }>();
    for (const c of columns) m.set(c.id, { name: c.name, colour: c.colour });
    return m;
  }, [columns]);

  return { columns, byId, loading };
}
