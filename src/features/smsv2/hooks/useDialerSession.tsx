// PR 151 (Hugo 2026-04-29): React provider + hook for the session-
// scoped dialer store (pacing config, sessionPaused flag, dialed-
// this-session anti-loop set, sessionId/startedAt boundary for
// "this session" projections in useSessionStats).
//
// Lifecycle:
//   - The provider mounts ONCE per Smsv2Layout (above ActiveCallProvider).
//   - sessionId is stamped on the FIRST `recordDialed()` call (i.e. the
//     first dial of this provider's lifetime). Until then it's null.
//   - `endSession()` wipes everything — used by clearCall, room close
//     after outcome_done, or page reload.
//   - Pacing config defaults to MANUAL on every mount; never persisted
//     across sessions (Hugo Rule 3 — no forced auto-advance, agent picks
//     the mode every session).
//
// Reducer integration:
//   - `paused` is mirrored into CallLifecycleState.sessionPaused via
//     ActiveCallContext effect, so pure reducer transitions can gate
//     auto-next without reaching outside.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  DEFAULT_PACING,
  type DialerSessionState,
  type PacingConfig,
} from '../lib/dialerSession.types';

export interface DialerSessionApi extends DialerSessionState {
  /** Called by ActiveCallContext.startCall before it dispatches
   *  START_CALL. Stamps sessionId/startedAt on the first call;
   *  appends to dialedThisSession on every call. Idempotent on
   *  the same contactId. */
  recordDialed: (contactId: string) => void;
  /** Toggle the session pause flag. PR 151 keeps this independent
   *  of the call-phase 'paused' transition — that lives in the
   *  reducer's PAUSE_REQUESTED handler. */
  pause: () => void;
  resume: () => void;
  /** Replace the pacing config (mode + delaySeconds). Validated only
   *  for non-negative delaySeconds; mode must be 'manual' | 'auto_next'. */
  setPacing: (next: PacingConfig) => void;
  /** Hard reset — clears sessionId/startedAt/dialedSet/paused/pacing.
   *  Called by clearCall and explicit "end session" UI. */
  endSession: () => void;
}

const Ctx = createContext<DialerSessionApi | null>(null);

export function DialerSessionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [pacing, setPacingState] = useState<PacingConfig>(DEFAULT_PACING);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [dialedThisSession, setDialedThisSession] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  );

  // Stable refs so the action callbacks don't re-create on every state
  // change — keeps useCallback dep arrays light.
  const dialedRef = useRef(dialedThisSession);
  dialedRef.current = dialedThisSession;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const recordDialed = useCallback((contactId: string) => {
    // Stamp session on first dial. Use crypto.randomUUID where available
    // (modern browsers + Node 18+); fall back to a stamp-based id.
    if (sessionIdRef.current === null) {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setSessionId(id);
      setStartedAt(Date.now());
    }
    if (dialedRef.current.has(contactId)) return; // idempotent
    setDialedThisSession((prev) => {
      const next = new Set(prev);
      next.add(contactId);
      return next;
    });
  }, []);

  const pause = useCallback(() => {
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
  }, []);

  const setPacing = useCallback((next: PacingConfig) => {
    if (next.delaySeconds < 0) return; // validation
    if (next.mode !== 'manual' && next.mode !== 'auto_next') return;
    setPacingState(next);
  }, []);

  const endSession = useCallback(() => {
    setSessionId(null);
    setStartedAt(null);
    setDialedThisSession(new Set<string>());
    setPaused(false);
    setPacingState(DEFAULT_PACING);
  }, []);

  const value = useMemo<DialerSessionApi>(
    () => ({
      sessionId,
      startedAt,
      paused,
      pacing,
      dialedThisSession,
      recordDialed,
      pause,
      resume,
      setPacing,
      endSession,
    }),
    [
      sessionId,
      startedAt,
      paused,
      pacing,
      dialedThisSession,
      recordDialed,
      pause,
      resume,
      setPacing,
      endSession,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDialerSession(): DialerSessionApi {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error(
      'useDialerSession must be used inside a <DialerSessionProvider> (mounted in Smsv2Layout above ActiveCallProvider)'
    );
  }
  return v;
}
