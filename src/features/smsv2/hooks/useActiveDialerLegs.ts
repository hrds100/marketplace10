// useActiveDialerLegs — what's ringing right now for THIS agent.
//
// PR 24 (Hugo 2026-04-27): the parallel-dial board was rendering
// hardcoded MOCK_DIALER_LEGS. Now we read live wk_calls rows for
// the signed-in agent in the in-flight statuses (queued / ringing /
// in_progress) and show them. Realtime subscription on wk_calls so
// the board updates as Twilio fires status callbacks.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DialerLegStatus =
  | 'queued'
  | 'ringing'
  | 'in_progress'
  | 'completed'
  | 'busy'
  | 'no_answer'
  | 'failed'
  | 'canceled'
  | 'missed'
  | 'voicemail';

export interface DialerLeg {
  id: string;
  contactId: string | null;
  contactName: string;
  phone: string;
  status: DialerLegStatus;
  startedAt: number;
  twilioSid: string | null;
}

interface CallRow {
  id: string;
  contact_id: string | null;
  to_e164: string | null;
  status: string;
  started_at: string | null;
  twilio_call_sid: string | null;
}

interface ContactRow {
  id: string;
  name: string;
  phone: string;
}

/** Statuses that count as "still in flight" — the board shows these.
 *  Once a call resolves (completed / failed / etc) it drops off. */
const ACTIVE_STATUSES = new Set<string>([
  'queued',
  'ringing',
  'in_progress',
]);

interface SupaTable<T> {
  from: (t: string) => {
    select: (c: string) => {
      eq: (c: string, v: string) => {
        in?: (c: string, vs: string[]) => Promise<{
          data: T[] | null;
          error: { message: string } | null;
        }>;
        order?: (
          col: string,
          opts: { ascending: boolean }
        ) => Promise<{ data: T[] | null; error: { message: string } | null }>;
      };
    };
  };
  channel: (name: string) => {
    on: (
      ev: string,
      filter: { event: string; schema: string; table: string; filter?: string },
      cb: (payload: unknown) => void
    ) => { subscribe: () => unknown };
  };
  removeChannel: (c: unknown) => void;
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
}

export function useActiveDialerLegs(): { legs: DialerLeg[]; loading: boolean } {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [contactsById, setContactsById] = useState<Map<string, ContactRow>>(new Map());
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Resolve agent id once.
  useEffect(() => {
    (async () => {
      const client = supabase as unknown as SupaTable<unknown>;
      const { data } = await client.auth.getUser();
      setAgentId(data.user?.id ?? null);
    })();
  }, []);

  // Initial fetch + realtime subscription on wk_calls for this agent.
  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    const client = supabase as unknown as SupaTable<CallRow>;

    const reload = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_calls' as any) as any)
        .select('id, contact_id, to_e164, status, started_at, twilio_call_sid')
        .eq('agent_id', agentId)
        .in('status', Array.from(ACTIVE_STATUSES))
        .order('started_at', { ascending: false });
      if (cancelled) return;
      const rows = (data ?? []) as CallRow[];
      setCalls(rows);
      setLoading(false);
    };

    void reload();

    const channel = client
      .channel(`dialer-legs:${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wk_calls',
          filter: `agent_id=eq.${agentId}`,
        },
        () => {
          if (!cancelled) void reload();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      try {
        client.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }, [agentId]);

  // Resolve contact names for the active calls (parallel SELECT). Cache
  // by id so subsequent reloads don't re-fetch unchanged contacts.
  useEffect(() => {
    const ids = Array.from(
      new Set(calls.map((c) => c.contact_id).filter((v): v is string => !!v))
    );
    const missing = ids.filter((id) => !contactsById.has(id));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_contacts' as any) as any)
        .select('id, name, phone')
        .in('id', missing);
      if (cancelled || !data) return;
      setContactsById((prev) => {
        const next = new Map(prev);
        for (const row of data as ContactRow[]) next.set(row.id, row);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [calls, contactsById]);

  const legs = useMemo<DialerLeg[]>(() => {
    return calls
      .filter((c) => ACTIVE_STATUSES.has(c.status))
      .map((c) => {
        const contact = c.contact_id ? contactsById.get(c.contact_id) : undefined;
        return {
          id: c.id,
          contactId: c.contact_id,
          contactName: contact?.name ?? 'Unknown',
          phone: contact?.phone ?? c.to_e164 ?? '',
          status: c.status as DialerLegStatus,
          startedAt: c.started_at ? new Date(c.started_at).getTime() : Date.now(),
          twilioSid: c.twilio_call_sid,
        };
      });
  }, [calls, contactsById]);

  return { legs, loading };
}
