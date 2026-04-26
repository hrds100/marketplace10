// useTerminologies — admin CRUD + agent-read for wk_terminologies.
//
// Used by:
//   - Settings → Glossary tab (admin: list, add, edit, delete, reorder)
//   - TerminologyPane (col 4 of LiveCallScreen, agent read)
//
// Realtime: wk_terminologies is in supabase_realtime, so the live-call
// pane reflects admin edits without reload.

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Terminology {
  id: string;
  term: string;
  short_gist: string | null;
  definition_md: string;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

type TermInsert = Omit<Terminology, 'id' | 'updated_at'>;
type TermPatch = Partial<TermInsert>;

interface TermTable {
  from: (t: string) => {
    select: (c: string) => {
      order: (
        col: string,
        opts: { ascending: boolean }
      ) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<{
          data: Terminology[] | null;
          error: { message: string } | null;
        }>;
      };
    };
    insert: (v: Record<string, unknown>) => {
      select: (c: string) => {
        single: () => Promise<{ data: Terminology | null; error: { message: string } | null }>;
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

export function useTerminologies(opts: { activeOnly?: boolean } = {}) {
  const { activeOnly = false } = opts;
  const [items, setItems] = useState<Terminology[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const { data, error: e } = await (supabase as unknown as TermTable)
        .from('wk_terminologies')
        .select('id, term, short_gist, definition_md, sort_order, is_active, updated_at')
        .order('sort_order', { ascending: true })
        .order('term', { ascending: true });
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
    // Realtime subscription — admin edits propagate to the live-call pane.
    const channel = (supabase as unknown as TermTable)
      .channel('wk_terminologies_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wk_terminologies' },
        () => {
          if (!cancelled) void reload();
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      (supabase as unknown as TermTable).removeChannel(channel);
    };
  }, [reload]);

  const add = useCallback(async (row: TermInsert) => {
    const { data, error: e } = await (supabase as unknown as TermTable)
      .from('wk_terminologies')
      .insert(row)
      .select('id, term, short_gist, definition_md, sort_order, is_active, updated_at')
      .single();
    if (e) throw new Error(e.message);
    if (!data) throw new Error('insert returned no row');
    return data;
  }, []);

  const patch = useCallback(async (id: string, p: TermPatch) => {
    const { error: e } = await (supabase as unknown as TermTable)
      .from('wk_terminologies')
      .update(p)
      .eq('id', id);
    if (e) throw new Error(e.message);
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error: e } = await (supabase as unknown as TermTable)
      .from('wk_terminologies')
      .delete()
      .eq('id', id);
    if (e) throw new Error(e.message);
  }, []);

  return { items, loading, error, reload, add, patch, remove };
}
