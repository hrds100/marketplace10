// Caller — useInboxThreads.
// Aggregates wk_sms_messages into per-contact threads (latest message
// per contact, with unread inbound count). Phase 4 skeleton: client-side
// rollup over the most recent 500 messages. Server-side aggregation
// (e.g. a wk_inbox_threads view) is a future optimisation.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ChannelKind } from './useContactMessages';

export interface InboxThread {
  contactId: string;
  contactName: string;
  contactPhone: string;
  lastBody: string;
  lastDirection: 'inbound' | 'outbound';
  lastChannel: ChannelKind;
  lastAt: string;
  unreadCount: number;
}

interface MessageRow {
  id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  created_at: string;
  channel: ChannelKind | null;
  read_at: string | null;
}

interface ContactJoin {
  id: string;
  name: string | null;
  phone: string | null;
}

export function useInboxThreads(limit = 500) {
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [contacts, setContacts] = useState<Map<string, ContactJoin>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: msgs, error: e } = await (supabase.from('wk_sms_messages' as any) as any)
        .select('id, contact_id, direction, body, created_at, channel, read_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cancelled) return;
      if (e) {
        setError(e.message);
        setRows([]);
        setLoading(false);
        return;
      }
      setRows((msgs ?? []) as MessageRow[]);

      const ids = Array.from(
        new Set(((msgs ?? []) as MessageRow[]).map((m) => m.contact_id))
      );
      if (ids.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: cs } = await (supabase.from('wk_contacts' as any) as any)
          .select('id, name, phone')
          .in('id', ids);
        if (cancelled) return;
        const m = new Map<string, ContactJoin>();
        for (const c of (cs ?? []) as ContactJoin[]) m.set(c.id, c);
        setContacts(m);
      }
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
      .channel(`caller-inbox-threads`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_sms_messages' },
        refresh
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (pending) clearTimeout(pending);
      try { void supabase.removeChannel(ch); } catch { /* ignore */ }
    };
  }, [limit]);

  const threads = useMemo<InboxThread[]>(() => {
    const byContact = new Map<string, MessageRow[]>();
    for (const m of rows) {
      const arr = byContact.get(m.contact_id) ?? [];
      arr.push(m);
      byContact.set(m.contact_id, arr);
    }
    const out: InboxThread[] = [];
    for (const [contactId, msgs] of byContact) {
      const sorted = [...msgs].sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
      );
      const latest = sorted[0];
      const unread = msgs.filter(
        (m) => m.direction === 'inbound' && !m.read_at
      ).length;
      const c = contacts.get(contactId);
      out.push({
        contactId,
        contactName: c?.name ?? c?.phone ?? 'Unknown',
        contactPhone: c?.phone ?? '',
        lastBody: latest.body || '',
        lastDirection: latest.direction,
        lastChannel: (latest.channel ?? 'sms') as ChannelKind,
        lastAt: latest.created_at,
        unreadCount: unread,
      });
    }
    return out.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [rows, contacts]);

  return { threads, loading, error };
}
