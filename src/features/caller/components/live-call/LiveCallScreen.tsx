// LiveCallScreen — Phase 3 live-call surface.
//
// Three-column layout:
//   left   — TimelinePane (transcript + coach + sms + activity, realtime)
//   middle — ScriptPane (live stage cursor) + CoachPane (streaming cards)
//   right  — MidCallSmsPane (SMS / WhatsApp / Email) + OutcomeSelector
//            during wrap-up + nav buttons (Skip / Next / Back)

import { useEffect, useState } from 'react';
import { PhoneOff, Mic, MicOff, ArrowLeft, SkipForward, Phone, X, Clock, Zap } from 'lucide-react';
import { useActiveCall } from '../../store/activeCallProvider';
import TimelinePane from './TimelinePane';
import OutcomeSelector from './OutcomeSelector';
import MidCallSmsPane from './MidCallSmsPane';
import ScriptPane from './ScriptPane';
import CoachPane from './CoachPane';

interface Props {
  pipelineId: string | null;
  scriptMd?: string | null;
  /** "← Back to dialer" — clears the call and returns to the pre-call
   *  queue surface. */
  onBackToQueue?: () => void;
  /** "Dial next lead" — clears + immediately dials the next queue
   *  entry. Used in wrap-up + outcome_done. */
  onDialNext?: () => void;
  /** Whether there is a next lead to dial. Disables Skip/Next when
   *  the queue is empty. */
  hasNextLead?: boolean;
}

