import { useState } from 'react';
import {
  MicOff,
  Pause,
  PhoneForwarded,
  StickyNote,
  PhoneOff,
  Minimize2,
  Flame,
  Tag,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useActiveCallCtx } from './ActiveCallContext';
import LiveTranscriptPane from './LiveTranscriptPane';
import CallScriptPane from './CallScriptPane';
import TerminologyPane from './TerminologyPane';
import MidCallSmsSender from './MidCallSmsSender';
import ApplyAutomationButton from './ApplyAutomationButton';
import PostCallPanel from './PostCallPanel';
import StageSelector from '../shared/StageSelector';
import EditContactModal from '../contacts/EditContactModal';
import type { Contact } from '../../types';
import { useSmsV2 } from '../../store/SmsV2Store';
import { useCurrentAgent } from '../../hooks/useCurrentAgent';
import {
  formatDuration,
  formatPence,
  formatRelativeTime,
} from '../../data/helpers';

export default function LiveCallScreen() {
  const { phase, call, durationSec, endCall, setFullScreen, muted, toggleMute } = useActiveCallCtx();
  const store = useSmsV2();
  const { agent: me, firstName: myFirstName, talkRatioPercent } = useCurrentAgent();
  const [editing, setEditing] = useState<Contact | null>(null);

  // Resolve a contact for context — fall back to first contact if direct dial
  const contact =
    store.contacts.find((c) => c.id === call?.contactId) ?? store.contacts[0];

  const stage = store.columns.find((c) => c.id === contact.pipelineColumnId);
  const contactFirstName = contact.name?.trim().split(/\s+/)[0] ?? '';

  return (
    <div className="fixed inset-0 z-[200] bg-[#F3F3EE] flex flex-col">
      {/* Top bar — three visual states:
            placing  → black bar with ringing dots (Hugo: no orange/red here)
            in_call  → green bar with pulsing dot + duration
            post_call → white bar, muted */}
      <header
        className={cn(
          'h-14 flex items-center px-5 gap-3 flex-shrink-0 transition-colors',
          phase === 'in_call' && 'bg-[#1E9A80] text-white',
          phase === 'placing' && 'bg-[#1A1A1A] text-white',
          phase === 'post_call' && 'bg-white border-b border-[#E5E7EB] text-[#1A1A1A]',
          phase === 'idle' && 'bg-white border-b border-[#E5E7EB] text-[#1A1A1A]'
        )}
      >
        {phase === 'placing' ? (
          <span className="relative w-2.5 h-2.5 inline-flex">
            <span className="absolute inset-0 rounded-full bg-white animate-ping" />
            <span className="relative w-2.5 h-2.5 rounded-full bg-white" />
          </span>
        ) : (
          <span
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              phase === 'in_call' && 'bg-white animate-pulse',
              (phase === 'post_call' || phase === 'idle') && 'bg-[#1E9A80]'
            )}
          />
        )}
        <span className="text-[14px] font-semibold flex items-center gap-2">
          {phase === 'placing' && (
            <>
              <span>Calling {call?.contactName}</span>
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </>
          )}
          {phase === 'in_call' && (
            <>
              <span>In call · {call?.contactName}</span>
              <span className="ml-2 tabular-nums opacity-90">{formatDuration(durationSec)}</span>
            </>
          )}
          {phase === 'post_call' && <span>Call ended · {call?.contactName}</span>}
          {phase === 'idle' && <span>Idle</span>}
        </span>

        {phase === 'in_call' && (
          <div className="ml-6 flex items-center gap-1">
            <TopBtn
              icon={<MicOff className="w-4 h-4" />}
              label={muted ? 'Unmute' : 'Mute'}
              onClick={toggleMute}
              active={muted}
            />
            <TopBtn icon={<Pause className="w-4 h-4" />} label="Hold" />
            <TopBtn icon={<PhoneForwarded className="w-4 h-4" />} label="Transfer" />
            <TopBtn icon={<StickyNote className="w-4 h-4" />} label="Note" />
            {muted && (
              // Self-test hint: when Hugo calls his own phone in the same
              // room and mutes the browser, his phone's OWN microphone keeps
              // picking up ambient sound and sending it back. Mute can only
              // silence the browser side. Headphones eliminate the loop.
              <span className="ml-2 text-[11px] text-white/80">
                Mic off · your phone's mic may still hear the room
              </span>
            )}
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

      {/* Resizable 4-column body (Hugo 2026-04-26):
            COL 1 — contact context (name, stage, KV, sticky notes)
            COL 2 — live transcript + AI coach (vertical resize inside)
            COL 3 — call script (admin-edited via /smsv2/settings)
            COL 4 — glossary (click-to-expand, admin-edited via Settings)
          autoSaveId bumped to v2 so old 3-col widths don't bleed in. */}
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="smsv2-live-call-layout-v2"
        className="flex-1 overflow-hidden"
      >
        {/* COL 1 — lead context */}
        <ResizablePanel defaultSize={20} minSize={14} className="bg-white border-r border-[#E5E7EB] flex flex-col overflow-hidden">
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
            <div className="mt-2 space-y-2">
              <StageSelector
                value={contact.pipelineColumnId}
                onChange={(col) => store.patchContact(contact.id, { pipelineColumnId: col })}
                size="sm"
              />
              <ApplyAutomationButton
                callId={call?.callId ?? null}
                contactId={contact.id}
                columnId={contact.pipelineColumnId}
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

            {/* Mid-call SMS sender (Hugo 2026-04-26): templated send without
                leaving the call screen. Reuses sms-send edge fn. */}
            <MidCallSmsSender
              contactId={contact.id}
              contactName={contact.name}
              contactPhone={contact.phone}
              agentFirstName={myFirstName ?? ''}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* COL 2 — transcript + coach during dial/in-call, post-call panel
            after hangup. We mount LiveTranscriptPane the moment callId is
            known (during 'placing'), not just on 'in_call', so we don't miss
            the first transcript chunks Twilio fires before bridge-accept. */}
        <ResizablePanel defaultSize={38} minSize={26} className="bg-white border-r border-[#E5E7EB] overflow-hidden">
          {phase === 'placing' || phase === 'in_call' ? (
            <LiveTranscriptPane durationSec={durationSec} contactId={contact.id} callId={call?.callId ?? null} />
          ) : (
            <PostCallPanel />
          )}
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* COL 3 — call script (admin-edited Markdown, item G) */}
        <ResizablePanel defaultSize={22} minSize={14} className="border-r border-[#E5E7EB] overflow-hidden">
          <CallScriptPane
            contactFirstName={contactFirstName}
            agentFirstName={myFirstName ?? ''}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* COL 4 — glossary cards (click-to-expand, item G) */}
        <ResizablePanel defaultSize={20} minSize={14} className="overflow-hidden">
          <TerminologyPane />
        </ResizablePanel>
      </ResizablePanelGroup>

      <EditContactModal
        contact={editing}
        onClose={() => setEditing(null)}
        onSave={(updated) => store.upsertContact(updated)}
      />
    </div>
  );
}

function TopBtn({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors',
        active ? 'bg-white text-[#1E9A80]' : 'hover:bg-white/15'
      )}
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
