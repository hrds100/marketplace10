// crm-v2 call lifecycle state machine — pure types.
//
// Two orthogonal axes drive the dialer experience:
//  - CallPhase  — where we are in the call lifecycle (server-truth aligned).
//  - RoomView   — whether the in-call room is visible (UI concern only).
//
// Hugo's invariants (carried over from the lessons of PRs 138–155):
//  1. Hang up changes CallPhase but never RoomView.
//  2. Minimise/Close changes RoomView but never CallPhase.
//  3. No auto-advance via timer inside the reducer; pacing lives in the
//     session store. The reducer just exposes `pacingDeadlineMs` so UI
//     can render a countdown.
//  4. `sessionPaused` is a flag mirrored from sessionStore — it does NOT
//     transition CallPhase. Pause is a session concept; the reducer
//     gates auto-next on it via a side-effect, not by changing phase.

export type CallPhase =
  | 'idle'
  | 'dialing'
  | 'ringing'
  | 'in_call'
  | 'stopped_waiting_outcome'
  | 'error_waiting_outcome'
  | 'outcome_submitting'
  | 'outcome_done';

export type RoomView = 'closed' | 'open_full' | 'open_min';

export interface ActiveCall {
  contactId: string;
  contactName: string;
  phone: string;
  startedAt: number;
  callId: string | null;
  campaignId: string | null;
}

export interface CallError {
  code: number;
  friendlyMessage: string;
}

/** Telephony reason computed from Twilio events + error codes. Not a phase. */
export type TelephonyReason =
  | 'unknown'
  | 'connected'
  | 'no_answer'
  | 'busy'
  | 'voicemail'
  | 'failed'
  | 'unreachable'
  | 'user_hangup'
  | 'twilio_disconnect'
  | 'twilio_cancel'
  | 'twilio_reject';

/** PR C.5 (Hugo 2026-04-29): the agent's intent to advance to the next
 *  call, modelled as a flag the reducer flips. An effect in the
 *  provider watches this flag — when it goes 'pending', the effect
 *  runs the wk-leads-next + startCall side-effects with FRESH state
 *  (because it runs AFTER React commits). Replaces the broken
 *  stateRef.current.callPhase guard pattern. See:
 *  https://redux.js.org/usage/side-effects-approaches */
export type AdvanceIntent = 'idle' | 'pending' | 'fetching';

export interface CallMachineState {
  callPhase: CallPhase;
  roomView: RoomView;
  call: ActiveCall | null;
  error: CallError | null;
  reason: TelephonyReason;
  muted: boolean;
  /** UI-only mirror of sessionStore.paused. Reducer reads it for gating. */
  sessionPaused: boolean;
  /** Auto-next deadline (ms epoch) when armed; null otherwise. */
  pacingDeadlineMs: number | null;
  /** Sticky banner — set by NEXT_CALL_EMPTY, cleared on START_CALL / CLEAR. */
  noNewLeadsBanner: { skippedAlreadyDialed: number } | null;
  /** For the InCallRoom "Open from Recent Calls" preview path. */
  previewContactId: string | null;
  /** Last contact whose call ended (used by "open previous"). */
  lastEndedContactId: string | null;
  /** PR C.5: agent intent to advance — the effect picks this up. */
  advanceIntent: AdvanceIntent;
}

export const INITIAL_STATE: CallMachineState = {
  callPhase: 'idle',
  roomView: 'closed',
  call: null,
  error: null,
  reason: 'unknown',
  muted: false,
  sessionPaused: false,
  pacingDeadlineMs: null,
  noNewLeadsBanner: null,
  previewContactId: null,
  lastEndedContactId: null,
  advanceIntent: 'idle',
};

// ─── Events ─────────────────────────────────────────────────────────

export type CallEvent =
  | { type: 'START_CALL'; call: ActiveCall }
  | { type: 'CALL_ID_RESOLVED'; callId: string }
  | { type: 'LEG_RINGING' }
  | { type: 'CALL_ACCEPTED'; startedAt: number }
  | { type: 'CALL_ENDED'; reason: TelephonyReason }
  | { type: 'CALL_ERROR'; error: CallError; fatal: boolean; reason?: TelephonyReason }
  | { type: 'OUTCOME_PICKED'; columnId: string }
  | { type: 'OUTCOME_RESOLVED' }
  | { type: 'OUTCOME_FAILED'; message: string }
  | { type: 'NEXT_CALL_EMPTY'; skippedAlreadyDialed: number }
  | { type: 'SKIP_REQUESTED' }
  | { type: 'PAUSE_MIRROR_CHANGED'; paused: boolean }
  | { type: 'PACING_ARMED'; deadlineMs: number }
  | { type: 'PACING_CANCELLED' }
  | { type: 'PACING_DEADLINE_TICK' }
  | { type: 'MUTE_CHANGED'; muted: boolean }
  | { type: 'OPEN_ROOM'; contactId: string }
  | { type: 'CLOSE_ROOM' }
  | { type: 'MINIMISE_ROOM' }
  | { type: 'MAXIMISE_ROOM' }
  | { type: 'CLEAR' }
  // ─── PR C.5 — advance intent (replaces stateRef-driven flow) ────────
  /** Agent (or pacing tick) wants to advance to the next call. From
   *  wrap-up phases the reducer atomically flips through outcome_done
   *  AND sets advanceIntent='pending' in one tick. The provider's
   *  effect picks it up post-render and runs wk-leads-next + startCall.
   *  No-op from live phases — never dial twice in parallel. */
  | { type: 'ADVANCE_REQUESTED' }
  /** The effect has begun the wk-leads-next fetch. UI can show a tiny
   *  spinner if it wants. */
  | { type: 'ADVANCE_FETCHING' }
  /** The effect resolved a contact + about to call startCall. Reducer
   *  clears the intent flag so a duplicate ADVANCE_REQUESTED while
   *  fetching doesn't double-fire. (startCall itself dispatches
   *  START_CALL which also clears.) */
  | { type: 'ADVANCE_RESOLVED' };
