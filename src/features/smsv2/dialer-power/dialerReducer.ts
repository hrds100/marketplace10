// dialerReducer — pure power-dialer state machine.
//
// Cloned from the working caller dialer at
// src/features/caller/pages/DialerPage.tsx (which Hugo confirmed is
// the mechanism we want — see its commit on origin/caller-v1-deploy).
//
// Phases: idle → dialing → ringing → connected → wrap_up → idle
//   (wrapping back to idle is what triggers the auto-pacing effect.)
//   Plus `paused` as an explicit branch.
//
// No state-ref gymnastics. The reducer is the truth. Effects watch
// the phase and run side effects post-render.

export interface Lead {
  id: string;
  name: string;
  phone: string;
  queueId: string;
  pipelineColumnId: string | null;
}

export type Phase =
  | 'idle'
  | 'dialing'
  | 'ringing'
  | 'connected'
  | 'wrap_up'
  | 'paused';

export interface DialerState {
  phase: Phase;
  lead: Lead | null;
  callId: string | null;
  startedAt: number | null;
  error: string | null;
  endReason: string | null;
  pacingDeadlineMs: number | null;
  /** True once the agent has clicked Start at least once this session.
   *  The auto-pacing effect gates on this so it doesn't fire on first
   *  page load. */
  sessionStarted: boolean;
}

export const INITIAL_STATE: DialerState = {
  phase: 'idle',
  lead: null,
  callId: null,
  startedAt: null,
  error: null,
  endReason: null,
  pacingDeadlineMs: null,
  sessionStarted: false,
};

export type DialerAction =
  | { type: 'DIAL_START'; lead: Lead }
  | { type: 'DIAL_RESOLVED'; callId: string }
  | { type: 'RINGING' }
  | { type: 'CONNECTED' }
  | { type: 'CALL_ENDED'; reason: string; error?: string }
  | { type: 'OUTCOME_DONE' }
  | { type: 'PACING_ARMED'; deadlineMs: number }
  | { type: 'PACING_CLEARED' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' };

export function dialerReducer(s: DialerState, a: DialerAction): DialerState {
  switch (a.type) {
    case 'DIAL_START':
      return {
        ...s,
        phase: 'dialing',
        lead: a.lead,
        callId: null,
        startedAt: null,
        error: null,
        endReason: null,
        pacingDeadlineMs: null,
        sessionStarted: true,
      };

    case 'DIAL_RESOLVED':
      return { ...s, callId: a.callId };

    case 'RINGING':
      return s.phase === 'dialing' ? { ...s, phase: 'ringing' } : s;

    case 'CONNECTED':
      return s.phase === 'dialing' || s.phase === 'ringing'
        ? { ...s, phase: 'connected', startedAt: Date.now() }
        : s;

    case 'CALL_ENDED':
      if (
        s.phase !== 'dialing' &&
        s.phase !== 'ringing' &&
        s.phase !== 'connected'
      ) {
        return s;
      }
      return {
        ...s,
        phase: 'wrap_up',
        endReason: a.reason,
        error: a.error ?? null,
      };

    case 'OUTCOME_DONE':
      if (s.phase !== 'wrap_up') return s;
      return { ...s, phase: 'idle', error: null, endReason: null };

    case 'PACING_ARMED':
      return { ...s, pacingDeadlineMs: a.deadlineMs };

    case 'PACING_CLEARED':
      if (s.pacingDeadlineMs === null) return s;
      return { ...s, pacingDeadlineMs: null };

    case 'PAUSE':
      return { ...s, phase: 'paused', pacingDeadlineMs: null };

    case 'RESUME':
      return { ...s, phase: 'idle' };

    case 'STOP':
      return { ...INITIAL_STATE };

    default: {
      const _exhaust: never = a;
      void _exhaust;
      return s;
    }
  }
}
