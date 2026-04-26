import { useState } from 'react';
import {
  MicOff,
  Pause,
  PhoneForwarded,
  StickyNote,
  PhoneOff,
  Minimize2,
  Flame,
  PhoneIncoming,
  PhoneOutgoing,
  Tag,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveCallCtx } from './ActiveCallContext';
import LiveTranscriptPane from './LiveTranscriptPane';
import PostCallPanel from './PostCallPanel';
import StageSelector from '../shared/StageSelector';
import EditContactModal from '../contacts/EditContactModal';
import type { Contact } from '../../types';
import { useSmsV2 } from '../../store/SmsV2Store';
import { MOCK_SMS, MOCK_CALLS, MOCK_ACTIVITIES } from '../../data/mockCalls';
import { useCurrentAgent } from '../../hooks/useCurrentAgent';
import {
  formatDuration,
  formatPence,
  formatTimeOnly,
  formatRelativeTime,
} from '../../data/helpers';

export default function LiveCallScreen() {
  const { phase, call, durationSec, endCall, setFullScreen } = useActiveCallCtx();
  const store = useSmsV2();
  const { agent: me, firstName: myFirstName, talkRatioPercent } = useCurrentAgent();
  const [editing, setEditing] = useState<Contact | null>(null);

  // Resolve a contact for context — fall back to first contact if direct dial
  const contact =
    store.contacts.find((c) => c.id === call?.contactId) ?? store.contacts[0];

  const sms = MOCK_SMS.filter((s) => s.contactId === contact.id);
  const calls = MOCK_CALLS.filter((c) => c.contactId === contact.id);
  const activities = MOCK_ACTIVITIES.filter((a) => a.contactId === contact.id);

  const stage = store.columns.find((c) => c.id === contact.pipelineColumnId);

  return (
    <div className="fixed inset-0 z-[200] bg-[#F3F3EE] flex flex-col">
      {/* Top bar */}
      <header
        className={cn(
          'h-14 flex items-center px-5 gap-3 flex-shrink-0',
          phase === 'in_call' ? 'bg-[#1E9A80] text-white' : 'bg-white border-b border-[#E5E7EB]'
        )}
      >
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            phase === 'in_call' ? 'bg-white animate-pulse' : 'bg-[#1E9A80]'
          )}
        />
        <span className="text-[14px] font-semibold">
          {phase === 'in_call' ? 'In call' : 'Call ended'} · {call?.contactName}
          {phase === 'in_call' && (
            <span className="ml-2 tabular-nums opacity-90">{formatDuration(durationSec)}</span>
          )}
        </span>

        {phase === 'in_call' && (
          <div className="ml-6 flex items-center gap-1">
            <TopBtn icon={<MicOff className="w-4 h-4" />} label="Mute" />
            <TopBtn icon={<Pause className="w-4 h-4" />} label="Hold" />
            <TopBtn icon={<PhoneForwarded className="w-4 h-4" />} label="Transfer" />
            <TopBtn icon={<StickyNote className="w-4 h-4" />} label="Note" />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Agent today stats */}
          <div
            className={cn(
              'hidden md:flex items-center gap-3 text-[11px] px-3 py-1 rounded-full',
              phase === 'in_call'
                ? 'bg-white/15 text-white'
                : 'bg-[#F3F3EE] border border-[#E5E7EB] text-[#6B7280]'
            )}
          >
            <span>
              Talk{' '}
              <span className="font-semibold tabular-nums">{talkRatioPercent}%</span>
            </span>
            <span className="opacity-50">·</span>
            <span>
              Calls{' '}
              <span className="font-semibold tabular-nums">{me?.callsToday ?? 0}</span>
            </span>
            <span className="opacity-50">·</span>
            <span>
              Spend{' '}
              <span className="font-semibold tabular-nums">
                {formatPence(me?.spendPence ?? 0)}
              </span>
            </span>
          </div>

          {phase === 'in_call' && (
            <button
              onClick={endCall}
              className="flex items-center gap-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white px-3 py-1.5 rounded-[10px] text-[12px] font-semibold"
            >
              <PhoneOff className="w-3.5 h-3.5" /> End call
            </button>
          )}

          <button
            onClick={() => setFullScreen(false)}
            className={cn(
              'p-1.5 rounded-lg',
              phase === 'in_call' ? 'hover:bg-white/15' : 'hover:bg-black/[0.04]'
            )}
            title="Minimise (call continues)"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3-column body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — lead context */}
        <aside className="w-[320px] bg-white border-r border-[#E5E7EB] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <div className="text-[16px] font-bold text-[#1A1A1A]">{contact.name}</div>
              {contact.isHot && (
                <span
                  className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: '#FEF2F2', color: '#EF4444' }}
                >
                  <Flame className="w-3 h-3" /> HOT
                </span>
              )}
              <button
                onClick={() => setEditing(contact)}
                className="ml-auto p-1 rounded hover:bg-[#F3F3EE] text-[#6B7280] hover:text-[#1A1A1A]"
                title="Edit lead"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[12px] text-[#6B7280] tabular-nums mt-0.5">{contact.phone}</div>
            <div className="text-[11px] text-[#9CA3AF] mt-0.5">
              Added {formatRelativeTime(contact.createdAt)}
            </div>
            <div className="mt-2">
              <StageSelector
                value={contact.pipelineColumnId}
                onChange={(col) => store.patchContact(contact.id, { pipelineColumnId: col })}
                size="sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-[12px]">
            <KV label="Pipeline" value={stage?.name ?? '—'} colour={stage?.colour} />
            <KV
              label="Last contact"
              value={contact.lastContactAt ? formatRelativeTime(contact.lastContactAt) : 'Never'}
            />
            <KV
              label="Tags"
              value={
                <div className="flex gap-1 flex-wrap">
                  {contact.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-medium bg-[#F3F3EE] text-[#6B7280] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
                    >
                      <Tag className="w-2.5 h-2.5" /> {t}
                    </span>
                  ))}
                </div>
              }
            />
            {contact.dealValuePence && (
              <KV
                label="Deal value"
                value={
                  <span className="font-semibold text-[#1E9A80] tabular-nums">
                    {formatPence(contact.dealValuePence)}
                  </span>
                }
              />
            )}

            {Object.entries(contact.customFields).map(([k, v]) => (
              <KV key={k} label={k} value={v} />
            ))}

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] mb-1.5">
                Notes (sticky)
              </div>
              <div className="bg-[#FEF7E6] border border-[#FDE68A] rounded-lg p-2 text-[12px] text-[#1A1A1A] leading-snug">
                Asked about deposit handling on the previous call. Wants written breakdown
                comparing Rightmove gross.
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] mb-1.5">
                Call script
              </div>
              <div className="bg-[#F3F3EE] rounded-lg p-2 text-[12px] text-[#1A1A1A] leading-snug">
                Hi {contact.name.split(' ')[0]}, this is {myFirstName || 'me'} from
                NFSTAY. I noticed you signed up for our landlord guide — got a few minutes?
              </div>
            </div>
          </div>
        </aside>

        {/* Centre — transcript + coach during dial/in-call, post-call panel
            after hangup. We mount LiveTranscriptPane the moment callId is
            known (during 'placing'), not just on 'in_call', so we don't miss
            the first transcript chunks Twilio fires before bridge-accept. */}
        <section className="flex-1 bg-white border-r border-[#E5E7EB] overflow-hidden">
          {phase === 'placing' || phase === 'in_call' ? (
            <LiveTranscriptPane durationSec={durationSec} contactId={contact.id} callId={call?.callId ?? null} />
          ) : (
            <PostCallPanel />
          )}
        </section>

        {/* Right — SMS thread + history */}
        <aside className="w-[340px] bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#E5E7EB] flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#1A1A1A]">SMS conversation</span>
            <span className="text-[10px] text-[#9CA3AF]">{sms.length} messages</span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {sms.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'rounded-2xl px-3 py-2 max-w-[85%] text-[12px] leading-snug',
                  m.direction === 'outbound'
                    ? 'bg-[#1E9A80]/10 text-[#1A1A1A] ml-auto'
                    : 'bg-[#F3F3EE] text-[#1A1A1A]'
                )}
              >
                {m.body}
                <div className="text-[10px] text-[#9CA3AF] mt-0.5 tabular-nums">
                  {formatTimeOnly(m.sentAt)}
                </div>
              </div>
            ))}

            <div className="border-t border-[#E5E7EB] pt-2 mt-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] mb-1.5">
                Past calls
              </div>
              {calls.map((c) => (
                <div key={c.id} className="flex items-start gap-2 py-1.5 text-[12px]">
                  {c.direction === 'inbound' ? (
                    <PhoneIncoming className="w-3.5 h-3.5 text-[#1E9A80] mt-0.5" />
                  ) : (
                    <PhoneOutgoing className="w-3.5 h-3.5 text-[#3B82F6] mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="text-[12px] text-[#1A1A1A]">
                      {formatRelativeTime(c.startedAt)} ·{' '}
                      <span className="text-[#6B7280]">
                        {c.status === 'missed'
                          ? 'missed'
                          : `${c.direction} · ${formatDuration(c.durationSec)}`}
                      </span>
                    </div>
                    {c.aiSummary && (
                      <div className="text-[11px] text-[#6B7280] italic leading-snug">
                        "{c.aiSummary.slice(0, 80)}…"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#E5E7EB] pt-2 mt-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] mb-1.5">
                Activity
              </div>
              {activities.slice(0, 5).map((a) => (
                <div key={a.id} className="text-[11px] text-[#6B7280] py-0.5">
                  • {a.title} · {formatRelativeTime(a.ts)}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <EditContactModal
        contact={editing}
        onClose={() => setEditing(null)}
        onSave={(updated) => store.upsertContact(updated)}
      />
    </div>
  );
}

function TopBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      title={label}
      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/15 text-[11px] font-medium"
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function KV({
  label,
  value,
  colour,
}: {
  label: string;
  value: React.ReactNode;
  colour?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] mb-0.5">
        {label}
      </div>
      <div className="text-[12px] text-[#1A1A1A] flex items-center gap-1.5">
        {colour && (
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: colour }} />
        )}
        {value}
      </div>
    </div>
  );
}
