// useInboxThreads — list of conversations for the /crm inbox.
// PR 50 (Hugo 2026-04-27).
//
// Returns one row per contact who has at least one wk_sms_messages
// entry, summarising the latest message + direction + timestamp.
// Sorted by latest activity descending. Realtime-subscribed:
// any INSERT into wk_sms_messages re-runs the load.
//
// PR 119 (Hugo 2026-04-28): per-agent inbox isolation.
// Migration 20260430000018 (PR 52) deliberately opened up
// wk_sms_messages SELECT to any CRM-eligible role with the comment
// "per-contact filtering is done by the application — the sidebar
// shows contacts the user owns; admins see all". That app-side
// filter never landed, so logging in as an agent showed every
// other agent's inbox. We now do that filter here:
//   - Admins (hardcoded email OR profiles.workspace_role = 'admin')
//     keep the whole-workspace view.
//   - Agents see only contacts they own (wk_contacts.owner_agent_id)
//     OR are actively assigned to (wk_lead_assignments status
//     IN ('assigned','in_progress')) — the same predicate used by
//     the wk_contacts RLS policy.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Mirrors src/core/auth/useAuth.ts ADMIN_EMAILS and the SQL helper
// wk_is_admin() in migration 20260425000002. Keep in sync.
const ADMIN_EMAILS = ['admin@hub.nfstay.com', 'hugo@nfstay.com', 'chris@nfstay.com', 'elijah@mail.nfstay.com'];

export type ChannelKind = 'sms' | 'whatsapp' | 'email';

export interface InboxThread {
  contactId: string;
  contactName: string;
  contactPhone: string;
  /** 2026-07-07 (Hugo): the workspace number this thread came in on
   *  ("Via: 07868…"), derived from the latest message's to/from. Null
   *  when we can't resolve it (e.g. legacy rows without e164). */
  viaNumber: string | null;
  lastMessageBody: string;
  lastMessageAt: string;
  lastDirection: 'inbound' | 'outbound';
  /** PR 78: channel of the latest message. Used by inbox filter
   *  pills + thread-row icon. */
  lastChannel: ChannelKind;
  /** Per-channel count of messages on this thread (helps the agent
   *  see "this contact has 4 SMS + 1 WA + 2 email" at a glance). */
  channelCounts: Record<ChannelKind, number>;
  /** Inbound-only count of messages newer than the contact's
   *  last_read_at (not yet implemented — placeholder = 0). */
  unreadCount: number;
  /** 2026-07-07 (Hugo): calls appear in the inbox next to messages. When
   *  the latest activity on this thread is a call, lastKind='call' and
   *  lastMessageBody carries a label ("Missed call" / "Incoming call" /
   *  "Outgoing call"). */
  lastKind: 'message' | 'call';
  callCount: number;
  hasMissedCall: boolean;
  hasVoicemail: boolean;
}

interface MessageRow {
  id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  created_at: string;
  channel: ChannelKind | null;
  from_e164: string | null;
  to_e164: string | null;
}

interface ContactRow {
  id: string;
  name: string;
  phone: string;
}

interface CallRow {
  contact_id: string | null;
  direction: 'inbound' | 'outbound';
  status: string;
  from_e164: string | null;
  to_e164: string | null;
  started_at: string;
}

// Inbound call statuses that mean "not connected" → shown as a missed call.
const MISSED_CALL_STATUSES = new Set([
  'no_answer', 'busy', 'missed', 'failed', 'canceled', 'cancelled',
]);

