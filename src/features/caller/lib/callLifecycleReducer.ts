// Caller — pure call-lifecycle reducer.
// Copied verbatim from src/features/smsv2/lib/callLifecycleReducer.ts
// (Hugo's PR 138-150 surface). Logic unchanged so the unit tests + state
// machine guarantees carry forward without a re-debug cycle. See
// docs/caller/DECISIONS.md (D2 — reuse the backend) for rationale.

import type {
  CallLifecycleEvent,
  CallLifecycleState,
  CallPhase,
  TelephonyInputs,
  TelephonySignal,
} from './callLifecycleReducer.types';
import { INITIAL_STATE } from './callLifecycleReducer.types';

export function computeDispositionSignal(input: TelephonyInputs): TelephonySignal {
  const { twilioStatus, amdResult, errorCode, durationSec, userCanceled } = input;

  if (userCanceled) return 'agent_canceled';

  if (errorCode === 13224) return 'invalid_number';
  if (errorCode === 31000 || errorCode === 31005 || errorCode === 31009) {
    return 'unreachable';
  }
  if (errorCode === 31404 || errorCode === 31480) {
    return 'unreachable';
  }

  if (twilioStatus === 'busy') return 'busy';
  if (twilioStatus === 'no-answer') return 'no_answer';

  if (amdResult && /machine|fax/i.test(amdResult)) return 'voicemail_detected';

  if (twilioStatus === 'completed') {
    if (
      typeof durationSec === 'number' &&
      durationSec < 3 &&
      amdResult &&
      /machine/i.test(amdResult)
    ) {
      return 'voicemail_detected';
    }
    if (typeof durationSec === 'number' && durationSec >= 5) {
      return 'human_picked_up';
    }
  }

  if (typeof durationSec === 'number' && durationSec > 0) {
    return 'connected_unknown_outcome';
  }

  return null;
}

