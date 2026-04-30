import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Call as TwilioCall } from '@twilio/voice-sdk';
import { supabase } from '@/integrations/supabase/client';
import {
  createDevice, dial as twilioDial, disconnectAllCalls,
  disconnectAllCallsAndWait, muteAllCalls, getDeviceCalls,
  addTokenRefreshFailListener,
} from '@/core/integrations/twilio-voice';
import { mapTwilioError } from '@/features/smsv2/caller-pad/lib/twilioErrorMap';
import type { DialerState, DialerAction, QueueLead } from './types';

const INITIAL: DialerState = {
  phase: 'idle',
  currentLead: null,
  currentCallSid: null,
  currentCallId: null,
  startedAt: null,
  durationSec: null,
  isMuted: false,
  isOnHold: false,
  pauseAfterCall: false,
  campaignId: null,
  autoPace: true,
  pacingDelaySec: 5,
  sessionStarted: false,
  endReason: null,
  error: null,
  pacingDeadlineMs: null,
};

function reducer(s: DialerState, a: DialerAction): DialerState {
  switch (a.type) {
    case 'DIAL_START':
      if (s.phase !== 'idle' && s.phase !== 'paused') return s;
      return {
        ...s,
        phase: 'dialing',
        currentLead: a.lead,
        currentCallId: a.callId,
        currentCallSid: null,
        startedAt: null,
        durationSec: null,
        isMuted: false,
        isOnHold: false,
        error: null,
        endReason: null,
        pacingDeadlineMs: null,
        sessionStarted: true,
      };
    case 'RINGING':
      return s.phase === 'dialing' ? { ...s, phase: 'ringing' } : s;
    case 'CONNECTED':
      return s.phase === 'dialing' || s.phase === 'ringing'
        ? { ...s, phase: 'connected', startedAt: Date.now() }
        : s;
    case 'CALL_ENDED':
      if (s.phase !== 'dialing' && s.phase !== 'ringing' && s.phase !== 'connected') return s;
      return {
        ...s,
        phase: 'wrap_up',
        endReason: a.reason,
        error: a.error ?? null,
        durationSec: s.startedAt ? Math.floor((Date.now() - s.startedAt) / 1000) : null,
      };
    case 'OUTCOME_DONE':
      if (s.phase !== 'wrap_up') return s;
      return {
        ...s,
        phase: s.pauseAfterCall ? 'paused' : 'idle',
        error: null,
        endReason: null,
      };
    case 'PACING_ARMED':
      return { ...s, pacingDeadlineMs: a.deadlineMs };
    case 'PACING_CLEARED':
      return { ...s, pacingDeadlineMs: null };
    case 'PAUSE':
      return { ...s, phase: 'paused', pacingDeadlineMs: null };
    case 'RESUME':
      return s.phase === 'paused' ? { ...s, phase: 'idle', pacingDeadlineMs: null } : s;
    case 'STOP':
      return { ...INITIAL };
    case 'MUTE_TOGGLE':
      return { ...s, isMuted: !s.isMuted };
    case 'HOLD_TOGGLE':
      return { ...s, isOnHold: !s.isOnHold };
    case 'SET_CAMPAIGN':
      return { ...s, campaignId: a.campaignId };
    case 'SET_AUTO_PACE':
      return { ...s, autoPace: a.value };
    case 'SET_PACING_DELAY':
      return { ...s, pacingDelaySec: a.seconds };
    case 'PAUSE_AFTER_CALL':
      return { ...s, pauseAfterCall: a.value };
  }
}

interface UseDialerMachineOpts {
  userId: string | null;
  campaignId: string | null;
  pipelineId: string | null;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function useDialerMachine({ userId, campaignId, pipelineId, onToast }: UseDialerMachineOpts) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const phaseRef = useRef(state.phase);
  phaseRef.current = state.phase;

  const twilioCallRef = useRef<TwilioCall | null>(null);
  const dialedRef = useRef<Set<string>>(new Set());

