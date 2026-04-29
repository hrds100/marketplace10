// InboxPage — message threads.
// Two-column: thread list (left) + selected thread + reply composer (right).
//
// Phase 5+ wires:
//   - Reply composer (channel-aware, with template picker)
//   - Unread-reset: marks inbound messages read_at=now on thread open
//   - Channel filter (sms / whatsapp / email)

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageSquare, Mail, Phone, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInboxThreads } from '../hooks/useInboxThreads';
import { useContactMessages } from '../hooks/useContactMessages';
import ReplyComposer from '../components/inbox/ReplyComposer';
import type { Channel } from '../hooks/useSendMessage';

type ChannelFilter = 'all' | Channel;

export default function InboxPage() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('contact');
  const [filter, setFilter] = useState<ChannelFilter>('all');
  const { threads, loading, error } = useInboxThreads(500);
  const { messages, loading: msgsLoading } = useContactMessages(selected);

  // Note: wk_sms_messages has no read_at column. Unread tracking +
  // mark-as-read on thread open ships in a future migration.

  const filteredThreads = useMemo(
    () =>
      filter === 'all' ? threads : threads.filter((t) => t.lastChannel === filter),
    [threads, filter]
  );

  const selectedThread = threads.find((t) => t.contactId === selected);

  const onSelect = (contactId: string) => {
    setParams({ contact: contactId });
  };

  return (
    <div className="p-6 max-w-[1300px] mx-auto h-full">
      <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">
            Inbox
          </h1>
          <p className="text-[12px] text-[#6B7280] mt-0.5">
            {filteredThreads.length} threads · realtime
          </p>
        </div>

        <div className="inline-flex rounded-[10px] border border-[#E5E7EB] overflow-hidden text-[11px]">
          {(['all', 'sms', 'whatsapp', 'email'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 capitalize',
                filter === f
                  ? 'bg-[#1E9A80] text-white'
                  : 'bg-white text-[#1A1A1A] hover:bg-[#F3F3EE]'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2 mb-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-y-auto">
          {loading && filteredThreads.length === 0 && (
            <div className="text-[12px] text-[#9CA3AF] italic py-8 text-center">
              Loading…
            </div>
          )}
          {!loading && filteredThreads.length === 0 && (
            <div className="text-[12px] text-[#9CA3AF] italic py-8 text-center">
              No threads.
            </div>
          )}
          <ul className="divide-y divide-[#E5E7EB]">
            {filteredThreads.map((t) => (
              <li key={t.contactId}>
                <button
                  type="button"
                  onClick={() => onSelect(t.contactId)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-[#F3F3EE]/40',
                    selected === t.contactId && 'bg-[#ECFDF5]'
                  )}
                >
                  <ChannelIcon channel={t.lastChannel} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-[#1A1A1A] truncate">
                        {t.contactName}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF] tabular-nums whitespace-nowrap">
                        {formatRel(t.lastAt)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6B7280] truncate">
                      {t.lastDirection === 'outbound' ? '↗ ' : '↙ '}
                      {t.lastBody || '—'}
                    </div>
                  </div>
                  {t.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#1E9A80] text-white text-[10px] font-bold tabular-nums">
                      {t.unreadCount}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl flex flex-col overflow-hidden">
          {!selected && (
            <div className="flex-1 flex items-center justify-center text-[12px] text-[#9CA3AF] italic">
              Pick a thread to view messages.
            </div>
          )}
          {selected && (
            <>
              <div className="px-4 py-2.5 border-b border-[#E5E7EB] flex items-center justify-between">
                <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
                  {selectedThread?.contactName ?? 'Thread'}
                </div>
                <Link
                  to={`/caller/contacts/${selected}`}
                  className="text-[11px] font-semibold text-[#1E9A80] hover:underline inline-flex items-center gap-1"
                >
                  Open contact <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <ul className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {msgsLoading && messages.length === 0 && (
                  <li className="text-[12px] text-[#9CA3AF] italic">Loading…</li>
                )}
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={cn(
                      'max-w-[80%] text-[13px] px-3 py-2 rounded-[10px]',
                      m.direction === 'inbound'
                        ? 'bg-[#F3F3EE] text-[#1A1A1A] mr-auto'
                        : 'bg-[#ECFDF5] text-[#065F46] ml-auto'
                    )}
                  >
                    <div className="text-[10px] uppercase tracking-wide opacity-60 mb-0.5">
                      {m.direction} · {m.channel} · {formatRel(m.createdAt)}
                    </div>
                    {m.subject && (
                      <div className="text-[11px] font-semibold mb-0.5">
                        {m.subject}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  </li>
                ))}
              </ul>
              <ReplyComposer
                contactId={selected}
                contactName={selectedThread?.contactName}
                defaultChannel={selectedThread?.lastChannel ?? 'sms'}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelIcon({ channel }: { channel: Channel }) {
  if (channel === 'email')
    return <Mail className="w-3.5 h-3.5 text-[#3B82F6] mt-0.5" />;
  if (channel === 'whatsapp')
    return <MessageSquare className="w-3.5 h-3.5 text-[#25D366] mt-0.5" />;
  return <Phone className="w-3.5 h-3.5 text-[#1E9A80] mt-0.5" />;
}

function formatRel(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}
