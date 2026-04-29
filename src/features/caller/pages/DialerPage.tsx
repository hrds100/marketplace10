// DialerPage — Caller power dialer (clean rebuild 2026-04-29).
//
// Self-contained. All dialer state, Twilio wiring, and UI are in this
// one file. Replaces the over-engineered ActiveCallProvider + multiple
// panes that Hugo flagged as broken.
//
// Power-dialer model:
//   1. Agent picks a campaign + pacing (Manual / Auto).
//   2. Click "Start power dialer" → fetches lead 1 from wk_dialer_queue
//      → calls wk-calls-create → Twilio.Device.connect.
//   3. Live call: status badge (Dialing / Ringing / Connected) +
//      Mute + Hang up.
//   4. After hangup: wrap-up panel with outcome buttons + Skip + Pause +
//      Notes. Picking an outcome calls wk-outcome-apply (moves contact +
//      fires automation). Skip applies no outcome.
//   5. Auto pacing: after outcome/skip, countdown to next dial. "Dial now"
//      bypasses the countdown.
//   6. Anti-loop: every dialed contact is recorded in `dialed` set;
//      next-lead picker filters them out so we cannot loop on the
//      same contact even if its wk_dialer_queue row is slow to
//      transition out of `pending`.
//   7. Pause / Resume / Stop are explicit buttons in the top bar.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Phone, PhoneOff, Mic, MicOff, Pause, Play, Square, SkipForward, Zap,
  CheckCircle2, Loader2, Clock, Radio, Pencil, X, Minus, GripVertical,
} from 'lucide-react';
import type { Call as TwilioCall } from '@twilio/voice-sdk';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  createDevice, destroyDevice, dial as twilioDial, disconnectAllCalls,
  disconnectAllCallsAndWait, muteAllCalls, getDeviceCalls,
  addTokenRefreshFailListener,
} from '@/core/integrations/twilio-voice';
import { mapTwilioError } from '../lib/twilioErrorMap';
import { useDialerCampaigns } from '../hooks/useDialerCampaigns';
import { usePipelineColumns } from '../hooks/usePipelineColumns';
import { useSpendLimit } from '../hooks/useSpendLimit';
import { useKillSwitch } from '../hooks/useKillSwitch';
import { useCalls } from '../hooks/useCalls';
import { useCallerToasts } from '../store/toastsProvider';
import type { Campaign } from '../types';

// ─── Types ──────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  phone: string;
  queueId: string;
  pipelineColumnId: string | null;
}

type Phase =
  | 'idle'           // pre-dial / stopped
  | 'dialing'        // wk-calls-create + Twilio.connect in flight
  | 'ringing'        // destination is alerting
  | 'connected'      // call active
  | 'wrap_up'        // call ended; agent picks outcome
  | 'paused';        // session paused; no new dials until resume

type PacingMode = 'manual' | 'auto';

interface State {
  phase: Phase;
  lead: Lead | null;
  callId: string | null;
  startedAt: number | null;
  error: string | null;
  endReason: string | null;
  pacingDeadlineMs: number | null;
  sessionStarted: boolean;
}

const INITIAL: State = {
  phase: 'idle',
  lead: null,
  callId: null,
  startedAt: null,
  error: null,
  endReason: null,
  pacingDeadlineMs: null,
  sessionStarted: false,
};

type Action =
  | { type: 'DIAL_START'; lead: Lead }
  | { type: 'DIAL_RESOLVED'; callId: string }
  | { type: 'RINGING' }
  | { type: 'CONNECTED' }
  | { type: 'CALL_ENDED'; reason: string; error?: string }
  | { type: 'OUTCOME_DONE' }
  | { type: 'PACING_ARMED'; deadlineMs: number }
  | { type: 'PACING_CLEARED' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'DIAL_START':
      return {
        ...s,
        phase: 'dialing',
        lead: a.lead,
        callId: null,
        startedAt: null,
        error: null,
        endReason: null,
        pacingDeadlineMs: null,
        sessionStarted: true,
      };
    case 'DIAL_RESOLVED':
      return { ...s, callId: a.callId };
    case 'RINGING':
      return s.phase === 'dialing' ? { ...s, phase: 'ringing' } : s;
    case 'CONNECTED':
      return s.phase === 'dialing' || s.phase === 'ringing'
        ? { ...s, phase: 'connected', startedAt: Date.now() }
        : s;
    case 'CALL_ENDED':
      if (s.phase !== 'dialing' && s.phase !== 'ringing' && s.phase !== 'connected') {
        return s;
      }
      return {
        ...s,
        phase: 'wrap_up',
        endReason: a.reason,
        error: a.error ?? null,
      };
    case 'OUTCOME_DONE':
      return { ...s, phase: 'idle', error: null, endReason: null };
    case 'PACING_ARMED':
      return { ...s, pacingDeadlineMs: a.deadlineMs };
    case 'PACING_CLEARED':
      return { ...s, pacingDeadlineMs: null };
    case 'PAUSE':
      return { ...s, phase: 'paused', pacingDeadlineMs: null };
    case 'RESUME':
      return { ...s, phase: 'idle', pacingDeadlineMs: null };
    case 'STOP':
      return { ...INITIAL };
  }
}

// ─── Component ──────────────────────────────────────────────────────
//
// `CallerPad` is mounted ONCE in CallerLayout so its state (Twilio
// Device, dialer reducer, queue subscriptions, in-flight call) survives
// route navigation. On `/caller/dialer` it renders as the full pad
// (top-right, minimize-to-chip). On every other `/caller/*` route it
// renders as a small Intercom-style square icon (bottom-right by
// default); clicking the icon expands the same pad as a floating
// overlay so the agent can dial from any caller page.
//
// The route component for `/caller/dialer` is `DialerPage` (default
// export below), which renders nothing — the pad rendered by the
// layout already provides the dialer UI.

