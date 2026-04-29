// crm-v2 SessionControlBar — universal Pause / Resume / Skip / Next.
//
// One component. Mounted in HeroCard (overview, callPhase=idle) and
// will be mounted in InCallRoom footer (live phases) in PR C. The
// visibility matrix below is the SINGLE source of truth for which
// buttons render in which phase. No duplicates anywhere else.
//
// Hugo's universal-control rule (plan §8):
//   - Hang up always invokes synchronous endCall (PR 148 contract).
//   - Pause / Resume only flip session.paused — never affect Twilio.
//   - Skip + Next never block on async server work; only outcome
//     submission (~50–500 ms) disables them briefly.
//
// PR B note: this PR ships the bar with idle-only behaviour. The
// Hang up button + the in-call branches will activate in PR C when
// startCall / endCall side-effects move out of the smsv2 provider
// into the crm-v2 provider.

import { useEffect, useState } from 'react';
import { Phone, PhoneOff, Pause, Play, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDialer } from '../state/DialerProvider';

export interface SessionControlBarProps {
  /** 'lg' for InCallRoom footer (PR C), 'md' for HeroCard. */
  size?: 'md' | 'lg';
  className?: string;
  /** Head lead's contact id; used by Next/Skip from idle. */
  headLeadId?: string | null;
  /** Second-in-line lead id; used by Skip from idle. */
  secondLeadId?: string | null;
  /** When set (idle path only), called with the contact id to dial. */
  onDial?: (contactId: string) => void;
}

interface VisibilityRule {
  hangUp: boolean;
  pause: boolean;
  resume: boolean;
  skip: boolean;
  next: boolean;
  blockSkipNext: boolean;
  hangUpLabel: 'Hang up' | 'Cancel';
}

function rulesFor(args: {
  callPhase: string;
  sessionPaused: boolean;
}): VisibilityRule {
  const { callPhase, sessionPaused } = args;

  const isLive =
    callPhase === 'dialing' ||
    callPhase === 'ringing' ||
    callPhase === 'in_call';
  const isWrapUp =
    callPhase === 'stopped_waiting_outcome' ||
    callPhase === 'error_waiting_outcome';
  const isSubmitting = callPhase === 'outcome_submitting';
  const isDone = callPhase === 'outcome_done';

  return {
    hangUp: isLive,
    pause: !sessionPaused,
    resume: sessionPaused,
    skip: isLive || isWrapUp || isDone || callPhase === 'idle',
    next: isLive || isWrapUp || isSubmitting || isDone || callPhase === 'idle',
    blockSkipNext: isSubmitting,
    hangUpLabel:
      callPhase === 'dialing' || callPhase === 'ringing'
        ? 'Cancel'
        : 'Hang up',
  };
}

