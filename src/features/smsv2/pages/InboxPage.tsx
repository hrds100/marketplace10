import { useState, useMemo, useEffect, useRef } from 'react';
import {
  MessageSquare,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Voicemail,
  Search,
  Phone,
  Play,
  Pencil,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_SMS, MOCK_CALLS, MOCK_ACTIVITIES } from '../data/mockCalls';
import { useDemoMode } from '../lib/useDemoMode';
import { formatRelativeTime, formatTimeOnly, formatDuration } from '../data/helpers';
import { useActiveCallCtx } from '../components/live-call/ActiveCallContext';
import StageSelector from '../components/shared/StageSelector';
import EditContactModal from '../components/contacts/EditContactModal';
import { useSmsV2 } from '../store/SmsV2Store';
import { useContactTimeline } from '../hooks/useContactTimeline';
import { useContactMessages } from '../hooks/useContactMessages';
import { useInboxThreads } from '../hooks/useInboxThreads';
import { useContactPersistence } from '../hooks/useContactPersistence';
import { supabase } from '@/integrations/supabase/client';
import type { Contact } from '../types';

interface SmsSendInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    // wk-sms-send returns { message_id, twilio_sid, status } on success
    // or { error } on failure. Older sms-send shape kept for compatibility.
    data: {
      message_id?: string;
      twilio_sid?: string;
      sid?: string;
      status?: string;
      error?: string;
    } | null;
    error: { message: string } | null;
  }>;
}

type Filter = 'all' | 'sms' | 'calls' | 'voicemail' | 'missed';