export function CallerPad() {
  const { user, isAdmin } = useAuth();
  const toasts = useCallerToasts();
  const { pathname } = useLocation();
  // The pad lives in CallerLayout, so it renders for every /caller/*
  // route. On /caller/dialer it's the full pad (current behaviour).
  // Elsewhere it's an Intercom-style icon by default — click to open.
  const onDialerPage = pathname === '/caller/dialer' || pathname.startsWith('/caller/dialer/');
  const onCallerSurface = pathname.startsWith('/caller/');
  // Persisted on/off for the icon mode. 'icon' = collapsed icon
  // visible; 'open' = full pad visible as an overlay. Independent
  // from `minimized` which only governs behaviour on /caller/dialer.
  const [iconOpen, setIconOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('caller_pad_open_v1') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('caller_pad_open_v1', iconOpen ? '1' : '0'); } catch { /* ignore */ }
  }, [iconOpen]);

  // Workspace-role check (mirrors CallerGuard).
  const [workspaceRole, setWorkspaceRole] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!user) { setWorkspaceRole(null); return; }
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('profiles' as any) as any)
        .select('workspace_role').eq('id', user.id).maybeSingle();
      if (!cancelled) setWorkspaceRole((data?.workspace_role as string | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, [user]);
  const isEffectiveAdmin = workspaceRole === 'admin' || (workspaceRole === null && isAdmin);

  // Campaigns + pacing.
  const { campaigns, loading: campaignsLoading } = useDialerCampaigns({
    scopedToAgentId: !isEffectiveAdmin && user ? user.id : null,
    includeInactive: true,
  });
  const [activeCampaignId, setActiveCampaignId] = useState<string>('');
  useEffect(() => {
    if (campaigns.length === 0) return;
    if (!campaigns.some((c) => c.id === activeCampaignId)) {
      setActiveCampaignId(campaigns[0].id);
    }
  }, [campaigns, activeCampaignId]);
  const camp: Campaign | null = useMemo(
    () => campaigns.find((c) => c.id === activeCampaignId) ?? campaigns[0] ?? null,
    [campaigns, activeCampaignId]
  );

  const [pacing, setPacing] = useState<PacingMode>('auto');
  const [pacingDelaySec, setPacingDelaySec] = useState(5);

  // Spend / kill switch.
  const spend = useSpendLimit();
  const ks = useKillSwitch();

  // Twilio Device lifecycle.
  const [deviceReady, setDeviceReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await createDevice();
        if (!cancelled) setDeviceReady(true);
      } catch (e) {
        console.warn('[caller] createDevice failed', e);
      }
    })();
    return () => {
      cancelled = true;
      void destroyDevice();
      setDeviceReady(false);
    };
  }, []);
  useEffect(() => {
    return addTokenRefreshFailListener((retry) => {
      toasts.push('Phone offline — refreshing connection…', 'error');
      window.requestAnimationFrame(() => {
        void retry().catch((e) => console.warn('[caller] retry threw', e));
      });
    });
  }, [toasts]);

  // Dialer reducer.
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // Anti-loop: contacts dialed in this session.
  const [dialed, setDialed] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    if (state.phase === 'idle' && !state.sessionStarted) {
      setDialed(new Set());
    }
  }, [state.phase, state.sessionStarted]);

  // Active Twilio call handle.
  const twilioCallRef = useRef<TwilioCall | null>(null);
  // Tracks the queue row currently in flight so hangUp / handlers can
  // transition wk_dialer_queue.status without relying on stale state.
  const currentLeadRef = useRef<Lead | null>(null);
  const [muted, setMuted] = useState(false);

  const [notes, setNotes] = useState('');

  // ─── Queue status writer ─────────────────────────────────────────
  // wk_dialer_queue.status CHECK constraint allows ONLY:
  //   pending · dialing · connected · voicemail · missed · done ·
  //   skipped · lost
  // Writing anything else (e.g. 'failed') silently fails — the row
  // stays at whatever status it was. That is exactly the bug Hugo hit
  // pre-2026-04-29 (the dialer kept looping on the same numbers
  // because failed dials never transitioned out of 'dialing').
  const updateQueueStatus = useCallback(
    async (
      queueId: string,
      status: 'pending' | 'dialing' | 'done' | 'missed' | 'skipped'
    ) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('wk_dialer_queue' as any) as any)
          .update({ status })
          .eq('id', queueId);
      } catch (e) {
        console.warn('[caller] updateQueueStatus failed', e);
      }
    },
    []
  );

  // ─── Pick next lead ───────────────────────────────────────────────
  // Calls the `wk_pick_next_lead` RPC. The RPC is SECURITY DEFINER so
  // it bypasses RLS — non-admin agents can't UPDATE wk_dialer_queue
  // directly (no agent UPDATE policy), so the prior client-side
  // SELECT + UPDATE silently failed: every claim returned 0 rows
  // and the picker reported "No leads in queue" while the panel
  // showed pending leads.
  //
  // Known limitation: the RPC's ORDER BY is `priority DESC,
  // scheduled_for ASC NULLS FIRST, attempts ASC` — no `created_at`
  // tiebreak. When many rows share priority + scheduled_for + attempts
  // (typical of a fresh CSV import) Postgres returns one of them
  // arbitrarily, so "Skip & next" can pick a row that's not at the
  // top of the panel. The follow-up migration in
  // supabase/migrations/20260430000160_smsv2_picker_created_at_tiebreak.sql
  // adds `created_at ASC` to the ORDER BY and drops the attempts<3
  // filter; once it's applied the picker will exactly match the
  // panel.
  const pickNextLead = useCallback(async (): Promise<Lead | null> => {
    if (!camp || !user) return null;

    // Anti-loop within a session: try a few RPC calls, marking each
    // pick as 'skipped' if we've already dialed that contact. The RPC
    // claims a row each call, so we have to release the duplicate
    // claim back to a terminal status (skipped) so it doesn't stay
    // stuck at 'dialing'.
    for (let attempt = 0; attempt < 5; attempt++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pickRow, error } = await (supabase as any).rpc('wk_pick_next_lead', {
        p_agent_id: user.id,
        p_campaign_id: camp.id,
      });
      if (error) {
        toasts.push(`Queue pick failed: ${error.message}`, 'error');
        return null;
      }
      // The function returns SETOF — supabase-js returns the first row
      // (or null if 0 rows). Normalize.
      const picked = Array.isArray(pickRow) ? pickRow[0] : pickRow;
      if (!picked) return null;
      const queueId = picked.queue_id as string;
      const contactId = picked.contact_id as string;

      // Resolve the contact (RLS on wk_contacts allows agent reads of
      // contacts they own / are assigned to; the RPC has already
      // claimed the queue row to this agent, so the agent will see it).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: contact } = await (supabase.from('wk_contacts' as any) as any)
        .select('id, name, phone, pipeline_column_id')
        .eq('id', contactId)
        .maybeSingle();
      if (!contact) {
        // Orphan queue row — mark missed and try again.
        void updateQueueStatus(queueId, 'missed');
        continue;
      }
      if (!contact.phone) {
        void updateQueueStatus(queueId, 'missed');
        continue;
      }
      if (dialed.has(contact.id)) {
        // Already dialed this contact in this session. Release the
        // claim back as 'skipped' so the row doesn't stay at 'dialing'.
        void updateQueueStatus(queueId, 'skipped');
        continue;
      }

      return {
        id: contact.id,
        name: contact.name ?? contact.phone,
        phone: contact.phone,
        queueId,
        pipelineColumnId: contact.pipeline_column_id ?? null,
      };
    }
    return null;
  }, [camp, dialed, user, toasts, updateQueueStatus]);

  // ─── Dial a lead ───────────────────────────────────────────────────
  const dialLead = useCallback(
    async (lead: Lead) => {
      // Clean up any leftover Twilio call before starting the next one.
      // Without this, auto-pacing fires faster than Twilio Device tears
      // down the previous call → twilioDial throws "A Call is already
      // active" and every subsequent dial fails. Hugo screenshots
      // 2026-04-29 caught this on every dial after the first.
      try {
        const stale = getDeviceCalls();
        if (stale.length > 0) {
          await disconnectAllCallsAndWait(800);
        }
      } catch {
        try { disconnectAllCalls(); } catch { /* ignore */ }
      }

      dispatch({ type: 'DIAL_START', lead });
      setNotes('');
      setMuted(false);
      twilioCallRef.current = null;
      currentLeadRef.current = lead;
      setDialed((prev) => {
        const next = new Set(prev);
        next.add(lead.id);
        return next;
      });
      // Note: the queue row is already at status='dialing' — the
      // wk_pick_next_lead RPC flipped it atomically inside pickNextLead.

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.functions as any).invoke('wk-calls-create', {
          body: { contact_id: lead.id, to_phone: lead.phone, campaign_id: camp?.id ?? null },
        });
        if (error || !data) {
          const msg = (error?.message as string | undefined) ?? 'unknown error';
          toasts.push(`Could not place call: ${msg}`, 'error');
          void updateQueueStatus(lead.queueId, 'missed');
          currentLeadRef.current = null;
          dispatch({ type: 'CALL_ENDED', reason: 'failed', error: msg });
          return;
        }
        if (data.allowed === false) {
          const reason = (data.reason as string | undefined) ?? 'spend limit reached';
          toasts.push(`Call blocked: ${reason}`, 'error');
          // Spend / killswitch block — give the lead back to the queue.
          // It's not the contact's fault and we want to retry tomorrow.
          void updateQueueStatus(lead.queueId, 'pending');
          currentLeadRef.current = null;
          dispatch({ type: 'CALL_ENDED', reason: 'blocked', error: reason });
          return;
        }
        const callId = data.call_id as string | undefined;
        if (!callId) {
          toasts.push('Server did not return a call id', 'error');
          void updateQueueStatus(lead.queueId, 'missed');
          currentLeadRef.current = null;
          dispatch({ type: 'CALL_ENDED', reason: 'failed', error: 'missing call_id' });
          return;
        }
        dispatch({ type: 'DIAL_RESOLVED', callId });

        const twilioCall = await twilioDial({
          to: lead.phone,
          extraParams: { CallId: callId, ContactId: lead.id },
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
          // Leave the queue row at 'dialing' so the outcome flow
          // (wk_apply_outcome) can transition it to 'done' atomically
          // alongside the pipeline move + automation. If we set 'done'
          // here first, the outcome RPC's UPDATE filter (pending/
          // dialing/connected/voicemail) won't match and we lose the
          // automatic queue cleanup hook.
          dispatch({ type: 'CALL_ENDED', reason: 'hangup' });
        });
        twilioCall.on('cancel', () => {
          if (!isThisCall()) return;
          twilioCallRef.current = null;
          void updateQueueStatus(lead.queueId, 'missed');
          currentLeadRef.current = null;
          dispatch({ type: 'CALL_ENDED', reason: 'cancel' });
        });
        twilioCall.on('reject', () => {
          if (!isThisCall()) return;
          twilioCallRef.current = null;
          void updateQueueStatus(lead.queueId, 'missed');
          currentLeadRef.current = null;
          dispatch({ type: 'CALL_ENDED', reason: 'reject' });
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        twilioCall.on('error', (err: any) => {
          if (!isThisCall()) return;
          const code = (err?.code as number | undefined) ?? 0;
          const mapped = mapTwilioError(code, err?.message ?? '');
          toasts.push(mapped.friendlyMessage, 'error');
          twilioCallRef.current = null;
          void updateQueueStatus(lead.queueId, 'missed');
          currentLeadRef.current = null;
          dispatch({ type: 'CALL_ENDED', reason: 'error', error: mapped.friendlyMessage });
          if (mapped.fatal) {
            void (async () => {
              try { await disconnectAllCallsAndWait(1500); } catch { try { disconnectAllCalls(); } catch { /* ignore */ } }
            })();
          }
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'dial crashed';
        toasts.push(`Dial failed: ${msg}`, 'error');
        void updateQueueStatus(lead.queueId, 'missed');
        currentLeadRef.current = null;
        dispatch({ type: 'CALL_ENDED', reason: 'failed', error: msg });
      }
    },
    [camp, toasts, updateQueueStatus]
  );

  // ─── Start dialer ─────────────────────────────────────────────────
  const startDialer = useCallback(async () => {
    if (!camp || !deviceReady) {
      toasts.push('Phone is starting up — try again', 'error');
      return;
    }
    if (spend.isLimitReached) {
      toasts.push('Daily spend limit reached', 'error');
      return;
    }
    if (ks.allDialers) {
      toasts.push('All dialers paused (kill switch)', 'error');
      return;
    }
    const next = await pickNextLead();
    if (!next) {
      toasts.push('No leads in queue', 'info');
      return;
    }
    void dialLead(next);
  }, [camp, deviceReady, spend.isLimitReached, ks.allDialers, pickNextLead, dialLead, toasts]);

  // ─── Hang up ──────────────────────────────────────────────────────
  const hangUp = useCallback(async () => {
    const c = twilioCallRef.current;
    twilioCallRef.current = null;
    if (c) {
      try { c.disconnect(); } catch { /* ignore */ }
    }
    try { disconnectAllCalls(); } catch { /* ignore */ }
    // Don't transition the queue row here — leave it at 'dialing' so
    // the wrap-up outcome can tag it (wk_apply_outcome). If the agent
    // skips without picking an outcome the skip handler marks
    // 'skipped'.
    currentLeadRef.current = null;
    dispatch({ type: 'CALL_ENDED', reason: 'hangup' });
    try { await disconnectAllCallsAndWait(1500); } catch { /* ignore */ }
  }, []);

  // ─── Mute ─────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const all = getDeviceCalls();
    const truth = twilioCallRef.current ?? all[all.length - 1] ?? null;
    if (!truth && all.length === 0) return;
    const next = !muted;
    muteAllCalls(next, truth);
    setMuted(next);
  }, [muted]);

  // ─── Apply outcome ─────────────────────────────────────────────────
  const [applying, setApplying] = useState(false);
  const applyOutcome = useCallback(
    async (columnId: string) => {
      if (!state.lead || !state.callId) {
        dispatch({ type: 'OUTCOME_DONE' });
        return;
      }
      setApplying(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.functions as any).invoke('wk-outcome-apply', {
          body: {
            call_id: state.callId,
            contact_id: state.lead.id,
            column_id: columnId,
            agent_note: notes.trim() || null,
          },
        });
        if (error) {
          toasts.push(`Outcome failed: ${error.message}`, 'error');
        } else {
          toasts.push('Outcome saved', 'success');
        }
      } finally {
        setApplying(false);
        dispatch({ type: 'OUTCOME_DONE' });
      }
    },
    [state.lead, state.callId, notes, toasts]
  );

  const skip = useCallback(() => {
    // Skip = no outcome chosen; mark queue 'skipped' so it doesn't
    // come back round in the same session.
    const lead = currentLeadRef.current ?? state.lead;
    if (lead) {
      void updateQueueStatus(lead.queueId, 'skipped');
      currentLeadRef.current = null;
    }
    dispatch({ type: 'OUTCOME_DONE' });
  }, [state.lead, updateQueueStatus]);

  // ─── Auto-pacing ──────────────────────────────────────────────────
  useEffect(() => {
    if (state.phase !== 'idle') return;
    if (!state.sessionStarted) return;
    if (pacing !== 'auto') return;

    const delayMs = Math.max(0, pacingDelaySec) * 1000;
    const deadlineMs = Date.now() + delayMs;
    dispatch({ type: 'PACING_ARMED', deadlineMs });
    const t = setTimeout(() => {
      void (async () => {
        const next = await pickNextLead();
        if (next) {
          void dialLead(next);
        } else {
          toasts.push('Queue empty', 'info');
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

  const dialNow = useCallback(async () => {
    dispatch({ type: 'PACING_CLEARED' });
    const next = await pickNextLead();
    if (next) void dialLead(next);
    else toasts.push('Queue empty', 'info');
  }, [pickNextLead, dialLead, toasts]);

  const dialNextManual = useCallback(async () => {
    if (state.phase === 'connected' || state.phase === 'ringing' || state.phase === 'dialing') {
      await hangUp();
    }
    dispatch({ type: 'OUTCOME_DONE' });
    setTimeout(async () => {
      const next = await pickNextLead();
      if (next) void dialLead(next);
      else toasts.push('Queue empty', 'info');
    }, 200);
  }, [state.phase, hangUp, pickNextLead, dialLead, toasts]);

  const pause = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, []);
  const resume = useCallback(async () => {
    dispatch({ type: 'RESUME' });
    const next = await pickNextLead();
    if (next) void dialLead(next);
    else toasts.push('Queue empty', 'info');
  }, [pickNextLead, dialLead, toasts]);
  const stop = useCallback(async () => {
    if (twilioCallRef.current) {
      try { twilioCallRef.current.disconnect(); } catch { /* ignore */ }
      twilioCallRef.current = null;
      try { disconnectAllCalls(); } catch { /* ignore */ }
    }
    // If we Stop mid-call without an outcome, the queue row stays at
    // 'dialing'. That is intentional — three-strikes still kicks in,
    // and an admin can reset from /caller/contacts if needed. We do
    // NOT mark 'done' because no outcome was applied.
    currentLeadRef.current = null;
    dispatch({ type: 'STOP' });
  }, []);

  const { columns: outcomeColumns } = usePipelineColumns(camp?.pipelineId ?? null);

  // ─── Floating-pad UI state ────────────────────────────────────────
  // Hugo's brief (2026-04-29): convert the dialer page to a phone-sized
  // floating pad anchored top-right just under the nav, draggable, with
  // accordion queue/history. Persist position + minimize state +
  // accordion section in localStorage so the pad feels like a desktop
  // tool, not a page.
  const PAD_W = 380;
  const HEADER_OFFSET = 72;     // top nav height
  const RIGHT_GUTTER = 24;
  const defaultPos = (): { x: number; y: number } => {
    if (typeof window === 'undefined') return { x: 800, y: HEADER_OFFSET };
    return {
      x: Math.max(0, window.innerWidth - PAD_W - RIGHT_GUTTER),
      y: HEADER_OFFSET,
    };
  };
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const raw = localStorage.getItem('caller_pad_pos_v1');
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p?.x === 'number' && typeof p?.y === 'number') return p;
      }
    } catch { /* ignore */ }
    return defaultPos();
  });
  useEffect(() => {
    try { localStorage.setItem('caller_pad_pos_v1', JSON.stringify(pos)); } catch { /* ignore */ }
  }, [pos]);

  const [minimized, setMinimized] = useState<boolean>(() => {
    try { return localStorage.getItem('caller_pad_minimized_v1') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('caller_pad_minimized_v1', minimized ? '1' : '0'); } catch { /* ignore */ }
  }, [minimized]);

  // 'peek' = both panels show 3 each. 'queue' = queue expanded,
  // history collapsed to header. 'history' = vice versa. Click on a
  // section header toggles between expanded and peek.
  const [accordion, setAccordion] = useState<'peek' | 'queue' | 'history'>(() => {
    try {
      const v = localStorage.getItem('caller_pad_accordion_v1');
      if (v === 'queue' || v === 'history' || v === 'peek') return v;
    } catch { /* ignore */ }
    return 'peek';
  });
  useEffect(() => {
    try { localStorage.setItem('caller_pad_accordion_v1', accordion); } catch { /* ignore */ }
  }, [accordion]);

  // Drag handlers. Pointer events so it works with mouse + touch.
  const dragRef = useRef<{ offX: number; offY: number; moved: boolean } | null>(null);
  const justDraggedRef = useRef(false);
  const onDragStart = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { offX: e.clientX - pos.x, offY: e.clientY - pos.y, moved: false };
    justDraggedRef.current = false;
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - (pos.x + dragRef.current.offX);
    const dy = e.clientY - (pos.y + dragRef.current.offY);
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
    const newX = e.clientX - dragRef.current.offX;
    const newY = e.clientY - dragRef.current.offY;
    const maxX = Math.max(0, window.innerWidth - PAD_W);
    const maxY = Math.max(0, window.innerHeight - 80);
    setPos({
      x: Math.min(Math.max(newX, 0), maxX),
      y: Math.min(Math.max(newY, 56), maxY),
    });
  };
  const onDragEnd = (e: React.PointerEvent) => {
    if (dragRef.current) {
      justDraggedRef.current = dragRef.current.moved;
      try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      dragRef.current = null;
      window.setTimeout(() => { justDraggedRef.current = false; }, 0);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────
  const blocked = spend.isLimitReached || ks.allDialers || !deviceReady;
  const blockReason = ks.allDialers
    ? 'All dialers paused (kill switch)'
    : spend.isLimitReached
      ? 'Daily spend limit reached'
      : !deviceReady
        ? 'Phone is starting up…'
        : null;

  const isLive =
    state.phase === 'dialing' ||
    state.phase === 'ringing' ||
    state.phase === 'connected';

  // Pad is only visible inside the /caller/* surface. The component is
  // mounted in CallerLayout, but defensively check in case it ever
  // ends up rendered outside.
  if (!onCallerSurface) return null;

  // ─── Non-dialer routes: Intercom-style square icon ──────────────────
  // On any /caller/* route that isn't /caller/dialer, the pad collapses
  // to a small square-with-rounded-corners icon (phone glyph in the
  // middle). Click expands the same pad as a floating overlay; the
  // overlay's X button returns to the icon.
  if (!onDialerPage && !iconOpen) {
    return (
      <div
        className="fixed z-[90] select-none"
        style={{ left: pos.x, top: pos.y }}
      >
        <button
          type="button"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          onClick={(e) => {
            if (justDraggedRef.current) return;
            e.preventDefault();
            setIconOpen(true);
          }}
          title={isLive && state.lead ? `Live · ${state.lead.name}` : 'Open dialer'}
          className={cn(
            'relative inline-flex items-center justify-center w-14 h-14 rounded-[16px] shadow-[0_12px_28px_rgba(30,154,128,0.35)] cursor-grab active:cursor-grabbing transition-colors',
            isLive
              ? 'bg-[#1E9A80] text-white'
              : 'bg-white text-[#1E9A80] border border-[#E5E7EB] hover:bg-[#ECFDF5]'
          )}
        >
          <Phone className="w-6 h-6" strokeWidth={2} />
          {isLive && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white animate-pulse" />
          )}
        </button>
      </div>
    );
  }

  // When minimized (only on /caller/dialer), show a draggable green
  // floating icon that reopens the full dialer pad.
  if (onDialerPage && minimized) {
    return (
      <div
        className="fixed z-[90] select-none"
        style={{ left: pos.x, top: pos.y }}
      >
        <button
          type="button"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          onClick={(e) => {
            if (justDraggedRef.current) return;
            e.preventDefault();
            setMinimized(false);
          }}
          title="Open dialer pad"
          className="relative inline-flex items-center justify-center w-14 h-14 rounded-[16px] shadow-[0_12px_28px_rgba(30,154,128,0.35)] cursor-grab active:cursor-grabbing bg-[#1E9A80] text-white"
        >
          <Phone className="w-6 h-6" strokeWidth={2} />
          {isLive && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white animate-pulse" />
          )}
        </button>
      </div>
    );
  }

  // Expanded floating pad.
  return (
    <div
      className="fixed z-[90] select-text"
      style={{ left: pos.x, top: pos.y, width: PAD_W }}
    >
      <div className="bg-[#F3F3EE] border border-[#E5E7EB] rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col max-h-[calc(100vh-96px)]">
        {/* Drag handle / header. */}
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          className="px-3 py-2 bg-white border-b border-[#E5E7EB] flex items-center gap-2 cursor-grab active:cursor-grabbing"
          title="Drag to move"
        >
          <GripVertical className="w-4 h-4 text-[#9CA3AF]" />
          <div className="flex-1 min-w-0 flex items-baseline gap-2">
            <span className="text-[13px] font-bold text-[#1A1A1A]">Caller</span>
            {camp && (
              <span className="text-[11px] text-[#6B7280] truncate">· {camp.name}</span>
            )}
            {isLive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1E9A80] animate-pulse" />
            )}
          </div>
          {/* On /caller/dialer the header button minimizes to the chip.
              On other /caller/* routes it closes back to the icon. */}
          {onDialerPage ? (
            <button
              type="button"
              onClick={() => setMinimized(true)}
              title="Minimize"
              className="p-1 rounded hover:bg-[#F3F3EE] text-[#6B7280]"
            >
              <Minus className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIconOpen(false)}
              title="Close"
              className="p-1 rounded hover:bg-[#F3F3EE] text-[#6B7280]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable body. */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Block reason banner. */}
          {blocked && blockReason && (
            <div className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[11px] rounded-[10px] px-2.5 py-1.5">
              {blockReason}
            </div>
          )}

          {/* Compact campaign + KPI strip. */}
          <CompactCampaignStrip
            campaigns={campaigns}
            activeId={activeCampaignId}
            onSelect={setActiveCampaignId}
            loading={campaignsLoading}
            camp={camp}
          />

          {/* Single compact control bar — pacing when idle, live-call info
              + Mute + Hang up + Skip & next + Pause/Resume + Stop when in
              any other phase. */}
          <ControlBar
            phase={state.phase}
            lead={state.lead}
            startedAt={state.startedAt}
            muted={muted}
            sessionStarted={state.sessionStarted}
            pacing={pacing}
            setPacing={setPacing}
            pacingDelaySec={pacingDelaySec}
            setPacingDelaySec={setPacingDelaySec}
            onMute={toggleMute}
            onHangUp={() => void hangUp()}
            onSkipNext={() => void dialNextManual()}
            onPause={pause}
            onResume={resume}
            onStop={stop}
          />

          {state.phase === 'wrap_up' && state.lead && (
            <WrapUpCard
              contactName={state.lead.name}
              contactPhone={state.lead.phone}
              endReason={state.endReason ?? 'ended'}
              error={state.error}
              notes={notes}
              setNotes={setNotes}
              columns={outcomeColumns}
              applying={applying}
              onApply={(id) => void applyOutcome(id)}
              onSkip={skip}
            />
          )}

          {state.pacingDeadlineMs !== null && state.phase === 'idle' && (
            <PacingCountdownBar
              deadlineMs={state.pacingDeadlineMs}
              onDialNow={() => void dialNow()}
              onPause={pause}
            />
          )}

          {!state.sessionStarted && state.phase === 'idle' && (
            <button
              type="button"
              onClick={() => void startDialer()}
              disabled={blocked || !camp}
              className="w-full inline-flex items-center justify-center gap-2 text-[14px] font-semibold text-white bg-[#1E9A80] hover:bg-[#1E9A80]/90 px-4 py-3 rounded-2xl shadow-[0_4px_16px_rgba(30,154,128,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Phone className="w-4 h-4" />
              Start power dialer
            </button>
          )}
          {state.sessionStarted && state.phase === 'idle' && state.pacingDeadlineMs === null && (
            <button
              type="button"
              onClick={() => void dialNow()}
              disabled={blocked}
              className="w-full inline-flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-[#1E9A80] hover:bg-[#1E9A80]/90 px-4 py-2.5 rounded-2xl shadow-[0_4px_16px_rgba(30,154,128,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Phone className="w-4 h-4" />
              Dial next lead
            </button>
          )}
          {state.phase === 'paused' && (
            <button
              type="button"
              onClick={() => void resume()}
              disabled={blocked}
              className="w-full inline-flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-[#1E9A80] hover:bg-[#1E9A80]/90 px-4 py-2.5 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          )}

          {/* Accordion: queue + history. Click a header to expand that
              section; the other auto-collapses to header-only. Click again
              to return both to peek mode (3 items each). */}
          <UpcomingQueuePanel
            campaignId={camp?.id ?? null}
            // Keep panel scope identical to wk_pick_next_lead so "Skip & next"
            // always dials what the operator can see in this list.
            agentId={user ? user.id : null}
            dialed={dialed}
            currentLead={state.lead}
            currentPhase={state.phase}
            dense
            maxItems={accordion === 'queue' ? 12 : 3}
            collapsed={accordion === 'history'}
            onHeaderClick={() =>
              setAccordion((prev) => (prev === 'queue' ? 'peek' : 'queue'))
            }
          />
          <CallHistoryPanel
            agentId={user ? user.id : null}
            dense
            maxItems={accordion === 'history' ? 20 : 3}
            collapsed={accordion === 'queue'}
            onHeaderClick={() =>
              setAccordion((prev) => (prev === 'history' ? 'peek' : 'history'))
            }
          />
        </div>
      </div>
    </div>
  );
}

// ─── /caller/dialer route component ─────────────────────────────────
//
// The pad UI lives in CallerLayout (above the Outlet) so it survives
// route navigation. The route component itself renders nothing — the
// pad floats over whatever the current page would have been.

export default function DialerPage() {
  return null;
}

// ─── Sub-components ──────────────────────────────────────────────────

// Compact one-row campaign + KPI strip for the floating pad. Replaces
// the old full-bleed CampaignCard. Each KPI shows its literal status
// count (no aggregation) so Pending + Connected + Done + others = Total.
function CompactCampaignStrip({
  campaigns, activeId, onSelect, loading, camp,
}: {
  campaigns: Campaign[];
  activeId: string;
  onSelect: (id: string) => void;
  loading: boolean;
  camp: Campaign | null;
}) {
  if (loading && campaigns.length === 0) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3">
        <div className="h-4 w-32 bg-[#F3F3EE] rounded animate-pulse" />
      </div>
    );
  }
  if (!camp) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3 text-center">
        <div className="text-[12px] font-semibold text-[#1A1A1A]">No campaigns yet</div>
        <div className="text-[11px] text-[#6B7280]">Ask an admin to create one.</div>
      </div>
    );
  }
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3 space-y-2">
      {campaigns.length > 1 && (
        <select
          value={activeId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full text-[12px] border border-[#E5E7EB] rounded-[8px] px-2 py-1 bg-white"
        >
          {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
      )}
      <div className="grid grid-cols-4 gap-1.5">
        <MiniStat label="Pending" value={camp.pendingLeads} accent />
        <MiniStat label="Connected" value={camp.connectedLeads} />
        <MiniStat label="Done" value={camp.doneLeads} />
        <MiniStat label="Total" value={camp.totalLeads} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={cn(
      'rounded-[8px] px-2 py-1.5 text-center',
      accent ? 'bg-[#ECFDF5]' : 'bg-[#F3F3EE]'
    )}>
      <div className="text-[9px] uppercase tracking-wide text-[#9CA3AF] font-semibold leading-none">
        {label}
      </div>
      <div className={cn(
        'text-[16px] font-bold tabular-nums leading-tight mt-0.5',
        accent ? 'text-[#1E9A80]' : 'text-[#1A1A1A]'
      )}>
        {value}
      </div>
    </div>
  );
}

function CampaignCard({
  campaigns, activeId, onSelect, loading, camp,
}: {
  campaigns: Campaign[];
  activeId: string;
  onSelect: (id: string) => void;
  loading: boolean;
  camp: Campaign | null;
}) {
  if (loading && campaigns.length === 0) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
        <div className="h-6 w-48 bg-[#F3F3EE] rounded animate-pulse" />
      </div>
    );
  }
  if (!camp) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center">
        <div className="text-[14px] font-semibold text-[#1A1A1A] mb-1">No campaigns yet</div>
        <div className="text-[12px] text-[#6B7280]">Ask an admin to create a campaign and assign you to it.</div>
      </div>
    );
  }
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
            Active campaign
          </div>
          <div className="text-[20px] font-bold text-[#1A1A1A] truncate">{camp.name}</div>
        </div>
        {campaigns.length > 1 && (
          <select
            value={activeId}
            onChange={(e) => onSelect(e.target.value)}
            className="text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-1.5 bg-white"
          >
            {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Pending" value={camp.pendingLeads} accent />
        <Stat label="Connected" value={camp.connectedLeads} />
        <Stat label="Done" value={camp.doneLeads} />
        <Stat label="Total" value={camp.totalLeads} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-[10px] px-3 py-2 ${accent ? 'bg-[#ECFDF5]' : 'bg-[#F3F3EE]'}`}>
      <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">{label}</div>
      <div className={`text-[20px] font-bold tabular-nums ${accent ? 'text-[#1E9A80]' : 'text-[#1A1A1A]'}`}>
        {value}
      </div>
    </div>
  );
}

// ─── ControlBar — combined pacing + live-call + session controls ────
//
// Hugo's UX spec: ONE compact bar at the top.
//   - When idle + not yet started: Pacing pills (Manual / Auto + delay)
//     so the agent can pick the mode before dialing.
//   - When dialing / ringing / connected / wrap_up / paused: the same
//     bar morphs to show status badge + contact name + phone + duration
//     + Mute + Hang up + Skip & next + Pause/Resume + Stop.
//
// All in one row, wrapping on narrow screens.

function ControlBar({
  phase, lead, startedAt, muted, sessionStarted, pacing, setPacing,
  pacingDelaySec, setPacingDelaySec, onMute, onHangUp, onSkipNext,
  onPause, onResume, onStop,
}: {
  phase: Phase;
  lead: Lead | null;
  startedAt: number | null;
  muted: boolean;
  sessionStarted: boolean;
  pacing: PacingMode;
  setPacing: (m: PacingMode) => void;
  pacingDelaySec: number;
  setPacingDelaySec: (s: number) => void;
  onMute: () => void;
  onHangUp: () => void;
  onSkipNext: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const isLive = phase === 'dialing' || phase === 'ringing' || phase === 'connected';
  const sessionRunning = phase !== 'idle' || pacing === 'auto' || sessionStarted;
  const isCallContext = phase !== 'idle';

  const tint =
    phase === 'connected' ? 'bg-[#ECFDF5] text-[#1E9A80]' :
    phase === 'wrap_up' ? 'bg-[#F3F3EE] text-[#6B7280]' :
    phase === 'paused' ? 'bg-[#F3F3EE] text-[#6B7280]' :
    'bg-[#FEF3C7] text-[#92400E]';
  const label =
    phase === 'dialing' ? 'DIALING' :
    phase === 'ringing' ? 'RINGING' :
    phase === 'connected' ? 'CONNECTED' :
    phase === 'wrap_up' ? 'WRAP-UP' :
    phase === 'paused' ? 'PAUSED' : '';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3 flex flex-wrap items-center gap-2 text-[12px]">
      {/* LEFT: status + contact info during a call, pacing pills when idle. */}
      {isCallContext ? (
        <>
          <Radio className="w-4 h-4 text-[#1E9A80] flex-shrink-0" />
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${tint}`}>
            {label}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-[#1A1A1A] truncate">
              {lead?.name ?? '—'}
            </div>
            <div className="text-[11px] text-[#6B7280] tabular-nums truncate">
              {lead?.phone ?? '—'}
              {startedAt && phase === 'connected' && <ConnectedDuration startedAt={startedAt} />}
            </div>
          </div>
        </>
      ) : (
        <>
          <span className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">Pacing</span>
          <div className="inline-flex rounded-[10px] border border-[#E5E7EB] overflow-hidden">
            <button
              type="button"
              onClick={() => setPacing('manual')}
              className={cn('px-3 py-1', pacing === 'manual' ? 'bg-[#1E9A80] text-white' : 'bg-white hover:bg-[#F3F3EE]')}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setPacing('auto')}
              className={cn('px-3 py-1', pacing === 'auto' ? 'bg-[#1E9A80] text-white' : 'bg-white hover:bg-[#F3F3EE]')}
            >
              Auto
            </button>
          </div>
          {pacing === 'auto' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[#6B7280]">delay</span>
              {[0, 5, 10, 30].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPacingDelaySec(s)}
                  className={cn(
                    'px-2 py-0.5 rounded-full font-semibold',
                    pacingDelaySec === s ? 'bg-[#ECFDF5] text-[#1E9A80]' : 'text-[#6B7280] hover:bg-[#F3F3EE]'
                  )}
                >
                  {s}s
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* RIGHT: action buttons. ml-auto pushes them right. */}
      <div className="ml-auto flex items-center gap-1.5">
        {isLive && (
          <>
            <button
              type="button"
              onClick={onMute}
              title={muted ? 'Unmute' : 'Mute'}
              className={cn(
                'inline-flex items-center justify-center w-8 h-8 rounded-[8px] border',
                muted ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]' : 'bg-white border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE]'
              )}
            >
              {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onHangUp}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-white bg-[#B91C1C] px-2.5 py-1.5 rounded-[8px] hover:bg-[#991B1B]"
            >
              <PhoneOff className="w-3 h-3" />
              Hang up
            </button>
          </>
        )}
        {isCallContext && phase !== 'paused' && (
          <button
            type="button"
            onClick={onSkipNext}
            title="Skip & dial next"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] hover:bg-[#F3F3EE] px-2.5 py-1.5 rounded-[8px]"
          >
            <SkipForward className="w-3 h-3" />
            Skip & next
          </button>
        )}
        {phase === 'paused' ? (
          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-white bg-[#1E9A80] px-2.5 py-1.5 rounded-[8px]"
          >
            <Play className="w-3 h-3" />
            Resume
          </button>
        ) : (
          isCallContext && (
            <button
              type="button"
              onClick={onPause}
              title="Pause session"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] hover:bg-[#F3F3EE] px-2.5 py-1.5 rounded-[8px]"
            >
              <Pause className="w-3 h-3" />
              Pause
            </button>
          )
        )}
        {sessionRunning && (
          <button
            type="button"
            onClick={onStop}
            title="Stop session"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#B91C1C] bg-white border border-[#FECACA] hover:bg-[#FEF2F2] px-2.5 py-1.5 rounded-[8px]"
          >
            <Square className="w-3 h-3" />
            Stop
          </button>
        )}
      </div>
    </div>
  );
}

function ConnectedDuration({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const sec = Math.max(0, Math.floor((now - startedAt) / 1000));
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return <span> · {mm}:{String(ss).padStart(2, '0')}</span>;
}

function WrapUpCard({
  contactName, contactPhone, endReason, error, notes, setNotes, columns, applying, onApply, onSkip,
}: {
  contactName: string;
  contactPhone: string;
  endReason: string;
  error: string | null;
  notes: string;
  setNotes: (s: string) => void;
  columns: { id: string; name: string }[];
  applying: boolean;
  onApply: (columnId: string) => void;
  onSkip: () => void;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
            Wrap-up · {contactName} · {contactPhone}
          </div>
          <div className="text-[11px] text-[#6B7280]">
            Call {endReason}{error ? ` — ${error}` : ''}
          </div>
        </div>

        {/* Skip — no outcome on TOP per Hugo's request. */}
        <button
          type="button"
          onClick={onSkip}
          disabled={applying}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] hover:text-[#1A1A1A] bg-[#F3F3EE] hover:bg-[#E5E7EB] px-3 py-1.5 rounded-[10px] disabled:opacity-50"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip — no outcome
        </button>
      </div>

      {/* Outcome buttons in the middle. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {columns.length === 0 && (
          <div className="col-span-full text-[12px] text-[#9CA3AF] italic py-2">
            No outcome columns. Ask admin to add stages.
          </div>
        )}
        {columns.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={applying}
            onClick={() => onApply(c.id)}
            className="inline-flex items-center justify-between gap-2 text-[13px] font-medium text-[#1A1A1A] bg-[#F3F3EE] hover:bg-[#ECFDF5] hover:text-[#1E9A80] px-3 py-2 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="truncate">{c.name}</span>
            {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 opacity-40" />}
          </button>
        ))}
      </div>

      {/* Notes at the bottom. */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional) — what happened, next steps…"
        rows={2}
        className="w-full text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white"
      />
    </div>
  );
}

function PacingCountdownBar({
  deadlineMs, onDialNow, onPause,
}: {
  deadlineMs: number;
  onDialNow: () => void;
  onPause: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const remainingSec = Math.max(0, Math.ceil((deadlineMs - now) / 1000));
  return (
    <div className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] rounded-2xl px-4 py-3 flex items-center gap-3 text-[13px] font-semibold">
      <Clock className="w-4 h-4" />
      Next call in {remainingSec}s
      <button
        type="button"
        onClick={onDialNow}
        className="inline-flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-[10px] bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90"
      >
        <Zap className="w-3.5 h-3.5" />
        Dial now
      </button>
      <button
        type="button"
        onClick={onPause}
        className="inline-flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-[10px] bg-white border border-[#A7F3D0] text-[#065F46] hover:bg-[#F0FDF4]"
      >
        <Pause className="w-3.5 h-3.5" />
        Pause
      </button>
    </div>
  );
}

// ─── Upcoming queue (next 100 leads, scrollable, realtime) ────────────

interface QueueItemRow {
  id: string;
  status: string;
  priority: number;
  scheduled_for: string | null;
  attempts: number;
  wk_contacts: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
}

interface QueueItem {
  queueId: string;
  contactId: string;
  name: string;
  phone: string;
  priority: number;
  attempts: number;
  scheduledFor: string | null;
}

function UpcomingQueuePanel({
  campaignId,
  agentId,
  dialed,
  currentLead,
  currentPhase,
  maxItems,
  dense,
  onHeaderClick,
  collapsed,
}: {
  campaignId: string | null;
  agentId: string | null;
  dialed: ReadonlySet<string>;
  currentLead: Lead | null;
  currentPhase: Phase;
  /** Cap visible rows. Use small (3) for peek mode, larger (8+) when expanded. */
  maxItems?: number;
  /** Tighter padding for the floating dialer pad. */
  dense?: boolean;
  /** Click handler on the section header (toggles accordion). */
  onHeaderClick?: () => void;
  /** When collapsed, only render the header. */
  collapsed?: boolean;
}) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setItems([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const nowIso = new Date().toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase.from('wk_dialer_queue' as any) as any)
        .select(
          'id, status, priority, scheduled_for, attempts, ' +
            'wk_contacts:contact_id ( id, name, phone )'
        )
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
        // Must match wk_pick_next_lead exactly:
        // ORDER BY priority DESC NULLS LAST, scheduled_for ASC NULLS FIRST,
        // attempts ASC, created_at ASC
        .order('priority', { ascending: false, nullsFirst: false })
        .order('scheduled_for', { ascending: true, nullsFirst: true })
        .order('attempts', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(100);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let countQ = (supabase.from('wk_dialer_queue' as any) as any)
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`);
      if (agentId) {
        q = q.or(`agent_id.eq.${agentId},agent_id.is.null`);
        countQ = countQ.or(`agent_id.eq.${agentId},agent_id.is.null`);
      }
      const [{ data, error: e }, { count, error: countErr }] = await Promise.all([q, countQ]);
      if (cancelled) return;
      if (e || countErr) {
        setError(e?.message ?? countErr?.message ?? 'Failed to load queue');
        setItems([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
      setTotalCount(count ?? 0);
      const mapped = ((data ?? []) as QueueItemRow[])
        .filter((r) => r.wk_contacts && r.wk_contacts.phone)
        .map<QueueItem>((r) => ({
          queueId: r.id,
          contactId: r.wk_contacts!.id,
          name: r.wk_contacts!.name ?? r.wk_contacts!.phone ?? 'Unknown',
          phone: r.wk_contacts!.phone ?? '',
          priority: r.priority,
          attempts: r.attempts,
          scheduledFor: r.scheduled_for,
        }));
      setItems(mapped);
      setLoading(false);
    };

    void load();

    let pending: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        if (!cancelled) void load();
      }, 400);
    };
    const ch = supabase
      .channel(`caller-upcoming-${campaignId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_dialer_queue', filter: `campaign_id=eq.${campaignId}` },
        refresh
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (pending) clearTimeout(pending);
      try { void supabase.removeChannel(ch); } catch { /* ignore */ }
    };
  }, [campaignId, agentId]);

  const visible = items.filter(
    (i) => !dialed.has(i.contactId) && i.contactId !== (currentLead?.id ?? null)
  );
  // Use the actual session set, not items.length-visible.length — leads
  // that transitioned out of `pending` (status='dialing'/'connected'/done)
  // wouldn't show up in items at all, so the diff under-reports.
  const dialedThisSession = dialed.size;
  const isCallActive =
    currentPhase === 'dialing' ||
    currentPhase === 'ringing' ||
    currentPhase === 'connected' ||
    currentPhase === 'wrap_up';

  const dialingTint =
    currentPhase === 'connected' ? 'bg-[#ECFDF5] text-[#1E9A80]' :
    currentPhase === 'wrap_up' ? 'bg-[#F3F3EE] text-[#6B7280]' :
    'bg-[#FEF3C7] text-[#92400E]';
  const dialingLabel =
    currentPhase === 'dialing' ? 'DIALING' :
    currentPhase === 'ringing' ? 'RINGING' :
    currentPhase === 'connected' ? 'CONNECTED' :
    currentPhase === 'wrap_up' ? 'WRAP-UP' : '';

  const displayed = typeof maxItems === 'number' ? visible.slice(0, maxItems) : visible;

  const headerInner = (
    <>
      <div className={cn(
        'uppercase tracking-wide text-[#9CA3AF] font-semibold',
        dense ? 'text-[11px]' : 'text-[12px]'
      )}>
        Upcoming queue
      </div>
      <div className={cn(
        'text-[#6B7280] tabular-nums',
        dense ? 'text-[10px]' : 'text-[11px]'
      )}>
        {totalCount}{dialedThisSession > 0 ? ` · ${dialedThisSession} dialed` : ''}
      </div>
    </>
  );

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl flex flex-col overflow-hidden">
      {onHeaderClick ? (
        <button
          type="button"
          onClick={onHeaderClick}
          className={cn(
            'border-b border-[#E5E7EB] flex items-center justify-between gap-2 hover:bg-[#F3F3EE]/40 text-left',
            dense ? 'px-3 py-2' : 'px-4 py-3'
          )}
        >
          {headerInner}
        </button>
      ) : (
        <div className={cn(
          'border-b border-[#E5E7EB] flex items-center justify-between gap-2',
          dense ? 'px-3 py-2' : 'px-4 py-3'
        )}>
          {headerInner}
        </div>
      )}

      {!collapsed && (
        <>
          {isCallActive && currentLead && (
            <div className={cn(
              'bg-[#ECFDF5]/40 border-b border-[#E5E7EB] flex items-center gap-3',
              dense ? 'px-3 py-1.5' : 'px-4 py-2'
            )}>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 ${dialingTint}`}>
                {dialingLabel}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-[#1A1A1A] truncate">{currentLead.name}</div>
                <div className="text-[11px] text-[#6B7280] tabular-nums truncate">{currentLead.phone}</div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] mx-3 my-2 px-3 py-2">
              {error}
            </div>
          )}

          {loading && items.length === 0 && (
            <div className={cn('italic text-center text-[#9CA3AF]', dense ? 'text-[11px] py-4' : 'text-[12px] py-8')}>
              Loading queue…
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className={cn('italic text-center text-[#9CA3AF]', dense ? 'text-[11px] py-4' : 'text-[12px] py-8')}>
              {items.length === 0 ? 'Queue empty.' : 'All visible leads dialed this session.'}
            </div>
          )}

          <ul className={cn(
            'overflow-y-auto divide-y divide-[#E5E7EB]',
            dense ? 'max-h-[280px]' : 'max-h-[480px]'
          )}>
            {displayed.map((lead, idx) => (
              <UpcomingRow key={lead.queueId} idx={idx + 1} lead={lead} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function UpcomingRow({ idx, lead }: { idx: number; lead: QueueItem }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <li className="px-4 py-2 flex items-center gap-3 hover:bg-[#F3F3EE]/30 group">
        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-[#F3F3EE] text-[10px] font-bold text-[#6B7280] tabular-nums flex-shrink-0">
          {idx}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="text-[12px] font-semibold text-[#1A1A1A] truncate hover:text-[#1E9A80]">{lead.name}</div>
          <div className="text-[11px] text-[#6B7280] tabular-nums truncate">{lead.phone}</div>
        </button>
        {lead.attempts > 0 && (
          <span className="text-[10px] text-[#9CA3AF] tabular-nums">{lead.attempts}× tried</span>
        )}
        {lead.priority > 0 && (
          <span className="text-[10px] font-bold text-[#1E9A80] tabular-nums">p{lead.priority}</span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Edit contact"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-[8px] text-[#6B7280] hover:bg-[#F3F3EE] hover:text-[#1A1A1A]"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </li>
      {editing && (
        <EditQueueLeadModal
          contactId={lead.contactId}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

function EditQueueLeadModal({
  contactId,
  onClose,
}: {
  contactId: string;
  onClose: () => void;
}) {
  const toasts = useCallerToasts();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: e } = await (supabase.from('wk_contacts' as any) as any)
        .select('name, phone, email')
        .eq('id', contactId)
        .maybeSingle();
      if (cancelled) return;
      if (e) setError(e.message);
      else if (data) {
        setName(data.name ?? '');
        setPhone(data.phone ?? '');
        setEmail(data.email ?? '');
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e } = await (supabase.from('wk_contacts' as any) as any)
      .update({ name: name.trim() || null, phone: phone.trim(), email: email.trim() || null })
      .eq('id', contactId);
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    toasts.push('Contact updated', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-[440px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
          <h2 className="text-[15px] font-bold text-[#1A1A1A]">Edit contact</h2>
          <button type="button" onClick={onClose} className="text-[#9CA3AF] hover:text-[#1A1A1A] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {error && (
            <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2">{error}</div>
          )}
          {loading ? (
            <div className="text-[12px] text-[#9CA3AF] italic py-4 text-center">Loading…</div>
          ) : (
            <>
              <ContactField label="Name">
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white" />
              </ContactField>
              <ContactField label="Phone (E.164)">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+447..."
                  className="w-full text-[13px] tabular-nums border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white" />
              </ContactField>
              <ContactField label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white" />
              </ContactField>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E5E7EB]">
          <button type="button" onClick={onClose}
            className="text-[12px] font-semibold text-[#6B7280] px-3 py-1.5 hover:text-[#1A1A1A]">Cancel</button>
          <button type="button" onClick={() => void onSave()} disabled={saving || loading}
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-white bg-[#1E9A80] px-3 py-1.5 rounded-[10px] disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">{label}</div>
      {children}
    </label>
  );
}

// ─── Call history (compact, scrollable, realtime) ────────────────────

function CallHistoryPanel({
  agentId,
  maxItems,
  dense,
  onHeaderClick,
  collapsed,
}: {
  agentId: string | null;
  maxItems?: number;
  dense?: boolean;
  onHeaderClick?: () => void;
  collapsed?: boolean;
}) {
  const { calls, totalCount, loading, error } = useCalls({ agentId, limit: 50 });
  const displayed = typeof maxItems === 'number' ? calls.slice(0, maxItems) : calls;

  const headerInner = (
    <>
      <div className={cn(
        'uppercase tracking-wide text-[#9CA3AF] font-semibold',
        dense ? 'text-[11px]' : 'text-[12px]'
      )}>
        Call history
      </div>
      <div className={cn('text-[#6B7280] tabular-nums', dense ? 'text-[10px]' : 'text-[11px]')}>
        {totalCount}
      </div>
    </>
  );

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl flex flex-col overflow-hidden">
      {onHeaderClick ? (
        <button
          type="button"
          onClick={onHeaderClick}
          className={cn(
            'border-b border-[#E5E7EB] flex items-center justify-between gap-2 hover:bg-[#F3F3EE]/40 text-left',
            dense ? 'px-3 py-2' : 'px-4 py-3'
          )}
        >
          {headerInner}
        </button>
      ) : (
        <div className={cn(
          'border-b border-[#E5E7EB] flex items-center justify-between gap-2',
          dense ? 'px-3 py-2' : 'px-4 py-3'
        )}>
          {headerInner}
        </div>
      )}

      {!collapsed && (
        <>
          {error && (
            <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] mx-3 my-2 px-3 py-2">
              {error}
            </div>
          )}

          {loading && calls.length === 0 && (
            <div className={cn('italic text-center text-[#9CA3AF]', dense ? 'text-[11px] py-4' : 'text-[12px] py-8')}>Loading…</div>
          )}
          {!loading && calls.length === 0 && (
            <div className={cn('italic text-center text-[#9CA3AF]', dense ? 'text-[11px] py-4' : 'text-[12px] py-8')}>
              No calls yet. Start dialing to see history here.
            </div>
          )}

          <ul className={cn(
            'overflow-y-auto divide-y divide-[#E5E7EB]',
            dense ? 'max-h-[280px]' : 'max-h-[480px]'
          )}>
        {displayed.map((c) => (
          <li key={c.id}>
            <Link
              to={`/caller/calls/${c.id}`}
              title="Open transcript, recording + AI summary"
              className="px-4 py-2 flex items-center gap-3 hover:bg-[#F3F3EE]/30 cursor-pointer"
            >
              <CallStatusIndicator status={c.status} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-[#1A1A1A] truncate">
                  {c.contactName ?? c.contactPhone ?? 'Unknown contact'}
                </div>
                <div className="text-[11px] text-[#6B7280] tabular-nums truncate">
                  {c.contactPhone ?? '—'}
                  {c.startedAt && (
                    <span className="ml-1">
                      · {new Date(c.startedAt).toLocaleString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mt-0.5">
                  {c.direction} · {c.status}
                </div>
              </div>
              <div className="text-[11px] text-[#6B7280] tabular-nums flex-shrink-0">
                {c.durationSec ? formatDur(c.durationSec) : '—'}
              </div>
            </Link>
          </li>
        ))}
          </ul>
        </>
      )}
    </div>
  );
}

function CallStatusIndicator({ status }: { status: string }) {
  const tint =
    status === 'completed'
      ? 'bg-[#1E9A80]'
      : status === 'in_progress' || status === 'in-progress'
        ? 'bg-[#FBBF24]'
        : status === 'missed' || status === 'no_answer' || status === 'no-answer'
          ? 'bg-[#9CA3AF]'
          : status === 'failed' || status === 'busy'
            ? 'bg-[#B91C1C]'
            : 'bg-[#9CA3AF]';
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${tint}`}
      title={status}
    />
  );
}

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
