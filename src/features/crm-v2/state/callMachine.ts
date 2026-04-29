// crm-v2 call lifecycle reducer — pure function.
//
// Tested in isolation (no React, no DOM, no Twilio). Side-effects live
// in DialerProvider. Every transition is justified inline so that the
// brittle 14-PR history of the old smsv2 reducer doesn't repeat itself.

import type { CallEvent, CallMachineState } from './callMachine.types';
import { INITIAL_STATE } from './callMachine.types';

const LIVE_PHASES: ReadonlySet<string> = new Set([
  'dialing',
  'ringing',
  'in_call',
]);
const WAITING_OUTCOME: ReadonlySet<string> = new Set([
  'stopped_waiting_outcome',
  'error_waiting_outcome',
]);

export function callMachine(
  state: CallMachineState,
  event: CallEvent
): CallMachineState {
  switch (event.type) {
    case 'START_CALL': {
      // Allowed from any non-live phase. Going live wipes the sticky
      // "no new leads" banner because by definition we found a new lead.
      if (LIVE_PHASES.has(state.callPhase as never)) return state;
      return {
        ...state,
        callPhase: 'dialing',
        roomView: 'open_full',
        call: event.call,
        error: null,
        reason: 'unknown',
        pacingDeadlineMs: null,
        noNewLeadsBanner: null,
        previewContactId: null,
        advanceIntent: 'idle', // intent fulfilled
      };
    }

    case 'CALL_ID_RESOLVED': {
      if (!state.call) return state;
      // Stamp callId without changing phase. Idempotent — if the same
      // id is dispatched twice the state is identical.
      if (state.call.callId === event.callId) return state;
      return { ...state, call: { ...state.call, callId: event.callId } };
    }

    case 'LEG_RINGING': {
      if (state.callPhase !== 'dialing') return state;
      return { ...state, callPhase: 'ringing' };
    }

    case 'CALL_ACCEPTED': {
      if (state.callPhase !== 'dialing' && state.callPhase !== 'ringing') {
        return state;
      }
      const call = state.call
        ? { ...state.call, startedAt: event.startedAt }
        : null;
      return { ...state, callPhase: 'in_call', call, reason: 'connected' };
    }

    case 'CALL_ENDED': {
      // Only meaningful from a live phase. Idempotent dispatches from
      // duplicate Twilio disconnect events are no-ops.
      if (!LIVE_PHASES.has(state.callPhase as never)) return state;
      return {
        ...state,
        callPhase: state.error
          ? 'error_waiting_outcome'
          : 'stopped_waiting_outcome',
        reason: event.reason,
        muted: false,
        lastEndedContactId: state.call?.contactId ?? state.lastEndedContactId,
      };
    }

    case 'CALL_ERROR': {
      // Live + fatal flips phase to error_waiting_outcome.
      // Live + non-fatal stashes the error but keeps phase.
      // Non-live + fatal is treated as a stash too (we won't kill UX).
      if (event.fatal && LIVE_PHASES.has(state.callPhase as never)) {
        return {
          ...state,
          callPhase: 'error_waiting_outcome',
          error: event.error,
          reason: event.reason ?? 'failed',
          muted: false,
          lastEndedContactId: state.call?.contactId ?? state.lastEndedContactId,
        };
      }
      return { ...state, error: event.error };
    }

    case 'OUTCOME_PICKED': {
      // Only from waiting-for-outcome states. The columnId itself is
      // not stored on the machine — the caller writes to wk_calls.
      if (!WAITING_OUTCOME.has(state.callPhase as never)) return state;
      return { ...state, callPhase: 'outcome_submitting' };
    }

    case 'OUTCOME_RESOLVED': {
      if (state.callPhase !== 'outcome_submitting') return state;
      return { ...state, callPhase: 'outcome_done' };
    }

    case 'OUTCOME_FAILED': {
      // Server write failed — flip to outcome_done so the agent isn't
      // trapped. Toast surfacing lives in the provider.
      if (state.callPhase !== 'outcome_submitting') return state;
      return { ...state, callPhase: 'outcome_done' };
    }

    case 'SKIP_REQUESTED': {
      // From waiting-for-outcome, no stage move; reducer flips to
      // outcome_done. Provider then triggers wk-leads-next.
      if (!WAITING_OUTCOME.has(state.callPhase as never)) return state;
      return { ...state, callPhase: 'outcome_done' };
    }

    case 'NEXT_CALL_EMPTY': {
      return {
        ...state,
        noNewLeadsBanner: {
          skippedAlreadyDialed: event.skippedAlreadyDialed,
        },
        pacingDeadlineMs: null,
        advanceIntent: 'idle',
      };
    }

    // ─── PR C.5 advance flow ────────────────────────────────────────
    case 'ADVANCE_REQUESTED': {
      // Refuse from live phases — never dial twice in parallel.
      if (LIVE_PHASES.has(state.callPhase as never)) return state;
      // From wrap-up: flip atomically through outcome_done + intent.
      // Agent's "Next" click is meant as: skip outcome AND advance.
      // The reducer expresses both in one tick so the effect downstream
      // sees a coherent state (no stateRef gymnastics).
      if (WAITING_OUTCOME.has(state.callPhase as never)) {
        return {
          ...state,
          callPhase: 'outcome_done',
          advanceIntent: 'pending',
          pacingDeadlineMs: null,
          noNewLeadsBanner: null,
        };
      }
      // From outcome_submitting: queue intent; the effect waits until
      // OUTCOME_RESOLVED / OUTCOME_FAILED lands before firing.
      if (state.callPhase === 'outcome_submitting') {
        return { ...state, advanceIntent: 'pending' };
      }
      // From outcome_done / idle / paused: just set the intent.
      return {
        ...state,
        advanceIntent: 'pending',
        pacingDeadlineMs: null,
        noNewLeadsBanner: null,
      };
    }

    case 'ADVANCE_FETCHING': {
      if (state.advanceIntent !== 'pending') return state;
      return { ...state, advanceIntent: 'fetching' };
    }

    case 'ADVANCE_RESOLVED': {
      if (state.advanceIntent === 'idle') return state;
      return { ...state, advanceIntent: 'idle' };
    }

    case 'PAUSE_MIRROR_CHANGED': {
      if (state.sessionPaused === event.paused) return state;
      // Pausing cancels any armed pacing deadline.
      return {
        ...state,
        sessionPaused: event.paused,
        pacingDeadlineMs: event.paused ? null : state.pacingDeadlineMs,
      };
    }

    case 'PACING_ARMED': {
      if (state.callPhase !== 'outcome_done') return state;
      if (state.sessionPaused) return state;
      return { ...state, pacingDeadlineMs: event.deadlineMs };
    }

    case 'PACING_CANCELLED': {
      if (state.pacingDeadlineMs === null) return state;
      return { ...state, pacingDeadlineMs: null };
    }

    case 'PACING_DEADLINE_TICK': {
      // Idempotent: clear the deadline; provider then dispatches
      // START_CALL after wk-leads-next resolves.
      return { ...state, pacingDeadlineMs: null };
    }

    case 'MUTE_CHANGED': {
      if (state.muted === event.muted) return state;
      return { ...state, muted: event.muted };
    }

    case 'OPEN_ROOM': {
      // Preview an old call — only from non-live phases.
      if (LIVE_PHASES.has(state.callPhase as never)) return state;
      return {
        ...state,
        roomView: 'open_full',
        previewContactId: event.contactId,
      };
    }

    case 'CLOSE_ROOM': {
      // Rule 6: hang up must not close the room. CLOSE_ROOM only fires
      // from the X button, and only when no live call exists.
      if (LIVE_PHASES.has(state.callPhase as never)) return state;
      return {
        ...state,
        roomView: 'closed',
        previewContactId: null,
        // Closing the room clears wrap-up phase too — the agent
        // explicitly walked away from the picker.
        callPhase: state.callPhase === 'idle' ? 'idle' : 'idle',
        call: null,
        error: null,
        reason: 'unknown',
        pacingDeadlineMs: null,
      };
    }

    case 'MINIMISE_ROOM': {
      if (state.roomView === 'closed') return state;
      return { ...state, roomView: 'open_min' };
    }

    case 'MAXIMISE_ROOM': {
      if (state.roomView === 'closed') return state;
      return { ...state, roomView: 'open_full' };
    }

    case 'CLEAR': {
      // Hard reset. Used by clearCall() and tests.
      return INITIAL_STATE;
    }

    default: {
      const _exhaustive: never = event;
      void _exhaustive;
      return state;
    }
  }
}

export { INITIAL_STATE };
