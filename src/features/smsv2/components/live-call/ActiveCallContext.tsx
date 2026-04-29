// PR 138 (Hugo 2026-04-28): refactor — single useReducer drives the
// entire call lifecycle. No more 5+ scattered useState's, no more fire-
// and-forget setTimeouts, no more "is this call alive?" booleans
// duplicated in three components.
//
// PUBLIC CONTEXT API IS STABLE — every consumer (LiveCallScreen,
// PostCallPanel, Softphone, RecentCallsPanel, DialerPage) keeps reading
// `phase`, `call`, `previewContactId`, `lastEndedContactId`, `muted`,
// `fullScreen`, `startCall`, `endCall`, `applyOutcome`, etc. The legacy
// `phase` is mapped from the new fine-grained `callPhase` via
// `mapToLegacyPhase` (see lib/callLifecycleReducer.ts). New fields:
// `callPhase`, `roomView`, `error`, `dispositionSignal` — consumers
// adopt them in commits 4-7.

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import type { Call as TwilioCall } from '@twilio/voice-sdk';
import { useSmsV2 } from '../../store/SmsV2Store';
import { supabase } from '@/integrations/supabase/client';
import { useTwilioDevice } from '../../hooks/useTwilioDevice';
import { useDialerSession } from '../../hooks/useDialerSession';
import { dialerLog } from '../../lib/dialerLog';
import {
  addIncomingCallListener,
  addTokenRefreshFailListener,
  disconnectAllCalls,
  disconnectAllCallsAndWait,
  getDeviceCalls,
  muteAllCalls,
} from '@/core/integrations/twilio-voice';
import { startCallOrchestration, type StartCallResult } from '../../lib/startCallOrchestration';
import {
  callLifecycleReducer,
  mapToLegacyPhase,
} from '../../lib/callLifecycleReducer';
import {
  INITIAL_STATE,
  type ActiveCall,
  type CallPhase as FineGrainedCallPhase,
  type CallError,
  type RoomView,
  type TelephonySignal,
} from '../../lib/callLifecycleReducer.types';
import { mapTwilioError } from '../../lib/twilioErrorMap';

/** Legacy phase shape kept for backwards compatibility with consumers
 *  that haven't been migrated yet. Mapped from the new fine-grained
 *  callPhase via lib/callLifecycleReducer.mapToLegacyPhase. */
export type CallPhase = 'idle' | 'placing' | 'in_call' | 'post_call';

interface OutcomeInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { applied?: string[]; column_id?: string } | null;
    error: { message: string } | null;
  }>;
}

interface CreateCallInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { call_id?: string; allowed?: boolean; reason?: string } | null;
    error: { message: string } | null;
  }>;
}

interface HangupInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { ok?: boolean } | null;
    error: { message: string } | null;
  }>;
}

// PR 138 follow-up (Hugo 2026-04-28): wk-leads-next is invoked from
// requestNextCall when the local Zustand queue is empty but the agent
// is on a campaign-driven session. The edge fn atomically picks the
// next row from wk_dialer_queue (priority + scheduled_for + attempts,
// SKIP LOCKED) and marks it 'dialing' for this agent.
interface NextLeadInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data:
      | { empty?: boolean; contact_id?: string; queue_id?: string; campaign_id?: string }
      | null;
    error: { message: string } | null;
  }>;
}

interface ActiveCallCtx {
  // ─── Legacy public API (UNCHANGED) ────────────────────────────────
  phase: CallPhase;
  call: ActiveCall | null;
  durationSec: number;
  fullScreen: boolean;
  setFullScreen: (v: boolean) => void;
  previewContactId: string | null;
  openCallRoom: (contactId: string) => void;
  closeCallRoom: () => void;
  lastEndedContactId: string | null;
  openPreviousCall: () => void;
  startCall: (
    contactId: string,
    phoneOverride?: string,
    nameOverride?: string
  ) => Promise<StartCallResult>;
  resumeFromBroadcast: (input: {
    contactId: string;
    contactName?: string;
    phone?: string;
    callId?: string | null;
  }) => void;
  enterDialingPlaceholder: (input: {
    contactId: string;
    contactName?: string;
    phone?: string;
    campaignId?: string | null;
  }) => void;
  endCall: () => Promise<void>;
  clearCall: () => void;
  muted: boolean;
  toggleMute: () => void;
  applyOutcome: (columnId: string, note?: string) => void;

