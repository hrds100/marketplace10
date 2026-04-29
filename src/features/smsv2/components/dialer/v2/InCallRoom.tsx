// PR 140 (Hugo 2026-04-28): the new live-call room.
//
// Replaces LiveCallScreen. Same panels, same data, same Twilio wiring —
// but the SHELL is rebuilt around a single, prominent state badge so
// the agent always knows whether the call is dialing / ringing /
// connected / wrapping-up / failed / etc.
//
// Layout (full-screen overlay, z-index 200):
//
//   ┌─ Header bar ──────────────────────────────────────────────────┐
//   │ [BIG STATE BADGE]  Contact name · phone    [Mute][Min][X]    │
//   ├───────────────────────────────────────────────────────────────┤
//   │ ┌─ Contact ─┐ ┌─ Transcript / AI coach ─┐ ┌─ Script ─┐ ┌─ Glos │
//   │ │ name      │ │  OR PostCallPanel       │ │          │ │       │
//   │ │ tags      │ │                          │ │          │ │       │
//   │ │ SMS/WA/Em │ │                          │ │          │ │       │
//   │ │ timeline  │ │                          │ │          │ │       │
//   │ └───────────┘ └─────────────────────────┘ └──────────┘ └───────│
//   ├───────────────────────────────────────────────────────────────┤
//   │ Action bar: [Hang up]  · status help text                    │
//   └───────────────────────────────────────────────────────────────┘
//
// Hugo's rules — explicit visible behaviour:
//   • Hang up never closes the room (Rule 6) — the room only closes
//     after outcome_done OR via the X button (which is hidden while
//     the call is live).
//   • Minimise never closes the room (Rule 7).
//   • The state badge is the single source of truth for "what state
//     the call is in right now". It updates from the reducer.

import { useEffect, useMemo, useState } from 'react';
import { MicOff, PhoneOff, Minimize2, Pencil, X, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useActiveCallCtx } from '../../live-call/ActiveCallContext';
import { useActiveDialerLegs } from '../../../hooks/useActiveDialerLegs';
import { useNoAnswerHangup } from '../../../hooks/useNoAnswerHangup';
import LiveTranscriptPane from '../../live-call/LiveTranscriptPane';
import CallScriptPane from '../../live-call/CallScriptPane';
import TerminologyPane from '../../live-call/TerminologyPane';
import MidCallSmsSender from '../../live-call/MidCallSmsSender';
import ContactMetaCompact from '../../live-call/ContactMetaCompact';
import CallTimeline from '../../live-call/CallTimeline';
import PostCallPanel from '../../live-call/PostCallPanel';
import EditContactModal from '../../contacts/EditContactModal';
import type { Contact } from '../../../types';
import { useSmsV2 } from '../../../store/SmsV2Store';
import { useCurrentAgent } from '../../../hooks/useCurrentAgent';
import {
  formatDuration,
  formatPence,
  formatRelativeTime,
} from '../../../data/helpers';
import { deriveDialerUiState } from '../../../lib/dialerUiState';
import CallStateBadge from './CallStateBadge';

