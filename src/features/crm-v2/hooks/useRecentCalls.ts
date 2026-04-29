// crm-v2 useRecentCalls — last 10 unique-contact calls for the agent.
//
// Source: wk_calls. Realtime subscription keeps it live.
// Joined client-side: contact name/phone, pipeline column for the
// "outcome" chip (wk_calls.disposition_column_id — yes,
// `disposition_column_id`, not pipeline_column_id; PR 155 paid for
// this lesson).

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { realtime } from '../data/realtime';
import type { CallRow } from '../data/types';

export interface RecentCall {
  id: string;
  contactId: string | null;
  name: string;
  phone: string;
  status: CallRow['status'];
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number;
  isActive: boolean;
  dispositionColumnId: string | null;
}

interface ContactLite {
  id: string;
  name: string | null;
  phone: string | null;
}

const ACTIVE_STATUSES = new Set<CallRow['status']>([
  'queued',
  'ringing',
  'in_progress',
]);

export function useRecentCalls(agentId: string | null): {
  rows: RecentCall[];
  loading: boolean;
  error: string | null;
} {
  const [rawRows, setRawRows] = useState<CallRow[]>([]);
  const [contacts, setContacts] = useState<Map<string, ContactLite>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) {
      setRawRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase.from('wk_calls' as any) as any)
        .select(
          'id, contact_id, campaign_id, agent_id, to_e164, status, started_at, ended_at, duration_sec, twilio_call_sid, agent_note, disposition_column_id'
        )
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false })
        .limit(30);
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setRawRows([]);
        setLoading(false);
        return;
      }
      setError(null);
      setRawRows((data ?? []) as CallRow[]);
      setLoading(false);
    };

    void load();
    const unsub = realtime.myCalls(agentId, () => void load());
    return () => {
      cancelled = true;
      unsub();
    };
  }, [agentId]);

  // Hydrate contact names / phones for visible rows.
  useEffect(() => {
    const ids = Array.from(
      new Set(rawRows.map((r) => r.contact_id).filter((v): v is string => !!v))
    );
    const missing = ids.filter((id) => !contacts.has(id));
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_contacts' as any) as any)
        .select('id, name, phone')
        .in('id', missing);
      if (cancelled || !data) return;
      setContacts((prev) => {
        const next = new Map(prev);
        for (const c of data as ContactLite[]) next.set(c.id, c);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [rawRows, contacts]);

  const rows = useMemo<RecentCall[]>(() => {
    // Dedupe by contact_id (latest first), keep up to 10 unique.
    const seen = new Set<string>();
    const out: RecentCall[] = [];
    for (const r of rawRows) {
      const key = r.contact_id ?? `__null_${r.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const c = r.contact_id ? contacts.get(r.contact_id) : undefined;
      out.push({
        id: r.id,
        contactId: r.contact_id,
        name: c?.name ?? 'Unknown contact',
        phone: c?.phone ?? r.to_e164 ?? '',
        status: r.status,
        startedAt: r.started_at,
        endedAt: r.ended_at,
        durationSec: r.duration_sec ?? 0,
        isActive: ACTIVE_STATUSES.has(r.status) && r.ended_at === null,
        dispositionColumnId: r.disposition_column_id,
      });
      if (out.length >= 10) break;
    }
    return out;
  }, [rawRows, contacts]);

  return { rows, loading, error };
}
