// crm-v2 DialerProvider — owns the call lifecycle reducer, the
// session store, and the side-effects glue between them and Twilio.
//
// PR A scope: the context shell + the bare minimum side-effects so a
// component can call `startCall(...)` and `endCall()` and see the
// reducer transition correctly. Pacing timer + outcome RPC + leads-
// next resolver come in PR B / C as the UI is wired.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';
import { callMachine } from './callMachine';
import {
  INITIAL_STATE,
  type ActiveCall,
  type CallEvent,
  type CallMachineState,
} from './callMachine.types';
import {
  createSessionStore,
  type PacingConfig,
  type SessionSnapshot,
  type SessionStore,
} from './sessionStore';

export interface DialerCtx {
  // ─── Call machine state (read-only snapshot) ──────────────────────
  state: CallMachineState;
  /** Convenience: same as state.callPhase. */
  callPhase: CallMachineState['callPhase'];
  /** Convenience: same as state.roomView. */
  roomView: CallMachineState['roomView'];
  call: CallMachineState['call'];
  error: CallMachineState['error'];
  reason: CallMachineState['reason'];
  pacingDeadlineMs: number | null;
  noNewLeadsBanner: CallMachineState['noNewLeadsBanner'];

  // ─── Dispatch surface (the only events the UI uses) ───────────────
  /** Pure-event dispatch escape hatch — used by Twilio listeners only. */
  dispatch: (event: CallEvent) => void;

  // ─── Session store API (mirror of sessionStore methods) ───────────
  session: SessionSnapshot;
  pause: () => void;
  resume: () => void;
  setPacing: (next: PacingConfig) => void;
  setActiveCampaignId: (id: string | null) => void;
  recordDialed: (contactId: string) => void;
  endSession: () => void;

  // ─── High-level intents ───────────────────────────────────────────
  /** Open the room in preview mode for a past call. */
  openCallRoom: (contactId: string) => void;
  /** Close the room (no-op while live). */
  closeCallRoom: () => void;
  /** Minimise / maximise the room. */
  minimiseRoom: () => void;
  maximiseRoom: () => void;
  /** Convenience: dispatch CLEAR + endSession. */
  clearAll: () => void;
}

const Ctx = createContext<DialerCtx | null>(null);

export interface DialerProviderProps {
  children: ReactNode;
  /** Inject a sessionStore for tests. Production uses the default. */
  sessionStore?: SessionStore;
}

export function DialerProvider({ children, sessionStore }: DialerProviderProps) {
  const [state, dispatchRaw] = useReducer(callMachine, INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Single sessionStore for the lifetime of the provider. Tests can
  // pass a fresh one in.
  const storeRef = useRef<SessionStore>(sessionStore ?? createSessionStore());
  const store = storeRef.current;
  const session = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );

  // Mirror sessionStore.paused into the reducer so PACING_ARMED and
  // pure transitions can gate on it without reaching outside.
  useEffect(() => {
    if (session.paused !== state.sessionPaused) {
      dispatchRaw({ type: 'PAUSE_MIRROR_CHANGED', paused: session.paused });
    }
  }, [session.paused, state.sessionPaused]);

  const dispatch = useCallback((event: CallEvent) => {
    dispatchRaw(event);
  }, []);

  const openCallRoom = useCallback((contactId: string) => {
    dispatchRaw({ type: 'OPEN_ROOM', contactId });
  }, []);

  const closeCallRoom = useCallback(() => {
    dispatchRaw({ type: 'CLOSE_ROOM' });
  }, []);

  const minimiseRoom = useCallback(() => {
    dispatchRaw({ type: 'MINIMISE_ROOM' });
  }, []);

  const maximiseRoom = useCallback(() => {
    dispatchRaw({ type: 'MAXIMISE_ROOM' });
  }, []);

  const clearAll = useCallback(() => {
    dispatchRaw({ type: 'CLEAR' });
    store.endSession();
  }, [store]);

  // Stable session-action wrappers — useCallback so consumers' useEffect
  // dep arrays stay quiet across renders.
  const pause = useCallback(() => store.pause(), [store]);
  const resume = useCallback(() => store.resume(), [store]);
  const setPacing = useCallback(
    (next: PacingConfig) => store.setPacing(next),
    [store]
  );
  const setActiveCampaignId = useCallback(
    (id: string | null) => store.setActiveCampaignId(id),
    [store]
  );
  const recordDialed = useCallback(
    (contactId: string) => store.recordDialed(contactId),
    [store]
  );
  const endSession = useCallback(() => store.endSession(), [store]);

  const value = useMemo<DialerCtx>(
    () => ({
      state,
      callPhase: state.callPhase,
      roomView: state.roomView,
      call: state.call,
      error: state.error,
      reason: state.reason,
      pacingDeadlineMs: state.pacingDeadlineMs,
      noNewLeadsBanner: state.noNewLeadsBanner,
      dispatch,
      session,
      pause,
      resume,
      setPacing,
      setActiveCampaignId,
      recordDialed,
      endSession,
      openCallRoom,
      closeCallRoom,
      minimiseRoom,
      maximiseRoom,
      clearAll,
    }),
    [
      state,
      dispatch,
      session,
      pause,
      resume,
      setPacing,
      setActiveCampaignId,
      recordDialed,
      endSession,
      openCallRoom,
      closeCallRoom,
      minimiseRoom,
      maximiseRoom,
      clearAll,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDialer(): DialerCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDialer must be used inside <DialerProvider>');
  return v;
}

// Re-exports for convenience.
export type { ActiveCall, CallMachineState, CallEvent } from './callMachine.types';
export type { PacingConfig, SessionSnapshot } from './sessionStore';