  // Twilio Device lifecycle
  const [deviceReady, setDeviceReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await createDevice();
        if (!cancelled) setDeviceReady(true);
      } catch (e) {
        console.warn('[dialer-pro] createDevice failed', e);
      }
    })();
    return () => { cancelled = true; setDeviceReady(false); };
  }, []);

  useEffect(() => {
    return addTokenRefreshFailListener((retry) => {
      onToast('Phone offline — refreshing connection…', 'error');
      window.requestAnimationFrame(() => {
        void retry().catch((e) => console.warn('[dialer-pro] retry threw', e));
      });
    });
  }, [onToast]);

  // Queue status helper
  const updateQueueStatus = useCallback(
    async (queueId: string, status: 'pending' | 'dialing' | 'done' | 'missed' | 'skipped') => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('wk_update_queue_status', {
          p_queue_id: queueId,
          p_status: status,
        });
      } catch (e) {
        console.warn('[dialer-pro] updateQueueStatus failed', e);
      }
    },
    []
  );

  // Dial a lead
  const dialLead = useCallback(
    async (lead: QueueLead) => {
      if (phaseRef.current !== 'idle' && phaseRef.current !== 'paused') return;

      // Disconnect zombie calls
      try {
        const stale = getDeviceCalls();
        if (stale.length > 0) await disconnectAllCallsAndWait(800);
      } catch {
        try { disconnectAllCalls(); } catch { /* ignore */ }
      }

      // Claim queue row
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: claimed, error: claimErr } = await (supabase as any).rpc('wk_claim_queue_row', {
        p_queue_id: lead.queueRowId,
        p_agent_id: userId,
      });
      if (claimErr) {
        onToast(`Claim failed: ${claimErr.message}`, 'error');
        return;
      }
      const claimedRow = Array.isArray(claimed) ? claimed[0] : claimed;
      if (!claimedRow) {
        void updateQueueStatus(lead.queueRowId, 'missed');
        return;
      }

      // Create call record server-side
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.functions as any).invoke('wk-calls-create', {
        body: { contact_id: lead.contactId, to_phone: lead.phone, campaign_id: campaignId },
      });
      if (error || !data) {
        const msg = (error?.message as string | undefined) ?? 'unknown error';
        onToast(`Could not place call: ${msg}`, 'error');
        void updateQueueStatus(lead.queueRowId, 'missed');
        return;
      }
      if (data.allowed === false) {
        const reason = (data.reason as string | undefined) ?? 'spend limit reached';
        onToast(`Call blocked: ${reason}`, 'error');
        void updateQueueStatus(lead.queueRowId, 'pending');
        return;
      }
      const callId = data.call_id as string | undefined;
      if (!callId) {
        onToast('Server did not return a call id', 'error');
        void updateQueueStatus(lead.queueRowId, 'missed');
        return;
      }

      dispatch({ type: 'DIAL_START', lead, callId });
      dialedRef.current.add(lead.queueRowId);

      try {
        const twilioCall = await twilioDial({
          to: lead.phone,
          extraParams: { CallId: callId, ContactId: lead.contactId },
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
          void updateQueueStatus(lead.queueRowId, 'missed');
          dispatch({ type: 'CALL_ENDED', reason: 'cancel' });
        });
        twilioCall.on('reject', () => {
          if (!isThisCall()) return;
          twilioCallRef.current = null;
          void updateQueueStatus(lead.queueRowId, 'missed');
          dispatch({ type: 'CALL_ENDED', reason: 'reject' });
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        twilioCall.on('error', (err: any) => {
          if (!isThisCall()) return;
          const code = (err?.code as number | undefined) ?? 0;
          const mapped = mapTwilioError(code, err?.message ?? '');
          onToast(mapped.friendlyMessage, 'error');
          twilioCallRef.current = null;
          void updateQueueStatus(lead.queueRowId, 'missed');
          dispatch({ type: 'CALL_ENDED', reason: 'error', error: mapped.friendlyMessage });
          if (mapped.fatal) {
            void (async () => {
              try { await disconnectAllCallsAndWait(1500); } catch { try { disconnectAllCalls(); } catch { /* ignore */ } }
            })();
          }
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'dial crashed';
        onToast(`Dial failed: ${msg}`, 'error');
        void updateQueueStatus(lead.queueRowId, 'missed');
        dispatch({ type: 'CALL_ENDED', reason: 'failed', error: msg });
      }
    },
    [userId, campaignId, onToast, updateQueueStatus]
  );

  // Pick next lead from queue
  const pickNextLead = useCallback(
    async (queue: QueueLead[]): Promise<QueueLead | null> => {
      for (const lead of queue) {
        if (dialedRef.current.has(lead.queueRowId)) continue;
        if (!lead.phone) continue;
        return lead;
      }
      return null;
    },
    []
  );

  // Hang up
  const hangUp = useCallback(async () => {
    const c = twilioCallRef.current;
    twilioCallRef.current = null;
    if (c) try { c.disconnect(); } catch { /* ignore */ }
    try { disconnectAllCalls(); } catch { /* ignore */ }
    dispatch({ type: 'CALL_ENDED', reason: 'hangup' });
    try { await disconnectAllCallsAndWait(1500); } catch { /* ignore */ }
  }, []);

  // Mute toggle
  const muteToggle = useCallback(() => {
    const all = getDeviceCalls();
    const truth = twilioCallRef.current ?? all[all.length - 1] ?? null;
    if (!truth && all.length === 0) return;
    muteAllCalls(!state.isMuted, truth);
    dispatch({ type: 'MUTE_TOGGLE' });
  }, [state.isMuted]);

  // Hold toggle
  const holdToggle = useCallback(() => {
    dispatch({ type: 'HOLD_TOGGLE' });
  }, []);

  // Apply outcome
  const [applying, setApplying] = useState(false);
  const applyOutcome = useCallback(
    async (columnId: string, agentNote?: string) => {
      if (!state.currentLead || !state.currentCallId) {
        onToast('Cannot save outcome — call ID missing', 'error');
        dispatch({ type: 'OUTCOME_DONE' });
        return;
      }
      setApplying(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.functions as any).invoke('wk-outcome-apply', {
          body: {
            call_id: state.currentCallId,
            contact_id: state.currentLead.contactId,
            column_id: columnId,
            agent_note: agentNote?.trim() || null,
          },
        });
        if (error) {
          onToast(`Outcome failed: ${error.message}`, 'error');
        } else {
          onToast('Outcome saved', 'success');
        }
      } finally {
        setApplying(false);
        dispatch({ type: 'OUTCOME_DONE' });
      }
    },
    [state.currentLead, state.currentCallId, onToast]
  );

  // Skip (no outcome)
  const skip = useCallback(() => {
    if (state.currentLead) {
      void updateQueueStatus(state.currentLead.queueRowId, 'skipped');
    }
    dispatch({ type: 'OUTCOME_DONE' });
  }, [state.currentLead, updateQueueStatus]);

  // Pause
  const pause = useCallback(() => {
    if (phaseRef.current === 'dialing' || phaseRef.current === 'ringing') {
      const c = twilioCallRef.current;
      twilioCallRef.current = null;
      if (c) try { c.disconnect(); } catch { /* ignore */ }
    }
    dispatch({ type: 'PAUSE' });
  }, []);

  // Resume
  const resume = useCallback(() => {
    dispatch({ type: 'RESUME' });
  }, []);

  // Stop
  const stop = useCallback(async () => {
    if (twilioCallRef.current) {
      try { twilioCallRef.current.disconnect(); } catch { /* ignore */ }
      twilioCallRef.current = null;
      try { disconnectAllCalls(); } catch { /* ignore */ }
    }
    dialedRef.current.clear();
    dispatch({ type: 'STOP' });
  }, []);

  // Dial now (bypass pacing countdown)
  const dialNow = useCallback(
    async (queue: QueueLead[]) => {
      dispatch({ type: 'PACING_CLEARED' });
      const next = await pickNextLead(queue);
      if (next) void dialLead(next);
      else onToast('Queue empty', 'info');
    },
    [pickNextLead, dialLead, onToast]
  );

  return {
    state,
    dispatch,
    deviceReady,
    applying,
    dialLead,
    pickNextLead,
    hangUp,
    muteToggle,
    holdToggle,
    applyOutcome,
    skip,
    pause,
    resume,
    stop,
    dialNow,
    dialedRef,
  };
}
