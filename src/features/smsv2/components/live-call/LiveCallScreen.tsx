import { useEffect, useState } from 'react';
import {
  MicOff,
  PhoneOff,
  Minimize2,
  Flame,
  Pencil,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useActiveCallCtx } from './ActiveCallContext';
import { useActiveDialerLegs } from '../../hooks/useActiveDialerLegs';
import { useNoAnswerHangup } from '../../hooks/useNoAnswerHangup';
import LiveTranscriptPane from './LiveTranscriptPane';
import CallScriptPane from './CallScriptPane';
import TerminologyPane from './TerminologyPane';
import MidCallSmsSender from './MidCallSmsSender';
import ContactMetaCompact from './ContactMetaCompact';
import CallTimeline from './CallTimeline';
import PostCallPanel from './PostCallPanel';
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
  const {
    phase,
    callPhase,
    call,
    durationSec,
    endCall,
    setFullScreen,
    muted,
    toggleMute,
    previewContactId,
    closeCallRoom,
    startCall,
    error,
  } = useActiveCallCtx();
  const store = useSmsV2();
  const { agent: me, firstName: myFirstName, talkRatioPercent } = useCurrentAgent();
  const [editing, setEditing] = useState<Contact | null>(null);

  // PR 127 (Hugo 2026-04-28): the header used to read from the
  // placeholder contact set by enterDialingPlaceholder, but the
  // PICKER may pick a DIFFERENT contact than the local store's
  // queueLeads[0] (queue ordering can shift between dispatch and
  // RPC). That caused the header to show one number and the banner
  // to show another. Source the placing-phase contact name from the
  // live leg instead so they always agree.
  const { legs: activeLegs } = useActiveDialerLegs();
  const placingDisplayName =
    phase === 'placing'
      ? activeLegs[0]?.contactName ?? activeLegs[0]?.phone ?? call?.contactName ?? '…'
      : call?.contactName ?? '';

  // PR 128 (Hugo 2026-04-28): we removed the dark second-banner that used
  // to show the ringing timer. Now the top header shows "Ringing · M:SS"
  // during placing so the agent can still see how long Twilio's been
  // trying. 1Hz tick — only runs while in the placing phase.
  const [, setRingingTick] = useState(0);
  useEffect(() => {
    if (phase !== 'placing') return;
    const id = window.setInterval(() => setRingingTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);
  const placingElapsedSec =
    phase === 'placing' && activeLegs[0]?.startedAt
      ? Math.max(0, Math.floor((Date.now() - activeLegs[0].startedAt) / 1000))
      : 0;
  // PR 129 (Hugo 2026-04-28): show the actual Twilio leg status
  // ('Dialing' / 'Ringing') so the agent sees Twilio's reported state
  // rather than a generic "Calling".
  const placingLegStatus = phase === 'placing' ? activeLegs[0]?.status : null;
  const placingStatusLabel =
    placingLegStatus === 'ringing'
      ? 'Ringing'
      : placingLegStatus === 'in_progress'
        ? 'Connecting…'
        : 'Dialing';

  // PR 138 (Hugo 2026-04-28): extracted to useNoAnswerHangup hook.
  // Same behaviour as before — when the leg's been in 'placing' for
  // ≥35s and is still queued/ringing (or no leg row at all), end the
  // call. The reducer flips to stopped_waiting_outcome; the agent
  // picks the outcome (Rules 3, 4, 5).
  useNoAnswerHangup({
    phase,
    legStatus: placingLegStatus,
    elapsedSec: placingElapsedSec,
    endCall,
  });

  // Preview mode (PR 10): no active call, but agent opened the room for
  // a specific contact from the inbox. Use that contact instead of the
  // active call's contact. When neither is set, fall back to first
  // contact (legacy direct-dial case).
  const isPreview = phase === 'idle' && previewContactId !== null;
  const contact =
    store.contacts.find((c) =>
      isPreview ? c.id === previewContactId : c.id === call?.contactId
    ) ?? store.contacts[0];

  const contactFirstName = contact.name?.trim().split(/\s+/)[0] ?? '';

  return (
    <div className="fixed inset-0 z-[200] bg-[#F3F3EE] flex flex-col">
      {/* Top bar — four visual states:
            placing  → tall black bar absorbing the design Hugo liked
                       from the dark banner (status pill + big timer)
            in_call  → green bar with pulsing dot + duration
            post_call → white bar, muted
            idle     → white bar */}
      <header
        className={cn(
          'flex items-center px-5 gap-3 flex-shrink-0 transition-colors',
          // PR 129: taller during placing so the absorbed design from
          // the deleted second banner has room to breathe.
          phase === 'placing' ? 'h-[68px]' : 'h-14',
          phase === 'in_call' && 'bg-[#1E9A80] text-white',
          phase === 'placing' && 'bg-[#0A0A0A] text-white',
          phase === 'post_call' && 'bg-white border-b border-[#E5E7EB] text-[#1A1A1A]',
          phase === 'idle' && 'bg-white border-b border-[#E5E7EB] text-[#1A1A1A]'
        )}
      >
        {phase !== 'placing' && (
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
            // PR 129 (Hugo 2026-04-28): absorbed the dark banner's
            // design — status pill + big tabular timer + ringing dot.
            // This is the SINGLE call surface now (PR 128 killed the
            // second banner). Layout reads: ●ringing · Hugo · DIALING · 0:14
            <span className="flex items-center gap-3">
              <span className="relative w-2.5 h-2.5 inline-flex">
                <span className="absolute inset-0 rounded-full bg-[#1E9A80] animate-ping opacity-75" />
                <span className="relative w-2.5 h-2.5 rounded-full bg-[#1E9A80]" />
              </span>
              <span className="text-[15px] font-semibold">
                Calling {placingDisplayName}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide',
                  placingLegStatus === 'ringing'
                    ? 'bg-[#1E9A80]/20 text-[#1E9A80]'
                    : 'bg-white/10 text-white/80'
                )}
                data-testid="livecall-leg-status"
              >
                {placingStatusLabel}
              </span>
              <span
                className="text-[18px] font-bold tabular-nums tracking-tight"
                data-testid="livecall-ringing-timer"
              >
                {Math.floor(placingElapsedSec / 60)}:
                {(placingElapsedSec % 60).toString().padStart(2, '0')}
              </span>
            </span>
          )}
          {phase === 'in_call' && (
            <>
              <span>In call · {call?.contactName}</span>
              <span className="ml-2 tabular-nums opacity-90">{formatDuration(durationSec)}</span>
            </>
          )}
          {phase === 'post_call' && <span>Call ended · {call?.contactName}</span>}
          {phase === 'idle' && !isPreview && <span>Idle</span>}
          {isPreview && (
            <>
              <span>Call room · {contact.name}</span>
              <span className="ml-1 text-[10px] uppercase tracking-wide font-semibold bg-[#1E9A80]/10 text-[#1E9A80] px-1.5 py-0.5 rounded">
                Preview
              </span>
            </>
          )}
        </span>

        {phase === 'in_call' && (
          <div className="ml-6 flex items-center gap-1">
            <TopBtn
              icon={<MicOff className="w-4 h-4" />}
              label={muted ? 'Unmute' : 'Mute'}
              onClick={toggleMute}
              active={muted}
            />
            {/* PR 89 (Hugo 2026-04-27): Hold / Transfer / Note buttons
                were rendered with no onClick \u2014 pure dead UI. Hold +
                Transfer require Twilio routing changes (out of scope
                for the inbox audit). Note duplicates the sticky-note
                textarea in the transcript pane, so we drop it here. */}
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
            {/* PR 109 (Hugo 2026-04-28): spend is admin-only across the CRM. */}
            {me?.isAdmin && (
              <>
                <span className="opacity-50">·</span>
                <span>
                  Spend{' '}
                  <span className="font-semibold tabular-nums">
                    {formatPence(me?.spendPence ?? 0)}
                  </span>
                </span>
              </>
            )}
          </div>

          {/* PR 132 (Hugo 2026-04-28, Bug 3): single Hang up button for
              ANY non-idle, non-post_call, non-preview phase. Hugo:
              "on the voicemail there is no option to hang up". When AMD
              flips wk_calls.status to 'voicemail' the FRONTEND phase may
              stay in 'placing' (no winner-broadcast fires for a non-
              in_progress mapped status) — neither the old End nor Cancel
              button rendered, so the agent was stuck. This consolidates
              the two and renders for every transitional state. The label
              changes for clarity but the handler is the same. */}
          {phase !== 'idle' && phase !== 'post_call' && !isPreview && (
            <button
              onClick={async () => {
                await endCall();
              }}
              className="flex items-center gap-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white px-3 py-1.5 rounded-[10px] text-[12px] font-semibold"
              data-testid={
                phase === 'placing'
                  ? 'livecall-cancel-placing'
                  : 'livecall-end-call'
              }
            >
              <PhoneOff className="w-3.5 h-3.5" />
              {phase === 'placing' ? ' Cancel' : ' Hang up'}
            </button>
          )}

          {/* Preview mode: agent can dial the lead from inside the call
              room without bouncing back to the inbox. Closing the room
              uses closeCallRoom() instead of fullScreen toggle. */}
          {isPreview && (
            <button
              onClick={() => void startCall(contact.id)}
              className="flex items-center gap-1.5 bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white px-3 py-1.5 rounded-[10px] text-[12px] font-semibold shadow-[0_4px_12px_rgba(30,154,128,0.35)]"
            >
              <PhoneOff className="w-3.5 h-3.5 rotate-[135deg]" /> Call now
            </button>
          )}

          {/* PR 138 (Hugo 2026-04-28, Rules 6, 7): the room ALWAYS has
              a Minimise button. The Close button is visible only when
              the call isn't live (idle / preview / *_waiting_outcome /
              outcome_done) — you can't close a live call's room
              without hanging up first. */}
          <button
            onClick={() => setFullScreen(false)}
            className={cn(
              'p-1.5 rounded-lg',
              phase === 'in_call' ? 'hover:bg-white/15' : 'hover:bg-black/[0.04]'
            )}
            title="Minimise (call continues — maximise from the floating bar)"
            data-testid="livecall-minimise"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          {/* Close: hidden during dialing / ringing / in_call. Once
              the call has ended (any *_waiting_outcome) or we're in
              preview, the agent can close out cleanly. */}
          {callPhase !== 'dialing' &&
            callPhase !== 'ringing' &&
            callPhase !== 'in_call' && (
              <button
                onClick={() => closeCallRoom()}
                className={cn(
                  'p-1.5 rounded-lg',
                  phase === 'in_call' ? 'hover:bg-white/15' : 'hover:bg-black/[0.04]'
                )}
                title={
                  isPreview
                    ? 'Close call room'
                    : 'Close call room (outcome saved)'
                }
                data-testid={
                  isPreview ? 'livecall-close-preview' : 'livecall-close'
                }
              >
                <X className="w-4 h-4" />
              </button>
            )}
        </div>
      </header>

      {/* PR 128 (Hugo 2026-04-28): removed the second "Calling now"
          banner entirely. Power-dialer-only since PR 126 means there's
          only ever one leg, and the top header above already shows
          "Calling +447…" with a Cancel button + ringing timer. The
          dark banner was pure duplication that confused agents. */}

      {/* PR 138 (Hugo 2026-04-28): Twilio fatal-error banner. Shows
          above the outcome picker when the call ended via an error
          (13224 invalid number, 31000 dropped, etc.). Friendly text
          comes from lib/twilioErrorMap.ts. The agent still picks an
          outcome — the banner just explains WHY the call ended. */}
      {callPhase === 'error_waiting_outcome' && error && (
        <div
          className="px-5 py-2 bg-[#FEF2F2] border-b border-[#FCA5A5] text-[12px] text-[#B91C1C] flex items-center gap-2"
          data-testid="livecall-error-banner"
        >
          <span className="font-semibold">Call error:</span>
          <span>{error.friendlyMessage}</span>
          {error.code ? (
            <span className="ml-auto text-[10px] text-[#B91C1C]/70 tabular-nums">
              code {error.code}
            </span>
          ) : null}
        </div>
      )}

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
            {/* Phase 6 (Hugo 2026-04-30): compact meta — pipeline + tags
                + last-contact side-by-side, frees vertical space for the
                timeline below SMS. */}
            <div className="mt-2">
              <ContactMetaCompact contact={contact} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-[12px]">
            {/* Mid-call SMS sender (Hugo 2026-04-26): templated send without
                leaving the call screen. Reuses sms-send edge fn. */}
            <MidCallSmsSender
              contactId={contact.id}
              contactName={contact.name}
              contactPhone={contact.phone}
              contactEmail={contact.email}
              agentFirstName={myFirstName ?? ''}
              campaignId={call?.campaignId ?? null}
            />
            {/* Phase 6 (Hugo 2026-04-30): timeline below SMS — sends,
                coach lines, stage moves, notes. Reads wk_call_timeline. */}
            <CallTimeline callId={call?.callId ?? null} />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* COL 2 — transcript + coach during dial/in-call, post-call panel
            after hangup. We mount LiveTranscriptPane the moment callId is
            known (during 'placing'), not just on 'in_call', so we don't miss
            the first transcript chunks Twilio fires before bridge-accept. */}
        <ResizablePanel defaultSize={38} minSize={26} className="bg-white border-r border-[#E5E7EB] overflow-hidden">
          {phase === 'placing' || phase === 'in_call' ? (
            <LiveTranscriptPane
              durationSec={durationSec}
              contactId={contact.id}
              callId={call?.callId ?? null}
              agentFirstName={myFirstName ?? ''}
            />
          ) : isPreview ? (
            // PR 10: preview mode — no active call, show the empty
            // transcript / coach layout so the agent sees the FULL call-
            // room view for the lead, ready to dial.
            <LiveTranscriptPane
              durationSec={0}
              contactId={contact.id}
              callId={null}
              agentFirstName={myFirstName ?? ''}
            />
          ) : (
            <PostCallPanel />
          )}
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* COL 3 — call script with click-to-mark-as-read tracking. */}
        <ResizablePanel defaultSize={22} minSize={14} className="border-r border-[#E5E7EB] overflow-hidden">
          <CallScriptPane
            callId={call?.callId ?? null}
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

// KV helper removed in Phase 6 — meta moved into ContactMetaCompact.
