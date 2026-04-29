// usePowerDialer — power-dialer engine hook.
//
// Wraps:
//   - dialerReducer (pure phase machine)
//   - pickNextLead (server query → dialable Lead)
//   - dialLead (wk-calls-create + Twilio dial + listeners)
//   - applyOutcome (wk-outcome-apply + auto-advance via OUTCOME_DONE)
//   - skip (no outcome write, just OUTCOME_DONE → idle)
//   - auto-pacing useEffect (idle && sessionStarted && auto → next lead)
//
// This is the canonical power-dialer mechanism cloned from
// src/features/caller/pages/DialerPage.tsx. It powers the
// /crm/dialer surface; the smsv2 UI components consume the public
// API (state + handlers).
//
// One mode only: POWER DIALER (auto by default, manual when paused).
// No parallel-line dialer. No "manual mode" with multiple Dial buttons.

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Call as TwilioCall } from '@twilio/voice-sdk';
import { supabase } from '@/integrations/supabase/client';
import {
  dial as twilioDial,
  disconnectAllCalls,
  disconnectAllCallsAndWait,
  muteAllCalls,
  getDeviceCalls,
} from '@/core/integrations/twilio-voice';
import { dialerReducer, INITIAL_STATE, type Lead } from './dialerReducer';
import { pickNextLead } from './pickNextLead';
import { mapTwilioError } from '../lib/twilioErrorMap';

export type PacingMode = 'manual' | 'auto';

export interface UsePowerDialerOpts {
  campaignId: string | null;
  agentId: string | null;
  isAdmin: boolean;
  /** Auto-advance off → click "Next call" to dial the next lead. */
  pacing: PacingMode;
  /** Seconds delay between calls when pacing='auto'. 0 = no delay. */
  pacingDelaySec: number;
  /** Optional toast surface — UI passes a fn that pushes a toast. */
  onToast?: (msg: string, tone: 'info' | 'success' | 'error') => void;
}

export interface UsePowerDialerResult {
  // ─── State (read by the UI) ────────────────────────────────────
  phase: ReturnType<typeof dialerReducer>['phase'];
  lead: Lead | null;
  callId: string | null;
  startedAt: number | null;
  error: string | null;
  endReason: string | null;
  pacingDeadlineMs: number | null;
  sessionStarted: boolean;
  muted: boolean;
  /** Anti-loop set: contacts already dialed this session. */
  dialedThisSession: ReadonlySet<string>;

  // ─── Intents (called by the UI) ────────────────────────────────
  /** Start a power-dial session: pick the first lead and dial it. */
  start: () => Promise<void>;
  /** Hang up the active call. Reducer flips to wrap_up. */
  hangUp: () => Promise<void>;
  /** Toggle mute on every Twilio Call on the device. */
  toggleMute: () => void;
  /** Save outcome via wk-outcome-apply, then advance. */
  applyOutcome: (columnId: string, note?: string | null) => Promise<void>;
  /** Skip the current contact's outcome, then advance. */
  skip: () => void;
  /** Manual "Dial now" while waiting for the auto-pacing countdown. */
  dialNow: () => Promise<void>;
  /** Manual "Next call" — hangs up if live, then advances. */
  dialNextManual: () => Promise<void>;
  /** Pause the session (no new dials). */
  pause: () => void;
  /** Resume from paused. */
  resume: () => Promise<void>;
  /** Stop the session entirely; reducer resets. */
  stop: () => void;
}

