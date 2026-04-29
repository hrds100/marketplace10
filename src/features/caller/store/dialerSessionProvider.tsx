// Caller — DialerSessionProvider.
// Ported from src/features/smsv2/hooks/useDialerSession.tsx (Hugo's PR
// 149-151 surface). Owns the SESSION-scoped client store: pacing config,
// session-pause flag, the dialed-this-session anti-loop set, and the
// sessionId / startedAt boundary used for "this session" projections.
//
// Lifecycle:
//   - Provider mounts ONCE per CallerLayout.
//   - sessionId is stamped on the FIRST `recordDialed()` call.
//   - `endSession()` wipes everything.
//   - Pacing config defaults to MANUAL on every mount; never persisted.
//
// Reducer integration: `paused` is mirrored into CallLifecycleState
// .sessionPaused via ActiveCallProvider effect, so pure reducer
// transitions can gate auto-next without reaching outside.

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
  recordDialed: (contactId: string) => void;
  pause: () => void;
  resume: () => void;
  setPacing: (next: PacingConfig) => void;
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

  const dialedRef = useRef(dialedThisSession);
  dialedRef.current = dialedThisSession;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const recordDialed = useCallback((contactId: string) => {
    if (sessionIdRef.current === null) {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setSessionId(id);
      setStartedAt(Date.now());
    }
    if (dialedRef.current.has(contactId)) return;
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
    if (next.delaySeconds < 0) return;
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
      'useDialerSession must be used inside a <DialerSessionProvider> (mounted in CallerLayout)'
    );
  }
  return v;
}