export default function LiveCallScreen({
  pipelineId,
  scriptMd,
  onBackToQueue,
  onDialNext,
  hasNextLead,
}: Props) {
  const ctx = useActiveCall();
  const callId = ctx.call?.callId ?? null;
  const contactId = ctx.call?.contactId ?? null;

  const isLive =
    ctx.callPhase === 'dialing' ||
    ctx.callPhase === 'ringing' ||
    ctx.callPhase === 'in_call';
  const isWrapUp =
    ctx.callPhase === 'stopped_waiting_outcome' ||
    ctx.callPhase === 'error_waiting_outcome' ||
    ctx.callPhase === 'outcome_submitting' ||
    ctx.callPhase === 'outcome_done';

  if (ctx.callPhase === 'idle') return null;

  return (
    <div className="space-y-3">
      {/* Always-visible nav bar — every action visible regardless of
          phase per Hugo's explicit ask:
            - Back to dialer (left)
            - Skip & dial next (always visible, hangs up live call first)
            - Pacing countdown + "Dial now" (only when timer armed)
            - X close (right, hidden during live call) */}
      <div className="flex items-center gap-2 flex-wrap">
        {onBackToQueue && (
          <button
            type="button"
            onClick={onBackToQueue}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] hover:bg-[#F3F3EE] px-3 py-1.5 rounded-[10px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dialer
          </button>
        )}
        {onDialNext && (
          <button
            type="button"
            onClick={onDialNext}
            disabled={!hasNextLead}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] hover:bg-[#F3F3EE] px-3 py-1.5 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip & dial next
          </button>
        )}
        {ctx.pendingNextCall === 'armed' && ctx.pacingDeadlineMs && (
          <PacingCountdown
            deadlineMs={ctx.pacingDeadlineMs}
            onDialNow={onDialNext}
          />
        )}
        {onBackToQueue && !isLive && (
          <button
            type="button"
            onClick={onBackToQueue}
            title="Close call room"
            className="ml-auto inline-flex items-center justify-center w-9 h-9 rounded-[10px] border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F3F3EE] hover:text-[#1A1A1A]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div
        data-feature="CALLER__LIVE_CALL_SCREEN"
        className="bg-white border border-[#E5E7EB] rounded-2xl p-4 grid grid-cols-1 xl:grid-cols-[1.4fr_1fr_360px] lg:grid-cols-[1fr_360px] gap-4"
      >
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-center gap-3">
            <PhaseBadge phase={ctx.callPhase} />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[#1A1A1A] truncate">
                {ctx.call?.contactName ?? '—'}
              </div>
              <div className="text-[11px] text-[#6B7280] tabular-nums truncate">
                {ctx.call?.phone ?? '—'}
              </div>
            </div>
            {isLive && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => ctx.toggleMute()}
                  title={ctx.muted ? 'Unmute' : 'Mute'}
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-[10px] border ${ctx.muted ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]' : 'bg-white border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE]'}`}
                >
                  {ctx.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => void ctx.endCall()}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#B91C1C] px-3 py-1.5 rounded-[10px] hover:bg-[#991B1B]"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  Hang up
                </button>
              </div>
            )}
          </div>

          {ctx.error && (
            <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2">
              {ctx.error.friendlyMessage}
            </div>
          )}

          <TimelinePane callId={callId} isLive={isLive} />
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <ScriptPane callId={callId} scriptMd={scriptMd ?? null} />
          <CoachPane callId={callId} />
        </div>

        <div className="flex flex-col gap-3">
          {ctx.call?.contactId && (
            <MidCallSmsPane
              contactId={ctx.call.contactId}
              contactName={ctx.call.contactName}
              campaignId={ctx.call.campaignId ?? null}
            />
          )}

          {/* Skip & next — visible during wrap-up so a failed call
              (e.g. 31404 "Contact not found") doesn't trap the agent
              waiting on an outcome they didn't need to pick. */}
          {isWrapUp && ctx.callPhase !== 'outcome_done' && onDialNext && (
            <button
              type="button"
              onClick={onDialNext}
              disabled={!hasNextLead}
              className="inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] hover:bg-[#F3F3EE] px-3 py-2 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip & dial next
            </button>
          )}

          {isWrapUp && (
            <OutcomeSelector
              pipelineId={pipelineId}
              callId={callId}
              contactId={contactId}
            />
          )}

          {ctx.callPhase === 'outcome_done' && (
            <div className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[12px] rounded-[10px] px-3 py-2 flex items-center justify-between gap-3">
              <span>Outcome saved.</span>
              <button
                type="button"
                onClick={() => ctx.clearCall()}
                className="text-[12px] font-semibold text-[#1E9A80] hover:underline"
              >
                Close
              </button>
            </div>
          )}

          {/* Dial next lead — visible after outcome saved so Hugo can
              advance manually without waiting for auto-next pacing. */}
          {ctx.callPhase === 'outcome_done' && onDialNext && (
            <button
              type="button"
              onClick={onDialNext}
              disabled={!hasNextLead}
              className="w-full inline-flex items-center justify-center gap-1.5 text-[14px] font-semibold text-white bg-[#1E9A80] hover:bg-[#1E9A80]/90 px-3 py-2.5 rounded-[10px] shadow-[0_2px_8px_rgba(30,154,128,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Phone className="w-3.5 h-3.5" />
              {hasNextLead ? 'Dial next lead' : 'Queue empty'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PacingCountdown({
  deadlineMs,
  onDialNow,
}: {
  deadlineMs: number;
  onDialNow?: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const remainingSec = Math.max(0, Math.ceil((deadlineMs - now) / 1000));
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[12px] font-semibold">
      <Clock className="w-3.5 h-3.5" />
      Next call in {remainingSec}s
      {onDialNow && (
        <button
          type="button"
          onClick={onDialNow}
          className="inline-flex items-center gap-1 ml-1.5 px-2 py-0.5 rounded-[6px] bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90 text-[11px]"
        >
          <Zap className="w-3 h-3" />
          Dial now
        </button>
      )}
    </div>
  );
}

function PhaseBadge({ phase }: { phase: string }) {
  const tint = TINT[phase] ?? 'bg-[#F3F3EE] text-[#6B7280]';
  const label = LABEL[phase] ?? phase;
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${tint}`}
    >
      {label}
    </span>
  );
}

const LABEL: Record<string, string> = {
  dialing: 'Dialing',
  ringing: 'Ringing',
  in_call: 'Connected',
  stopped_waiting_outcome: 'Wrap-up',
  error_waiting_outcome: 'Call failed',
  outcome_submitting: 'Saving…',
  outcome_done: 'Done',
  paused: 'Paused',
};

const TINT: Record<string, string> = {
  dialing: 'bg-[#FEF3C7] text-[#92400E]',
  ringing: 'bg-[#FEF3C7] text-[#92400E]',
  in_call: 'bg-[#ECFDF5] text-[#1E9A80]',
  stopped_waiting_outcome: 'bg-[#F3F3EE] text-[#6B7280]',
  error_waiting_outcome: 'bg-[#FEF2F2] text-[#B91C1C]',
  outcome_submitting: 'bg-[#F3F3EE] text-[#6B7280]',
  outcome_done: 'bg-[#ECFDF5] text-[#1E9A80]',
  paused: 'bg-[#F3F3EE] text-[#6B7280]',
};
