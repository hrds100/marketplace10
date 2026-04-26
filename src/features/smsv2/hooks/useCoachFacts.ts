// useCoachFacts — admin CRUD + realtime read for wk_coach_facts.
//
// The knowledge base layer of the three-layer coach prompt system
// (style / script / facts). The edge function `wk-voice-transcription`
// reads this table on every coach generation; admin edits propagate
// instantly via the supabase_realtime publication.

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CoachFact {
  id: string;
  key: string;
  label: string;
  value: string;
  keywords: string[];
  sort_order: number;
  is_active: boolean;
  /** Phase 1 migration 2026-04-30: groups facts in the FactsDrawer UI. */
  category: 'deal' | 'returns' | 'compliance' | 'logistics' | 'objection';
  updated_at: string;
}

type FactInsert = Omit<CoachFact, 'id' | 'updated_at'>;
type FactPatch = Partial<FactInsert>;

interface FactTable {
  from: (t: string) => {
    select: (c: string) => {
      order: (
        col: string,
        opts: { ascending: boolean }
      ) => {
        order: (
          col: string,
          opts: { ascending: boolean }
        ) => Promise<{ data: CoachFact[] | null; error: { message: string } | null }>;
      };
    };
    insert: (v: Record<string, unknown>) => {
      select: (c: string) => {
        single: () => Promise<{ data: CoachFact | null; error: { message: string } | null }>;
      };
    };
    update: (v: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
    delete: () => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  };
  channel: (name: string) => {
    on: (
      ev: string,
      filter: { event: string; schema: string; table: string },
      cb: () => void
    ) => {
      subscribe: () => { unsubscribe: () => void };
    };
  };
  removeChannel: (c: unknown) => void;
}

export function useCoachFacts(opts: { activeOnly?: boolean } = {}) {
  const { activeOnly = false } = opts;
  const [items, setItems] = useState<CoachFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const { data, error: e } = await (supabase as unknown as FactTable)
        .from('wk_coach_facts')
        .select('id, key, label, value, keywords, sort_order, is_active, category, updated_at')
        .order('sort_order', { ascending: true })
        .order('key', { ascending: true });
      if (e) {
        setError(e.message);
      } else {
        const rows = data ?? [];
        setItems(activeOnly ? rows.filter((r) => r.is_active) : rows);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed');
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await reload();
    })();
    const channel = (supabase as unknown as FactTable)
      .channel('wk_coach_facts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wk_coach_facts' },
        () => {
          if (!cancelled) void reload();
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      (supabase as unknown as FactTable).removeChannel(channel);
    };
  }, [reload]);

  const add = useCallback(async (row: FactInsert) => {
    const { data, error: e } = await (supabase as unknown as FactTable)
      .from('wk_coach_facts')
      .insert(row)
      .select('id, key, label, value, keywords, sort_order, is_active, category, updated_at')
      .single();
    if (e) throw new Error(e.message);
    if (!data) throw new Error('insert returned no row');
    return data;
  }, []);

  const patch = useCallback(async (id: string, p: FactPatch) => {
    const { error: e } = await (supabase as unknown as FactTable)
      .from('wk_coach_facts')
      .update(p)
      .eq('id', id);
    if (e) throw new Error(e.message);
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error: e } = await (supabase as unknown as FactTable)
      .from('wk_coach_facts')
      .delete()
      .eq('id', id);
    if (e) throw new Error(e.message);
  }, []);

  return { items, loading, error, reload, add, patch, remove };
}
