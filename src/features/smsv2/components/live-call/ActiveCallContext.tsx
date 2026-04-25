import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Call as TwilioCall } from '@twilio/voice-sdk';
import { useSmsV2 } from '../../store/SmsV2Store';
import { supabase } from '@/integrations/supabase/client';
import { useTwilioDevice } from '../../hooks/useTwilioDevice';
import { startCallOrchestration, type StartCallResult } from '../../lib/startCallOrchestration';

export type CallPhase = 'idle' | 'placing' | 'in_call' | 'post_call';

interface ActiveCall {
  contactId: string;
  contactName: string;
  phone: string;
  startedAt: number;
  /** Server-side wk_calls.id, set when this call originated through the
   *  real dialer (wk-dialer-start or wk-voice-twiml-outgoing). When null
   *  we skip the wk-outcome-apply round-trip and rely on the local store
   *  only — used by the Phase 0 mock data and offline demos. */
  callId?: string | null;
}

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

interface ActiveCallCtx {
  phase: CallPhase;
  call: ActiveCall | null;
  durationSec: number;
  fullScreen: boolean;
  setFullScreen: (v: boolean) => void;
  /**
   * Manual dial — minted call_id server-side, dials Twilio Device, and
   * drives phase transitions via call event listeners. Returns the
   * orchestration result for callers that want the typed reason on
   * failure (most just await and ignore).
   */
  startCall: (
    contactId: string,
    phoneOverride?: string,
    nameOverride?: string
  ) => Promise<StartCallResult>;
  /**
   * Internal: used by the dialer-winner broadcast handler when the call is
   * already up server-side. Skips the dial/mint flow.
   */
  resumeFromBroadcast: (input: {
    contactId: string;
    contactName?: string;
    phone?: string;
    callId?: string | null;
  }) => void;
  endCall: () => void;
  clearCall: () => void;
  /**
   * Apply a pipeline-column outcome to the just-ended call.
   * Mutates store (contact stage + activity + tags + queue) and auto-loads
   * the next lead from the dialer queue.
   *
   * Special sentinels (no automation):
   *   - 'skipped' — no outcome logged, lead stays in queue, advance to next
   *   - 'next-now' — same, "Call now" button
   */
  applyOutcome: (columnId: string, note?: string) => void;
}

const Ctx = createContext<ActiveCallCtx | null>(null);