export function callLifecycleReducer(
  state: CallLifecycleState,
  event: CallLifecycleEvent
): CallLifecycleState {
  switch (event.type) {
    case 'START_CALL': {
      return {
        ...state,
        callPhase: 'dialing',
        roomView: 'open_full',
        call: event.call,
        previewContactId: null,
        muted: false,
        error: null,
        dispositionSignal: null,
      };
    }

    case 'CALL_ID_RESOLVED': {
      if (!state.call) return state;
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
      return {
        ...state,
        callPhase: 'in_call',
        call: state.call ? { ...state.call, startedAt: event.startedAt } : null,
      };
    }

    case 'CALL_ENDED': {
      const wasLive =
        state.callPhase === 'dialing' ||
        state.callPhase === 'ringing' ||
        state.callPhase === 'in_call';
      if (!wasLive) return state;

      const stashedErrorCode = state.error?.code ?? null;
      const dispositionSignal = computeDispositionSignal({
        ...(event.telephony ?? {}),
        errorCode: event.telephony?.errorCode ?? stashedErrorCode,
        userCanceled:
          event.telephony?.userCanceled ??
          (event.reason === 'twilio_cancel' ||
            (event.reason === 'user_hangup' && state.callPhase !== 'in_call')),
      });

      const targetPhase: CallLifecycleState['callPhase'] = state.error
        ? 'error_waiting_outcome'
        : 'stopped_waiting_outcome';

      return {
        ...state,
        callPhase: targetPhase,
        lastEndedContactId: state.call?.contactId ?? state.lastEndedContactId,
        dispositionSignal,
      };
    }

    case 'CALL_ERROR': {
      const isLive =
        state.callPhase === 'dialing' ||
        state.callPhase === 'ringing' ||
        state.callPhase === 'in_call';
      if (!isLive) {
        return state;
      }
      if (!event.fatal) {
        return { ...state, error: event.error };
      }
      const dispositionSignal = computeDispositionSignal(
        event.telephony ?? { errorCode: event.error.code }
      );
      return {
        ...state,
        callPhase: 'error_waiting_outcome',
        error: event.error,
        lastEndedContactId: state.call?.contactId ?? state.lastEndedContactId,
        dispositionSignal,
      };
    }

    case 'OUTCOME_PICKED': {
      if (
        state.callPhase !== 'stopped_waiting_outcome' &&
        state.callPhase !== 'error_waiting_outcome'
      ) {
        return state;
      }
      return { ...state, callPhase: 'outcome_submitting' };
    }

    case 'OUTCOME_RESOLVED': {
      if (state.callPhase !== 'outcome_submitting') return state;
      return { ...state, callPhase: 'outcome_done' };
    }

    case 'OUTCOME_FAILED': {
      if (state.callPhase !== 'outcome_submitting') return state;
      return { ...state, callPhase: 'outcome_done' };
    }

    case 'NEXT_CALL_REQUESTED': {
      if (state.callPhase !== 'outcome_done') return state;
      return {
        ...state,
        callPhase: 'dialing',
        roomView: 'open_full',
        call: event.call,
        muted: false,
        error: null,
        dispositionSignal: null,
        pendingNextCall: 'idle',
        pacingDeadlineMs: null,
        noNewLeadsBanner: false,
      };
    }

    case 'NEXT_CALL_EMPTY': {
      if (state.callPhase !== 'outcome_done') return state;
      return {
        ...state,
        pendingNextCall: 'idle',
        pacingDeadlineMs: null,
        noNewLeadsBanner: true,
      };
    }

    case 'SKIP_REQUESTED': {
      if (
        state.callPhase !== 'stopped_waiting_outcome' &&
        state.callPhase !== 'error_waiting_outcome'
      ) {
        return state;
      }
      return { ...state, callPhase: 'outcome_done' };
    }

    case 'PAUSE_REQUESTED': {
      if (state.sessionPaused && state.callPhase !== 'outcome_done') {
        return state;
      }
      const cancelled =
        state.pendingNextCall !== 'idle' || state.pacingDeadlineMs !== null;
      const nextPhase: CallPhase =
        state.callPhase === 'outcome_done' ? 'paused' : state.callPhase;
      if (
        state.sessionPaused &&
        state.callPhase === nextPhase &&
        !cancelled
      ) {
        return state;
      }
      return {
        ...state,
        sessionPaused: true,
        callPhase: nextPhase,
        pendingNextCall: 'idle',
        pacingDeadlineMs: null,
      };
    }

    case 'RESUME_REQUESTED': {
      if (!state.sessionPaused && state.callPhase !== 'paused') {
        return state;
      }
      const nextPhase: CallPhase =
        state.callPhase === 'paused'
          ? state.call
            ? 'outcome_done'
            : 'idle'
          : state.callPhase;
      return {
        ...state,
        sessionPaused: false,
        callPhase: nextPhase,
      };
    }

    case 'PACING_ARMED': {
      if (state.callPhase !== 'outcome_done') return state;
      return {
        ...state,
        pendingNextCall: 'armed',
        pacingDeadlineMs: event.deadlineMs,
      };
    }

    case 'PACING_CANCELLED': {
      if (state.pendingNextCall === 'idle' && state.pacingDeadlineMs === null) {
        return state;
      }
      return { ...state, pendingNextCall: 'idle', pacingDeadlineMs: null };
    }

    case 'PACING_DEADLINE_TICK': {
      if (state.pendingNextCall !== 'armed') return state;
      return { ...state, pendingNextCall: 'cooling_down' };
    }

    case 'INBOUND_ANSWERED':
    case 'WINNER_BROADCAST': {
      return {
        ...state,
        callPhase: 'in_call',
        roomView: 'open_full',
        call: event.call,
        muted: false,
        error: null,
        dispositionSignal: null,
        previewContactId: null,
      };
    }

    case 'MUTE_CHANGED': {
      if (state.muted === event.muted) return state;
      return { ...state, muted: event.muted };
    }

    case 'OPEN_ROOM': {
      const isLive =
        state.callPhase === 'dialing' ||
        state.callPhase === 'ringing' ||
        state.callPhase === 'in_call';
      if (isLive) return state;
      return {
        ...state,
        callPhase: 'idle',
        roomView: 'open_full',
        previewContactId: event.contactId,
        call: null,
        error: null,
        dispositionSignal: null,
      };
    }

    case 'CLOSE_ROOM': {
      if (
        state.callPhase === 'dialing' ||
        state.callPhase === 'ringing' ||
        state.callPhase === 'in_call'
      ) {
        return state;
      }
      const isPostCall =
        state.callPhase === 'stopped_waiting_outcome' ||
        state.callPhase === 'error_waiting_outcome' ||
        state.callPhase === 'outcome_submitting' ||
        state.callPhase === 'outcome_done';
      if (isPostCall) {
        return {
          ...state,
          roomView: 'closed',
          callPhase: 'idle',
          call: null,
          previewContactId: null,
          error: null,
          dispositionSignal: null,
        };
      }
      return {
        ...state,
        roomView: 'closed',
        previewContactId: null,
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

    case 'ENTER_DIALING_PLACEHOLDER': {
      return {
        ...state,
        callPhase: 'dialing',
        roomView: 'open_full',
        call: event.call,
        previewContactId: null,
        muted: false,
        error: null,
        dispositionSignal: null,
      };
    }

    case 'CLEAR': {
      return { ...INITIAL_STATE, lastEndedContactId: state.lastEndedContactId };
    }

    default: {
      const _exhaustive: never = event;
      return state;
    }
  }
}

export function mapToLegacyPhase(
  callPhase: CallLifecycleState['callPhase']
): 'idle' | 'placing' | 'in_call' | 'post_call' {
  switch (callPhase) {
    case 'idle':
      return 'idle';
    case 'dialing':
    case 'ringing':
      return 'placing';
    case 'in_call':
      return 'in_call';
    case 'stopped_waiting_outcome':
    case 'error_waiting_outcome':
    case 'outcome_submitting':
    case 'outcome_done':
      return 'post_call';
    case 'paused':
      return 'post_call';
  }
}
