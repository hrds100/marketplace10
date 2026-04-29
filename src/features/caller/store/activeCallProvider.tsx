// Caller — skeleton ActiveCallProvider.
//
// Phase 2 scope: dial → ringing → connected → ended ONLY.
//
// Intentionally deferred (Phase 3+):
//   - winner-broadcast realtime subscription (parallel mode)
//   - inbound PSTN call listener
//   - mute/unmute (state field exists; toggleMute is a no-op for now)
//   - pacing timer (auto-next, sessionPaused mirror, pacing deadline)
//   - outcome → wk-outcome-apply flow
//   - next-call resolver (wk-leads-next + dialed-set anti-loop)
//   - post-call AI summary subscription
//   - client-side wk_calls.ended_at fallback write
//   - 50-min Twilio token refresh trigger
//   - PR 144 SDK precision-flag error handling beyond what mapTwilioError covers
//   - room view orchestration (open/close/minimise/maximise)
//   - durationSec tick (UI doesn't yet need it)
//
// Each deferred behaviour is logged in docs/caller/LOG.md with the
// specific phase that owns it. Phase 3 expands this provider; the
// skeleton API is shaped so consumers (DialerPage, future LiveCallScreen)
// don't need to be rewritten when the deferred wiring lands.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Call as TwilioCall } from '@twilio/voice-sdk';
import { supabase } from '@/integrations/supabase/client';
import {
  addIncomingCallListener,
  addTokenRefreshFailListener,
  createDevice,
  destroyDevice,
  dial as twilioDial,
  disconnectAllCalls,
  disconnectAllCallsAndWait,
  getDeviceCalls,
  muteAllCalls,
  type DeviceHandle,
} from '@/core/integrations/twilio-voice';
import { callLifecycleReducer, mapToLegacyPhase } from '../lib/callLifecycleReducer';
import {
  INITIAL_STATE,
  type ActiveCall,
  type CallError,
  type CallPhase,
  type RoomView,
} from '../lib/callLifecycleReducer.types';
import { mapTwilioError } from '../lib/twilioErrorMap';
import {
  startCallOrchestration,
  type StartCallResult,
} from '../lib/startCallOrchestration';
import { useDialerSession } from './dialerSessionProvider';
import { useCallerToasts } from './toastsProvider';

export type LegacyCallPhase = 'idle' | 'placing' | 'in_call' | 'post_call';

interface CreateCallInvokeShape {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { call_id?: string; allowed?: boolean; reason?: string } | null;
    error: { message: string; context?: Response } | null;
  }>;
}

export interface ActiveCallApi {
  /** Legacy 4-state phase derived from callPhase. */
  phase: LegacyCallPhase;
  /** Fine-grained reducer phase (idle / dialing / ringing / in_call /
   *  …_waiting_outcome / outcome_submitting / outcome_done / paused).
   *  Phase 2 only drives idle / dialing / ringing / in_call /
   *  stopped_waiting_outcome / error_waiting_outcome. */
  callPhase: CallPhase;
  /** Live call payload (contactId, contactName, phone, callId). */
  call: ActiveCall | null;
  /** Whether the call-room surface is closed / open / minimised. Phase 2
   *  always uses 'open_full' once dialing starts; orchestration of
   *  open/close/minimise lands in Phase 3. */
  roomView: RoomView;
  /** Most recent Twilio error (mapped to a friendly message). */
  error: CallError | null;
  /** Whether the device is initialised and ready to dial. */
  deviceReady: boolean;
  /** Mute state. Toggling calls into core/integrations/twilio-voice
   *  to mute every Call on the device (not just the active ref). */
  muted: boolean;
  /** Auto-next pacing — 'armed' when a setTimeout is pending, with the
   *  ms-epoch deadline in pacingDeadlineMs. UI uses this to render a
   *  countdown + "Dial now" button. */
  pendingNextCall: 'idle' | 'armed' | 'cooling_down';
  pacingDeadlineMs: number | null;
  /** Start an outbound call. Returns the StartCallResult union from
   *  startCallOrchestration so the caller can read failure reasons. */
  startCall: (input: {
    contactId: string;
    contactName: string;
    phone: string;
    campaignId?: string | null;
  }) => Promise<StartCallResult>;
  /** Hang up the active call (synchronous tear-down + dispatch CALL_ENDED). */
  endCall: () => Promise<void>;
  /** Toggle mute on the active Twilio Call (mutes every Call on the
   *  device defensively). */
  toggleMute: () => void;
  /** Hard reset back to INITIAL_STATE. Used by tests / explicit reset. */
  clearCall: () => void;
}

const Ctx = createContext<ActiveCallApi | null>(null);

