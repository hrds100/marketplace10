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
  | { type: 'CLEAR' };
