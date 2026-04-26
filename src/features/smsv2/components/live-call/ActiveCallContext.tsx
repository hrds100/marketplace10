import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Call as TwilioCall } from '@twilio/voice-sdk';
import { useSmsV2 } from '../../store/SmsV2Store';
import { supabase } from '@/integrations/supabase/client';
import { useTwilioDevice } from '../../hooks/useTwilioDevice';
import {
  addIncomingCallListener,
  disconnectAllCalls,
  getDeviceCalls,
  muteAllCalls,
} from '@/core/integrations/twilio-voice';
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
  /** Hugo 2026-04-26 (PR 10): "calling room" preview — open the live-
   *  call screen layout for a contact WITHOUT dialling. The agent uses
   *  it to look at the lead's context (script, glossary, mid-call SMS
   *  sender) without committing to a call. Set via openCallRoom. */
  previewContactId: string | null;
  openCallRoom: (contactId: string) => void;
  closeCallRoom: () => void;
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
  /** Whether the active TwilioCall's mic is currently muted. */
  muted: boolean;
  /** Toggle the active TwilioCall's mute. No-op if no live call. */
  toggleMute: () => void;
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
  const [muted, setMuted] = useState(false);
  const [previewContactId, setPreviewContactId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTwilioCallRef = useRef<TwilioCall | null>(null);

  const toggleMute = useCallback(() => {
    // ROOT CAUSE of the "I clicked Mute, callee still hears me" bug:
    // Twilio Device maintains MULTIPLE Calls simultaneously (device.calls).
    // Every device.connect() appends a new Call without disposing prior
    // ones — the agent's mic feeds them ALL until each one's track.enabled
    // is flipped or the Call is disconnected. Across rapid test cycles,
    // navigating away mid-call, or any missed disconnect, zombie Calls
    // accumulate. Muting only the activeTwilioCallRef leaves the zombies
    // streaming, so the callee keeps hearing the agent.
    //
    // Fix: mute EVERY Call the Device is maintaining. The active ref is
    // also muted (it's in device.calls). isMuted() truth comes from the
    // active ref / device.activeCall (both reflect the same Call) so the
    // icon flips correctly.
    const all = getDeviceCalls();
    const truth =
      activeTwilioCallRef.current ?? device.activeCall ?? all[all.length - 1] ?? null;
    if (!truth && all.length === 0) {
      console.info('[mute] no Twilio Calls on device — toggleMute is a no-op');
      return;
    }
    // Toggle based on React state (the source of truth for the UI) instead of
    // the SDK's isMuted(). After Layer 3 replaceTrack(null), the SDK's
    // _sender.track is null, which can leave isMuted() in an inconsistent
    // state — Hugo (2026-04-26): "click mute, button stays selected".
    // React state is what the user sees; toggle it predictably.
    const next = !muted;
    console.info('[mute] toggle', { wasMuted: muted, next, calls: all.length, hasFallback: !!truth });
    // Pass `truth` as the fallback so muteAllCalls can hard-mute the active
    // outbound Call even when device.calls is empty (the SDK doesn't list
    // outbound dials in its public `calls` array).
    muteAllCalls(next, truth);
    // The 'mute' event listener wired in startCall / incoming will sync
    // React state on the active Call. Set optimistically too so the icon
    // flips immediately even if a Call's stream isn't fully wired yet.
    setMuted(next);
  }, [muted, device.activeCall]);

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

  // Inbound PSTN calls — Twilio routes to the agent's browser <Client>.
  // The core voice wrapper auto-accepts and notifies us; we morph into the
  // live-call screen the same way we do for the dialer-winner broadcast.
  useEffect(() => {
    const unsubscribe = addIncomingCallListener((call) => {
      const fromParam = call.parameters?.get?.('From') ?? '';
      const callSid = call.parameters?.get?.('CallSid') ?? '';
      // Try to look up an existing contact by phone before we name them
      // "Inbound" — keeps continuity with their existing wk_contacts row.
      const phone = typeof fromParam === 'string' ? fromParam : '';
      const matched = phone
        ? store.contacts.find((c) => c.phone === phone)
        : undefined;
      setCall({
        contactId: matched?.id ?? `inbound-${callSid || Date.now()}`,
        contactName: matched?.name ?? 'Inbound caller',
        phone,
        startedAt: Date.now(),
        callId: null, // server fills the wk_calls row via wk-voice-twiml-incoming
      });
      activeTwilioCallRef.current = call;
      setPhase('in_call');
      setFullScreen(true);
      setMuted(false);

      // Same stale-call guard as the outbound path: only mutate state if
      // THIS Call is still the current one. Without this, an old leaked
      // inbound Call's late 'disconnect' would stomp on a fresh dial.
      const isThisCall = () => activeTwilioCallRef.current === call;
      const onEnd = () => {
        if (!isThisCall()) return;
        activeTwilioCallRef.current = null;
        setPhase('post_call');
      };
      call.on('disconnect', onEnd);
      call.on('cancel', onEnd);
      call.on('reject', onEnd);
      // SDK is the source of truth for mute state — wire it into React.
      call.on('mute', (isMuted: boolean) => {
        console.info('[mute] sdk event', isMuted);
        setMuted(isMuted);
      });
    });
    return unsubscribe;
  }, [store]);

  const startCall = useCallback<ActiveCallCtx['startCall']>(
    async (contactId, phoneOverride, nameOverride) => {
      const contact = store.getContact(contactId);
      const phone = (phoneOverride ?? contact?.phone ?? '').trim();
      const contactName = contact?.name ?? nameOverride ?? 'Unknown caller';

      // We used to call disconnectAllCalls() here to evict zombie Calls
      // before each new dial. Hugo's regression report (2026-04-26): "I
      // try to recall and then it gets hung up immediately, never rings".
      // Symptom: wk_calls inserted with status='queued', twilio_call_sid
      // never set — Twilio never reaches our TwiML endpoint. Reverting the
      // pre-dial eviction restores the dial flow. Zombie cleanup still
      // happens on endCall and via muteAllCalls (which iterates device.calls
      // and falls back to the active ref).
      activeTwilioCallRef.current = null;

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
            // supabase-js wraps every non-2xx into FunctionsHttpError with the
            // useless message "Edge Function returned a non-2xx status code".
            // Pull the real status + body off the captured Response so the
            // toast tells the agent what actually happened (auth expired,
            // spend block, missing env, etc.).
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
      setMuted(false);

      // GUARD against stale-call event leaks: every listener checks that the
      // disconnecting Call is THIS call (the one we just dialed). Without
      // this, a previous call's 'disconnect' / 'cancel' (fired when
      // disconnectAllCalls() evicts it at the start of a new dial) would
      // run setPhase('post_call' / 'idle') and stomp on the new call,
      // hanging it up before it can ring. Hugo's regression report
      // (2026-04-26): "I try to recall and then it gets hung up immediately".
      const isThisCall = () => activeTwilioCallRef.current === result.twilioCall;

      const onAccept = () => {
        if (!isThisCall()) return;
        setPhase('in_call');
        setCall((prev) => (prev ? { ...prev, startedAt: Date.now() } : prev));
      };
      const onEnd = () => {
        if (!isThisCall()) return;
        activeTwilioCallRef.current = null;
        setPhase('post_call');
      };
      const onCancel = () => {
        if (!isThisCall()) return;
        activeTwilioCallRef.current = null;
        setPhase('idle');
        setCall(null);
      };
      result.twilioCall.on('accept', onAccept);
      result.twilioCall.on('disconnect', onEnd);
      result.twilioCall.on('cancel', onCancel);
      result.twilioCall.on('reject', onEnd);
      // Surface Twilio Call errors so we can see WHY a dial fails (no
      // edge errors, no network errors, just the SDK-side reason). Hugo's
      // "never rings" repro had no error trail at all — this fixes that.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.twilioCall.on('error', (err: any) => {
        console.error('[twilio-call] error', {
          code: err?.code,
          message: err?.message,
          name: err?.name,
          causes: err?.causes,
          description: err?.description,
        });
        // Surface the most actionable reason in the toast. 31401 is by far
        // the most common — Chrome has the mic blocked for hub.nfstay.com.
        // Generic codes get a one-line summary so the agent isn't staring
        // at "Call error 31005" with no idea what to do.
        const code = err?.code as number | undefined;
        let toast: string;
        if (code === 31401) {
          toast = 'Mic blocked. Click the 🔒 next to the URL → Microphone → Allow → reload.';
        } else if (code === 31403 || code === 31486) {
          toast = `Call refused by Twilio (${code}). Check phone number / caller ID.`;
        } else if (code === 31005 || code === 31009) {
          toast = `Connection lost (${code}). Refresh the page if it doesn't recover.`;
        } else {
          toast = `Call error ${code ?? ''}: ${err?.message ?? 'unknown'}`;
        }
        store.pushToast(toast, 'error');
      });
      // SDK is the source of truth for mute state. Without this, calling
      // .mute() externally (or any internal track-replacement re-application)
      // would leave the React icon out of sync with the actual track.
      result.twilioCall.on('mute', (isMuted: boolean) => {
        console.info('[mute] sdk event', isMuted);
        setMuted(isMuted);
      });

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
      previewContactId,
      openCallRoom: (contactId: string) => {
        // Preview mode: no dial, no Twilio Call, just the layout. Skip
        // if there's already an active call — preview would race with
        // the live transcript/coach state.
        if (phase !== 'idle') return;
        setPreviewContactId(contactId);
        setFullScreen(true);
      },
      closeCallRoom: () => {
        setPreviewContactId(null);
      },
      muted,
      toggleMute,
      startCall,
      resumeFromBroadcast,
      endCall: () => {
        // Disconnect EVERY Call on the Device — not just the active ref.
        // The "callee still hears me" zombie Calls (see toggleMute comment)
        // also need to be evicted so they stop streaming the mic.
        try { disconnectAllCalls(); } catch { /* ignore */ }
        activeTwilioCallRef.current = null;
        setPhase('post_call');
        setMuted(false);
      },
      clearCall: () => {
        setPhase('idle');
        setCall(null);
        setFullScreen(true);
        setMuted(false);
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
                // supabase-js wraps every non-2xx into FunctionsHttpError with
                // the useless "Edge Function returned a non-2xx status code".
                // Pull the actual JSON error off the captured Response so the
                // toast tells the agent what really failed (forbidden, RLS,
                // missing FK, etc.) instead of "non-2xx".
                let real = error.message;
                const ctx = (error as unknown as { context?: Response }).context;
                if (ctx) {
                  try {
                    const body = await ctx.clone().text();
                    let parsed: { error?: string } | null = null;
                    try { parsed = body ? JSON.parse(body) : null; } catch { /* not JSON */ }
                    real = `${ctx.status} ${parsed?.error || body || error.message}`.trim();
                  } catch {
                    // fall through with original message
                  }
                }
                console.error('[wk-outcome-apply] failed', real);
                store.pushToast(`Server outcome failed: ${real}`, 'error');
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
  }, [phase, call, fullScreen, muted, toggleMute, store, startCall, resumeFromBroadcast, previewContactId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveCallCtx() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useActiveCallCtx must be used inside ActiveCallProvider');
  return v;
}