  // ─── New API (PR 138) ─────────────────────────────────────────────
  /** Fine-grained phase. `phase` is derived from this for legacy
   *  consumers; new code should read `callPhase`. */
  callPhase: FineGrainedCallPhase;
  /** Whether the live-call room is closed / open full / minimised.
   *  Hang-up does NOT change this (Rule 6). */
  roomView: RoomView;
  /** Most recent Twilio error (mapped to a friendly message). */
  error: CallError | null;
  /** Phase-2 metadata — telephony signal computed at end-of-call.
   *  NOT consumed yet; do not auto-act on it. */
  dispositionSignal: TelephonySignal;
  /** Minimise the room — call continues. */
  minimiseRoom: () => void;
  /** Maximise from minimised state. */
  maximiseRoom: () => void;
  /** PR 138 follow-up (11/10): the agent has finished one call and
   *  picked an outcome (callPhase === 'outcome_done'). Resolve the
   *  next contact from the local queue first, then wk-leads-next as a
   *  fallback for campaign sessions, and start the dial. No-op if
   *  callPhase isn't outcome_done. Used by Next call / Skip / S / N
   *  shortcuts AND by real outcome card clicks once the reducer
   *  settles. */
  requestNextCall: () => Promise<void>;
  // ─── PR 151 (Hugo 2026-04-29): universal session controls ──────────
  /** Pause the session: gates auto-next pacing, transitions to
   *  callPhase='paused' when idle in outcome_done. Mid-call only
   *  toggles the flag — the live call is untouched. */
  requestPause: () => void;
  /** Resume the session: clears sessionPaused, exits callPhase='paused'
   *  back to outcome_done (or idle if no last call). */
  requestResume: () => void;
  /** Skip the current contact: from *_waiting_outcome, transitions to
   *  outcome_done with no stage move, then fires requestNextCall. */
  requestSkip: () => Promise<void>;
}

const Ctx = createContext<ActiveCallCtx | null>(null);

