// Caller — useContacts.
// Lists wk_contacts with realtime. Phase 4 skeleton: simple filter on
// pipeline column + free-text search across name/phone/email. Pagination
// + advanced filters land later.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ContactRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  pipelineColumnId: string | null;
  /** Tags live in the separate wk_contact_tags table; left empty here.
   *  Populate via a separate hook (useContactTags) when needed. */
  tags: string[];
  lastContactAt: string | null;
  createdAt: string;
}

interface WkContactRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  pipeline_column_id: string | null;
  last_contact_at: string | null;
  created_at: string;
}

function rowToContact(r: WkContactRow): ContactRow {
  return {
    id: r.id,
    name: r.name ?? r.phone ?? 'Unknown',
    phone: r.phone ?? '',
    email: r.email,
    pipelineColumnId: r.pipeline_column_id,
    tags: [],
    lastContactAt: r.last_contact_at,
    createdAt: r.created_at,
  };
}

interface Opts {
  pipelineColumnId?: string | null;
  search?: string;
  limit?: number;
}

export function useContacts(opts: Opts = {}) {
  const { pipelineColumnId = null, search = '', limit = 200 } = opts;
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase.from('wk_contacts' as any) as any)
        .select(
          'id, name, phone, email, pipeline_column_id, last_contact_at, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (pipelineColumnId) q = q.eq('pipeline_column_id', pipelineColumnId);
      const trimmed = search.trim();
      if (trimmed.length >= 2) {
        const escaped = trimmed.replace(/[%,]/g, '');
        q = q.or(
          `name.ilike.%${escaped}%,phone.ilike.%${escaped}%,email.ilike.%${escaped}%`
        );
      }

      const { data, error: e } = await q;
      if (cancelled) return;

      if (e) {
        setError(e.message);
        setContacts([]);
        setLoading(false);
        return;
      }
      setContacts(((data ?? []) as WkContactRow[]).map(rowToContact));
      setLoading(false);
    }

    void load();

    let pending: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        if (!cancelled) void load();
      }, 500);
    };

    const ch = supabase
      .channel(`caller-contacts-${pipelineColumnId ?? 'all'}-${search}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_contacts' },
        refresh
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (pending) clearTimeout(pending);
      try { void supabase.removeChannel(ch); } catch { /* ignore */ }
    };
  }, [pipelineColumnId, search, limit]);

  return { contacts, loading, error };
}
