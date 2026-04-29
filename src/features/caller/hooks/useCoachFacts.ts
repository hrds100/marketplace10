// Caller — useCoachFacts.
// CRUD over wk_coach_facts (the Layer-3 knowledge base for the live
// coach). Realtime subscription so admin edits propagate to live agents
// within ~1 second.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CoachFact {
  id: string;
  key: string;
  label: string;
  value: string;
  keywords: string[];
  sortOrder: number;
  isActive: boolean;
}

interface CoachFactRow {
  id: string;
  key: string;
  label: string;
  value: string;
  keywords: string[] | null;
  sort_order: number | null;
  is_active: boolean | null;
}

function rowToFact(r: CoachFactRow): CoachFact {
  return {
    id: r.id,
    key: r.key,
    label: r.label,
    value: r.value,
    keywords: r.keywords ?? [],
    sortOrder: r.sort_order ?? 0,
    isActive: r.is_active ?? true,
  };
}

export function useCoachFacts() {
  const [facts, setFacts] = useState<CoachFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: e } = await (supabase.from('wk_coach_facts' as any) as any)
      .select('id, key, label, value, keywords, sort_order, is_active')
      .order('sort_order', { ascending: true });
    if (e) setError(e.message);
    else setFacts(((data ?? []) as CoachFactRow[]).map(rowToFact));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`caller-coach-facts`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_coach_facts' },
        () => void load()
      )
      .subscribe();
    return () => {
      try { void supabase.removeChannel(ch); } catch { /* ignore */ }
    };
  }, [load]);

  const upsert = useCallback(
    async (
      input: Omit<CoachFact, 'id'> & { id?: string }
    ): Promise<{ ok: boolean; error?: string }> => {
      const payload = {
        ...(input.id ? { id: input.id } : {}),
        key: input.key,
        label: input.label,
        value: input.value,
        keywords: input.keywords,
        sort_order: input.sortOrder,
        is_active: input.isActive,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: e } = await (supabase.from('wk_coach_facts' as any) as any).upsert(
        payload
      );
      if (e) return { ok: false, error: e.message };
      return { ok: true };
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<{ ok: boolean; error?: string }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e } = await (supabase.from('wk_coach_facts' as any) as any)
      .delete()
      .eq('id', id);
    if (e) return { ok: false, error: e.message };
    return { ok: true };
  }, []);

  return { facts, loading, error, upsert, remove, reload: load };
}