export default function SessionControlBar({
  size = 'md',
  className,
  headLeadId = null,
  secondLeadId = null,
  onDial,
}: SessionControlBarProps) {
  const ctx = useDialer();
  const rules = rulesFor({
    callPhase: ctx.callPhase,
    sessionPaused: ctx.session.paused,
  });

  // Countdown surface — when pacingDeadlineMs is set, render the
  // remaining seconds inside the Next call button.
  const deadline = ctx.pacingDeadlineMs;
  const [, setNow] = useState(0);
  useEffect(() => {
    if (deadline === null) return;
    const id = window.setInterval(() => setNow((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [deadline]);
  const remainingMs = deadline !== null ? deadline - Date.now() : null;
  const remainingSec =
    remainingMs !== null ? Math.max(0, Math.ceil(remainingMs / 1000)) : null;
  const showCountdown =
    rules.next && remainingSec !== null && remainingSec > 0 && !ctx.session.paused;

  const onSkip = async () => {
    if (ctx.callPhase === 'idle') {
      const target = secondLeadId ?? headLeadId;
      if (target && onDial) onDial(target);
      return;
    }
    // PR C: live + wrap-up + outcome_done all delegate to ctx.requestSkip
    // which: from wrap-up flips through outcome_done as 'skipped'; from
    // anywhere else falls through to requestNextCall.
    await ctx.requestSkip();
  };

  const onNext = async () => {
    if (ctx.callPhase === 'idle') {
      if (headLeadId && onDial) onDial(headLeadId);
      return;
    }
    // PR C: live → end call first.
    if (
      ctx.callPhase === 'dialing' ||
      ctx.callPhase === 'ringing' ||
      ctx.callPhase === 'in_call'
    ) {
      await ctx.endCall();
    }
    // PR C.2 (Hugo 2026-04-29): from any wrap-up state — including
    // `*_waiting_outcome` AND post-end-call — call requestSkip which
    // dispatches OUTCOME_PICKED('skipped') → OUTCOME_RESOLVED →
    // outcome_done THEN calls requestNextCall internally. Previously
    // we called requestNextCall directly, which silently returned
    // because it requires callPhase === 'outcome_done'. That was the
    // "Next button does nothing" bug.
    await ctx.requestSkip();
  };

  const onHangUp = async () => {
    await ctx.endCall();
  };

  // Keyboard shortcuts — H/P/R/S/N. Skip when typing in an input.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'h' && rules.hangUp) void onHangUp();
      else if (k === 'p' && rules.pause) ctx.pause();
      else if (k === 'r' && rules.resume) ctx.resume();
      else if (k === 's' && rules.skip && !rules.blockSkipNext) void onSkip();
      else if (k === 'n' && rules.next && !rules.blockSkipNext) void onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, rules, headLeadId, secondLeadId]);

  const lg = size === 'lg';
  const padX = lg ? 'px-4' : 'px-3';
  const padY = lg ? 'py-2' : 'py-1.5';
  const text = lg ? 'text-[13px]' : 'text-[12px]';

  return (
    <div
      data-testid="session-control-bar"
      data-call-phase={ctx.callPhase}
      data-session-paused={ctx.session.paused ? 'true' : 'false'}
      className={cn('flex items-center gap-2', className)}
    >
      {rules.hangUp && (
        <button
          onClick={() => void onHangUp()}
          className={cn(
            'flex items-center gap-2 rounded-[10px] font-semibold',
            'bg-[#EF4444] hover:bg-[#DC2626] text-white',
            padX,
            padY,
            text
          )}
          data-testid="control-hangup"
          title="Hang up (H)"
        >
          <PhoneOff className="w-4 h-4" />
          {rules.hangUpLabel}
        </button>
      )}

      {rules.pause && (
        <button
          onClick={() => ctx.pause()}
          className={cn(
            'flex items-center gap-2 rounded-[10px] font-medium',
            'border border-[#E5E7EB] bg-white text-[#1A1A1A] hover:bg-[#F3F3EE]',
            padX,
            padY,
            text
          )}
          data-testid="control-pause"
          title="Pause auto-next (P)"
        >
          <Pause className="w-3.5 h-3.5" />
          Pause
        </button>
      )}

      {rules.resume && (
        <button
          onClick={() => ctx.resume()}
          className={cn(
            'flex items-center gap-2 rounded-[10px] font-semibold',
            'bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white shadow-[0_4px_12px_rgba(30,154,128,0.35)]',
            padX,
            padY,
            text
          )}
          data-testid="control-resume"
          title="Resume (R)"
        >
          <Play className="w-3.5 h-3.5" />
          Resume
        </button>
      )}

      {rules.skip && (
        <button
          onClick={onSkip}
          disabled={rules.blockSkipNext}
          className={cn(
            'flex items-center gap-2 rounded-[10px] font-medium',
            'border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F3F3EE] disabled:opacity-50',
            padX,
            padY,
            text
          )}
          data-testid="control-skip"
          title="Skip (S)"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip
        </button>
      )}

      {rules.next && (
        <button
          onClick={onNext}
          disabled={rules.blockSkipNext}
          className={cn(
            'flex items-center gap-2 rounded-[10px] font-semibold',
            'bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white shadow-[0_4px_12px_rgba(30,154,128,0.35)] disabled:opacity-50',
            padX,
            padY,
            text
          )}
          data-testid="control-next"
          title="Next call (N)"
        >
          <Phone className="w-3.5 h-3.5" />
          Next call
          {showCountdown && (
            <span
              className="ml-0.5 px-1.5 py-0.5 rounded-md bg-white/25 text-white text-[10px] font-bold tabular-nums"
              data-testid="control-next-countdown"
              title="Auto-next in seconds"
            >
              {remainingSec}s
            </span>
          )}
        </button>
      )}
    </div>
  );
}