export default function InboxPage() {
  const { contacts, patchContact, upsertContact, pushToast } = useSmsV2();
  const persist = useContactPersistence();
  const demoMode = useDemoMode();
  const [filter, setFilter] = useState<Filter>('all');
  const [activeContactId, setActiveContactId] = useState<string>('');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const { startCall, openCallRoom } = useActiveCallCtx();
  const threadScrollRef = useRef<HTMLDivElement>(null);

  // PR 52 (war room, Hugo 2026-04-27): the sidebar is now driven by
  // useInboxThreads (latest message per contact, ordered desc) merged
  // with any contact in the local store that doesn't have messages
  // yet. Old behaviour iterated `contacts` which excluded inbound
  // contacts whose wk_contacts row hadn't propagated yet AND ordered
  // by hydration order, not message recency.
  const { threads: inboxThreads } = useInboxThreads();

  // Build the sidebar list — threads first (newest message at top),
  // then contacts that have NO messages yet (so the agent can still
  // start a new conversation from the sidebar).
  const sidebarRows = useMemo(() => {
    const contactById = new Map(contacts.map((c) => [c.id, c] as const));
    type Row = {
      id: string;
      name: string;
      phone: string;
      pipelineColumnId: string | undefined;
      lastMessageBody: string | null;
      lastMessageAt: string | null;
      lastDirection: 'inbound' | 'outbound' | null;
      isHot: boolean;
      tags: string[];
    };
    const out: Row[] = [];
    const seen = new Set<string>();

    // Threads (already ordered newest first by useInboxThreads).
    for (const t of inboxThreads) {
      const c = contactById.get(t.contactId);
      out.push({
        id: t.contactId,
        name: c?.name ?? t.contactName,
        phone: c?.phone ?? t.contactPhone,
        pipelineColumnId: c?.pipelineColumnId,
        lastMessageBody: t.lastMessageBody,
        lastMessageAt: t.lastMessageAt,
        lastDirection: t.lastDirection,
        isHot: !!c?.isHot,
        tags: c?.tags ?? [],
      });
      seen.add(t.contactId);
    }

    // Contacts with NO messages yet.
    for (const c of contacts) {
      if (seen.has(c.id)) continue;
      out.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        pipelineColumnId: c.pipelineColumnId,
        lastMessageBody: null,
        lastMessageAt: c.lastContactAt ?? null,
        lastDirection: null,
        isHot: c.isHot,
        tags: c.tags,
      });
    }

    return out;
  }, [inboxThreads, contacts]);

  // Auto-select the newest thread on first load (Hugo's spec: newest
  // conversation must be visible without scrolling).
  useEffect(() => {
    if (!activeContactId && sidebarRows.length > 0) {
      setActiveContactId(sidebarRows[0].id);
    }
    // If the currently-selected contact disappeared from the list
    // entirely, fall back to the newest.
    if (activeContactId && !sidebarRows.some((r) => r.id === activeContactId) && sidebarRows.length > 0) {
      setActiveContactId(sidebarRows[0].id);
    }
  }, [sidebarRows, activeContactId]);

  // Resolve activeContact from the store first (full Contact shape
  // for stage selector / edit modal) — fall back to a synthesized
  // shim from the sidebar row when the store hasn't hydrated yet.
  const activeRow = sidebarRows.find((r) => r.id === activeContactId);
  const activeContact: Contact | undefined =
    contacts.find((c) => c.id === activeContactId) ??
    (activeRow ? {
      id: activeRow.id,
      name: activeRow.name,
      phone: activeRow.phone,
      tags: activeRow.tags,
      isHot: activeRow.isHot,
      customFields: {},
      createdAt: new Date().toISOString(),
      pipelineColumnId: activeRow.pipelineColumnId,
    } : undefined);
  const timeline = useContactTimeline(activeContact?.id ?? '', activeContact?.phone);
  // PR 50 (Hugo 2026-04-27): SMS source is wk_sms_messages now.
  // useContactTimeline still loads the legacy sms_messages rows for
  // backward compatibility (so any historical conversations from the
  // old /sms inbox remain visible), but the canonical CRM source
  // going forward is the realtime-subscribed useContactMessages.
  const { messages: crmMessages } = useContactMessages(activeContact?.id ?? '');

  // Convert wk_sms_messages → SmsMessage shape so the existing
  // thread renderer doesn't have to change.
  const crmSms = useMemo(() => crmMessages.map((m) => ({
    id: m.id,
    contactId: m.contactId,
    direction: m.direction,
    body: m.body,
    sentAt: m.createdAt,
  })), [crmMessages]);

  // Real data only in production. Mock fallback restricted to ?demo=1.
  // CRM messages are the primary source; legacy timeline SMS shown
  // only when CRM messages are empty so historical /sms threads
  // don't disappear.
  const contactSms = crmSms.length > 0
    ? crmSms
    : timeline.sms.length > 0
      ? timeline.sms
      : demoMode
        ? MOCK_SMS.filter((m) => m.contactId === activeContact?.id)
        : [];
  const contactActivity = timeline.activities.length > 0
    ? timeline.activities
    : demoMode
      ? MOCK_ACTIVITIES.filter((a) => a.contactId === activeContact?.id)
      : [];

  // Auto-scroll the thread to the bottom (newest message visible)
  // whenever new content arrives or the agent switches contacts.
  // PR 52 war-room: Hugo's spec — "The newest message is visible
  // without scrolling."
  // We deliberately scroll instantly (not smooth) on contact switch
  // and smoothly when a new message lands while the same contact is
  // open. Using setTimeout(0) so the DOM has flushed before we
  // measure scrollHeight.
  // (Hook depends on contactSms below, so declared after that block.)

  // Sort the unified thread by timestamp so SMS interleave with calls if present
  const threadItems = useMemo(() => {
    const items = contactSms.map((m) => ({
      kind: 'sms' as const,
      ts: m.sentAt,
      payload: m,
    }));
    // Add call entries from timeline so the bubble list shows both
    for (const c of timeline.calls) {
      items.push({ kind: 'call' as const, ts: c.startedAt, payload: c });
    }
    items.sort((a, b) => +new Date(a.ts) - +new Date(b.ts));
    return items;
  }, [contactSms, timeline.calls]);

  // Auto-scroll on thread change OR new message append.
  useEffect(() => {
    const el = threadScrollRef.current;
    if (!el) return;
    // Use rAF + setTimeout to wait for layout flush before measuring.
    const id = setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 0);
    return () => clearTimeout(id);
  }, [activeContactId, threadItems.length]);

  const setStage = (col: string) => {
    if (!activeContact) return;
    patchContact(activeContact.id, { pipelineColumnId: col });
    void persist.moveToColumn(activeContact.id, col);
  };

  const send = async () => {
    if (!reply.trim() || !activeContact || sending) return;
    setSending(true);
    try {
      // PR 50 (Hugo 2026-04-27): outbound SMS now goes through
      // wk-sms-send, which writes to wk_sms_messages so the message
      // appears in the thread immediately via realtime subscription.
      // The legacy sms-send wrote to sms_messages and bypassed the
      // /crm inbox entirely.
      const { data, error } = await (
        supabase.functions as unknown as SmsSendInvoke
      ).invoke('wk-sms-send', {
        body: {
          contact_id: activeContact.id,
          body: reply.trim(),
        },
      });
      if (error || data?.error) {
        pushToast(`SMS send failed: ${error?.message ?? data?.error ?? 'unknown'}`, 'error');
      } else {
        pushToast('SMS sent', 'success');
        setReply('');
      }
    } catch (e) {
      pushToast(`SMS send crashed: ${e instanceof Error ? e.message : 'unknown'}`, 'error');
    } finally {
      setSending(false);
    }
  };

  if (!activeContact) {
    return (
      <div className="p-12 text-center text-[14px] text-[#9CA3AF] italic">
        No contacts yet. Import a CSV or add one in Contacts.
      </div>
    );
  }

  return (
    <>
    <div className="h-full flex">
      {/* Pane 1 — list */}
      <aside className="w-[280px] bg-white border-r border-[#E5E7EB] flex flex-col">
        <div className="px-3 py-2.5 border-b border-[#E5E7EB] space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              placeholder="Search inbox…"
              className="w-full pl-7 pr-2 py-1.5 text-[12px] bg-[#F3F3EE] border-0 rounded-[10px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'sms', 'calls', 'voicemail', 'missed'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors uppercase tracking-wide',
                  filter === f
                    ? 'bg-[#1E9A80] text-white'
                    : 'bg-[#F3F3EE] text-[#6B7280] hover:bg-black/[0.05]'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB]">
          {/* PR 52 war-room: sidebarRows is the union of (a) thread
              rows ordered newest-first by latest wk_sms_messages,
              and (b) contacts with no messages yet. Newest message
              ALWAYS sits at the top — Hugo's spec. */}
          {sidebarRows.map((r) => {
            const initials = (r.name || r.phone)
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2);
            return (
              <button
                key={r.id}
                data-testid={`inbox-row-${r.id}`}
                onClick={() => setActiveContactId(r.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 hover:bg-[#F3F3EE]/50',
                  activeContactId === r.id && 'bg-[#ECFDF5]'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#1E9A80]/15 text-[#1E9A80] text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1A1A1A] truncate flex items-center gap-1">
                      {r.name}
                    </div>
                    <div className="text-[11px] text-[#6B7280] truncate">
                      {r.lastMessageBody
                        ? `${r.lastDirection === 'outbound' ? '↗' : '💬'} ${r.lastMessageBody.slice(0, 40)}`
                        : '—'}
                    </div>
                  </div>
                  {r.lastMessageAt && (
                    <div className="text-[10px] text-[#9CA3AF] tabular-nums">
                      {formatRelativeTime(r.lastMessageAt)}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Pane 2 — thread */}
      <section className="flex-1 bg-[#F3F3EE]/30 flex flex-col min-w-0">
        <div className="px-5 py-3 bg-white border-b border-[#E5E7EB] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1E9A80]/15 text-[#1E9A80] text-[13px] font-bold flex items-center justify-center">
            {activeContact.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-[#1A1A1A]">
              {activeContact.name}
            </div>
            <div className="text-[11px] text-[#6B7280] tabular-nums">
              {activeContact.phone}
            </div>
          </div>
          {/* Stage selector — change stage from inbox */}
          <StageSelector
            value={activeContact.pipelineColumnId}
            onChange={setStage}
            size="md"
          />
          <button
            onClick={() => setEditing(activeContact)}
            className="flex items-center gap-1.5 border border-[#E5E7EB] text-[#1A1A1A] text-[12px] font-medium px-3 py-1.5 rounded-[10px] hover:bg-[#F3F3EE]"
            title="Edit lead"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          {/* Two-button stack: tiny "Call room" link above, primary
              "Call" button below. Hugo 2026-04-26 (PR 10): the agent
              wants to be able to OPEN the call-room layout (script +
              coach + glossary + SMS sender) for a lead without
              dialling — just to look at context. The room itself has a
              "Call now" button if they decide to dial after all. */}
          <div className="flex flex-col items-end gap-0.5">
            <button
              onClick={() => openCallRoom(activeContact.id)}
              className="text-[10px] text-[#1E9A80] hover:text-[#1E9A80]/80 font-medium underline-offset-2 hover:underline"
              title="Open the call room without dialling"
            >
              Open call room
            </button>
            <button
              onClick={() => startCall(activeContact.id)}
              className="flex items-center gap-1.5 bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white text-[12px] font-semibold px-3 py-1.5 rounded-[10px] shadow-[0_4px_12px_rgba(30,154,128,0.35)]"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </button>
          </div>
        </div>

        <div ref={threadScrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-2" data-testid="inbox-thread-scroll">
          {threadItems.map((item) => {
            if (item.kind === 'sms') {
              const m = item.payload;
              return (
                <div
                  key={`sms-${m.id}`}
                  className={cn(
                    'rounded-2xl px-3 py-2 max-w-[60%] text-[13px] leading-snug',
                    m.direction === 'outbound'
                      ? 'bg-[#1E9A80]/15 text-[#1A1A1A] ml-auto'
                      : 'bg-white border border-[#E5E7EB] text-[#1A1A1A]'
                  )}
                >
                  {m.body}
                  <div className="text-[10px] text-[#9CA3AF] mt-0.5 tabular-nums">
                    {formatTimeOnly(m.sentAt)}
                  </div>
                </div>
              );
            }
            const c = item.payload;
            return (
              <div
                key={`call-${c.id}`}
                className="rounded-2xl px-3 py-2 max-w-[60%] mx-auto bg-white border border-[#E5E7EB] text-[#1A1A1A] text-[12px]"
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {c.direction === 'outbound' ? (
                    <PhoneOutgoing className="w-3 h-3 text-[#3B82F6]" />
                  ) : (
                    <PhoneIncoming className="w-3 h-3 text-[#1E9A80]" />
                  )}
                  {c.direction} call · {c.status}
                  {c.durationSec > 0 && ` · ${formatDuration(c.durationSec)}`}
                </div>
                {c.aiSummary && (
                  <div className="text-[11px] text-[#6B7280] italic mt-1">
                    "{c.aiSummary}"
                  </div>
                )}
                <div className="text-[10px] text-[#9CA3AF] mt-1 tabular-nums">
                  {formatTimeOnly(c.startedAt)}
                </div>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="px-5 py-3 bg-white border-t border-[#E5E7EB] flex gap-2"
        >
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type a reply…"
            disabled={sending}
            className="flex-1 px-3 py-2 text-[13px] bg-[#F3F3EE] border-0 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#1E9A80]/30 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!reply.trim() || sending}
            className="flex items-center gap-1.5 bg-[#1E9A80] text-white text-[13px] font-semibold px-4 rounded-[10px] hover:bg-[#1E9A80]/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </section>

      {/* Pane 3 — timeline */}
      <aside className="w-[320px] bg-white border-l border-[#E5E7EB] flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#E5E7EB]">
          <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
            Contact timeline
          </div>
          <div className="text-[14px] font-semibold text-[#1A1A1A] mt-0.5">
            {activeContact.name}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {contactActivity.map((a) => (
            <div key={a.id} className="flex gap-2.5 text-[12px]">
              <ActivityIcon kind={a.kind} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#1A1A1A]">{a.title}</div>
                {a.body && (
                  <div className="text-[11px] text-[#6B7280] truncate">{a.body}</div>
                )}
                <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                  {formatRelativeTime(a.ts)}
                </div>
                {a.kind === 'call_inbound' && (
                  <button className="mt-1 text-[10px] flex items-center gap-1 text-[#1E9A80] hover:underline">
                    <Play className="w-3 h-3" /> Play recording (4:21)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
    <EditContactModal
      contact={editing}
      onClose={() => setEditing(null)}
      onSave={(updated) => upsertContact(updated)}
    />
    </>
  );
}

function ActivityIcon({ kind }: { kind: string }) {
  const map: Record<string, { icon: React.ReactNode; bg: string; fg: string }> = {
    call_inbound: {
      icon: <PhoneIncoming className="w-3.5 h-3.5" />,
      bg: '#ECFDF5',
      fg: '#1E9A80',
    },
    call_outbound: {
      icon: <PhoneOutgoing className="w-3.5 h-3.5" />,
      bg: '#DBEAFE',
      fg: '#3B82F6',
    },
    call_missed: {
      icon: <PhoneMissed className="w-3.5 h-3.5" />,
      bg: '#FEF2F2',
      fg: '#EF4444',
    },
    sms_inbound: {
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      bg: '#F3F3EE',
      fg: '#6B7280',
    },
    sms_outbound: {
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      bg: '#ECFDF5',
      fg: '#1E9A80',
    },
    voicemail: {
      icon: <Voicemail className="w-3.5 h-3.5" />,
      bg: '#F3F3EE',
      fg: '#9CA3AF',
    },
    stage_moved: { icon: <span>↗</span>, bg: '#ECFDF5', fg: '#1E9A80' },
    tag_added: { icon: <span>#</span>, bg: '#F3F3EE', fg: '#6B7280' },
  };
  const m = map[kind] ?? map.sms_inbound;
  return (
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: m.bg, color: m.fg }}
    >
      {m.icon}
    </div>
  );
}

// satisfy unused-import lint when build pruning occurs
void formatDuration;