export function ActiveCallProvider({ children }: { children: ReactNode }) {
  const store = useSmsV2();
  const device = useTwilioDevice();
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [, setTick] = useState(0);
  const [fullScreen, setFullScreen] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTwilioCallRef = useRef<TwilioCall | null>(null);

  useEffect(() => {
    if (phase === 'in_call') {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  // Subscribe to `dialer:<agentId>` for winner-takes-screen.
  // wk-dialer-answer broadcasts { call_id, contact_id, twilio_call_sid } on
  // the agent's channel the moment a parallel-dial leg is picked up. We
  // morph straight into the live-call view with the winning contact loaded.
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
                twilio_call_sid?: string;
              };
            }) => {
              const p = payload.payload;
              if (!p?.contact_id) return;
              const contact = store.getContact(p.contact_id);
              setCall({
                contactId: p.contact_id,
                contactName: contact?.name ?? 'Inbound',
                phone: contact?.phone ?? '',
                startedAt: Date.now(),
                callId: p.call_id ?? null,
              });
              setPhase('in_call');
              setFullScreen(true);
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

  const startCall = useCallback<ActiveCallCtx['startCall']>(
    async (contactId, phoneOverride, nameOverride) => {
      const contact = store.getContact(contactId);
      const phone = (phoneOverride ?? contact?.phone ?? '').trim();
      const contactName = contact?.name ?? nameOverride ?? 'Unknown caller';

      // Optimistic UI: show placing state so the agent gets immediate
      // feedback (the "calling…" pill). startedAt is set once the call
      // is accepted, not now, so the duration reflects real talk time.
      setCall({ contactId, contactName, phone, startedAt: Date.now(), callId: null });
      setPhase('placing');
      setFullScreen(true);

      const result = await startCallOrchestration(
        { contactId, contactName, phone },
        {
          invokeCreateCall: async (input) => {
            const { data, error } = await (
              supabase.functions as unknown as CreateCallInvoke
            ).invoke('wk-calls-create', { body: input });
            return { data, error };
          },
          dial: device.dial,
          pushToast: store.pushToast,
        }
      );

      if (!result.ok) {
        setPhase('idle');
        setCall(null);
        return result;
      }

      // Wire phase transitions to the Twilio Call lifecycle. 'accept' means
      // the agent's mic is connected to Twilio (call is up). 'disconnect',
      // 'cancel', 'reject' all collapse to post_call.
      activeTwilioCallRef.current = result.twilioCall;
      setCall((prev) =>
        prev ? { ...prev, callId: result.callId, startedAt: Date.now() } : prev
      );

      const onAccept = () => {
        setPhase('in_call');
        setCall((prev) => (prev ? { ...prev, startedAt: Date.now() } : prev));
      };
      const onEnd = () => {
        if (activeTwilioCallRef.current === result.twilioCall) {
          activeTwilioCallRef.current = null;
        }
        setPhase('post_call');
      };
      result.twilioCall.on('accept', onAccept);
      result.twilioCall.on('disconnect', onEnd);
      result.twilioCall.on('cancel', () => {
        if (activeTwilioCallRef.current === result.twilioCall) {
          activeTwilioCallRef.current = null;
        }
        setPhase('idle');
        setCall(null);
      });
      result.twilioCall.on('reject', onEnd);

      return result;
    },
    [device.dial, store]
  );

  const resumeFromBroadcast = useCallback<ActiveCallCtx['resumeFromBroadcast']>(
    (input) => {
      setCall({
        contactId: input.contactId,
        contactName: input.contactName ?? 'Inbound',
        phone: input.phone ?? '',
        startedAt: Date.now(),
        callId: input.callId ?? null,
      });
      setPhase('in_call');
      setFullScreen(true);
    },
    []
  );

  const value = useMemo<ActiveCallCtx>(() => {
    const durationSec = call ? Math.floor((Date.now() - call.startedAt) / 1000) : 0;

    return {
      phase,
      call,
      durationSec,
      fullScreen,
      setFullScreen,
      startCall,
      resumeFromBroadcast,
      endCall: () => {
        try { activeTwilioCallRef.current?.disconnect(); } catch { /* ignore */ }
        setPhase('post_call');
      },
      clearCall: () => {
        setPhase('idle');
        setCall(null);
        setFullScreen(true);
      },
      applyOutcome: (columnId, note) => {
        if (!call) {
          setPhase('idle');
          return;
        }

        // Sentinels — Skip / Call Now: no stage move, just advance
        if (columnId === 'skipped' || columnId === 'next-now') {
          const nextId = store.popNextFromQueue();
          if (nextId) {
            void startCall(nextId);
          } else {
            store.pushToast('Queue is empty — no more leads', 'info');
            setPhase('idle');
            setCall(null);
          }
          return;
        }

        // Real outcome: write to store, surface toast, auto-advance
        const { nextContactId, badges, columnName } = store.applyOutcome(
          call.contactId,
          columnId,
          note
        );
        const summary =
          badges.length > 0
            ? `Moved to ${columnName} · ${badges.join(' · ')}`
            : `Moved to ${columnName}`;
        store.pushToast(summary, 'success');

        // Fire the server-side automation in the background. We've already
        // optimistically updated the local store; if the server returns a
        // different applied[] list (e.g. SMS template missing) we surface
        // a follow-up toast but don't roll back.
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
                store.pushToast(`Server outcome failed: ${error.message}`, 'error');
              } else if (data?.applied && data.applied.length === 0 && badges.length > 0) {
                console.warn('outcome: server fired no automations', data);
              }
            } catch (e) {
              store.pushToast(
                `Outcome did not save server-side: ${e instanceof Error ? e.message : 'unknown'}`,
                'error'
              );
            }
          })();
        }

        if (nextContactId) {
          // small delay for the agent to read the toast
          setTimeout(() => void startCall(nextContactId), 600);
        } else {
          store.pushToast('Queue is empty — no more leads', 'info');
          setPhase('idle');
          setCall(null);
        }
      },
    };
  }, [phase, call, fullScreen, store, startCall, resumeFromBroadcast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveCallCtx() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useActiveCallCtx must be used inside ActiveCallProvider');
  return v;
}