export default function InCallRoom() {
  const ctx = useActiveCallCtx();
  const {
    callPhase,
    roomView,
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
    dispositionSignal,
  } = ctx;

  const store = useSmsV2();
  const { agent: me, firstName: myFirstName, talkRatioPercent } = useCurrentAgent();
  const [editing, setEditing] = useState<Contact | null>(null);

  // Reconstruct the lifecycle state shape that deriveDialerUiState
  // needs. (We don't expose `state` on the context — only the public
  // fields the consumers read individually — so we rebuild it here.)
  const uiState = useMemo(
    () =>
      deriveDialerUiState({
        callPhase,
        roomView,
        call,
        previewContactId,
        lastEndedContactId: null,
        muted,
        error,
        dispositionSignal,
      }),
    [callPhase, roomView, call, previewContactId, muted, error, dispositionSignal]
  );

  const isPreview = uiState.kind === 'preview';
  const isLive =
    uiState.kind === 'dialing' ||
    uiState.kind === 'ringing' ||
    uiState.kind === 'connected';
  const isWrapUp = uiState.kind === 'wrap_up' || uiState.kind === 'submitting' || uiState.kind === 'done';

  const { legs: activeLegs } = useActiveDialerLegs();
  const placingLegStatus = isLive ? activeLegs[0]?.status ?? null : null;

  // PR 148 (Hugo 2026-04-29): tick the badge meta 1Hz while live AND
  // during wrap-up so the agent sees seconds-since-call-ended (the
  // "old dial UI" timing feedback he asked for). 1Hz is enough.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isLive && !isWrapUp) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [isLive, isWrapUp]);

  const placingElapsedSec =
    uiState.kind === 'dialing' || uiState.kind === 'ringing'
      ? activeLegs[0]?.startedAt
        ? Math.max(0, Math.floor((Date.now() - activeLegs[0].startedAt) / 1000))
        : call?.startedAt
          ? Math.max(0, Math.floor((Date.now() - call.startedAt) / 1000))
          : 0
      : 0;

  // PR 148: wrap-up elapsed seconds — time since the call's last
  // start anchor. Approximation, but accurate enough for the agent
  // to see "I've been parked here for 0:08, time to advance".
  const wrapUpElapsedSec =
    isWrapUp && call?.startedAt
      ? Math.max(0, Math.floor((Date.now() - call.startedAt) / 1000))
      : 0;

  useNoAnswerHangup({
    phase:
      uiState.kind === 'dialing' || uiState.kind === 'ringing'
        ? 'placing'
        : uiState.kind === 'connected'
          ? 'in_call'
          : isWrapUp
            ? 'post_call'
            : 'idle',
    legStatus: placingLegStatus,
    elapsedSec: placingElapsedSec,
    endCall,
  });

  // PR 147 (Hugo 2026-04-29, Bug #1): the header used to fall back to
  // `store.contacts[0]` when the contact-id lookup failed — which
  // happens for manual dials from the softphone DialPad (contactId =
  // 'manual-${Date.now()}', never in the store). The result was the
  // header showing some random other contact's name/phone during a
  // live call. Fix: when the lookup fails, build a minimal contact
  // shell from the active call's contactName + phone (which the dial
  // path always populates). Only fall back to store.contacts[0] when
  // there is no active call and no preview either (true edge case).
  const storeContact = store.contacts.find((c) =>
    isPreview ? c.id === previewContactId : c.id === call?.contactId
  );
  const fallbackFromCall =
    !storeContact && call
      ? ({
          id: call.contactId,
          name: call.contactName || call.phone || 'Unknown caller',
          phone: call.phone,
          tags: [],
          isHot: false,
          customFields: {},
          createdAt: new Date().toISOString(),
        } as Contact)
      : null;
  const contact = storeContact ?? fallbackFromCall ?? store.contacts[0];

  if (!contact) {
    // Edge case: room mounted but nothing resolvable — render nothing
    // rather than crash. Should not happen in practice because
    // closeCallRoom() runs on outcome_done.
    return null;
  }

  const contactFirstName = contact.name?.trim().split(/\s+/)[0] ?? '';

  // Badge meta — secondary tabular text next to the label.
  // PR 148 (Hugo 2026-04-29): show wrap-up elapsed seconds during
  // every wrap_up / submitting / done phase so the agent sees the
  // "seconds between calls" feedback the old dial UI had.
  const badgeMeta =
    uiState.kind === 'connected'
      ? formatDuration(durationSec)
      : uiState.kind === 'dialing' || uiState.kind === 'ringing'
        ? `${Math.floor(placingElapsedSec / 60)}:${(placingElapsedSec % 60)
            .toString()
            .padStart(2, '0')}`
        : isWrapUp && wrapUpElapsedSec > 0
          ? `${Math.floor(wrapUpElapsedSec / 60)}:${(wrapUpElapsedSec % 60)
              .toString()
              .padStart(2, '0')}`
          : null;

  const hangUpLabel =
    uiState.kind === 'dialing' || uiState.kind === 'ringing' ? 'Cancel' : 'Hang up';

  return (
    <div
      className="fixed inset-0 z-[200] bg-[#F3F3EE] flex flex-col"
      data-testid="incall-room"
      data-state-kind={uiState.kind}
    >
      {/* Header — clean white bar, big state badge on the left. */}
      <header className="flex items-center px-5 gap-4 flex-shrink-0 h-16 bg-white border-b border-[#E5E7EB]">
        <CallStateBadge state={uiState} meta={badgeMeta} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-[15px] font-semibold text-[#1A1A1A] truncate"
              data-testid="incall-contact-name"
            >
              {contact.name}
            </span>
            {contact.isHot && (
              <span
                className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#EF4444]"
                title="Hot lead"
              >
                <Flame className="w-3 h-3" /> HOT
              </span>
            )}
          </div>
          <div className="text-[12px] text-[#6B7280] tabular-nums">
            {contact.phone}
          </div>
        </div>

        {uiState.kind === 'connected' && (
          <button
            onClick={toggleMute}
            title={muted ? 'Unmute' : 'Mute'}
            data-testid="incall-mute"
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
              muted
                ? 'bg-[#1E9A80] text-white'
                : 'border border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE]'
            )}
          >
            <MicOff className="w-4 h-4" />
            {muted ? 'Unmute' : 'Mute'}
          </button>
        )}

        <div className="hidden md:flex items-center gap-3 text-[11px] px-3 py-1 rounded-full bg-[#F3F3EE] border border-[#E5E7EB] text-[#6B7280]">
          <span>
            Talk{' '}
            <span className="font-semibold tabular-nums text-[#1A1A1A]">
              {talkRatioPercent}%
            </span>
          </span>
          <span className="opacity-50">·</span>
          <span>
            Calls{' '}
            <span className="font-semibold tabular-nums text-[#1A1A1A]">
              {me?.callsToday ?? 0}
            </span>
          </span>
          {me?.isAdmin && (
            <>
              <span className="opacity-50">·</span>
              <span>
                Spend{' '}
                <span className="font-semibold tabular-nums text-[#1A1A1A]">
                  {formatPence(me?.spendPence ?? 0)}
                </span>
              </span>
            </>
          )}
        </div>

        {/* Minimise — always available; call continues. */}
        <button
          onClick={() => setFullScreen(false)}
          className="p-2 rounded-lg hover:bg-[#F3F3EE] text-[#6B7280]"
          title="Minimise (call continues)"
          data-testid="incall-minimise"
        >
          <Minimize2 className="w-4 h-4" />
        </button>

        {/* Close — hidden while live. Visible during preview / wrap-up
            / done. Cannot close mid-call (Rule 6). */}
        {!isLive && (
          <button
            onClick={() => closeCallRoom()}
            className="p-2 rounded-lg hover:bg-[#F3F3EE] text-[#6B7280]"
            title="Close call room"
            data-testid="incall-close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Error banner — when wrap_up reason is failed/unreachable/
          invalid_number, show the friendly message above the body. */}
      {uiState.kind === 'wrap_up' &&
        (uiState.reason === 'failed' ||
          uiState.reason === 'unreachable' ||
          uiState.reason === 'invalid_number') &&
        error && (
          <div
            data-testid="incall-error-banner"
            className="px-5 py-2 bg-[#FEF2F2] border-b border-[#FCA5A5] text-[12px] text-[#B91C1C] flex items-center gap-2"
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

      {/* Body — same panels as LiveCallScreen, restyled to feel less
          chrome-heavy. */}
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="smsv2-incall-room-v1"
        className="flex-1 overflow-hidden"
      >
        <ResizablePanel
          defaultSize={20}
          minSize={14}
          className="bg-white border-r border-[#E5E7EB] flex flex-col overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <div className="text-[16px] font-bold text-[#1A1A1A]">{contact.name}</div>
              <button
                onClick={() => setEditing(contact)}
                className="ml-auto p-1 rounded hover:bg-[#F3F3EE] text-[#6B7280] hover:text-[#1A1A1A]"
                title="Edit lead"
                data-testid="incall-edit-contact"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[12px] text-[#6B7280] tabular-nums mt-0.5">
              {contact.phone}
            </div>
            <div className="text-[11px] text-[#9CA3AF] mt-0.5">
              Added {formatRelativeTime(contact.createdAt)}
            </div>
            <div className="mt-2">
              <ContactMetaCompact contact={contact} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-[12px]">
            <MidCallSmsSender
              contactId={contact.id}
              contactName={contact.name}
              contactPhone={contact.phone}
              contactEmail={contact.email}
              agentFirstName={myFirstName ?? ''}
              campaignId={call?.campaignId ?? null}
            />
            <CallTimeline callId={call?.callId ?? null} />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          defaultSize={38}
          minSize={26}
          className="bg-white border-r border-[#E5E7EB] overflow-hidden"
        >
          {isLive ? (
            <LiveTranscriptPane
              durationSec={durationSec}
              contactId={contact.id}
              callId={call?.callId ?? null}
              agentFirstName={myFirstName ?? ''}
            />
          ) : isPreview ? (
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

        <ResizablePanel
          defaultSize={22}
          minSize={14}
          className="border-r border-[#E5E7EB] overflow-hidden"
        >
          <CallScriptPane
            callId={call?.callId ?? null}
            contactFirstName={contactFirstName}
            agentFirstName={myFirstName ?? ''}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={20} minSize={14} className="overflow-hidden">
          <TerminologyPane />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Action bar — bottom-fixed; the Hang Up / Call Now button is
          the loudest element. Status help text on the right. */}
      <footer className="flex items-center px-5 gap-3 flex-shrink-0 h-14 bg-white border-t border-[#E5E7EB]">
        {isLive ? (
          <button
            onClick={async () => {
              await endCall();
            }}
            className="flex items-center gap-2 bg-[#EF4444] hover:bg-[#DC2626] text-white px-4 py-2 rounded-[10px] text-[13px] font-semibold"
            data-testid="incall-hangup"
          >
            <PhoneOff className="w-4 h-4" /> {hangUpLabel}
          </button>
        ) : isPreview ? (
          <button
            onClick={() => void startCall(contact.id)}
            className="flex items-center gap-2 bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white px-4 py-2 rounded-[10px] text-[13px] font-semibold shadow-[0_4px_12px_rgba(30,154,128,0.35)]"
            data-testid="incall-call-now"
          >
            <PhoneOff className="w-4 h-4 rotate-[135deg]" /> Call now
          </button>
        ) : null}

        <span
          className="ml-auto text-[12px] text-[#6B7280]"
          data-testid="incall-help-text"
        >
          {helpTextForUiState(uiState)}
        </span>
      </footer>

      <EditContactModal
        contact={editing}
        onClose={() => setEditing(null)}
        onSave={(updated) => store.upsertContact(updated)}
      />
    </div>
  );
}

// PR 147 (Hugo 2026-04-29, Bug #3): per-wrap-up-reason help text. The
// CallStateBadge already shows the SHORT label ("No answer", "Busy",
// "Unreachable", etc.); this footer string adds the actionable
// instruction below the badge so the agent knows what to do next.
function helpTextForUiState(s: import('../../../lib/dialerUiState').DialerUiState): string {
  switch (s.kind) {
    case 'dialing':
      return 'Connecting through Twilio · cancel any time';
    case 'ringing':
      return 'Remote phone is ringing · cancel to stop';
    case 'connected':
      return 'Microphone live · use Mute to silence your end';
    case 'wrap_up':
      switch (s.reason) {
        case 'completed':
          return 'Call ended — pick an outcome below to log the call';
        case 'no_answer':
          return 'No answer — pick an outcome to move on';
        case 'voicemail':
          return 'Voicemail detected — pick Voicemail or move on';
        case 'busy':
          return 'Destination is busy — try the next lead or retry later';
        case 'unreachable':
          return 'Contact not found — please dial the next lead';
        case 'invalid_number':
          return 'Number invalid for this carrier — pick the next lead';
        case 'failed':
          return 'Call failed — pick an outcome to move on';
        case 'unknown':
          return 'Pick an outcome below to log the call';
      }
    // eslint-disable-next-line no-fallthrough
    case 'submitting':
      return 'Saving outcome…';
    case 'done':
      return 'Outcome saved · close to return to the dialer or press Next call';
    case 'preview':
      return 'Preview · click Call now to dial this lead';
    case 'idle':
    default:
      return '';
  }
}
