import { useState, useMemo } from 'react';
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
import { useContactPersistence } from '../hooks/useContactPersistence';
import { supabase } from '@/integrations/supabase/client';
import type { Contact } from '../types';

interface SmsSendInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { sid?: string; error?: string } | null;
    error: { message: string } | null;
  }>;
}

type Filter = 'all' | 'sms' | 'calls' | 'voicemail' | 'missed';

export default function InboxPage() {
  const { contacts, patchContact, upsertContact, pushToast } = useSmsV2();
  const persist = useContactPersistence();
  const demoMode = useDemoMode();
  const [filter, setFilter] = useState<Filter>('all');
  const [activeContactId, setActiveContactId] = useState(contacts[0]?.id ?? '');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const { startCall } = useActiveCallCtx();

  const activeContact = contacts.find((c) => c.id === activeContactId) ?? contacts[0];
  const timeline = useContactTimeline(activeContact?.id ?? '', activeContact?.phone);

  // Real data only in production. Mock fallback restricted to ?demo=1.
  const contactSms = timeline.sms.length > 0
    ? timeline.sms
    : demoMode
      ? MOCK_SMS.filter((m) => m.contactId === activeContact?.id)
      : [];
  const contactActivity = timeline.activities.length > 0
    ? timeline.activities
    : demoMode
      ? MOCK_ACTIVITIES.filter((a) => a.contactId === activeContact?.id)
      : [];

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

  const setStage = (col: string) => {
    if (!activeContact) return;
    patchContact(activeContact.id, { pipelineColumnId: col });
    void persist.moveToColumn(activeContact.id, col);
  };

  const send = async () => {
    if (!reply.trim() || !activeContact || sending) return;
    setSending(true);
    try {
      const { data, error } = await (
        supabase.functions as unknown as SmsSendInvoke
      ).invoke('sms-send', {
        body: {
          to: activeContact.phone,
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
          {contacts.map((c) => {
            // No mock leak in production: list rows surface only real
            // history. The legacy mock fallback returns ONLY when ?demo=1
            // is in the URL.
            const lastCall = demoMode
              ? MOCK_CALLS.filter((cl) => cl.contactId === c.id).sort(
                  (a, b) => +new Date(b.startedAt) - +new Date(a.startedAt)
                )[0]
              : undefined;
            const lastSms = demoMode
              ? MOCK_SMS.filter((m) => m.contactId === c.id).sort(
                  (a, b) => +new Date(b.sentAt) - +new Date(a.sentAt)
                )[0]
              : undefined;
            return (
              <button
                key={c.id}
                onClick={() => setActiveContactId(c.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 hover:bg-[#F3F3EE]/50',
                  activeContactId === c.id && 'bg-[#ECFDF5]'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#1E9A80]/15 text-[#1E9A80] text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    {c.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1A1A1A] truncate flex items-center gap-1">
                      {c.name}
                      {lastCall?.status === 'missed' && (
                        <PhoneMissed className="w-3 h-3 text-[#EF4444] flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-[#6B7280] truncate">
                      {lastSms ? `💬 ${lastSms.body.slice(0, 32)}` : '—'}
                    </div>
                  </div>
                  {(lastCall || lastSms) && (
                    <div className="text-[10px] text-[#9CA3AF] tabular-nums">
                      {formatRelativeTime(
                        lastCall && lastSms
                          ? lastCall.startedAt > lastSms.sentAt
                            ? lastCall.startedAt
                            : lastSms.sentAt
                          : (lastCall?.startedAt ?? lastSms!.sentAt)
                      )}
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
          <button
            onClick={() => startCall(activeContact.id)}
            className="flex items-center gap-1.5 bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white text-[12px] font-semibold px-3 py-1.5 rounded-[10px] shadow-[0_4px_12px_rgba(30,154,128,0.35)]"
          >
            <Phone className="w-3.5 h-3.5" /> Call
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
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