export function ActiveCallProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(callLifecycleReducer, INITIAL_STATE);
  const session = useDialerSession();
  const toasts = useCallerToasts();

  const deviceRef = useRef<DeviceHandle | null>(null);
  // deviceReady must be state (not ref) so consumers re-render when the
  // Twilio device finishes booting. With a ref the DialerPage stayed
  // stuck on "Phone is starting up — try again in a moment" forever.
  const [deviceReady, setDeviceReady] = useState(false);
  const activeTwilioCallRef = useRef<TwilioCall | null>(null);

  // ─── Device lifecycle ─────────────────────────────────────────────
  // Phase 2 simply boots the device on mount and tears it down on
  // unmount. Token refresh failures show a toast but do NOT auto-retry —
  // automatic retry plus mid-call refresh lands in Phase 3.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const handle = await createDevice();
        if (cancelled) {
          await destroyDevice();
          return;
        }
        deviceRef.current = handle;
        setDeviceReady(true);
      } catch (e) {
        console.warn('[caller] createDevice failed', e);
      }
    })();
    return () => {
      cancelled = true;
      void destroyDevice();
      deviceRef.current = null;
      setDeviceReady(false);
    };
  }, []);

  // Token refresh failure toast. The core wrapper auto-refreshes the
  // Twilio Device token proactively (5 min before expiry) and reactively
  // on 31005/31204/20104; this listener fires only when *both* paths
  // fail. The retry callback lets the agent re-trigger the loop on demand.
  useEffect(() => {
    const unsubscribe = addTokenRefreshFailListener((retryFn) => {
      toasts.push('Phone offline — refreshing connection…', 'error');
      window.requestAnimationFrame(() => {
        void retryFn().catch((e) =>
          console.warn('[caller] auto-retry threw', e)
        );
      });
    });
    return unsubscribe;
  }, [toasts]);

  // Inbound PSTN listener. wk-voice-twiml-incoming routes calls to the
  // agent's Client identity; the core wrapper auto-accepts and forwards
  // the TwilioCall to subscribers. We morph straight into the live-call
  // view via INBOUND_ANSWERED.
  useEffect(() => {
    const unsubscribe = addIncomingCallListener((twilioCall) => {
      const fromParam = twilioCall.parameters?.get?.('From') ?? '';
      const callSid = twilioCall.parameters?.get?.('CallSid') ?? '';
      const phone = typeof fromParam === 'string' ? fromParam : '';
      const inbound: ActiveCall = {
        contactId: `inbound-${callSid || Date.now()}`,
        contactName: phone || 'Inbound caller',
        phone,
        startedAt: Date.now(),
        callId: null,
      };
      activeTwilioCallRef.current = twilioCall;
      dispatch({ type: 'INBOUND_ANSWERED', call: inbound });
      toasts.push(`Inbound call from ${phone || 'unknown'}`, 'info');

      const isThisCall = () => activeTwilioCallRef.current === twilioCall;
      const onEnd = () => {
        if (!isThisCall()) return;
        activeTwilioCallRef.current = null;
        dispatch({ type: 'CALL_ENDED', reason: 'twilio_disconnect' });
      };
      twilioCall.on('disconnect', onEnd);
      twilioCall.on('cancel', onEnd);
      twilioCall.on('reject', onEnd);
    });
    return unsubscribe;
  }, [toasts]);

  // Parallel-mode winner broadcast. wk-dialer-answer publishes to
  // `dialer:<agentId>` when the first contact in a parallel-line dial
  // picks up; we morph the UI into the live-call view for that contact.
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId || cancelled) return;
      const ch = supabase
        .channel(`dialer:${userId}`)
        .on(
          'broadcast',
          { event: 'winner' },
          (payload: {
            payload?: {
              call_id?: string;
              contact_id?: string;
              campaign_id?: string | null;
              contact_name?: string;
              phone?: string;
            };
          }) => {
            const p = payload.payload;
            if (!p?.contact_id) return;
            dispatch({
              type: 'WINNER_BROADCAST',
              call: {
                contactId: p.contact_id,
                contactName: p.contact_name ?? 'Inbound',
                phone: p.phone ?? '',
                startedAt: Date.now(),
                callId: p.call_id ?? null,
                campaignId: p.campaign_id ?? null,
              },
            });
            toasts.push('Connected — call active', 'success');
          }
        )
        .subscribe();
      cleanup = () => {
        try { void supabase.removeChannel(ch); } catch { /* ignore */ }
      };
    })();
    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [toasts]);

  // Orphan-call recovery on mount. If the browser was reloaded while a
  // Twilio Call was still alive on the device, dispatch INBOUND_ANSWERED
  // so the live-call UI rehydrates around it instead of leaving a zombie.
  useEffect(() => {
    const t = setTimeout(() => {
      const calls = getDeviceCalls();
      if (calls.length === 0) return;
      const c = calls[calls.length - 1];
      if (activeTwilioCallRef.current) return;
      activeTwilioCallRef.current = c;
      const fromParam = c.parameters?.get?.('From') ?? '';
      const callSid = c.parameters?.get?.('CallSid') ?? '';
      dispatch({
        type: 'INBOUND_ANSWERED',
        call: {
          contactId: `recovered-${callSid || Date.now()}`,
          contactName: 'Recovered call',
          phone: typeof fromParam === 'string' ? fromParam : '',
          startedAt: Date.now(),
          callId: null,
        },
      });
      toasts.push('Recovered an in-progress call', 'info');
    }, 1500);
    return () => clearTimeout(t);
  }, [toasts]);

  // Auto-next pacing timer. When the agent lands in `outcome_done` with
  // pacing.mode='auto_next' and the session is not paused, schedule a
  // setTimeout for `delaySeconds`. On fire, dispatch PACING_DEADLINE_TICK
  // and clear the call so the queue UI re-emerges (Caller skeleton —
  // requestNextCall via wk-leads-next is a future PR).
  const pacingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const shouldArm =
      state.callPhase === 'outcome_done' &&
      !session.paused &&
      session.pacing.mode === 'auto_next';
    if (!shouldArm) {
      if (pacingTimerRef.current) {
        clearTimeout(pacingTimerRef.current);
        pacingTimerRef.current = null;
        dispatch({ type: 'PACING_CANCELLED' });
      }
      return;
    }
    if (pacingTimerRef.current) return;
    const delayMs = Math.max(0, session.pacing.delaySeconds) * 1000;
    const deadlineMs = Date.now() + delayMs;
    dispatch({ type: 'PACING_ARMED', deadlineMs });
    pacingTimerRef.current = setTimeout(() => {
      pacingTimerRef.current = null;
      dispatch({ type: 'PACING_DEADLINE_TICK' });
      // For Caller skeleton, "auto-next" means: clear the wrap-up so
      // the agent's queue UI returns. requestNextCall + wk-leads-next
      // wiring lands in a follow-up PR.
      activeTwilioCallRef.current = null;
      dispatch({ type: 'CLEAR' });
    }, delayMs);
    return () => {
      if (pacingTimerRef.current) {
        clearTimeout(pacingTimerRef.current);
        pacingTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.callPhase, session.paused, session.pacing.mode, session.pacing.delaySeconds]);

  // ─── startCall ────────────────────────────────────────────────────
  const startCall = useCallback<ActiveCallApi['startCall']>(
    async ({ contactId, contactName, phone, campaignId }) => {
      const cleanPhone = (phone ?? '').trim();

      // Anti-loop guard: record this contact in the session so a future
      // next-call resolver (Phase 3) can skip it. Skip synthetic
      // manual-dial IDs.
      if (!contactId.startsWith('manual-')) {
        session.recordDialed(contactId);
      }

      activeTwilioCallRef.current = null;

      // Optimistic dispatch — reducer flips to 'dialing' + opens the room.
      dispatch({
        type: 'START_CALL',
        call: {
          contactId,
          contactName,
          phone: cleanPhone,
          startedAt: Date.now(),
          callId: null,
          campaignId: campaignId ?? null,
        },
      });

      const handle = deviceRef.current;
      if (!handle) {
        const result: StartCallResult = {
          ok: false,
          reason: 'dial_failed',
          message: 'Twilio device is not ready yet. Try again in a few seconds.',
        };
        console.warn('[caller] startCall before device ready');
        dispatch({ type: 'CLEAR' });
        return result;
      }

      const result = await startCallOrchestration(
        { contactId, contactName, phone: cleanPhone },
        {
          invokeCreateCall: async (input) => {
            const { data, error } = await (
              supabase.functions as unknown as CreateCallInvokeShape
            ).invoke('wk-calls-create', { body: input });
            if (error && error.context) {
              try {
                const body = await error.context.clone().text();
                let parsed: { error?: string; reason?: string } | null = null;
                try {
                  parsed = body ? JSON.parse(body) : null;
                } catch {
                  /* not JSON */
                }
                const real = parsed?.error || parsed?.reason || body || error.message;
                return {
                  data,
                  error: { message: `${error.context.status} ${real}`.trim() },
                };
              } catch {
                return { data, error };
              }
            }
            return { data, error };
          },
          // Adapter: startCallOrchestration expects (phone, params); the
          // core wrapper exposes dial({ to, extraParams }).
          dial: (phone, params) =>
            twilioDial({ to: phone, extraParams: params }),
          pushToast: (text, kind) => toasts.push(text, kind),
        }
      );

      if (!result.ok) {
        dispatch({ type: 'CLEAR' });
        return result;
      }

      activeTwilioCallRef.current = result.twilioCall;
      dispatch({ type: 'CALL_ID_RESOLVED', callId: result.callId });

      const isThisCall = () => activeTwilioCallRef.current === result.twilioCall;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result.twilioCall as any).on?.('ringing', () => {
        if (!isThisCall()) return;
        dispatch({ type: 'LEG_RINGING' });
      });
      result.twilioCall.on('accept', () => {
        if (!isThisCall()) return;
        dispatch({ type: 'CALL_ACCEPTED', startedAt: Date.now() });
      });
      result.twilioCall.on('disconnect', () => {
        if (!isThisCall()) return;
        activeTwilioCallRef.current = null;
        dispatch({ type: 'CALL_ENDED', reason: 'twilio_disconnect' });
      });
      result.twilioCall.on('cancel', () => {
        if (!isThisCall()) return;
        activeTwilioCallRef.current = null;
        dispatch({ type: 'CALL_ENDED', reason: 'twilio_cancel' });
      });
      result.twilioCall.on('reject', () => {
        if (!isThisCall()) return;
        activeTwilioCallRef.current = null;
        dispatch({ type: 'CALL_ENDED', reason: 'twilio_reject' });
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.twilioCall.on('error', (err: any) => {
        if (!isThisCall()) return;
        const code = (err?.code as number | undefined) ?? 0;
        const mapped = mapTwilioError(code, err?.message ?? '');
        toasts.push(mapped.friendlyMessage, 'error');
        activeTwilioCallRef.current = null;
        dispatch({
          type: 'CALL_ERROR',
          error: { code, friendlyMessage: mapped.friendlyMessage },
          fatal: mapped.fatal,
          telephony: { errorCode: code },
        });
        if (mapped.fatal) {
          void (async () => {
            try {
              await disconnectAllCallsAndWait(1500);
            } catch {
              try {
                disconnectAllCalls();
              } catch {
                /* ignore */
              }
            }
          })();
        }
      });

      return result;
    },
    [session, toasts]
  );

  // ─── endCall ──────────────────────────────────────────────────────
  // Synchronous: drop the active call ref FIRST so racing error/disconnect
  // events are filtered, then dispatch CALL_ENDED, then call disconnect()
  // on the live TwilioCall (Hugo PR 148: kill audio synchronously, not
  // after a 1.5s timeout).
  const endCall = useCallback(async () => {
    const callToKill = activeTwilioCallRef.current;
    activeTwilioCallRef.current = null;
    if (callToKill) {
      try {
        callToKill.disconnect();
      } catch (e) {
        console.warn('[caller] sync TwilioCall.disconnect threw', e);
      }
    }
    try {
      disconnectAllCalls();
    } catch {
      /* ignore */
    }
    dispatch({ type: 'CALL_ENDED', reason: 'user_hangup' });
    // Async sweep — covers any dead WebRTC sessions the sync calls missed.
    try {
      await disconnectAllCallsAndWait(1500);
    } catch {
      /* ignore */
    }
  }, []);

  const clearCall = useCallback(() => {
    activeTwilioCallRef.current = null;
    dispatch({ type: 'CLEAR' });
  }, []);

  // Mute / unmute. Calls muteAllCalls() so every Call on the device
  // (defensively — the SDK can hold multiple) is silenced.
  const toggleMute = useCallback(() => {
    const all = getDeviceCalls();
    const truth =
      activeTwilioCallRef.current ?? all[all.length - 1] ?? null;
    if (!truth && all.length === 0) {
      return;
    }
    const next = !state.muted;
    muteAllCalls(next, truth);
    dispatch({ type: 'MUTE_CHANGED', muted: next });
  }, [state.muted]);

  const value = useMemo<ActiveCallApi>(
    () => ({
      phase: mapToLegacyPhase(state.callPhase) as LegacyCallPhase,
      callPhase: state.callPhase,
      call: state.call,
      roomView: state.roomView,
      error: state.error,
      deviceReady,
      muted: state.muted,
      pendingNextCall: state.pendingNextCall,
      pacingDeadlineMs: state.pacingDeadlineMs,
      startCall,
      endCall,
      toggleMute,
      clearCall,
    }),
    [
      state.callPhase,
      state.call,
      state.roomView,
      state.error,
      state.muted,
      state.pendingNextCall,
      state.pacingDeadlineMs,
      deviceReady,
      startCall,
      endCall,
      toggleMute,
      clearCall,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveCall(): ActiveCallApi {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error(
      'useActiveCall must be used inside <ActiveCallProvider> (mounted in CallerLayout)'
    );
  }
  return v;
}
