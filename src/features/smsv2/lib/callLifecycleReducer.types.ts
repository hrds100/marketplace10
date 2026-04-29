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
 *  ActiveCallContext for backwards compatibility.
 *
 *  PR 149 (Hugo 2026-04-29): `paused` added as a CALL-PHASE state. It is
 *  reachable only from `outcome_done` (after a Pause click while the
 *  agent is between calls) and exits to `outcome_done` (or `idle` if no
 *  prior call) on Resume. Distinct from `sessionPaused` (a session flag,
 *  see CallLifecycleState below) — `paused` is a discrete dialer phase,
 *  `sessionPaused` is a flag that can be true in any phase to gate
 *  auto-next pacing without changing the call lifecycle. */
export type CallPhase =
  | 'idle'
  | 'dialing'
  | 'ringing'
  | 'in_call'
  | 'stopped_waiting_outcome'
  | 'error_waiting_outcome'
  | 'outcome_submitting'
  | 'outcome_done'
  | 'paused';

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

/** PR 149 (Hugo 2026-04-29): pacing state for the auto-next timer.
 *  - 'idle'         — no pacing timer pending.
 *  - 'armed'        — timer scheduled; deadline is `pacingDeadlineMs`.
 *  - 'cooling_down' — deadline reached and PACING_DEADLINE_TICK fired,
 *                     waiting for the new dial to start (avoids re-arming).
 *  Cancelled on any state change away from outcome_done. */
export type PendingNextCall = 'idle' | 'armed' | 'cooling_down';

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
  /** PR 149 (Hugo 2026-04-29): pacing-timer status mirror. The actual
   *  setTimeout lives in ActiveCallContext; this tells the reducer (and
   *  any consumer) whether a timer is currently armed. */
  pendingNextCall: PendingNextCall;
  /** PR 149: when set, the absolute ms timestamp at which the auto-next
   *  pacing timer is scheduled to fire. Drives the visible countdown
   *  in the badge during outcome_done. Null when no timer is armed. */
  pacingDeadlineMs: number | null;
  /** PR 149: session-level pause flag mirrored from dialerSessionStore.
   *  When true, the pacing timer is cancelled / never armed and the
   *  session bar shows "Paused — Resume to continue". Distinct from
   *  CallPhase 'paused' (an explicit phase reachable from outcome_done
   *  while idle); sessionPaused can be true in ANY phase. */
  sessionPaused: boolean;
  /** PR 149: when NEXT_CALL_EMPTY fires, sticky banner stays up until the
   *  next agent action. Cleared on every other transition. */
  noNewLeadsBanner: boolean;
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
  // PR 150 (Hugo 2026-04-29): outcome write failed (e.g. wk-outcome-apply
  // returned 5xx). Reducer flips outcome_submitting → outcome_done so the
  // agent isn't trapped on a spinning button. UI surface a toast.
  | {
      type: 'OUTCOME_FAILED';
      message: string;
    }
  | {
      type: 'NEXT_CALL_REQUESTED';
      call: ActiveCall;
    }
  // PR 150 (Hugo 2026-04-29): wk-leads-next returned no claimable lead
  // (queue empty or all already-dialed-this-session). Stay in
  // outcome_done; flip noNewLeadsBanner so the OverviewHeader / sticky
  // banner can render.
  | {
      type: 'NEXT_CALL_EMPTY';
      skippedAlreadyDialed: number;
    }
  // PR 150: agent Skip — applies a no-stage-move outcome and moves on.
  // From *_waiting_outcome we transition straight to outcome_done.
  // Context follows up with NEXT_CALL_REQUESTED.
  | {
      type: 'SKIP_REQUESTED';
    }
  // PR 150: session pacing flag toggle. PAUSE sets sessionPaused=true,
  // cancels any armed timer. From outcome_done while idle, transitions
  // callPhase to 'paused'. RESUME clears the flag and exits 'paused'.
  | {
      type: 'PAUSE_REQUESTED';
    }
  | {
      type: 'RESUME_REQUESTED';
    }
  // PR 150: pacing-timer status mirror events. The actual setTimeout
  // lives in ActiveCallContext (PR 151). The reducer just stores the
  // status + deadline so the UI can render the visible countdown.
  | {
      type: 'PACING_ARMED';
      deadlineMs: number;
    }
  | {
      type: 'PACING_CANCELLED';
    }
  | {
      type: 'PACING_DEADLINE_TICK';
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
  // PR 149 — defaults chosen so existing reducer behaviour is unchanged
  // when the new fields are not yet read by any case (pacing wiring lands
  // in PR 150 with the new event handlers). All consumers that destructure
  // INITIAL_STATE keep working.
  pendingNextCall: 'idle',
  pacingDeadlineMs: null,
  sessionPaused: false,
  noNewLeadsBanner: false,
};