export function useInboxThreads(): { threads: InboxThread[]; loading: boolean; refetch: () => void } {
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // PR 119: resolve current user + admin status before querying so
    // we can scope the inbox per-user. RLS on wk_sms_messages is open
    // to any CRM role (PR 52); ownership filtering is the app's job.
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id ?? null;
    const email = authData.user?.email ?? '';

    // seesAll: full shared inbox. Admins always; workers too (2026-07-07,
    // Hugo) — Shyra/Shanto work the shared ported Twilio lines, whose
    // inbound contacts are unowned, so a scoped allow-list would hide
    // every incoming message from them. Agents keep the scoped view
    // (owned/assigned only) — Hugo 2026-07-07: agents see only their
    // assigned numbers/inbox/pipeline, NOT everything.
    let seesAll = ADMIN_EMAILS.includes(email);
    if (!seesAll && uid) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase.from('profiles' as any) as any)
        .select('workspace_role')
        .eq('id', uid)
        .maybeSingle();
      const role = (profile as { workspace_role: string | null } | null)?.workspace_role;
      if (role === 'admin' || role === 'worker') {
        seesAll = true;
      }
    }

    // Build the contact-id allow-list for scoped roles (agents). Mirrors the
    // wk_contacts RLS predicate: owner OR active lead-assignment.
    let allowedContactIds: string[] | null = null;
    if (!seesAll && uid) {
      const [ownedRes, assignedRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_contacts' as any) as any)
          .select('id')
          .eq('owner_agent_id', uid),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_lead_assignments' as any) as any)
          .select('contact_id')
          .eq('agent_id', uid)
          .in('status', ['assigned', 'in_progress']),
      ]);
      const ids = new Set<string>();
      for (const r of (ownedRes.data ?? []) as Array<{ id: string }>) ids.add(r.id);
      for (const r of (assignedRes.data ?? []) as Array<{ contact_id: string }>) {
        ids.add(r.contact_id);
      }
      allowedContactIds = Array.from(ids);

      // Agent owns nothing → empty inbox. Skip the round-trip.
      if (allowedContactIds.length === 0) {
        setThreads([]);
        setLoading(false);
        return;
      }
    }

    // Strategy: pull the last 500 messages, group client-side. Then
    // fetch only the contacts referenced by those messages (not all
    // 17k+ contacts). This keeps the query small and fast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let msgsQuery = (supabase.from('wk_sms_messages' as any) as any)
      .select('id, contact_id, direction, body, created_at, channel, from_e164, to_e164')
      .order('created_at', { ascending: false })
      .limit(500);
    if (allowedContactIds !== null) {
      msgsQuery = msgsQuery.in('contact_id', allowedContactIds);
    }
    const msgsRes = await msgsQuery;
    const msgs = (msgsRes.data ?? []) as MessageRow[];

    // Pull recent calls too, so incoming / missed / outgoing calls thread
    // into the inbox next to messages (Hugo 2026-07-07). Only calls with a
    // contact_id (inbound calls are linked in wk-voice-twiml-incoming).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let callsQuery = (supabase.from('wk_calls' as any) as any)
      .select('contact_id, direction, status, from_e164, to_e164, started_at')
      .not('contact_id', 'is', null)
      .order('started_at', { ascending: false })
      .limit(500);
    if (allowedContactIds !== null) {
      callsQuery = callsQuery.in('contact_id', allowedContactIds);
    }
    const callsRes = await callsQuery;
    const calls = (callsRes.data ?? []) as CallRow[];

    // Collect unique contact IDs from messages AND calls, then fetch those.
    const neededIds = Array.from(new Set<string>([
      ...msgs.map((m) => m.contact_id),
      ...calls.map((c) => c.contact_id).filter((x): x is string => !!x),
    ]));
    const contactById = new Map<string, ContactRow>();
    if (neededIds.length > 0) {
      // Supabase .in() has a practical limit; batch in chunks of 200.
      for (let i = 0; i < neededIds.length; i += 200) {
        const chunk = neededIds.slice(i, i + 200);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('wk_contacts' as any) as any)
          .select('id, name, phone')
          .in('id', chunk);
        for (const c of (data ?? []) as ContactRow[]) {
          contactById.set(c.id, c);
        }
      }
    }

    // Per-contact channel counts (walk all 500 once).
    const counts = new Map<string, Record<ChannelKind, number>>();
    for (const m of msgs) {
      const cur = counts.get(m.contact_id) ?? { sms: 0, whatsapp: 0, email: 0 };
      const ch: ChannelKind = (m.channel ?? 'sms') as ChannelKind;
      cur[ch] = (cur[ch] ?? 0) + 1;
      counts.set(m.contact_id, cur);
    }

    // Latest message + latest call per contact, plus call flags for filters.
    const latestMsg = new Map<string, MessageRow>();
    for (const m of msgs) if (!latestMsg.has(m.contact_id)) latestMsg.set(m.contact_id, m);
    const latestCall = new Map<string, CallRow>();
    const callCount = new Map<string, number>();
    const hasMissed = new Set<string>();
    const hasVoicemail = new Set<string>();
    for (const c of calls) {
      const cid = c.contact_id as string;
      if (!latestCall.has(cid)) latestCall.set(cid, c);
      callCount.set(cid, (callCount.get(cid) ?? 0) + 1);
      if (c.direction === 'inbound' && MISSED_CALL_STATUSES.has(c.status)) hasMissed.add(cid);
      if (c.status === 'voicemail') hasVoicemail.add(cid);
    }
    const callLabel = (c: CallRow): string =>
      c.direction === 'outbound'
        ? 'Outgoing call'
        : MISSED_CALL_STATUSES.has(c.status)
          ? 'Missed call'
          : 'Incoming call';

    // One thread per contact; last activity = newer of latest message/call.
    const out: InboxThread[] = [];
    for (const cid of new Set<string>([...latestMsg.keys(), ...latestCall.keys()])) {
      const c = contactById.get(cid);
      const m = latestMsg.get(cid);
      const call = latestCall.get(cid);
      const mAt = m ? new Date(m.created_at).getTime() : -1;
      const cAt = call ? new Date(call.started_at).getTime() : -1;
      const useCall = !!call && cAt >= mAt;

      let phone = '', via: string | null = null, body = '', at = '';
      let dir: 'inbound' | 'outbound' = 'inbound';
      let channel: ChannelKind | null = null;
      let kind: 'message' | 'call' = 'message';
      if (useCall && call) {
        phone = c?.phone || (call.direction === 'inbound' ? call.from_e164 : call.to_e164) || '';
        via = (call.direction === 'inbound' ? call.to_e164 : call.from_e164) ?? null;
        body = callLabel(call); at = call.started_at; dir = call.direction; kind = 'call';
      } else if (m) {
        phone = c?.phone || (m.direction === 'inbound' ? m.from_e164 : m.to_e164) || '';
        via = (m.direction === 'inbound' ? m.to_e164 : m.from_e164) ?? null;
        body = m.body; at = m.created_at; dir = m.direction;
        channel = (m.channel ?? 'sms') as ChannelKind; kind = 'message';
      }
      out.push({
        contactId: cid,
        contactName: c?.name || c?.phone || phone || 'Unknown',
        contactPhone: phone,
        viaNumber: via,
        lastMessageBody: body,
        lastMessageAt: at,
        lastDirection: dir,
        lastChannel: channel,
        channelCounts: counts.get(cid) ?? { sms: 0, whatsapp: 0, email: 0 },
        unreadCount: 0,
        lastKind: kind,
        callCount: callCount.get(cid) ?? 0,
        hasMissedCall: hasMissed.has(cid),
        hasVoicemail: hasVoicemail.has(cid),
      });
    }
    // Newest activity first (ISO timestamps sort lexicographically).
    out.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
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
      // 2026-07-07: also refresh when a call is logged/updated so incoming
      // and missed calls surface in the inbox without a manual refresh.
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_calls' },
        () => { void load(); },
      )
      .subscribe();

    // PR 89 (Hugo 2026-04-27): "WhatsApp messages don't appear without
    // refresh." Realtime IS subscribed above, but in practice some
    // inserts (especially those done via service-role from edge fns or
    // pg_cron) can silently fail to push to the client. Belt-and-braces:
    // also poll every 30s. Cheap (one query, sub-100ms) and bounds the
    // worst-case staleness.
    const pollId = window.setInterval(() => { void load(); }, 30_000);

    // Re-fetch on tab focus too — when Hugo flips back to the tab after
    // chatting on WhatsApp, the inbox should be fresh by the time the
    // page paints.
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);

    return () => {
      try { void supabase.removeChannel(channel); } catch { /* ignore */ }
      window.clearInterval(pollId);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  return { threads, loading, refetch: load };
}
