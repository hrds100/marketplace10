// PR 138 (Hugo 2026-04-28): pure reducer for the dialer call lifecycle.
//
// Inputs: current state + event. Output: next state. NO side effects, NO
// React, NO Twilio imports — that lets us unit-test exhaustively and
// reason about transitions in isolation.
//
// Hugo's 10 rules are enforced HERE — most via the absence of
// transitions:
//   Rule 2 (no countdown)        — no event listed flips OUT of
//                                   *_waiting_outcome on a timer.
//   Rule 3 (no auto-advance)     — same.
//   Rule 4 (no auto-outcome)     — same. OUTCOME_PICKED is the only
//                                   exit path from *_waiting_outcome.
//   Rule 5 (stay on contact)     — CALL_ENDED never sets call=null;
//                                   it only flips callPhase.
//   Rule 6 (hang-up doesn't      — CALL_ENDED does not touch roomView.
//           close room)
//
// All other rules (1, 7, 8, 9, 10) are enforced by consumers — see PR
// 138 plan.

import type {
  CallLifecycleEvent,
  CallLifecycleState,
  TelephonyInputs,
  TelephonySignal,
} from './callLifecycleReducer.types';
import { INITIAL_STATE } from './callLifecycleReducer.types';

/** Compute the Phase-2 dispositionSignal from raw Twilio inputs.
 *  THIS IS METADATA — never auto-acted on. The agent picks the outcome.
 *  See PR 138 brief, "TelephonySignal" section. */
export function computeDispositionSignal(input: TelephonyInputs): TelephonySignal {
  const { twilioStatus, amdResult, errorCode, durationSec, userCanceled } = input;

  if (userCanceled) return 'agent_canceled';

  if (errorCode === 13224) return 'invalid_number';
  if (errorCode === 31000 || errorCode === 31005 || errorCode === 31009) {
    return 'unreachable';
  }

  if (twilioStatus === 'busy') return 'busy';
  if (twilioStatus === 'no-answer') return 'no_answer';

  // AMD machine result — voicemail detected explicitly.
  if (amdResult && /machine|fax/i.test(amdResult)) return 'voicemail_detected';

  if (twilioStatus === 'completed') {
    // Very short answered-by-machine durations also → voicemail.
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

/** Pure reducer — every transition listed explicitly. */
export function callLifecycleReducer(
  state: CallLifecycleState,
  event: CallLifecycleEvent
): CallLifecycleState {
  switch (event.type) {
    // ─── Lifecycle ────────────────────────────────────────────────────
    case 'START_CALL': {
      // Manual dial. Transitions to dialing regardless of prior phase
      // (consumer is expected to have ended any prior call first).
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
      return {
        ...state,
        call: { ...state.call, callId: event.callId },
      };
    }

    case 'LEG_RINGING': {
      if (state.callPhase !== 'dialing') return state;
      return { ...state, callPhase: 'ringing' };
    }

    case 'CALL_ACCEPTED': {
      // Only meaningful while we're still trying to connect.
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
      // Rule 5: stay on the contact. We do NOT clear `call`.
      // Rule 6: hang-up does NOT touch `roomView`.
      // We accept this from any "live" phase; if we're already past it
      // (i.e. already waiting for outcome) it's a no-op.
      const wasLive =
        state.callPhase === 'dialing' ||
        state.callPhase === 'ringing' ||
        state.callPhase === 'in_call';
      if (!wasLive) return state;

      const dispositionSignal = computeDispositionSignal({
        ...(event.telephony ?? {}),
        userCanceled:
          event.telephony?.userCanceled ??
          (event.reason === 'twilio_cancel' ||
            (event.reason === 'user_hangup' && state.callPhase !== 'in_call')),
      });

      return {
        ...state,
        callPhase: 'stopped_waiting_outcome',
        lastEndedContactId: state.call?.contactId ?? state.lastEndedContactId,
        dispositionSignal,
      };
    }

    case 'CALL_ERROR': {
      // Fatal Twilio error — flip to error_waiting_outcome. Non-fatal
      // errors only stash the error (UI may show a banner).
      if (!event.fatal) {
        return { ...state, error: event.error };
      }
      const wasLive =
        state.callPhase === 'dialing' ||
        state.callPhase === 'ringing' ||
        state.callPhase === 'in_call';
      if (!wasLive) {
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
      // Only valid from *_waiting_outcome. The agent's pick is the
      // ONLY exit from these states (Rules 3, 4, 5).
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

    case 'NEXT_CALL_REQUESTED': {
      // Only valid from outcome_done. Starts a fresh dial.
      if (state.callPhase !== 'outcome_done') return state;
      return {
        ...state,
        callPhase: 'dialing',
        roomView: 'open_full',
        call: event.call,
        muted: false,
        error: null,
        dispositionSignal: null,
        // We keep lastEndedContactId so PostCall back-nav still works
        // until the new call ends.
      };
    }

    // ─── Inbound / winner ─────────────────────────────────────────────
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

    // ─── Mute ─────────────────────────────────────────────────────────
    case 'MUTE_CHANGED': {
      if (state.muted === event.muted) return state;
      return { ...state, muted: event.muted };
    }

    // ─── Room ─────────────────────────────────────────────────────────
    case 'OPEN_ROOM': {
      // Preview mode only valid when nothing is live. If a call is
      // active, this is a no-op — the live call's room is already up.
      if (state.callPhase !== 'idle') return state;
      return {
        ...state,
        roomView: 'open_full',
        previewContactId: event.contactId,
      };
    }

    case 'CLOSE_ROOM': {
      // Rule 6: cannot close while live. Reducer enforces it.
      if (
        state.callPhase === 'dialing' ||
        state.callPhase === 'ringing' ||
        state.callPhase === 'in_call'
      ) {
        return state;
      }
      // Closing fully resets — preview clears, room hidden.
      // If the user closes after outcome_done, drop the call too.
      if (state.callPhase === 'outcome_done') {
        return {
          ...state,
          roomView: 'closed',
          call: null,
          previewContactId: null,
          callPhase: 'idle',
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
      // Used by DialerPage right after wk-dialer-start. Identical
      // observable shape to START_CALL, but doesn't trigger Twilio.connect.
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
      // Hard reset — used by clearCall (legacy API). Loses error +
      // dispositionSignal too.
      return { ...INITIAL_STATE, lastEndedContactId: state.lastEndedContactId };
    }

    default: {
      // Exhaustiveness guard — TS will yell if a new event type is
      // added without a switch arm.
      const _exhaustive: never = event;
      return state;
    }
  }
}

/** Map the new fine-grained `callPhase` to the legacy 4-state `phase`
 *  shape that current consumers (LiveCallScreen, PostCallPanel,
 *  Softphone, RecentCallsPanel) read. */
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
  }
}
