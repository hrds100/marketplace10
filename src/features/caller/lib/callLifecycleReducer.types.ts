// Caller — call-lifecycle reducer types.
// Copied verbatim from src/features/smsv2/lib/callLifecycleReducer.types.ts
// (Hugo's PR 138-150 surface). Logic unchanged so the reducer + tests can
// be re-used as-is. See docs/caller/DECISIONS.md (D2 — reuse the backend).

/** Fine-grained call phase. The legacy `phase` (idle / placing / in_call /
 *  post_call) consumed by existing components is mapped from this in
 *  ActiveCallProvider for backwards compatibility.
 *
 *  `paused` is reachable only from `outcome_done` (after a Pause click
 *  while the agent is between calls) and exits to `outcome_done` (or
 *  `idle` if no prior call) on Resume. Distinct from `sessionPaused`
 *  (a session flag, see CallLifecycleState) — `paused` is a discrete
 *  dialer phase, `sessionPaused` is a flag that can be true in any phase
 *  to gate auto-next pacing without changing the call lifecycle. */
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

export interface ActiveCall {
  contactId: string;
  contactName: string;
  phone: string;
  startedAt: number;
  callId?: string | null;
  campaignId?: string | null;
}

export interface CallError {
  code: number;
  friendlyMessage: string;
}

export interface TelephonyInputs {
  twilioStatus?: string | null;
  amdResult?: string | null;
  errorCode?: number | null;
  durationSec?: number | null;
  /** True iff the agent clicked Cancel before the call ever connected. */
  userCanceled?: boolean;
}

export type PendingNextCall = 'idle' | 'armed' | 'cooling_down';

export interface CallLifecycleState {
  callPhase: CallPhase;
  roomView: RoomView;
  call: ActiveCall | null;
  previewContactId: string | null;
  lastEndedContactId: string | null;
  muted: boolean;
  error: CallError | null;
  dispositionSignal: TelephonySignal;
  pendingNextCall: PendingNextCall;
  pacingDeadlineMs: number | null;
  sessionPaused: boolean;
  noNewLeadsBanner: boolean;
}

export type CallLifecycleEvent =
  | { type: 'START_CALL'; call: ActiveCall }
  | { type: 'CALL_ID_RESOLVED'; callId: string }
  | { type: 'LEG_RINGING' }
  | { type: 'CALL_ACCEPTED'; startedAt: number }
  | {
      type: 'CALL_ENDED';
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
      fatal: boolean;
      telephony?: TelephonyInputs;
    }
  | { type: 'OUTCOME_PICKED'; columnId: string }
  | { type: 'OUTCOME_RESOLVED' }
  | { type: 'OUTCOME_FAILED'; message: string }
  | { type: 'NEXT_CALL_REQUESTED'; call: ActiveCall }
  | { type: 'NEXT_CALL_EMPTY'; skippedAlreadyDialed: number }
  | { type: 'SKIP_REQUESTED' }
  | { type: 'PAUSE_REQUESTED' }
  | { type: 'RESUME_REQUESTED' }
  | { type: 'PACING_ARMED'; deadlineMs: number }
  | { type: 'PACING_CANCELLED' }
  | { type: 'PACING_DEADLINE_TICK' }
  | { type: 'INBOUND_ANSWERED'; call: ActiveCall }
  | { type: 'WINNER_BROADCAST'; call: ActiveCall }
  | { type: 'MUTE_CHANGED'; muted: boolean }
  | { type: 'OPEN_ROOM'; contactId: string }
  | { type: 'CLOSE_ROOM' }
  | { type: 'MINIMISE_ROOM' }
  | { type: 'MAXIMISE_ROOM' }
  | { type: 'ENTER_DIALING_PLACEHOLDER'; call: ActiveCall }
  | { type: 'CLEAR' };

export const INITIAL_STATE: CallLifecycleState = {
  callPhase: 'idle',
  roomView: 'closed',
  call: null,
  previewContactId: null,
  lastEndedContactId: null,
  muted: false,
  error: null,
  dispositionSignal: null,
  pendingNextCall: 'idle',
  pacingDeadlineMs: null,
  sessionPaused: false,
  noNewLeadsBanner: false,
};
