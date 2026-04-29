// Caller — usePipelineColumns.
// Reads wk_pipeline_columns for a given pipeline_id (or all if null).
// Used by OutcomeSelector + (later) PipelinesPage Kanban board.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PipelineColumnRow {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  colour: string | null;
  icon: string | null;
  requires_followup: boolean | null;
}

export function usePipelineColumns(pipelineId: string | null) {
  const [columns, setColumns] = useState<PipelineColumnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase.from('wk_pipeline_columns' as any) as any)
        .select('id, pipeline_id, name, position, colour, icon, requires_followup')
        .order('position', { ascending: true });

      if (pipelineId) q = q.eq('pipeline_id', pipelineId);

      const { data, error: e } = await q;
      if (cancelled) return;

      if (e) {
        setError(e.message);
        setColumns([]);
        setLoading(false);
        return;
      }
      setColumns((data ?? []) as PipelineColumnRow[]);
      setLoading(false);
    }

    void load();

    let pending: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        if (!cancelled) void load();
      }, 400);
    };

    const ch = supabase
      .channel(`caller-pipeline-columns-${pipelineId ?? 'all'}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_pipeline_columns' },
        refresh
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (pending) clearTimeout(pending);
      try { void supabase.removeChannel(ch); } catch { /* ignore */ }
    };
  }, [pipelineId]);

  return { columns, loading, error };
}
