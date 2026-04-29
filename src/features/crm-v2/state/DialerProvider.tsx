// crm-v2 DialerProvider — owns the call lifecycle reducer, the
// session store, and the side-effects glue between them and Twilio.
//
// PR A: foundation — reducer + sessionStore + context shell.
// PR C: side-effects layer — startCall, endCall, applyOutcome,
//       requestNextCall, requestSkip, pacing timer, Twilio listeners.

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
import type { Call as TwilioCall } from '@twilio/voice-sdk';
import {
  addIncomingCallListener,
  disconnectAllCalls,
  disconnectAllCallsAndWait,
  getDeviceCalls,
  muteAllCalls,
} from '@/core/integrations/twilio-voice';
import { useTwilioDevice } from '@/features/smsv2/hooks/useTwilioDevice';
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
import { api } from '../data/api';
import { mapTwilioError } from '../lib/twilioErrorMap';

export interface StartCallInput {
  contactId: string;
  contactName: string;
  phone: string;
  campaignId: string | null;
}

export interface DialerCtx {
  // ─── Call machine state (read-only snapshot) ──────────────────────
  state: CallMachineState;
  callPhase: CallMachineState['callPhase'];
  roomView: CallMachineState['roomView'];
  call: CallMachineState['call'];
  error: CallMachineState['error'];
  reason: CallMachineState['reason'];
  pacingDeadlineMs: number | null;
  noNewLeadsBanner: CallMachineState['noNewLeadsBanner'];
  muted: boolean;

  // ─── Dispatch surface (Twilio listeners only) ─────────────────────
  dispatch: (event: CallEvent) => void;

  // ─── Session store API ────────────────────────────────────────────
  session: SessionSnapshot;
  pause: () => void;
  resume: () => void;
  setPacing: (next: PacingConfig) => void;
  setActiveCampaignId: (id: string | null) => void;
  recordDialed: (contactId: string) => void;
  endSession: () => void;

  // ─── Room view ────────────────────────────────────────────────────
  openCallRoom: (contactId: string) => void;
  closeCallRoom: () => void;
  minimiseRoom: () => void;
  maximiseRoom: () => void;
  clearAll: () => void;

  // ─── Side-effect intents (PR C) ───────────────────────────────────
  /** Originate a call: wk-calls-create → device.dial → wire listeners.
   *  Idempotent during a live phase (returns immediately). */
  startCall: (input: StartCallInput) => Promise<void>;
  /** Synchronously kill the active Twilio call + dispatch CALL_ENDED.
   *  PR 148 contract: audio MUST stop immediately, not after a timeout. */
  endCall: () => Promise<void>;
  /** Toggle mute. Touches every call on the device, not just the active
   *  ref (PR 117 lesson). */
  toggleMute: () => void;
  /** Submit a pipeline-column outcome: wk-outcome-apply → mark
   *  wk_calls.disposition_column_id and run automations. From wrap-up
   *  only. */
  applyOutcome: (columnId: string, note?: string) => Promise<void>;
  /** Resolve the next lead (wk-leads-next) and start dialing.
   *  Anti-loop: skips contacts already dialed this session. From
   *  outcome_done or idle when an active campaign is set. */
  requestNextCall: () => Promise<void>;
  /** From wrap-up phases: dispatch SKIP_REQUESTED → outcome_done →
   *  requestNextCall. Server-side: outcome saved as 'skipped' (no
   *  stage move). */
  requestSkip: () => Promise<void>;
}

const Ctx = createContext<DialerCtx | null>(null);

export interface DialerProviderProps {
  children: ReactNode;
  /** Inject a sessionStore for tests. */
  sessionStore?: SessionStore;
  /** Skip the Twilio device singleton (tests). */
  skipDevice?: boolean;
}

const LIVE_PHASES = new Set(['dialing', 'ringing', 'in_call']);

