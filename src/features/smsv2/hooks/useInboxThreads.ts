// useInboxThreads — list of conversations for the /crm inbox.
// PR 50 (Hugo 2026-04-27).
//
// Returns one row per contact who has at least one wk_sms_messages
// entry, summarising the latest message + direction + timestamp.
// Sorted by latest activity descending. Realtime-subscribed:
// any INSERT into wk_sms_messages re-runs the load.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InboxThread {
  contactId: string;
  contactName: string;
  contactPhone: string;
  lastMessageBody: string;
  lastMessageAt: string;
  lastDirection: 'inbound' | 'outbound';
  /** Inbound-only count of messages newer than the contact's
   *  last_read_at (not yet implemented — placeholder = 0). */
  unreadCount: number;
}

interface MessageRow {
  id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  created_at: string;
}

interface ContactRow {
  id: string;
  name: string;
  phone: string;
}

export function useInboxThreads(): { threads: InboxThread[]; loading: boolean; refetch: () => void } {
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Strategy: pull the last 500 messages, group client-side. Cheap
    // for typical CRM volume (under a few thousand messages/day) and
    // doesn't require a server-side window function. If volume grows,
    // swap to a SQL function returning latest-per-contact directly.
    const [msgsRes, contactsRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('wk_sms_messages' as any) as any)
        .select('id, contact_id, direction, body, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('wk_contacts' as any) as any)
        .select('id, name, phone'),
    ]);

    const msgs = (msgsRes.data ?? []) as MessageRow[];
    const contacts = (contactsRes.data ?? []) as ContactRow[];
    const contactById = new Map<string, ContactRow>();
    for (const c of contacts) contactById.set(c.id, c);

    // Walk newest → oldest, take the first message we see per contact.
    const seen = new Set<string>();
    const out: InboxThread[] = [];
    for (const m of msgs) {
      if (seen.has(m.contact_id)) continue;
      seen.add(m.contact_id);
      const c = contactById.get(m.contact_id);
      out.push({
        contactId: m.contact_id,
        contactName: c?.name ?? 'Unknown',
        contactPhone: c?.phone ?? '',
        lastMessageBody: m.body,
        lastMessageAt: m.created_at,
        lastDirection: m.direction,
        unreadCount: 0,
      });
    }
    setThreads(out);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();

    const channel = supabase
      .channel('wk_sms_messages-inbox')
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'wk_sms_messages' },
        () => { void load(); },
      )
      .subscribe();

    return () => {
      try { void supabase.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [load]);

  return { threads, loading, refetch: load };
}