export function ActiveCallProvider({ children }: { children: ReactNode }) {
  const store = useSmsV2();
  const device = useTwilioDevice();
  const session = useDialerSession();
  const [state, dispatch] = useReducer(callLifecycleReducer, INITIAL_STATE);
  const { callPhase, call, roomView, muted, error, dispositionSignal, previewContactId, lastEndedContactId } = state;

  // 1Hz tick for the "in_call" duration display. Same idea as the old
  // useState(setTick) — kept as a separate concern so it doesn't bloat
  // reducer state with a redraw-only counter.
  const [, setTick] = useReducer((n: number) => n + 1, 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTwilioCallRef = useRef<TwilioCall | null>(null);

  // PR 138 follow-up (11/10): requestNextCall needs to read the LATEST
  // callPhase + call to decide whether to advance. useCallback closures
  // capture stale snapshots, so we mirror state into a ref every render.
  const stateRef = useRef(state);
  stateRef.current = state;

  // PR 151 (Hugo 2026-04-29): dialedThisSession migrated from a local
  // useRef into useDialerSession() so the same set is visible to other
  // consumers (OverviewHeader counts, debugger, future logging). The
  // store lives in DialerSessionProvider — see Smsv2Layout.tsx wiring.
  // Read live via `session.dialedThisSession`; append via
  // `session.recordDialed(contactId)`. PR 147's anti-loop semantics
  // unchanged.

  // PR 147 (Hugo 2026-04-29, Bug #2): track which callIds we've already
  // stamped client-side ended_at on so the persistence useEffect below
  // doesn't fire repeatedly while the agent sits in wrap-up.
  const persistedEndedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (callPhase === 'in_call') {
      intervalRef.current = setInterval(() => setTick(), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [callPhase]);

  // PR 151 (Hugo 2026-04-29): mirror dialerSession.paused into the
  // reducer so pure transitions can gate auto-next without reaching
  // outside. The reducer's PAUSE_REQUESTED / RESUME_REQUESTED handlers
  // are idempotent — dispatching twice for the same value is a no-op.
  useEffect(() => {
    if (session.paused && !state.sessionPaused) {
      dispatch({ type: 'PAUSE_REQUESTED' });
    } else if (!session.paused && state.sessionPaused) {
      dispatch({ type: 'RESUME_REQUESTED' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.paused, state.sessionPaused]);

  // PR 151: pacing timer. When the agent lands in outcome_done with
  // auto_next pacing AND the session is not paused AND no timer is
  // already armed, schedule a setTimeout for `delaySeconds` and dispatch
  // PACING_ARMED so the badge can render the visible countdown. On
  // any state change (or unmount), cancel the timer + dispatch
  // PACING_CANCELLED. When the timer fires, dispatch
  // PACING_DEADLINE_TICK + call requestNextCallRef.current() to
  // resolve the next contact. Hugo Rule 3: pacing is convenience, not
  // a blocker — agent intent (manual Next / Skip / Pause) cancels the
  // timer instantly because every action triggers a state change.
  const requestNextCallRef = useRef<() => Promise<void>>(async () => {});
  const pacingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const shouldArm =
      callPhase === 'outcome_done' &&
      !session.paused &&
      session.pacing.mode === 'auto_next' &&
      state.pendingNextCall === 'idle';
    if (!shouldArm) {
      // Cancel any prior timer + clear the reducer mirror.
      if (pacingTimerRef.current) {
        clearTimeout(pacingTimerRef.current);
        pacingTimerRef.current = null;
        if (state.pendingNextCall !== 'idle' || state.pacingDeadlineMs !== null) {
          dispatch({ type: 'PACING_CANCELLED' });
          dialerLog('pacing.cancelled', {
            sessionId: session.sessionId,
            fromPhase: callPhase,
          });
        }
      }
      return;
    }
    const delayMs = Math.max(0, session.pacing.delaySeconds) * 1000;
    const deadlineMs = Date.now() + delayMs;
    dispatch({ type: 'PACING_ARMED', deadlineMs });
    dialerLog('pacing.armed', {
      sessionId: session.sessionId,
      extra: { delayMs, deadlineMs },
    });
    pacingTimerRef.current = setTimeout(() => {
      pacingTimerRef.current = null;
      dispatch({ type: 'PACING_DEADLINE_TICK' });
      dialerLog('pacing.fire', { sessionId: session.sessionId });
      void requestNextCallRef.current();
    }, delayMs);
    return () => {
      if (pacingTimerRef.current) {
        clearTimeout(pacingTimerRef.current);
        pacingTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callPhase, session.paused, session.pacing.mode, session.pacing.delaySeconds, state.pendingNextCall]);

  // PR 147 (Hugo 2026-04-29, Bug #2): when the call lands in any wrap-
  // up phase, stamp wk_calls.ended_at client-side. Twilio's
  // wk-voice-status webhook is the primary source of truth, but it
  // can fail or arrive late on gateway-error disconnects — and Recent
  // Calls reads from wk_calls. Without this, error-ended calls were
  // missing from history until the agent reloaded the page. Idempotent:
  // only fires the first time we see each (callId, wrap-up) transition.
  // Conditional `is('ended_at', null)` so we never overwrite a real
  // status the webhook already wrote.
  useEffect(() => {
    const isWrapUp =
      callPhase === 'stopped_waiting_outcome' ||
      callPhase === 'error_waiting_outcome';
    if (!isWrapUp) return;
    const cid = call?.callId;
    if (!cid) return;
    if (persistedEndedRef.current.has(cid)) return;
    persistedEndedRef.current.add(cid);
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('wk_calls' as any) as any)
          .update({
            ended_at: new Date().toISOString(),
            status: 'completed',
          })
          .eq('id', cid)
          .is('ended_at', null);
      } catch (e) {
        console.warn('[wk_calls] client-side ended_at fallback failed', e);
      }
    })();
  }, [callPhase, call?.callId]);

  const toggleMute = useCallback(() => {
    // Same logic as before — the mute mechanic itself is unchanged.
    // ROOT CAUSE of "I clicked Mute, callee still hears me": Twilio
    // Device maintains MULTIPLE Calls; we mute every Call on the
    // device, not just the active ref.
    const all = getDeviceCalls();
    const truth =
      activeTwilioCallRef.current ?? device.activeCall ?? all[all.length - 1] ?? null;
    if (!truth && all.length === 0) {
      console.info('[mute] no Twilio Calls on device — toggleMute is a no-op');
      return;
    }
    const next = !muted;
    console.info('[mute] toggle', { wasMuted: muted, next, calls: all.length, hasFallback: !!truth });
    muteAllCalls(next, truth);
    dispatch({ type: 'MUTE_CHANGED', muted: next });
  }, [muted, device.activeCall]);

  // ─── Winner broadcast ────────────────────────────────────────────
  // Subscribe to `dialer:<agentId>` for winner-takes-screen.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id || cancelled) return;
        const ch = supabase
          .channel(`dialer:${session.user.id}`)
          .on(
            'broadcast',
            { event: 'winner' },
            (payload: {
              payload?: {
                call_id?: string;
                contact_id?: string;
                campaign_id?: string | null;
                twilio_call_sid?: string;
              };
            }) => {
              const p = payload.payload;
              if (!p?.contact_id) return;
              const contact = store.getContact(p.contact_id);
              dispatch({
                type: 'WINNER_BROADCAST',
                call: {
                  contactId: p.contact_id,
                  contactName: contact?.name ?? 'Inbound',
                  phone: contact?.phone ?? '',
                  startedAt: Date.now(),
                  callId: p.call_id ?? null,
                  campaignId: p.campaign_id ?? null,
                },
              });
              store.pushToast('Connected — call active', 'success');
            }
          )
          .subscribe();
        unsubscribe = () => {
          try { supabase.removeChannel(ch); } catch { /* ignore */ }
        };
      } catch (e) {
        console.warn('dialer winner subscribe failed', e);
      }
    })();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [store]);

  // ─── Token refresh failure toast ─────────────────────────────────
  useEffect(() => {
    const unsubscribe = addTokenRefreshFailListener((retryFn) => {
      store.pushToast('Phone offline — click to retry', 'error');
      window.requestAnimationFrame(() => {
        void retryFn().catch((e) =>
          console.warn('[twilio-voice] auto-retry threw', e)
        );
      });
    });
    return unsubscribe;
  }, [store]);

  // ─── Inbound PSTN calls ──────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = addIncomingCallListener((twilioCall) => {
      const fromParam = twilioCall.parameters?.get?.('From') ?? '';
      const callSid = twilioCall.parameters?.get?.('CallSid') ?? '';
      const phone = typeof fromParam === 'string' ? fromParam : '';
      const matched = phone
        ? store.contacts.find((c) => c.phone === phone)
        : undefined;

      const inbound: ActiveCall = {
        contactId: matched?.id ?? `inbound-${callSid || Date.now()}`,
        contactName: matched?.name ?? 'Inbound caller',
        phone,
        startedAt: Date.now(),
        callId: null,
      };
      activeTwilioCallRef.current = twilioCall;
      dispatch({ type: 'INBOUND_ANSWERED', call: inbound });

      const isThisCall = () => activeTwilioCallRef.current === twilioCall;
      const onEnd = () => {
        if (!isThisCall()) return;
        activeTwilioCallRef.current = null;
        dispatch({ type: 'CALL_ENDED', reason: 'twilio_disconnect' });
      };
      twilioCall.on('disconnect', onEnd);
      twilioCall.on('cancel', onEnd);
      twilioCall.on('reject', onEnd);
      twilioCall.on('mute', (isMuted: boolean) => {
        console.info('[mute] sdk event', isMuted);
        dispatch({ type: 'MUTE_CHANGED', muted: isMuted });
      });
    });
    return unsubscribe;
  }, [store]);

  // ─── Manual / auto dial ──────────────────────────────────────────
  const startCall = useCallback<ActiveCallCtx['startCall']>(
    async (contactId, phoneOverride, nameOverride) => {
      const contact = store.getContact(contactId);
      const phone = (phoneOverride ?? contact?.phone ?? '').trim();
      const contactName = contact?.name ?? nameOverride ?? 'Unknown caller';

      // PR 46: remove the contact from the queue BEFORE the dial fires,
      // so sentinel flows like Skip / Next-now don't pop it again.
      store.removeFromQueue(contactId);

      // PR 147 / PR 151: mark this contact as dialed-this-session so
      // the anti-loop guard in requestNextCall can avoid bouncing back.
      // Skip recording for synthetic manual-dial IDs (`manual-...`)
      // since each manual dial gets a fresh id anyway. PR 151: source
      // is now useDialerSession() (was useRef).
      if (!contactId.startsWith('manual-')) {
        session.recordDialed(contactId);
      }

      activeTwilioCallRef.current = null;

      // Optimistic UI: dispatch START_CALL — reducer flips to 'dialing'
      // and roomView to 'open_full'. startedAt is re-anchored on
      // CALL_ACCEPTED.
      dispatch({
        type: 'START_CALL',
        call: {
          contactId,
          contactName,
          phone,
          startedAt: Date.now(),
          callId: null,
        },
      });

      const result = await startCallOrchestration(
        { contactId, contactName, phone },
        {
          invokeCreateCall: async (input) => {
            const { data, error } = await (
              supabase.functions as unknown as CreateCallInvoke
            ).invoke('wk-calls-create', { body: input });
            if (error && (error as { context?: Response }).context) {
              try {
                const ctx = (error as { context: Response }).context;
                const body = await ctx.clone().text();
                let parsed: { error?: string; reason?: string } | null = null;
                try { parsed = body ? JSON.parse(body) : null; } catch { /* not JSON */ }
                const real = parsed?.error || parsed?.reason || body || error.message;
                return {
                  data,
                  error: { message: `${ctx.status} ${real}`.trim() },
                };
              } catch {
                return { data, error };
              }
            }
            return { data, error };
          },
          dial: device.dial,
          pushToast: store.pushToast,
        }
      );

      if (!result.ok) {
        // Reducer treats CLEAR as a hard reset back to idle.
        dispatch({ type: 'CLEAR' });
        return result;
      }

      activeTwilioCallRef.current = result.twilioCall;
      // Stash the resolved callId on the in-flight call without
      // changing phase.
      dispatch({ type: 'CALL_ID_RESOLVED', callId: result.callId });

      const isThisCall = () => activeTwilioCallRef.current === result.twilioCall;

      // PR 140 (Hugo 2026-04-28): Twilio Call.on('ringing') fires when
      // the carrier reports the remote leg is alerting. This is the
      // unambiguous "Ringing" boundary the new dialer UX hinges on —
      // before this commit the reducer's `ringing` phase was only
      // reachable from server-side leg-status mirroring, which lagged
      // the SDK by 1-3s. Twilio docs:
      // https://www.twilio.com/docs/voice/sdks/javascript/twiliocall
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
        // PR 142 (Hugo 2026-04-28): 31005 was firing repeatedly because
        // we left activeTwilioCallRef pointing at the dead Call. The
        // isThisCall() guard on subsequent events couldn't filter the
        // dupes. We now ALWAYS null the ref on the first error event
        // so any further error/disconnect events for THIS Call instance
        // are no-ops at the reducer layer.
        if (!isThisCall()) return;
        // PR 144 (Hugo 2026-04-28, Phase 1): the Twilio SDK exposes
        // `err.originalError` which carries the raw `payload.error` from
        // the gateway's HANGUP message — including the underlying error
        // code Twilio's REST API reports (e.g. 13224 invalid number).
        // Without logging this we threw away the gateway's actual
        // reason every time a call failed.
        console.error('[twilio-call] error', {
          code: err?.code,
          message: err?.message,
          name: err?.name,
          causes: err?.causes,
          description: err?.description,
          originalError: err?.originalError,
        });
        const code = (err?.code as number | undefined) ?? 0;
        const mapped = mapTwilioError(code, err?.message ?? '');
        store.pushToast(mapped.friendlyMessage, 'error');
        // Drop the ref — if the call object somehow recovers, the next
        // dial is going through startCall again anyway.
        activeTwilioCallRef.current = null;
        dispatch({
          type: 'CALL_ERROR',
          error: { code, friendlyMessage: mapped.friendlyMessage },
          fatal: mapped.fatal,
          telephony: { errorCode: code },
        });
        if (mapped.fatal) {
          // WebRTC cleanup so the next dial doesn't trip "A Call is
          // already active". Fire-and-forget — UI has already moved on.
          void (async () => {
            try {
              await disconnectAllCallsAndWait(1500);
            } catch (e) {
              console.warn('[twilio-call] error-path disconnect threw', e);
              try { disconnectAllCalls(); } catch { /* ignore */ }
            }
            dispatch({ type: 'MUTE_CHANGED', muted: false });
          })();
        }
      });
      result.twilioCall.on('mute', (isMuted: boolean) => {
        console.info('[mute] sdk event', isMuted);
        dispatch({ type: 'MUTE_CHANGED', muted: isMuted });
      });

      return result;
    },
    [device.dial, store]
  );

  const resumeFromBroadcast = useCallback<ActiveCallCtx['resumeFromBroadcast']>(
    (input) => {
      dispatch({
        type: 'WINNER_BROADCAST',
        call: {
          contactId: input.contactId,
          contactName: input.contactName ?? 'Inbound',
          phone: input.phone ?? '',
          startedAt: Date.now(),
          callId: input.callId ?? null,
        },
      });
    },
    []
  );

  const enterDialingPlaceholder = useCallback<
    ActiveCallCtx['enterDialingPlaceholder']
  >((input) => {
    dispatch({
      type: 'ENTER_DIALING_PLACEHOLDER',
      call: {
        contactId: input.contactId,
        contactName: input.contactName ?? 'Dialing…',
        phone: input.phone ?? '',
        startedAt: Date.now(),
        callId: null,
        campaignId: input.campaignId ?? null,
      },
    });
  }, []);

  // ─── End call ───────────────────────────────────────────────────
  const endCall = useCallback(async (): Promise<void> => {
    // PR 142 (Hugo 2026-04-28): the room used to look "stuck in
    // RINGING" for ~1.5s after Hang up because we awaited
    // disconnectAllCallsAndWait BEFORE dispatching CALL_ENDED. If the
    // Twilio SDK was in a bad state (e.g. after a 31005 HANGUP) those
    // disconnect events never fired and the timeout had to elapse.
    //
    // New order:
    //   1. Drop the active-call ref so any racing 'error'/'disconnect'
    //      events from the dead Call are filtered by isThisCall().
    //   2. Dispatch CALL_ENDED IMMEDIATELY — UI moves to wrap-up.
    //   3. Run server-side hangup-leg + client-side WebRTC teardown
    //      asynchronously. The reducer doesn't care if those succeed.
    //
    // PR 148 (Hugo 2026-04-29): Hang up MUST kill audio synchronously,
    // not after a 1.5 s timeout. Previously the WebRTC teardown was
    // deferred to a `void async () => disconnectAllCallsAndWait(1500)`
    // IIFE — UI flipped instantly but the audio kept streaming for up
    // to 1.5 s. Now we call .disconnect() on the active TwilioCall ref
    // synchronously here, plus a sync disconnectAllCalls() to evict any
    // zombies. The async wait stays for the device-level cleanup but is
    // no longer the user-facing hang-up path.
    const callToKill = activeTwilioCallRef.current;
    activeTwilioCallRef.current = null;
    if (callToKill) {
      try {
        callToKill.disconnect();
      } catch (e) {
        console.warn('[endCall] sync disconnect threw', e);
      }
    }
    try {
      disconnectAllCalls();
    } catch (e) {
      console.warn('[endCall] sync disconnectAllCalls threw', e);
    }
    dispatch({ type: 'CALL_ENDED', reason: 'user_hangup' });
    dispatch({ type: 'MUTE_CHANGED', muted: false });

    const currentCallId = call?.callId ?? null;
    // Note: client-side wk_calls.ended_at stamping happens in the
    // useEffect that watches callPhase transition into wrap-up — that
    // path catches every disconnect cause (user hangup, SDK disconnect,
    // gateway error, race) without needing endCall to fire it manually.

    // Server-side sweep — Twilio tears PSTN leg down regardless.
    void (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id ?? null;
        const ids = new Set<string>();
        if (currentCallId) ids.add(currentCallId);
        if (uid) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: legs } = await (supabase.from('wk_calls' as any) as any)
            .select('id')
            .eq('agent_id', uid)
            .in('status', ['queued', 'ringing', 'in_progress']);
          for (const l of (legs ?? []) as Array<{ id: string }>) {
            ids.add(l.id);
          }
        }
        await Promise.all(
          Array.from(ids).map(async (callId) => {
            try {
              const { error } = await (
                supabase.functions as unknown as HangupInvoke
              ).invoke('wk-dialer-hangup-leg', { body: { call_id: callId } });
              if (error) {
                console.warn('[endCall] hangup-leg', callId, error.message);
              }
            } catch (e) {
              console.warn('[endCall] hangup-leg threw', callId, e);
            }
          })
        );
      } catch (e) {
        console.warn('[endCall] sweep failed', e);
      }
    })();

    // Client-side WebRTC teardown — best-effort. If the SDK is dead,
    // this throws or hangs; either way the UI has already moved on.
    void (async () => {
      try {
        await disconnectAllCallsAndWait(1500);
      } catch (e) {
        console.warn('[endCall] disconnectAllCallsAndWait threw', e);
        try { disconnectAllCalls(); } catch { /* ignore */ }
      }
    })();
  }, [call?.callId]);

  // ─── Apply outcome ──────────────────────────────────────────────
  const applyOutcome = useCallback<ActiveCallCtx['applyOutcome']>(
    (columnId, note) => {
      if (!call) {
        dispatch({ type: 'CLEAR' });
        return;
      }

      // Sentinels — Skip / Next-now: no stage move. Reducer still
      // flips phase via OUTCOME_PICKED → OUTCOME_RESOLVED so the UI
      // can disable the picker and surface the "Next call" CTA.
      dispatch({ type: 'OUTCOME_PICKED', columnId });

      if (columnId === 'skipped' || columnId === 'next-now') {
        // PR 138: no auto-dial. Reducer transitions to outcome_done;
        // agent presses "Next call" (or selects another lead from
        // RecentCallsPanel) to start the next dial.
        dispatch({ type: 'OUTCOME_RESOLVED' });
        return;
      }

      // Real outcome: write to store, surface toast.
      const previousColumnId =
        store.contacts.find((c) => c.id === call.contactId)?.pipelineColumnId ?? null;
      const previousContactId = call.contactId;

      const { badges, columnName } = store.applyOutcome(
        call.contactId,
        columnId,
        note
      );
      const summary =
        badges.length > 0
          ? `Moved to ${columnName} · ${badges.join(' · ')}`
          : `Moved to ${columnName}`;
      store.pushToast(summary, 'success');

      // Server-side automation runs in the background. Reducer flips
      // to outcome_done as soon as the local store accepts the pick;
      // a server failure rolls back the optimistic move.
      if (call.callId) {
        void (async () => {
          try {
            const { data, error } = await (
              supabase.functions as unknown as OutcomeInvoke
            ).invoke('wk-outcome-apply', {
              body: {
                call_id: call.callId,
                contact_id: call.contactId,
                column_id: columnId,
                agent_note: note ?? null,
              },
            });
            if (error) {
              let real = error.message;
              const ctx = (error as unknown as { context?: Response }).context;
              if (ctx) {
                try {
                  const body = await ctx.clone().text();
                  let parsed: { error?: string } | null = null;
                  try { parsed = body ? JSON.parse(body) : null; } catch { /* not JSON */ }
                  real = `${ctx.status} ${parsed?.error || body || error.message}`.trim();
                } catch {
                  // fall through
                }
              }
              console.error('[wk-outcome-apply] failed', real);
              store.patchContact(previousContactId, {
                pipelineColumnId: previousColumnId ?? undefined,
              });
              store.pushToast(
                `Server outcome failed: ${real} — restored previous stage`,
                'error'
              );
              // PR 151: dispatch OUTCOME_FAILED so the reducer flips to
              // outcome_done (no trap on save failure). Note: we already
              // dispatched OUTCOME_RESOLVED below for the optimistic
              // path; OUTCOME_FAILED is idempotent if state is already
              // outcome_done so dispatching here is safe even though the
              // reducer is already past outcome_submitting.
              dispatch({ type: 'OUTCOME_FAILED', message: real });
              dialerLog('outcome.failed', {
                callId: call.callId,
                contactId: call.contactId,
                sessionId: session.sessionId,
                extra: { message: real },
              }, 'error');
            } else if (data?.applied && data.applied.length === 0 && badges.length > 0) {
              console.warn('outcome: server fired no automations', data);
            }
          } catch (e) {
            store.patchContact(previousContactId, {
              pipelineColumnId: previousColumnId ?? undefined,
            });
            store.pushToast(
              `Outcome did not save server-side: ${e instanceof Error ? e.message : 'unknown'} — restored previous stage`,
              'error'
            );
            const msg = e instanceof Error ? e.message : 'unknown';
            dispatch({ type: 'OUTCOME_FAILED', message: msg });
            dialerLog('outcome.failed', {
              callId: call.callId,
              contactId: call.contactId,
              sessionId: session.sessionId,
              extra: { message: msg },
            }, 'error');
          }
        })();
      }

      // Reducer transitions to outcome_done. NO auto-advance, NO
      // setTimeout chain to startCall (Rules 3, 4). Agent presses
      // "Next call" or picks a different contact from Recent Calls.
      // (PR 151: OUTCOME_FAILED handler in the reducer is idempotent in
      // outcome_done so the optimistic OUTCOME_RESOLVED below is fine.)
      dispatch({ type: 'OUTCOME_RESOLVED' });

      // Empty-queue case is now handled at the UI layer (PostCallPanel
      // shows the queue state). For campaign-driven flows we just
      // leave the agent in outcome_done and let them press Next call.
      // The wk-leads-next round-trip (PR 132) is no longer fired
      // automatically — it would race with the agent's manual choice.
      void store; // referenced via the closures above
    },
    [call, store]
  );

  // ─── Request next call ──────────────────────────────────────────
  // PR 138 follow-up (11/10): the reducer defines NEXT_CALL_REQUESTED
  // (outcome_done → dialing) but nothing in the codebase dispatched
  // it before — Next call / Skip / S / N were silent no-ops post-
  // outcome. This is the dispatch site.
  //
  // Resolution order for the next contact:
  //   1. store.popNextFromQueue(prevContactId) — local Zustand mirror
  //      (manual queue / RecentCallsPanel pre-loaded leads)
  //   2. wk-leads-next on the call's campaign — falls back to the
  //      server-side wk_dialer_queue (priority + scheduled_for +
  //      attempts, SKIP LOCKED) so campaign sessions don't dead-end
  //      when the local mirror is empty.
  //   3. Genuinely empty → toast + STAY in outcome_done. The agent
  //      decides what to do next (close room / pick from Recent Calls
  //      / dial manually). Hugo's Rule 3/4 (no auto-advance, no auto-
  //      outcome) is preserved: this fires because the AGENT clicked
  //      Next/Skip/an outcome card, not because of a timer.
  //
  // Twilio dial fires via the existing `startCall` path, which already
  // wires every Twilio listener (accept/disconnect/cancel/reject/
  // error/mute) onto the new TwilioCall — duplicating that here would
  // be a regression magnet. startCall internally dispatches
  // START_CALL; the reducer accepts it from outcome_done identically
  // to NEXT_CALL_REQUESTED (both flip to dialing + open_full + new
  // call). NEXT_CALL_REQUESTED stays in the reducer for direct
  // dispatch paths (e.g. future RecentCallsPanel "redial").
  const requestNextCall = useCallback(async (): Promise<void> => {
    const cur = stateRef.current;
    if (cur.callPhase !== 'outcome_done') {
      // Defensive — UI shouldn't allow this, but never advance from
      // mid-call or pre-outcome states.
      console.info('[requestNextCall] ignored — callPhase is', cur.callPhase);
      return;
    }

    const prevContactId = cur.call?.contactId ?? null;
    const campaignId = cur.call?.campaignId ?? null;

    // PR 147/151: deterministic anti-loop. Pop up to N times, skipping
    // any contact already dialed this session (set lives in
    // useDialerSession). If every reachable lead has been dialed,
    // dispatch NEXT_CALL_EMPTY so the reducer's sticky banner flag
    // turns on; UI surfaces "No new leads — N already dialed".
    dialerLog('next.requested', {
      callId: cur.call?.callId ?? null,
      contactId: prevContactId,
      campaignId,
      sessionId: session.sessionId,
      source: 'manual',
      fromPhase: cur.callPhase,
    });
    const dialed = session.dialedThisSession;
    let nextContactId: string | null = null;
    const skipped: string[] = [];
    for (let i = 0; i < 20; i++) {
      const candidate = store.popNextFromQueue(prevContactId);
      if (!candidate) break;
      if (dialed.has(candidate)) {
        skipped.push(candidate);
        continue;
      }
      nextContactId = candidate;
      break;
    }

    // 2. Campaign fallback (only if local queue produced nothing).
    if (!nextContactId && campaignId) {
      try {
        const { data, error: fnError } = await (
          supabase.functions as unknown as NextLeadInvoke
        ).invoke('wk-leads-next', {
          body: { campaign_id: campaignId },
        });
        if (fnError) {
          console.warn('[requestNextCall] wk-leads-next failed:', fnError.message);
        } else if (data && !data.empty && data.contact_id) {
          const candidate = data.contact_id;
          // Apply the same anti-loop guard to server-picked contacts.
          if (!dialed.has(candidate)) {
            nextContactId = candidate;
            if (!store.getContact(candidate)) {
              console.info(
                '[requestNextCall] contact not in local mirror — startCall will use phone from server later'
              );
            }
          } else {
            console.info(
              '[requestNextCall] wk-leads-next returned already-dialed contact, skipping',
              candidate
            );
            skipped.push(candidate);
          }
        }
      } catch (e) {
        console.warn('[requestNextCall] wk-leads-next threw:', e);
      }
    }

    // 3. Empty (or only already-dialed contacts left).
    if (!nextContactId) {
      // PR 151: dispatch NEXT_CALL_EMPTY so the reducer flips its
      // sticky banner flag. Toast still fires for immediate feedback.
      dispatch({
        type: 'NEXT_CALL_EMPTY',
        skippedAlreadyDialed: skipped.length,
      });
      dialerLog('next.empty', {
        callId: cur.call?.callId ?? null,
        contactId: prevContactId,
        campaignId,
        sessionId: session.sessionId,
        extra: { skipped: skipped.length },
      });
      const msg =
        skipped.length > 0
          ? `No new leads — ${skipped.length} already dialed this session`
          : 'Queue is empty — no more leads';
      store.pushToast(msg, 'info');
      return;
    }

    // 4. Dial. startCall handles dispatch + Twilio wiring + spend gate
    //    + listener registration. This is the SINGLE dial path.
    dialerLog('next.selected', {
      callId: cur.call?.callId ?? null,
      contactId: nextContactId,
      campaignId,
      sessionId: session.sessionId,
    });
    await startCall(nextContactId);
  }, [store, startCall, session]);

  // PR 151: keep the pacing-timer's ref-callback in sync with the
  // latest requestNextCall closure so the timer's callback always sees
  // the freshest dependencies (state, session). Without this the timer
  // fires with a stale closure when the agent toggles pacing mid-session.
  useEffect(() => {
    requestNextCallRef.current = requestNextCall;
  }, [requestNextCall]);

  // PR 151: universal session controls — Pause / Resume / Skip. These
  // adapt the agent's intent into the right combination of session-store
  // mutation + reducer dispatch. Hugo's universal-control rule: these
  // must work in EVERY phase; the underlying store/reducer handle the
  // gating per-phase.
  const requestPause = useCallback(() => {
    session.pause();
    dispatch({ type: 'PAUSE_REQUESTED' });
    dialerLog('pause', {
      sessionId: session.sessionId,
      fromPhase: stateRef.current.callPhase,
    });
  }, [session]);

  const requestResume = useCallback(() => {
    session.resume();
    dispatch({ type: 'RESUME_REQUESTED' });
    dialerLog('resume', {
      sessionId: session.sessionId,
      fromPhase: stateRef.current.callPhase,
    });
  }, [session]);

  const requestSkip = useCallback(async (): Promise<void> => {
    const cur = stateRef.current;
    dialerLog('skip', {
      callId: cur.call?.callId ?? null,
      contactId: cur.call?.contactId ?? null,
      sessionId: session.sessionId,
      fromPhase: cur.callPhase,
    });
    // From wrap-up, dispatch SKIP_REQUESTED (atomic outcome_done
    // transition, no stage move). From any other state we fall through
    // to requestNextCall which itself handles the live-call-end-first
    // semantics via startCall.
    if (
      cur.callPhase === 'stopped_waiting_outcome' ||
      cur.callPhase === 'error_waiting_outcome'
    ) {
      dispatch({ type: 'SKIP_REQUESTED' });
      // Allow the reducer transition to settle before requesting next.
      await Promise.resolve();
    }
    await requestNextCall();
  }, [requestNextCall, session]);

  // ─── Public context value ───────────────────────────────────────
  const legacyPhase = mapToLegacyPhase(callPhase);
  // `fullScreen` mirrors `roomView !== 'open_min'` — preserves the
  // legacy boolean for Softphone's "minimised" check while the new
  // `roomView` API is the single source of truth.
  const fullScreen = roomView !== 'open_min';

  const value = useMemo<ActiveCallCtx>(() => {
    const durationSec = call ? Math.floor((Date.now() - call.startedAt) / 1000) : 0;

    return {
      // ─── Legacy (unchanged) ──────────────────────────────────────
      phase: legacyPhase,
      call,
      durationSec,
      fullScreen,
      setFullScreen: (v: boolean) => {
        if (v) dispatch({ type: 'MAXIMISE_ROOM' });
        else dispatch({ type: 'MINIMISE_ROOM' });
      },
      previewContactId,
      openCallRoom: (contactId: string) => {
        dispatch({ type: 'OPEN_ROOM', contactId });
      },
      closeCallRoom: () => {
        dispatch({ type: 'CLOSE_ROOM' });
      },
      lastEndedContactId,
      openPreviousCall: () => {
        if (!lastEndedContactId) return;
        if (callPhase === 'in_call' || callPhase === 'dialing' || callPhase === 'ringing') return;
        dispatch({ type: 'OPEN_ROOM', contactId: lastEndedContactId });
      },
      muted,
      toggleMute,
      startCall,
      resumeFromBroadcast,
      enterDialingPlaceholder,
      endCall,
      clearCall: () => {
        // PR 147 / PR 151: clearCall is the explicit "start over" hook —
        // wipe the dialed-this-session set so the agent can re-dial
        // contacts in a fresh session. PR 151: source is now
        // useDialerSession.endSession() (was useRef.clear()).
        session.endSession();
        dispatch({ type: 'CLEAR' });
      },
      applyOutcome,

      // ─── New (PR 138) ────────────────────────────────────────────
      callPhase,
      roomView,
      error,
      dispositionSignal,
      minimiseRoom: () => dispatch({ type: 'MINIMISE_ROOM' }),
      maximiseRoom: () => dispatch({ type: 'MAXIMISE_ROOM' }),
      requestNextCall,
      // PR 151 (Hugo 2026-04-29): universal session controls.
      requestPause,
      requestResume,
      requestSkip,
    };
  }, [
    legacyPhase,
    callPhase,
    call,
    fullScreen,
    roomView,
    muted,
    error,
    dispositionSignal,
    previewContactId,
    lastEndedContactId,
    toggleMute,
    startCall,
    resumeFromBroadcast,
    enterDialingPlaceholder,
    endCall,
    applyOutcome,
    requestNextCall,
    requestPause,
    requestResume,
    requestSkip,
    session,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveCallCtx() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useActiveCallCtx must be used inside ActiveCallProvider');
  return v;
}