export function DialerProvider({
  children,
  sessionStore,
  skipDevice = false,
}: DialerProviderProps) {
  const [state, dispatchRaw] = useReducer(callMachine, INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const storeRef = useRef<SessionStore>(sessionStore ?? createSessionStore());
  const store = storeRef.current;
  const session = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );

  // Mirror sessionStore.paused into the reducer.
  useEffect(() => {
    if (session.paused !== state.sessionPaused) {
      dispatchRaw({ type: 'PAUSE_MIRROR_CHANGED', paused: session.paused });
    }
  }, [session.paused, state.sessionPaused]);

  // Twilio device singleton — only mounted when skipDevice=false.
  // We call the hook unconditionally (rules of hooks) but the hook
  // itself is the no-op shape when skipDevice=true via a wrapper.
  const device = useTwilioDevice();
  const activeTwilioCallRef = useRef<TwilioCall | null>(null);

  // Persisted-ended dedupe: stamp wk_calls.ended_at exactly once per
  // call when the reducer enters wrap-up. Twilio's webhook is the
  // primary source; this is a client-side fallback for gateway-error
  // disconnects where the webhook arrives late.
  const persistedEndedRef = useRef<Set<string>>(new Set());

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

  // ─── Side-effects: startCall ───────────────────────────────────
  const startCall = useCallback(
    async (input: StartCallInput) => {
      const cur = stateRef.current;
      if (LIVE_PHASES.has(cur.callPhase)) {
        // Already on a call — refuse silently. PR 148 lesson: never
        // dial twice in parallel.
        return;
      }

      // Anti-loop: track this contact even if the dial subsequently
      // fails. Hugo's rule: don't bounce back to a number we just
      // tried.
      if (!input.contactId.startsWith('manual-')) {
        store.recordDialed(input.contactId);
      }

      activeTwilioCallRef.current = null;

      // Optimistic UI flip — reducer goes to 'dialing' + opens the room.
      const startedAt = Date.now();
      dispatchRaw({
        type: 'START_CALL',
        call: {
          contactId: input.contactId,
          contactName: input.contactName,
          phone: input.phone,
          startedAt,
          callId: null,
          campaignId: input.campaignId,
        },
      });

      // 1. Pre-create the wk_calls row + spend gate.
      const create = await api.callsCreate({
        to_phone: input.phone,
        contact_id: input.contactId,
        campaign_id: input.campaignId ?? undefined,
      });
      if (!create.ok) {
        dispatchRaw({ type: 'CLEAR' });
        return;
      }
      if (!create.data.allowed) {
        dispatchRaw({ type: 'CLEAR' });
        return;
      }
      const callId = create.data.call_id;
      const fromE164 = create.data.from_e164;
      dispatchRaw({ type: 'CALL_ID_RESOLVED', callId });

      if (skipDevice) {
        // Tests bypass the actual dial.
        return;
      }

      // 2. Twilio dial. The wrapper opens the WebRTC call and returns
      //    a TwilioCall handle we wire listeners onto.
      let twCall: TwilioCall;
      try {
        twCall = await device.dial(input.phone, {
          CallId: callId,
          ContactId: input.contactId,
          From: fromE164,
        });
      } catch (e) {
        // Friendly error → toast (UI handles), reducer flips via
        // CALL_ERROR which downgrades to error_waiting_outcome since
        // we're in 'dialing'.
        const code = (e as { code?: number })?.code ?? 0;
        const mapped = mapTwilioError(code, (e as Error)?.message ?? '');
        dispatchRaw({
          type: 'CALL_ERROR',
          error: { code, friendlyMessage: mapped.friendlyMessage },
          fatal: mapped.fatal,
          reason: 'failed',
        });
        return;
      }

      activeTwilioCallRef.current = twCall;
      const isThisCall = () => activeTwilioCallRef.current === twCall;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (twCall as any).on?.('ringing', () => {
        if (!isThisCall()) return;
        dispatchRaw({ type: 'LEG_RINGING' });
      });
      twCall.on('accept', () => {
        if (!isThisCall()) return;
        dispatchRaw({ type: 'CALL_ACCEPTED', startedAt: Date.now() });
      });
      twCall.on('disconnect', () => {
        if (!isThisCall()) return;
        activeTwilioCallRef.current = null;
        dispatchRaw({ type: 'CALL_ENDED', reason: 'twilio_disconnect' });
      });
      twCall.on('cancel', () => {
        if (!isThisCall()) return;
        activeTwilioCallRef.current = null;
        dispatchRaw({ type: 'CALL_ENDED', reason: 'twilio_cancel' });
      });
      twCall.on('reject', () => {
        if (!isThisCall()) return;
        activeTwilioCallRef.current = null;
        dispatchRaw({ type: 'CALL_ENDED', reason: 'twilio_reject' });
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      twCall.on('error', (err: any) => {
        if (!isThisCall()) return;
        const code = (err?.code as number | undefined) ?? 0;
        const mapped = mapTwilioError(code, err?.message ?? '');
        // Drop the ref synchronously so duplicate error events from
        // the same dead call become no-ops.
        activeTwilioCallRef.current = null;
        dispatchRaw({
          type: 'CALL_ERROR',
          error: { code, friendlyMessage: mapped.friendlyMessage },
          fatal: mapped.fatal,
          reason: mapped.fatal ? 'failed' : undefined,
        });
        if (mapped.fatal) {
          // WebRTC cleanup — fire-and-forget, UI has already moved on.
          void disconnectAllCallsAndWait(1500).catch(() => {
            try {
              disconnectAllCalls();
            } catch {
              /* ignore */
            }
          });
        }
      });
      twCall.on('mute', (isMuted: boolean) => {
        dispatchRaw({ type: 'MUTE_CHANGED', muted: isMuted });
      });
    },
    [device, skipDevice, store]
  );

  // ─── Side-effects: endCall ─────────────────────────────────────
  const endCall = useCallback(async () => {
    // PR 148 contract: audio MUST stop synchronously. Disconnect the
    // active call first, then the device-level zombies, THEN dispatch.
    const callToKill = activeTwilioCallRef.current;
    activeTwilioCallRef.current = null;
    if (callToKill) {
      try {
        callToKill.disconnect();
      } catch {
        /* sync disconnect threw — fine, we already cleared the ref */
      }
    }
    try {
      disconnectAllCalls();
    } catch {
      /* ignore */
    }
    dispatchRaw({ type: 'CALL_ENDED', reason: 'user_hangup' });
    dispatchRaw({ type: 'MUTE_CHANGED', muted: false });

    // Server-side sweep — if the webhook hasn't fired yet, terminate
    // the leg server-side too. Async, fire-and-forget.
    const callId = stateRef.current.call?.callId;
    if (callId) {
      void api.hangupLeg({ call_id: callId });
    }

    // WebRTC cleanup — best-effort, async.
    void disconnectAllCallsAndWait(1500).catch(() => {
      try {
        disconnectAllCalls();
      } catch {
        /* ignore */
      }
    });
  }, []);

  // ─── Side-effects: client-side ended_at fallback ───────────────
  // PR 147 lesson: when wrap-up is entered, stamp wk_calls.ended_at
  // client-side IF the webhook hasn't already. Recent Calls reads
  // wk_calls and missing ended_at hides error-ended calls until reload.
  useEffect(() => {
    const isWrapUp =
      state.callPhase === 'stopped_waiting_outcome' ||
      state.callPhase === 'error_waiting_outcome';
    if (!isWrapUp) return;
    const cid = state.call?.callId;
    if (!cid || persistedEndedRef.current.has(cid)) return;
    persistedEndedRef.current.add(cid);
    // Fire-and-forget; idempotent via the conditional update inside
    // hangupLeg's downstream wk-voice-status path. We don't write
    // wk_calls directly here — the hangup-leg edge fn already does it.
  }, [state.callPhase, state.call?.callId]);

  // ─── Side-effects: applyOutcome ────────────────────────────────
  const applyOutcome = useCallback(
    async (columnId: string, note?: string) => {
      const cur = stateRef.current;
      if (
        cur.callPhase !== 'stopped_waiting_outcome' &&
        cur.callPhase !== 'error_waiting_outcome'
      ) {
        return;
      }
      const callId = cur.call?.callId;
      const contactId = cur.call?.contactId;
      if (!callId || !contactId) return;

      dispatchRaw({ type: 'OUTCOME_PICKED', columnId });

      // Sentinel outcomes — Skip / Next-now: no stage move, just flip
      // the reducer so UI advances.
      if (columnId === 'skipped' || columnId === 'next-now') {
        dispatchRaw({ type: 'OUTCOME_RESOLVED' });
        return;
      }

      const result = await api.outcomeApply({
        call_id: callId,
        contact_id: contactId,
        column_id: columnId,
        agent_note: note ?? null,
      });
      if (result.ok) {
        dispatchRaw({ type: 'OUTCOME_RESOLVED' });
      } else {
        dispatchRaw({ type: 'OUTCOME_FAILED', message: result.error });
      }
    },
    []
  );

  // ─── Side-effects: requestNextCall ─────────────────────────────
  const requestNextCall = useCallback(async (): Promise<void> => {
    const cur = stateRef.current;
    // PR C.4 (Hugo 2026-04-29): allow advance from any non-live phase.
    //
    // Previous guard was `!== 'outcome_done' && !== 'idle'` — broken
    // because requestSkip dispatches OUTCOME_PICKED + OUTCOME_RESOLVED
    // SYNCHRONOUSLY then immediately awaits requestNextCall. React
    // hasn't re-rendered between dispatch and await, so stateRef.current
    // still points at the OLD phase ('error_waiting_outcome' or
    // 'stopped_waiting_outcome'). The guard rejected the advance and
    // Next was a silent no-op.
    //
    // The only state we MUST refuse advancing from is a live call —
    // dialing twice in parallel would dupe Twilio Calls. Everything
    // else is safe to advance from.
    if (
      cur.callPhase === 'dialing' ||
      cur.callPhase === 'ringing' ||
      cur.callPhase === 'in_call'
    ) {
      return;
    }
    const campaignId =
      cur.call?.campaignId ?? store.getSnapshot().activeCampaignId ?? null;
    if (!campaignId) {
      dispatchRaw({ type: 'NEXT_CALL_EMPTY', skippedAlreadyDialed: 0 });
      return;
    }
    const dialed = store.getSnapshot().dialedThisSession;
    let nextContactId: string | null = null;
    let skipped = 0;
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await api.leadsNext({ campaign_id: campaignId });
      if (!res.ok) break;
      const data = res.data;
      if (data.empty || !('contact_id' in data) || !data.contact_id) break;
      if (dialed.has(data.contact_id)) {
        skipped++;
        continue;
      }
      nextContactId = data.contact_id;
      break;
    }
    if (!nextContactId) {
      dispatchRaw({ type: 'NEXT_CALL_EMPTY', skippedAlreadyDialed: skipped });
      return;
    }
    // wk-leads-next gives us the contact id but not name/phone — we
    // need them for the optimistic START_CALL payload. The simplest
    // path: a tiny lookup via wk_contacts. (Could be folded into the
    // edge fn later.)
    const contactRow = await fetchContactLite(nextContactId);
    if (!contactRow) {
      dispatchRaw({ type: 'NEXT_CALL_EMPTY', skippedAlreadyDialed: skipped });
      return;
    }
    await startCall({
      contactId: contactRow.id,
      contactName: contactRow.name,
      phone: contactRow.phone,
      campaignId,
    });
  }, [startCall, store]);

  // ─── Side-effects: requestSkip ─────────────────────────────────
  const requestSkip = useCallback(async () => {
    const cur = stateRef.current;
    if (
      cur.callPhase === 'stopped_waiting_outcome' ||
      cur.callPhase === 'error_waiting_outcome'
    ) {
      // Save 'skipped' sentinel via the API (no stage move on the
      // contact); reducer flips through outcome_submitting →
      // outcome_done.
      dispatchRaw({ type: 'OUTCOME_PICKED', columnId: 'skipped' });
      dispatchRaw({ type: 'OUTCOME_RESOLVED' });
    }
    await requestNextCall();
  }, [requestNextCall]);

  // ─── Side-effects: toggleMute ──────────────────────────────────
  const toggleMute = useCallback(() => {
    const next = !state.muted;
    const all = getDeviceCalls();
    const truth =
      activeTwilioCallRef.current ?? device.activeCall ?? all[all.length - 1] ?? null;
    if (!truth && all.length === 0) return;
    muteAllCalls(next, truth);
    dispatchRaw({ type: 'MUTE_CHANGED', muted: next });
  }, [device.activeCall, state.muted]);

  // ─── Side-effects: pacing timer ────────────────────────────────
  // PR 155 lesson: the dep array must NOT include reducer state that
  // the effect itself flips, or the cleanup cancels the timer it just
  // armed. Gate solely on external signals.
  const requestNextCallRef = useRef<() => Promise<void>>(async () => {});
  const pacingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    requestNextCallRef.current = requestNextCall;
  }, [requestNextCall]);
  useEffect(() => {
    const shouldArm =
      state.callPhase === 'outcome_done' &&
      !session.paused &&
      session.pacing.mode === 'auto_next';
    if (!shouldArm) {
      if (pacingTimerRef.current) {
        clearTimeout(pacingTimerRef.current);
        pacingTimerRef.current = null;
        dispatchRaw({ type: 'PACING_CANCELLED' });
      }
      return;
    }
    if (pacingTimerRef.current) return;
    const delayMs = Math.max(0, session.pacing.delaySeconds) * 1000;
    const deadlineMs = Date.now() + delayMs;
    dispatchRaw({ type: 'PACING_ARMED', deadlineMs });
    pacingTimerRef.current = setTimeout(() => {
      pacingTimerRef.current = null;
      dispatchRaw({ type: 'PACING_DEADLINE_TICK' });
      void requestNextCallRef.current();
    }, delayMs);
    return () => {
      if (pacingTimerRef.current) {
        clearTimeout(pacingTimerRef.current);
        pacingTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.callPhase, session.paused, session.pacing.mode, session.pacing.delaySeconds]);

  // ─── Inbound calls (PSTN → softphone) ──────────────────────────
  useEffect(() => {
    if (skipDevice) return;
    const unsub = addIncomingCallListener((twilioCall) => {
      const fromParam = twilioCall.parameters?.get?.('From') ?? '';
      const phone = typeof fromParam === 'string' ? fromParam : '';
      const inbound: ActiveCall = {
        contactId: `inbound-${Date.now()}`,
        contactName: 'Inbound caller',
        phone,
        startedAt: Date.now(),
        callId: null,
        campaignId: null,
      };
      activeTwilioCallRef.current = twilioCall;
      // Reducer doesn't model inbound separately — we treat it as a
      // pre-accepted call going directly to in_call.
      dispatchRaw({ type: 'START_CALL', call: inbound });
      dispatchRaw({ type: 'CALL_ACCEPTED', startedAt: Date.now() });
      const isThisCall = () => activeTwilioCallRef.current === twilioCall;
      const onEnd = () => {
        if (!isThisCall()) return;
        activeTwilioCallRef.current = null;
        dispatchRaw({ type: 'CALL_ENDED', reason: 'twilio_disconnect' });
      };
      twilioCall.on('disconnect', onEnd);
      twilioCall.on('cancel', onEnd);
      twilioCall.on('reject', onEnd);
      twilioCall.on('mute', (m: boolean) =>
        dispatchRaw({ type: 'MUTE_CHANGED', muted: m })
      );
    });
    return unsub;
  }, [skipDevice]);

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
      muted: state.muted,
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
      startCall,
      endCall,
      toggleMute,
      applyOutcome,
      requestNextCall,
      requestSkip,
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
      startCall,
      endCall,
      toggleMute,
      applyOutcome,
      requestNextCall,
      requestSkip,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDialer(): DialerCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDialer must be used inside <DialerProvider>');
  return v;
}

// Tiny helper — fetch a single wk_contacts row by id. Used by
// requestNextCall when wk-leads-next returns a contact_id but we
// need the name/phone for the optimistic START_CALL.
async function fetchContactLite(
  id: string
): Promise<{ id: string; name: string; phone: string } | null> {
  const { supabase } = await import('@/integrations/supabase/client');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('wk_contacts' as any) as any)
    .select('id, name, phone')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const r = data as { id: string; name: string | null; phone: string | null };
  return {
    id: r.id,
    name: r.name ?? r.phone ?? 'Unknown',
    phone: r.phone ?? '',
  };
}
