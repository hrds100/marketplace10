// PR 149 (Hugo 2026-04-29): types for the session-scoped client store
// that owns pacing config, session-pause flag, and the dialed-this-
// session anti-loop set.
//
// Why a separate store from the reducer:
//  - The reducer owns CALL state (callPhase × roomView). Sharing every
//    dial it tracks with the reducer would mix two concerns.
//  - The session store owns SESSION state (pacing preference, dialed
//    contacts in this provider's lifetime, sessionStartedAt boundary
//    for "this session" projections in useSessionStats).
//  - The reducer mirrors `sessionPaused` from this store so transitions
//    can gate auto-next without reaching outside the pure function.
//
// Lifecycle: a sessionId is stamped at the FIRST dial of a fresh provider
// mount. Wiped by `endSession()` (called from clearCall, room close after
// outcome_done, or page unload). Pacing config defaults to MANUAL on every
// session start — never persisted. Campaign `auto_advance_seconds` is
// shown as a suggested default in the dropdown but doesn't force the mode.

export type PacingMode = 'manual' | 'auto_next';

/** Configurable delay (in seconds) between a connected call's wrap-up
 *  and the next dial. 0 means immediate; 5/10 are the menu defaults
 *  per Hugo's brief. Custom values >0 < 60 are accepted by the UI. */
export interface PacingConfig {
  mode: PacingMode;
  delaySeconds: number;
}

export const DEFAULT_PACING: PacingConfig = {
  mode: 'manual',
  delaySeconds: 0,
};

/** Session-scoped state. Lives in a React provider; never persisted. */
export interface DialerSessionState {
  /** UUID stamped on first dial of this session. Used for log
   *  correlation across the dialer surface. Null until first dial. */
  sessionId: string | null;
  /** Wall-clock ms when the session began (first dial). Null until
   *  first dial. Drives "Done this session" filter in useSessionStats
   *  and the visible session timer in OverviewHeader. */
  startedAt: number | null;
  /** Session pause flag. When true, auto-next pacing is gated; the
   *  reducer mirrors this into CallLifecycleState.sessionPaused so
   *  pure transitions can read it. */
  paused: boolean;
  /** Current pacing preference. Defaults to MANUAL on every session. */
  pacing: PacingConfig;
  /** Set of contactIds dialed during this session. Drives the anti-
   *  loop guard in requestNextCall (skip already-dialed candidates). */
  dialedThisSession: ReadonlySet<string>;
}

export const INITIAL_DIALER_SESSION_STATE: DialerSessionState = {
  sessionId: null,
  startedAt: null,
  paused: false,
  pacing: DEFAULT_PACING,
  dialedThisSession: new Set<string>(),
};
