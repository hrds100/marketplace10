// PR 138 (Hugo 2026-04-28): two-state-machine call lifecycle types.
//
// Six PRs (132-137) on the dialer were technically clean but the call
// lifecycle had grown 5+ sources of truth ("is a call alive?"), scattered
// booleans, and fire-and-forget setTimeouts. This file declares the
// formal state model that the reducer (callLifecycleReducer.ts) drives,
// so transitions are explicit and the rules Hugo gave us are
// STRUCTURALLY enforced (e.g. "stopped_waiting_outcome" cannot auto-
// advance — only an OUTCOME_PICKED event leaves it).
//
// Two independent machines:
//   A. callPhase   — what the call itself is doing (dial / ring / talk / done).
//   B. roomView    — whether the live-call screen is mounted full-screen,
//                    minimised, or closed. Hang-up does NOT touch this.
//
// previewMode is DERIVED — `roomView !== 'closed' && callPhase === 'idle'`.
// No new boolean.

/** Fine-grained call phase. The legacy `phase` (idle / placing / in_call /
 *  post_call) consumed by existing components is mapped from this in
 *  ActiveCallContext for backwards compatibility. */
export type CallPhase =
  | 'idle'
  | 'dialing'
  | 'ringing'
  | 'in_call'
  | 'stopped_waiting_outcome'
  | 'error_waiting_outcome'
  | 'outcome_submitting'
  | 'outcome_done';

/** Whether the live-call room is mounted. Hang-up does not change this —
 *  Rule 6: "Stop / Hang up must NOT close the room." */
export type RoomView = 'closed' | 'open_full' | 'open_min';

/** Pure metadata for Phase 2 (rules engine). Computed at end-of-call from
 *  Twilio's reported status / errorCode / amdResult / duration. NOT
 *  consumed yet — do not auto-act on it, do not show it in the UI. */
export type TelephonySignal =
  | 'human_picked_up'
  | 'voicemail_detected'
  | 'busy'
  | 'no_answer'
  | 'invalid_number'
  | 'unreachable'
  | 'agent_canceled'
  | 'connected_unknown_outcome'
  | null;

/** The contact attached to the active call. Same shape as the legacy
 *  ActiveCall — kept here for the reducer to reference. */
export interface ActiveCall {
  contactId: string;
  contactName: string;
  phone: string;
  startedAt: number;
  callId?: string | null;
  campaignId?: string | null;
}

/** Twilio fatal error mapped to a friendly message (see twilioErrorMap.ts). */
export interface CallError {
  code: number;
  friendlyMessage: string;
}

/** Inputs used to compute a TelephonySignal at end-of-call. The reducer
 *  asks the helper to derive a signal from this whenever it transitions
 *  into stopped_waiting_outcome / error_waiting_outcome. */
export interface TelephonyInputs {
  twilioStatus?: string | null;
  amdResult?: string | null;
  errorCode?: number | null;
  durationSec?: number | null;
  /** True iff the agent clicked Cancel before the call ever connected. */
  userCanceled?: boolean;
}

/** The whole reducer state. */
export interface CallLifecycleState {
  callPhase: CallPhase;
  roomView: RoomView;
  call: ActiveCall | null;
  previewContactId: string | null;
  lastEndedContactId: string | null;
  muted: boolean;
  error: CallError | null;
  /** Phase 2 metadata — set on transition into *_waiting_outcome. */
  dispositionSignal: TelephonySignal;
}

// ────────────────────────────────────────────────────────────────────────
// Events — the discriminated union the reducer accepts.
// ────────────────────────────────────────────────────────────────────────

export type CallLifecycleEvent =
  // ─── Lifecycle (call) ───────────────────────────────────────────────
  | {
      type: 'START_CALL';
      call: ActiveCall;
    }
  | {
      type: 'CALL_ID_RESOLVED';
      callId: string;
    }
  | {
      type: 'LEG_RINGING';
    }
  | {
      type: 'CALL_ACCEPTED';
      /** Twilio fires 'accept' — startedAt may be re-anchored here. */
      startedAt: number;
    }
  | {
      type: 'CALL_ENDED';
      /** What ended the call. Used to compute dispositionSignal. */
      reason:
        | 'user_hangup'
        | 'no_answer'
        | 'twilio_disconnect'
        | 'twilio_cancel'
        | 'twilio_reject';
      telephony?: TelephonyInputs;
    }
  | {
      type: 'CALL_ERROR';
      error: CallError;
      /** Whether Twilio reported a fatal error (forces error_waiting_outcome). */
      fatal: boolean;
      telephony?: TelephonyInputs;
    }
  | {
      type: 'OUTCOME_PICKED';
      columnId: string;
    }
  | {
      type: 'OUTCOME_RESOLVED';
    }
  | {
      type: 'NEXT_CALL_REQUESTED';
      call: ActiveCall;
    }
  // ─── Inbound ────────────────────────────────────────────────────────
  | {
      type: 'INBOUND_ANSWERED';
      call: ActiveCall;
    }
  | {
      type: 'WINNER_BROADCAST';
      call: ActiveCall;
    }
  // ─── Mute ───────────────────────────────────────────────────────────
  | {
      type: 'MUTE_CHANGED';
      muted: boolean;
    }
  // ─── Room visibility ────────────────────────────────────────────────
  | {
      type: 'OPEN_ROOM';
      contactId: string;
    }
  | {
      type: 'CLOSE_ROOM';
    }
  | {
      type: 'MINIMISE_ROOM';
    }
  | {
      type: 'MAXIMISE_ROOM';
    }
  // ─── Misc ──────────────────────────────────────────────────────────
  | {
      type: 'ENTER_DIALING_PLACEHOLDER';
      call: ActiveCall;
    }
  | {
      type: 'CLEAR';
    };

/** The initial state for a fresh provider mount. */
export const INITIAL_STATE: CallLifecycleState = {
  callPhase: 'idle',
  roomView: 'closed',
  call: null,
  previewContactId: null,
  lastEndedContactId: null,
  muted: false,
  error: null,
  dispositionSignal: null,
};
