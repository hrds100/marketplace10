import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Call as TwilioCall } from '@twilio/voice-sdk';
import { useSmsV2 } from '../../store/SmsV2Store';
import { supabase } from '@/integrations/supabase/client';
import { useTwilioDevice } from '../../hooks/useTwilioDevice';
import {
  addIncomingCallListener,
  addTokenRefreshFailListener,
  disconnectAllCalls,
  disconnectAllCallsAndWait,
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
  /** PR 96 (Hugo 2026-04-28): campaign this call belongs to. Lets the
   *  mid-call sender route through wk_campaign_numbers for the from-line
   *  (matches PR 86's backend resolution). null when the call wasn't
   *  initiated under a campaign (manual dial). */
  campaignId?: string | null;
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

// PR (Hugo 2026-04-28, Bug 1): typed invoke for wk-dialer-hangup-leg.
// Fires from endCall so pressing "End" actually kills the PSTN leg
// instead of just dropping the agent's WebRTC client (which left the
// callee on a still-billed Twilio leg until they hung up themselves).
interface HangupInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { ok?: boolean } | null;
    error: { message: string } | null;
  }>;
}

// PR (Hugo 2026-04-28, Bug 2): typed invoke for wk-leads-next. The
// local Zustand store doesn't mirror wk_dialer_queue, so after an
// outcome the "next contact" used to be popped from the local queue
// and was almost always empty for campaign-driven dialer sessions.
// We now fall back to wk-leads-next, which atomically picks the
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
  /** Hugo 2026-04-27 (PR 44): the contact whose call just ended. Lets
   *  PostCallPanel show a "← Previous call" button that pops the agent
   *  back into that lead's room (preview mode) without ending the dial
   *  cycle. Null on first call of the session. */
  lastEndedContactId: string | null;
  openPreviousCall: () => void;
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
  /**
   * PR (Hugo 2026-04-28, Bug 3): mount the live-call screen in 'placing'
   * state with placeholder contact info. Used by DialerPage right after
   * wk-dialer-start succeeds, so the agent sees the dialing screen
   * IMMEDIATELY instead of staring at the dialer panel until the
   * winner-orchestration broadcast lands ~2-8s later. Does NOT invoke
   * Twilio (server-side legs are already firing). When the broadcast
   * arrives, resumeFromBroadcast overwrites with real contact + callId
   * and flips phase to 'in_call'.
   */
  enterDialingPlaceholder: (input: {
    contactId: string;
    contactName?: string;
    phone?: string;
    campaignId?: string | null;
  }) => void;
  /**
   * PR 132 (Hugo 2026-04-28, Bug 1): endCall is now async. Returns once
   * every Twilio Call on this Device has fired 'disconnect' (or a 1500ms
   * per-call timeout has elapsed). The auto-hangup at 35s and the manual
   * End button MUST `await` this before the next dial fires — otherwise
   * device.connect() races the prior Call's teardown and we hit
   * "A Call is already active".
   */
  endCall: () => Promise<void>;
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
  const [lastEndedContactId, setLastEndedContactId] = useState<string | null>(null);
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

  // PR 44 (Hugo 2026-04-27): snapshot the contactId whenever a call
  // ends (post_call), so the agent can pop back into that lead's room
  // from PostCallPanel via "← Previous call" without ending the dial
  // cycle. We don't clear it on idle — the snapshot survives across
  // calls until the next one ends.
  useEffect(() => {
    if (phase === 'post_call' && call?.contactId) {
      setLastEndedContactId(call.contactId);
    }
  }, [phase, call?.contactId]);

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
                campaign_id?: string | null;
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
                campaignId: p.campaign_id ?? null,
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

  // PR 132 (Hugo 2026-04-28, Bug 2): once the Twilio Device's access
  // token has failed to refresh 3 times in a row (network blip, edge
  // function down, JWT corruption…), surface a SINGLE persistent toast
  // with a manual "Retry" path. Without this the agent only saw a
  // generic "Connection lost (31005). Refresh the page" — and the
  // SDK kept firing it on every reconnect attempt, stacking toasts.
  useEffect(() => {
    const unsubscribe = addTokenRefreshFailListener((retryFn) => {
      // We push a single 'error' toast with the retry instructions. The
      // store's pushToast dedupes by message, so even if the listener
      // somehow fires again the agent only sees one banner. The retry
      // is best-effort — the agent can also full-refresh as a fallback.
      store.pushToast(
        'Phone offline — click to retry',
        'error'
      );
      // Fire the retry on the next animation frame so the toast renders
      // before we attempt re-registration. The agent doesn't have to
      // hit a button — this is automatic; the toast is informational.
      window.requestAnimationFrame(() => {
        void retryFn().catch((e) =>
          console.warn('[twilio-voice] auto-retry threw', e)
        );
      });
    });
    return unsubscribe;
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

      // PR 46 (Hugo 2026-04-27): remove the contact from the queue
      // BEFORE the dial fires. Otherwise state.queue[0] is still the
      // contact we just started dialling, and sentinel flows like
      // Skip / Next-now / auto-advance pop it again → "calls same
      // person twice in a row" bug.
      store.removeFromQueue(contactId);

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
        // PR 135 (Hugo 2026-04-28): error 31000 ("UnknownError / General
        // Error") used to surface as the raw SDK string and leave the
        // call in a half-dead state. Friendly toast STAYS — that's
        // good UX.
        //
        // PR 137 (Hugo 2026-04-28): partial revert of PR 135's fix B.
        // Hugo's new rule: "ANY call end (hang up, ring-out, voicemail,
        // error, busy) should STAY ON THE CONTACT, show the post-call
        // outcome picker, and wait for the agent to click an outcome."
        // So after a Twilio fatal error, we still sweep WebRTC state
        // (so the next dial doesn't trip "A Call is already active"),
        // but we let the SDK's 'disconnect' listener (which fires
        // alongside 'error') drive the phase transition to post_call
        // naturally. The agent then picks an outcome.
        const code = err?.code as number | undefined;
        let toast: string;
        let fatal = false;
        if (code === 31401) {
          toast = 'Mic blocked. Click the 🔒 next to the URL → Microphone → Allow → reload.';
        } else if (code === 31403 || code === 31486) {
          toast = `Call refused by Twilio (${code}). Check phone number / caller ID.`;
        } else if (code === 31005 || code === 31009) {
          toast = `Connection lost (${code}). Refresh the page if it doesn't recover.`;
        } else if (code === 31000) {
          toast = 'Call dropped — please try again.';
          fatal = true;
        } else {
          toast = `Call error ${code ?? ''}: ${err?.message ?? 'unknown'}`;
        }
        store.pushToast(toast, 'error');
        if (fatal) {
          // PR 137: WebRTC cleanup ONLY. Do NOT setPhase('idle') or
          // setCall(null) — let the 'disconnect' listener flip phase
          // to post_call so the agent sees the outcome picker. Do
          // NOT clear lastEndedContactId for the same reason.
          void (async () => {
            try {
              await disconnectAllCallsAndWait(1500);
            } catch (e) {
              console.warn('[twilio-call] error-path disconnect threw', e);
              try { disconnectAllCalls(); } catch { /* ignore */ }
            }
            activeTwilioCallRef.current = null;
            setMuted(false);
          })();
        }
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

  // PR (Hugo 2026-04-28, Bug 3): mount the live-call screen in 'placing'
  // state with placeholder info so the agent doesn't stare at the dialer
  // panel between Start click and winner broadcast. Pure UI — does NOT
  // trigger Twilio.connect (the legs are already firing server-side via
  // wk-dialer-start). When the dialer:{agent_id} winner broadcast lands,
  // resumeFromBroadcast overrides this with real contactId + callId.
  const enterDialingPlaceholder = useCallback<
    ActiveCallCtx['enterDialingPlaceholder']
  >((input) => {
    setCall({
      contactId: input.contactId,
      contactName: input.contactName ?? 'Dialing…',
      phone: input.phone ?? '',
      startedAt: Date.now(),
      callId: null,
      campaignId: input.campaignId ?? null,
    });
    setPhase('placing');
    setFullScreen(true);
  }, []);

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
      lastEndedContactId,
      openPreviousCall: () => {
        // PR 44: from PostCallPanel, pop the agent back into the just-
        // ended call's room (preview mode). Doesn't dial. Skips if no
        // prior call exists OR if a fresh call has already started.
        if (!lastEndedContactId) return;
        if (phase === 'in_call' || phase === 'placing') return;
        setPreviewContactId(lastEndedContactId);
        setFullScreen(true);
      },
      muted,
      toggleMute,
      startCall,
      resumeFromBroadcast,
      enterDialingPlaceholder,
      endCall: async () => {
        // PR (Hugo 2026-04-28, Bug 1): the End button used to ONLY do a
        // WebRTC client-side disconnect. The agent's mic stopped, but the
        // PSTN leg stayed up on Twilio's side — Hugo's complaint:
        // "Tajul pressed End but call kept going until guest hung up".
        // PR 130 (Hugo 2026-04-28): belt-and-braces. The local
        // call.callId is NULL on the first dial (broadcast hasn't
        // landed yet), and previous legs may be lingering after the
        // 35s no-answer auto-advance. Hugo: "There is one call in
        // the background running." Now we sweep every queued /
        // ringing / in_progress wk_calls row for THIS agent and hang
        // each one up — guaranteed no zombies even when callId is
        // unknown.
        // PR 132 (Hugo 2026-04-28, Bug 1): endCall is now async. We
        // AWAIT every Twilio Call's 'disconnect' before resolving so
        // the auto-hangup at 35s and the manual End can chain
        // straight into the next dial without "A Call is already
        // active". The server-side hangup-leg sweep continues in
        // parallel (its result doesn't gate the next dial — Twilio
        // tears down the PSTN leg server-side regardless).
        const serverSideSweep = (async () => {
          try {
            const { data: userData } = await supabase.auth.getUser();
            const uid = userData.user?.id ?? null;
            const ids = new Set<string>();
            if (call?.callId) ids.add(call.callId);
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
        // Don't block on the server-side sweep — fire it but await the
        // CLIENT-side WebRTC teardown synchronously.
        void serverSideSweep;
        // Disconnect EVERY Call on the Device AND wait for each to
        // confirm 'disconnect'. This is the gate that stops the next
        // dial from racing into "A Call is already active".
        try {
          await disconnectAllCallsAndWait(1500);
        } catch (e) {
          console.warn('[endCall] disconnectAllCallsAndWait threw', e);
          // Fallback: best-effort sync disconnect so we never get stuck.
          try { disconnectAllCalls(); } catch { /* ignore */ }
        }
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

        // PR 135 (Hugo 2026-04-28): once an outcome has been picked, the
        // orange "Pick outcome for …" CTA must not linger. Phase flips
        // away from post_call below (via startCall → 'placing', or
        // setPhase('idle') in the empty-queue branches), but
        // lastEndedContactId is independent state used by PostCallPanel
        // for the "Previous call" button. Clear it now so a stale ghost
        // doesn't follow the agent into the next call.
        setLastEndedContactId(null);

        // Sentinels — Skip / Next-now: no stage move, just advance.
        // PR 46: pass call.contactId as excludeContactId so we never
        // pop the just-finished lead even if startCall hadn't yet
        // dispatched the queue/remove (React batching). Phone dedupe
        // is INTENTIONALLY not applied here — Hugo's call: testing
        // with N contacts on the same phone still works via Skip /
        // Next-now; production safety lives in the real applyOutcome
        // path below.
        if (columnId === 'skipped' || columnId === 'next-now') {
          const nextId = store.popNextFromQueue(call.contactId);
          if (nextId) {
            // PR 133: previously fire-and-forget (`void startCall(...)`)
            // which swallowed the dial's pre-flight teardown errors and
            // contributed to "A Call is already active". applyOutcome's
            // signature is sync (returns void), so we can't await here —
            // instead surface failures via .catch so they reach the
            // console + toast pipeline inside startCall.
            startCall(nextId).catch((e) =>
              console.warn('auto-dial failed', e)
            );
          } else {
            store.pushToast('Queue is empty — no more leads', 'info');
            setPhase('idle');
            setCall(null);
          }
          return;
        }

        // PR 26 (Hugo 2026-04-27): capture the contact's previous
        // pipelineColumnId BEFORE the optimistic move, so we can roll
        // back if the server-side wk-outcome-apply rejects the move.
        // Without this, the UI lies about persisted state when RLS or
        // FK errors fire on the server.
        const previousColumnId =
          store.contacts.find((c) => c.id === call.contactId)?.pipelineColumnId ?? null;
        const previousContactId = call.contactId;

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
        // optimistically updated the local store; if the server rejects
        // the move we ROLL BACK the contact's pipelineColumnId so the UI
        // reflects truth (PR 26).
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
                // PR 26: roll back the optimistic move. The auto-advance
                // already kicked off above, so we don't undo the queue
                // pop — that would race with the new call. We just put
                // the LEAD back where it was so /smsv2/pipelines /
                // contacts shows truth.
                store.patchContact(previousContactId, {
                  pipelineColumnId: previousColumnId ?? undefined,
                });
                store.pushToast(
                  `Server outcome failed: ${real} — restored previous stage`,
                  'error'
                );
              } else if (data?.applied && data.applied.length === 0 && badges.length > 0) {
                console.warn('outcome: server fired no automations', data);
              }
            } catch (e) {
              // Same rollback path on a thrown error.
              store.patchContact(previousContactId, {
                pipelineColumnId: previousColumnId ?? undefined,
              });
              store.pushToast(
                `Outcome did not save server-side: ${e instanceof Error ? e.message : 'unknown'} — restored previous stage`,
                'error'
              );
            }
          })();
        }

        if (nextContactId) {
          // small delay for the agent to read the toast
          // PR 133: keep the 600ms delay (intentional buffer between
          // outcome and next dial) but stop swallowing rejections —
          // attach .catch so dial errors reach the console.
          setTimeout(() => {
            startCall(nextContactId).catch((e) =>
              console.warn('auto-dial failed', e)
            );
          }, 600);
        } else if (call?.campaignId) {
          // PR (Hugo 2026-04-28, Bug 2): local store said empty, but the
          // real queue lives in wk_dialer_queue (DB). Hugo's complaint:
          // "after marking no pickup or anything then it doesn't go next
          // call." Ask wk-leads-next for the next DB lead before we lie
          // to the agent that the queue is empty.
          const campaignId = call.campaignId;
          void (async () => {
            try {
              const { data, error } = await (
                supabase.functions as unknown as NextLeadInvoke
              ).invoke('wk-leads-next', {
                body: { campaign_id: campaignId },
              });
              if (error) {
                console.warn('[applyOutcome] wk-leads-next failed:', error.message);
              }
              if (!error && data && !data.empty && data.contact_id) {
                // Same 600ms delay so the success toast finishes reading
                // before the next call screen takes over.
                setTimeout(() => void startCall(data.contact_id!), 600);
                return;
              }
              // Genuinely empty (or RPC error) — fall through to idle.
              store.pushToast('Queue is empty — no more leads', 'info');
              setPhase('idle');
              setCall(null);
            } catch (e) {
              console.warn('[applyOutcome] wk-leads-next threw:', e);
              store.pushToast('Queue is empty — no more leads', 'info');
              setPhase('idle');
              setCall(null);
            }
          })();
        } else {
          // No campaign on this call (manual dial) — original behavior.
          store.pushToast('Queue is empty — no more leads', 'info');
          setPhase('idle');
          setCall(null);
        }
      },
    };
  }, [phase, call, fullScreen, muted, toggleMute, store, startCall, resumeFromBroadcast, enterDialingPlaceholder, previewContactId, lastEndedContactId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveCallCtx() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useActiveCallCtx must be used inside ActiveCallProvider');
  return v;
}