export function usePowerDialer(opts: UsePowerDialerOpts): UsePowerDialerResult {
  const { campaignId, agentId, isAdmin, pacing, pacingDelaySec, onToast } = opts;
  const [state, dispatch] = useReducer(dialerReducer, INITIAL_STATE);
  const [muted, setMuted] = useState(false);
  const [dialed, setDialed] = useState<ReadonlySet<string>>(new Set());

  // Reset dialed Set when session ends (phase=idle && !sessionStarted).
  useEffect(() => {
    if (state.phase === 'idle' && !state.sessionStarted) {
      setDialed(new Set());
    }
  }, [state.phase, state.sessionStarted]);

  const twilioCallRef = useRef<TwilioCall | null>(null);
  const toast = useCallback(
    (msg: string, tone: 'info' | 'success' | 'error' = 'info') => {
      if (onToast) onToast(msg, tone);
      console.info(`[power-dialer ${tone}]`, msg);
    },
    [onToast]
  );

  // ─── Pick the next lead ──────────────────────────────────────────
  const pickNext = useCallback((): Promise<Lead | null> => {
    return pickNextLead(supabase, {
      campaignId,
      agentId,
      isAdmin,
      dialed,
    });
  }, [campaignId, agentId, isAdmin, dialed]);

  // ─── Dial a lead ──────────────────────────────────────────────────
  const dialLead = useCallback(
    async (lead: Lead): Promise<void> => {
      dispatch({ type: 'DIAL_START', lead });
      setMuted(false);
      twilioCallRef.current = null;
      setDialed((prev) => {
        const next = new Set(prev);
        next.add(lead.id);
        return next;
      });

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.functions as any).invoke(
          'wk-calls-create',
          {
            body: {
              contact_id: lead.id,
              to_phone: lead.phone,
              campaign_id: campaignId,
            },
          }
        );
        if (error || !data) {
          const msg = (error?.message as string | undefined) ?? 'unknown error';
          toast(`Could not place call: ${msg}`, 'error');
          dispatch({ type: 'CALL_ENDED', reason: 'failed', error: msg });
          return;
        }
        if (data.allowed === false) {
          const reason =
            (data.reason as string | undefined) ?? 'spend limit reached';
          toast(`Call blocked: ${reason}`, 'error');
          dispatch({ type: 'CALL_ENDED', reason: 'blocked', error: reason });
          return;
        }
        const newCallId = data.call_id as string | undefined;
        if (!newCallId) {
          toast('Server did not return a call id', 'error');
          dispatch({
            type: 'CALL_ENDED',
            reason: 'failed',
            error: 'missing call_id',
          });
          return;
        }
        dispatch({ type: 'DIAL_RESOLVED', callId: newCallId });

        const twilioCall = await twilioDial({
          to: lead.phone,
          extraParams: { CallId: newCallId, ContactId: lead.id },
        });
        twilioCallRef.current = twilioCall;
        const isThisCall = () => twilioCallRef.current === twilioCall;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (twilioCall as any).on?.('ringing', () => {
          if (isThisCall()) dispatch({ type: 'RINGING' });
        });
        twilioCall.on('accept', () => {
          if (isThisCall()) dispatch({ type: 'CONNECTED' });
        });
        twilioCall.on('disconnect', () => {
          if (!isThisCall()) return;
          twilioCallRef.current = null;
          dispatch({ type: 'CALL_ENDED', reason: 'hangup' });
        });
        twilioCall.on('cancel', () => {
          if (!isThisCall()) return;
          twilioCallRef.current = null;
          dispatch({ type: 'CALL_ENDED', reason: 'cancel' });
        });
        twilioCall.on('reject', () => {
          if (!isThisCall()) return;
          twilioCallRef.current = null;
          dispatch({ type: 'CALL_ENDED', reason: 'reject' });
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        twilioCall.on('error', (err: any) => {
          if (!isThisCall()) return;
          const code = (err?.code as number | undefined) ?? 0;
          const mapped = mapTwilioError(code, err?.message ?? '');
          toast(mapped.friendlyMessage, 'error');
          twilioCallRef.current = null;
          dispatch({
            type: 'CALL_ENDED',
            reason: 'error',
            error: mapped.friendlyMessage,
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
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'dial crashed';
        toast(`Dial failed: ${msg}`, 'error');
        dispatch({ type: 'CALL_ENDED', reason: 'failed', error: msg });
      }
    },
    [campaignId, toast]
  );

  // ─── Start session ───────────────────────────────────────────────
  const start = useCallback(async (): Promise<void> => {
    const next = await pickNext();
    if (!next) {
      toast('No leads in queue', 'info');
      return;
    }
    void dialLead(next);
  }, [pickNext, dialLead, toast]);

  // ─── Hang up ─────────────────────────────────────────────────────
  const hangUp = useCallback(async (): Promise<void> => {
    const c = twilioCallRef.current;
    twilioCallRef.current = null;
    if (c) {
      try {
        c.disconnect();
      } catch {
        /* ignore */
      }
    }
    try {
      disconnectAllCalls();
    } catch {
      /* ignore */
    }
    dispatch({ type: 'CALL_ENDED', reason: 'hangup' });
    try {
      await disconnectAllCallsAndWait(1500);
    } catch {
      /* ignore */
    }
  }, []);

  // ─── Mute ────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const all = getDeviceCalls();
    const truth = twilioCallRef.current ?? all[all.length - 1] ?? null;
    if (!truth && all.length === 0) return;
    const next = !muted;
    muteAllCalls(next, truth);
    setMuted(next);
  }, [muted]);

  // ─── Apply outcome ───────────────────────────────────────────────
  const applyOutcome = useCallback(
    async (columnId: string, note?: string | null): Promise<void> => {
      if (!state.lead || !state.callId) {
        dispatch({ type: 'OUTCOME_DONE' });
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.functions as any).invoke(
          'wk-outcome-apply',
          {
            body: {
              call_id: state.callId,
              contact_id: state.lead.id,
              column_id: columnId,
              agent_note: note?.trim() || null,
            },
          }
        );
        if (error) {
          toast(`Outcome failed: ${error.message}`, 'error');
        } else {
          toast('Outcome saved', 'success');
        }
      } finally {
        dispatch({ type: 'OUTCOME_DONE' });
      }
    },
    [state.lead, state.callId, toast]
  );

  // ─── Skip (no outcome write) ─────────────────────────────────────
  const skip = useCallback(() => {
    dispatch({ type: 'OUTCOME_DONE' });
  }, []);

  // ─── Dial now (bypass auto-pacing countdown) ─────────────────────
  const dialNow = useCallback(async (): Promise<void> => {
    dispatch({ type: 'PACING_CLEARED' });
    const next = await pickNext();
    if (next) void dialLead(next);
    else toast('Queue empty', 'info');
  }, [pickNext, dialLead, toast]);

  // ─── Dial next manually (hang up first if live) ──────────────────
  const dialNextManual = useCallback(async (): Promise<void> => {
    if (
      state.phase === 'connected' ||
      state.phase === 'ringing' ||
      state.phase === 'dialing'
    ) {
      await hangUp();
    }
    dispatch({ type: 'OUTCOME_DONE' });
    setTimeout(async () => {
      const next = await pickNext();
      if (next) void dialLead(next);
      else toast('Queue empty', 'info');
    }, 200);
  }, [state.phase, hangUp, pickNext, dialLead, toast]);

  // ─── Pause / Resume / Stop ───────────────────────────────────────
  const pause = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, []);
  const resume = useCallback(async () => {
    dispatch({ type: 'RESUME' });
    const next = await pickNext();
    if (next) void dialLead(next);
    else toast('Queue empty', 'info');
  }, [pickNext, dialLead, toast]);
  const stop = useCallback(() => {
    const c = twilioCallRef.current;
    twilioCallRef.current = null;
    if (c) {
      try {
        c.disconnect();
      } catch {
        /* ignore */
      }
    }
    try {
      disconnectAllCalls();
    } catch {
      /* ignore */
    }
    dispatch({ type: 'STOP' });
  }, []);

  // ─── Auto-pacing ─────────────────────────────────────────────────
  // Watch for the magic transition: phase=idle + sessionStarted +
  // auto-pacing. When we land here, arm a setTimeout. When it fires,
  // pickNextLead → dialLead. The cleanup clears the timer if any of
  // the deps change (e.g. phase moves out of idle, pacing flips, etc.).
  useEffect(() => {
    if (state.phase !== 'idle') return;
    if (!state.sessionStarted) return;
    if (pacing !== 'auto') return;

    const delayMs = Math.max(0, pacingDelaySec) * 1000;
    const deadlineMs = Date.now() + delayMs;
    dispatch({ type: 'PACING_ARMED', deadlineMs });
    const t = setTimeout(() => {
      void (async () => {
        const next = await pickNext();
        if (next) {
          void dialLead(next);
        } else {
          toast('Queue empty', 'info');
          dispatch({ type: 'PACING_CLEARED' });
        }
      })();
    }, delayMs);
    return () => {
      clearTimeout(t);
      dispatch({ type: 'PACING_CLEARED' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.sessionStarted, pacing, pacingDelaySec]);

  return {
    phase: state.phase,
    lead: state.lead,
    callId: state.callId,
    startedAt: state.startedAt,
    error: state.error,
    endReason: state.endReason,
    pacingDeadlineMs: state.pacingDeadlineMs,
    sessionStarted: state.sessionStarted,
    muted,
    dialedThisSession: dialed,
    start,
    hangUp,
    toggleMute,
    applyOutcome,
    skip,
    dialNow,
    dialNextManual,
    pause,
    resume,
    stop,
  };
}
