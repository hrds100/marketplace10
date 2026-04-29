// PR 152 (Hugo 2026-04-29): the universal agent control bar.
//
// One component, two mounts:
//  - InCallRoom footer (when roomView=open_full).
//  - HeroCard on the v3 overview page (when roomView=closed) — landing
//    in PR 153.
//
// Hugo's universal-control non-negotiables (plan §8):
//  - Hang up / Pause / Resume / Skip / Next call must remain reachable
//    in EVERY phase where the rule says they apply.
//  - Visibility matrix is per-phase (see VISIBILITY_RULES below).
//  - Hang up always invokes synchronous endCall() (PR 148 contract).
//  - Pause / Resume only act on sessionPaused — never affect Twilio.
//  - Buttons NEVER block on async server work. The only short disable
//    window is `outcome_submitting` (~50–500 ms typical).
//  - Keyboard shortcuts: H = hang up, S = skip, N = next, P = pause,
//    R = resume. Shortcuts fire from anywhere (handled in this
//    component via window keydown listener).

import { useEffect } from 'react';
import { Phone, PhoneOff, Pause, Play, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveCallCtx } from '../../live-call/ActiveCallContext';
import { useDialerSession } from '../../../hooks/useDialerSession';

export interface SessionControlBarProps {
  /** Visual size — 'lg' for the in-call room footer, 'md' for the
   *  HeroCard on the overview page. */
  size?: 'md' | 'lg';
  className?: string;
}

interface VisibilityRule {
  hangUp: boolean;
  pause: boolean;
  resume: boolean;
  skip: boolean;
  next: boolean;
  /** Disable Skip + Next during outcome_submitting to race-protect the
   *  outcome write (PR 148 contract). */
  blockSkipNext: boolean;
  /** Hang up label changes mid-ringing (Cancel) vs in-call (Hang up). */
  hangUpLabel: 'Hang up' | 'Cancel';
}

function rulesFor(args: {
  callPhase: string;
  sessionPaused: boolean;
}): VisibilityRule {
  const { callPhase, sessionPaused } = args;

  // Call-phase 'paused' (between calls): only Resume.
  if (callPhase === 'paused') {
    return {
      hangUp: false,
      pause: false,
      resume: true,
      skip: false,
      next: false,
      blockSkipNext: false,
      hangUpLabel: 'Hang up',
    };
  }

  const isLive =
    callPhase === 'dialing' ||
    callPhase === 'ringing' ||
    callPhase === 'in_call';
  const isWrapUp =
    callPhase === 'stopped_waiting_outcome' ||
    callPhase === 'error_waiting_outcome';
  const isSubmitting = callPhase === 'outcome_submitting';
  const isDone = callPhase === 'outcome_done';

  // Pause / Resume mirror the session flag (Hugo: "agent intent always
  // wins"). When sessionPaused=true mid-call, the live call UI still
  // shows Resume so the agent can re-arm auto-next.
  const pauseShown = !sessionPaused;
  const resumeShown = sessionPaused;

  return {
    hangUp: isLive,
    pause: pauseShown,
    resume: resumeShown,
    skip: isLive || isWrapUp || isDone || callPhase === 'idle',
    next: isLive || isWrapUp || isSubmitting || isDone || callPhase === 'idle',
    blockSkipNext: isSubmitting,
    hangUpLabel:
      callPhase === 'dialing' || callPhase === 'ringing' ? 'Cancel' : 'Hang up',
  };
}

export default function SessionControlBar({
  size = 'lg',
  className,
}: SessionControlBarProps) {
  const ctx = useActiveCallCtx();
  const session = useDialerSession();
  const rules = rulesFor({
    callPhase: ctx.callPhase,
    sessionPaused: session.paused,
  });

  // PR 152: keyboard shortcuts. Listen at window level, but ignore
  // when an input/textarea/contenteditable has focus (so typing notes
  // doesn't accidentally hang up). H = hang up (live phases only).
  // S = skip; N = next; P = pause; R = resume. Each gates on its own
  // visibility rule so the agent can't trigger an action whose button
  // isn't visible (Hugo's universal-control matrix is the truth).
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
      if (k === 'h' && rules.hangUp) {
        void ctx.endCall();
      } else if (k === 'p' && rules.pause) {
        ctx.requestPause();
      } else if (k === 'r' && rules.resume) {
        ctx.requestResume();
      } else if (k === 's' && rules.skip && !rules.blockSkipNext) {
        void ctx.requestSkip();
      } else if (k === 'n' && rules.next && !rules.blockSkipNext) {
        void ctx.requestNextCall();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ctx, rules]);

  const lg = size === 'lg';
  const padX = lg ? 'px-4' : 'px-3';
  const padY = lg ? 'py-2' : 'py-1.5';
  const text = lg ? 'text-[13px]' : 'text-[12px]';

  return (
    <div
      data-testid="session-control-bar"
      data-call-phase={ctx.callPhase}
      data-session-paused={session.paused ? 'true' : 'false'}
      className={cn('flex items-center gap-2', className)}
    >
      {rules.hangUp && (
        <button
          onClick={async () => {
            await ctx.endCall();
          }}
          className={cn(
            'flex items-center gap-2 rounded-[10px] font-semibold',
            'bg-[#EF4444] hover:bg-[#DC2626] text-white',
            padX,
            padY,
            text
          )}
          data-testid="control-hangup"
        >
          <PhoneOff className="w-4 h-4" />
          {rules.hangUpLabel}
        </button>
      )}

      {rules.pause && (
        <button
          onClick={() => ctx.requestPause()}
          className={cn(
            'flex items-center gap-2 rounded-[10px] font-medium',
            'border border-[#E5E7EB] bg-white text-[#1A1A1A] hover:bg-[#F3F3EE]',
            padX,
            padY,
            text
          )}
          data-testid="control-pause"
          title="Pause auto-next pacing (P)"
        >
          <Pause className="w-3.5 h-3.5" />
          Pause
        </button>
      )}

      {rules.resume && (
        <button
          onClick={() => ctx.requestResume()}
          className={cn(
            'flex items-center gap-2 rounded-[10px] font-semibold',
            'bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white shadow-[0_4px_12px_rgba(30,154,128,0.35)]',
            padX,
            padY,
            text
          )}
          data-testid="control-resume"
          title="Resume session (R)"
        >
          <Play className="w-3.5 h-3.5" />
          Resume
        </button>
      )}

      {rules.skip && (
        <button
          onClick={() => void ctx.requestSkip()}
          disabled={rules.blockSkipNext}
          className={cn(
            'flex items-center gap-2 rounded-[10px] font-medium',
            'border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F3F3EE] disabled:opacity-50',
            padX,
            padY,
            text
          )}
          data-testid="control-skip"
          title="Skip this lead (S)"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip
        </button>
      )}

      {rules.next && (
        <button
          onClick={() => void ctx.requestNextCall()}
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
        </button>
      )}
    </div>
  );
}
