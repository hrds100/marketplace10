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
import {
  Phone, PhoneOff, Mic, MicOff, Pause, Play, Square, SkipForward, Zap,
  CheckCircle2, Loader2, Clock, Radio,
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

export default function DialerPage() {
  const { user, isAdmin } = useAuth();
  const toasts = useCallerToasts();

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
  const [muted, setMuted] = useState(false);

  const [notes, setNotes] = useState('');

  // ─── Pick next lead ───────────────────────────────────────────────
  const pickNextLead = useCallback(async (): Promise<Lead | null> => {
    if (!camp) return null;
    const nowIso = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from('wk_dialer_queue' as any) as any)
      .select(
        'id, contact_id, agent_id, status, priority, attempts, scheduled_for, ' +
          'wk_contacts:contact_id ( id, name, phone, pipeline_column_id )'
      )
      .eq('campaign_id', camp.id)
      .eq('status', 'pending')
      .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true, nullsFirst: true })
      .order('attempts', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(20);
    if (!isEffectiveAdmin && user) {
      q = q.or(`agent_id.eq.${user.id},agent_id.is.null`);
    }
    const { data, error } = await q;
    if (error) {
      toasts.push(`Queue load failed: ${error.message}`, 'error');
      return null;
    }
    const rows = (data ?? []) as Array<{
      id: string;
      wk_contacts: { id: string; name: string | null; phone: string | null; pipeline_column_id: string | null } | null;
    }>;
    for (const r of rows) {
      const c = r.wk_contacts;
      if (!c) continue;
      if (!c.phone) continue;
      if (dialed.has(c.id)) continue;
      return {
        id: c.id,
        name: c.name ?? c.phone,
        phone: c.phone,
        queueId: r.id,
        pipelineColumnId: c.pipeline_column_id,
      };
    }
    return null;
  }, [camp, dialed, isEffectiveAdmin, user, toasts]);

  // ─── Dial a lead ───────────────────────────────────────────────────
  const dialLead = useCallback(
    async (lead: Lead) => {
      dispatch({ type: 'DIAL_START', lead });
      setNotes('');
      setMuted(false);
      twilioCallRef.current = null;
      setDialed((prev) => {
        const next = new Set(prev);
        next.add(lead.id);
        return next;
      });

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.functions as any).invoke('wk-calls-create', {
          body: { contact_id: lead.id, to_phone: lead.phone, campaign_id: camp?.id ?? null },
        });
        if (error || !data) {
          const msg = (error?.message as string | undefined) ?? 'unknown error';
          toasts.push(`Could not place call: ${msg}`, 'error');
          dispatch({ type: 'CALL_ENDED', reason: 'failed', error: msg });
          return;
        }
        if (data.allowed === false) {
          const reason = (data.reason as string | undefined) ?? 'spend limit reached';
          toasts.push(`Call blocked: ${reason}`, 'error');
          dispatch({ type: 'CALL_ENDED', reason: 'blocked', error: reason });
          return;
        }
        const callId = data.call_id as string | undefined;
        if (!callId) {
          toasts.push('Server did not return a call id', 'error');
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
          toasts.push(mapped.friendlyMessage, 'error');
          twilioCallRef.current = null;
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
        dispatch({ type: 'CALL_ENDED', reason: 'failed', error: msg });
      }
    },
    [camp, toasts]
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
    dispatch({ type: 'OUTCOME_DONE' });
  }, []);

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
    dispatch({ type: 'STOP' });
  }, []);

  const { columns: outcomeColumns } = usePipelineColumns(camp?.pipelineId ?? null);

  // ─── Render ────────────────────────────────────────────────────────
  const blocked = spend.isLimitReached || ks.allDialers || !deviceReady;
  const blockReason = ks.allDialers
    ? 'All dialers paused (kill switch)'
    : spend.isLimitReached
      ? 'Daily spend limit reached'
      : !deviceReady
        ? 'Phone is starting up…'
        : null;

  return (
    <div className="p-6 max-w-[1280px] mx-auto space-y-4">
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">Power dialer</h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          One lead at a time · agent-controlled pacing · anti-loop guard
        </p>
      </div>

      {blocked && blockReason && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[12px] rounded-[10px] px-3 py-2">
          {blockReason}
        </div>
      )}

      <CampaignCard
        campaigns={campaigns}
        activeId={activeCampaignId}
        onSelect={setActiveCampaignId}
        loading={campaignsLoading}
        camp={camp}
      />

      <SessionBar
        phase={state.phase}
        pacing={pacing}
        setPacing={setPacing}
        pacingDelaySec={pacingDelaySec}
        setPacingDelaySec={setPacingDelaySec}
        onPause={pause}
        onResume={resume}
        onStop={stop}
      />

      {state.phase !== 'idle' && (
        <LiveCallCard
          state={state}
          muted={muted}
          onMute={toggleMute}
          onHangUp={() => void hangUp()}
        />
      )}

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
          className="w-full inline-flex items-center justify-center gap-2 text-[16px] font-semibold text-white bg-[#1E9A80] hover:bg-[#1E9A80]/90 px-5 py-4 rounded-2xl shadow-[0_4px_16px_rgba(30,154,128,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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
          className="w-full inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-white bg-[#1E9A80] hover:bg-[#1E9A80]/90 px-5 py-3 rounded-2xl shadow-[0_4px_16px_rgba(30,154,128,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="w-full inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-white bg-[#1E9A80] hover:bg-[#1E9A80]/90 px-5 py-3 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          Resume — dial next lead
        </button>
      )}

      {state.sessionStarted && state.phase !== 'idle' && state.phase !== 'paused' && (
        <button
          type="button"
          onClick={() => void dialNextManual()}
          className="w-full inline-flex items-center justify-center gap-2 text-[13px] font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] hover:bg-[#F3F3EE] px-3 py-2 rounded-[10px]"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip & dial next
        </button>
      )}

      {/* Two-column queue + history below the call controls. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingQueuePanel
          campaignId={camp?.id ?? null}
          agentId={!isEffectiveAdmin && user ? user.id : null}
          dialed={dialed}
          currentContactId={state.lead?.id ?? null}
        />
        <CallHistoryPanel
          agentId={!isEffectiveAdmin && user ? user.id : null}
        />
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

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

function SessionBar({
  phase, pacing, setPacing, pacingDelaySec, setPacingDelaySec, onPause, onResume, onStop,
}: {
  phase: Phase;
  pacing: PacingMode;
  setPacing: (m: PacingMode) => void;
  pacingDelaySec: number;
  setPacingDelaySec: (s: number) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const sessionRunning = phase !== 'idle' || pacing === 'auto';
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-wrap items-center gap-3 text-[12px]">
      <span className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">Pacing</span>
      <div className="inline-flex rounded-[10px] border border-[#E5E7EB] overflow-hidden">
        <button
          type="button"
          onClick={() => setPacing('manual')}
          className={cn('px-3 py-1.5', pacing === 'manual' ? 'bg-[#1E9A80] text-white' : 'bg-white hover:bg-[#F3F3EE]')}
        >
          Manual
        </button>
        <button
          type="button"
          onClick={() => setPacing('auto')}
          className={cn('px-3 py-1.5', pacing === 'auto' ? 'bg-[#1E9A80] text-white' : 'bg-white hover:bg-[#F3F3EE]')}
        >
          Auto
        </button>
      </div>
      {pacing === 'auto' && (
        <div className="flex items-center gap-2">
          <span className="text-[#6B7280]">delay</span>
          {[0, 5, 10, 30].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPacingDelaySec(s)}
              className={cn(
                'px-2 py-1 rounded-full font-semibold',
                pacingDelaySec === s ? 'bg-[#ECFDF5] text-[#1E9A80]' : 'text-[#6B7280] hover:bg-[#F3F3EE]'
              )}
            >
              {s}s
            </button>
          ))}
        </div>
      )}
      <div className="ml-auto flex items-center gap-2">
        {phase === 'paused' ? (
          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#1E9A80] px-3 py-1.5 rounded-[10px]"
          >
            <Play className="w-3.5 h-3.5" />
            Resume
          </button>
        ) : (
          phase !== 'idle' && (
            <button
              type="button"
              onClick={onPause}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] hover:bg-[#F3F3EE] px-3 py-1.5 rounded-[10px]"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause
            </button>
          )
        )}
        {sessionRunning && (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#B91C1C] bg-white border border-[#FECACA] hover:bg-[#FEF2F2] px-3 py-1.5 rounded-[10px]"
          >
            <Square className="w-3.5 h-3.5" />
            Stop
          </button>
        )}
      </div>
    </div>
  );
}

function LiveCallCard({
  state, muted, onMute, onHangUp,
}: {
  state: State;
  muted: boolean;
  onMute: () => void;
  onHangUp: () => void;
}) {
  const isLive = state.phase === 'dialing' || state.phase === 'ringing' || state.phase === 'connected';
  const tint =
    state.phase === 'connected' ? 'bg-[#ECFDF5] text-[#1E9A80]' :
    state.phase === 'wrap_up' ? 'bg-[#F3F3EE] text-[#6B7280]' :
    state.phase === 'paused' ? 'bg-[#F3F3EE] text-[#6B7280]' :
    'bg-[#FEF3C7] text-[#92400E]';
  const label =
    state.phase === 'dialing' ? 'DIALING' :
    state.phase === 'ringing' ? 'RINGING' :
    state.phase === 'connected' ? 'CONNECTED' :
    state.phase === 'wrap_up' ? 'WRAP-UP' :
    state.phase === 'paused' ? 'PAUSED' : '';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex items-center gap-3">
      <Radio className="w-4 h-4 text-[#1E9A80]" />
      <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${tint}`}>
        {label}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-[#1A1A1A] truncate">
          {state.lead?.name ?? '—'}
        </div>
        <div className="text-[11px] text-[#6B7280] tabular-nums truncate">
          {state.lead?.phone ?? '—'}
          {state.startedAt && state.phase === 'connected' && (
            <ConnectedDuration startedAt={state.startedAt} />
          )}
        </div>
      </div>
      {isLive && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMute}
            title={muted ? 'Unmute' : 'Mute'}
            className={cn(
              'inline-flex items-center justify-center w-9 h-9 rounded-[10px] border',
              muted ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]' : 'bg-white border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE]'
            )}
          >
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onHangUp}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#B91C1C] px-3 py-1.5 rounded-[10px] hover:bg-[#991B1B]"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            Hang up
          </button>
        </div>
      )}
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
      <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
        Wrap-up · {contactName} · {contactPhone}
      </div>
      <div className="text-[11px] text-[#6B7280]">
        Call {endReason}{error ? ` — ${error}` : ''}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional) — what happened, next steps…"
        rows={2}
        className="w-full text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white"
      />
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
      <button
        type="button"
        onClick={onSkip}
        disabled={applying}
        className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#6B7280] hover:text-[#1A1A1A] py-2"
      >
        <SkipForward className="w-3.5 h-3.5" />
        Skip — no outcome
      </button>
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
  currentContactId,
}: {
  campaignId: string | null;
  agentId: string | null;
  dialed: ReadonlySet<string>;
  currentContactId: string | null;
}) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setItems([]);
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
        .order('priority', { ascending: false })
        .order('scheduled_for', { ascending: true, nullsFirst: true })
        .order('attempts', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(100);
      if (agentId) q = q.or(`agent_id.eq.${agentId},agent_id.is.null`);
      const { data, error: e } = await q;
      if (cancelled) return;
      if (e) {
        setError(e.message);
        setItems([]);
        setLoading(false);
        return;
      }
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
    (i) => !dialed.has(i.contactId) && i.contactId !== currentContactId
  );
  const skippedCount = items.length - visible.length;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          Upcoming queue
        </div>
        <div className="text-[11px] text-[#6B7280] tabular-nums">
          {visible.length}{skippedCount > 0 ? ` · ${skippedCount} dialed this session` : ''}
        </div>
      </div>

      {error && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] mx-3 my-2 px-3 py-2">
          {error}
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="text-[12px] text-[#9CA3AF] italic py-8 text-center">Loading queue…</div>
      )}

      {!loading && visible.length === 0 && (
        <div className="text-[12px] text-[#9CA3AF] italic py-8 text-center">
          {items.length === 0 ? 'Queue empty.' : 'All visible leads dialed this session.'}
        </div>
      )}

      <ul className="overflow-y-auto max-h-[480px] divide-y divide-[#E5E7EB]">
        {visible.map((lead, idx) => (
          <li key={lead.queueId} className="px-4 py-2 flex items-center gap-3 hover:bg-[#F3F3EE]/30">
            <div className="w-6 h-6 flex items-center justify-center rounded-full bg-[#F3F3EE] text-[10px] font-bold text-[#6B7280] tabular-nums flex-shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-[#1A1A1A] truncate">{lead.name}</div>
              <div className="text-[11px] text-[#6B7280] tabular-nums truncate">{lead.phone}</div>
            </div>
            {lead.attempts > 0 && (
              <span className="text-[10px] text-[#9CA3AF] tabular-nums">
                {lead.attempts}× tried
              </span>
            )}
            {lead.priority > 0 && (
              <span className="text-[10px] font-bold text-[#1E9A80] tabular-nums">
                p{lead.priority}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Call history (compact, scrollable, realtime) ────────────────────

function CallHistoryPanel({ agentId }: { agentId: string | null }) {
  const { calls, loading, error } = useCalls({ agentId, limit: 50 });

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          Call history
        </div>
        <div className="text-[11px] text-[#6B7280] tabular-nums">{calls.length}</div>
      </div>

      {error && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] mx-3 my-2 px-3 py-2">
          {error}
        </div>
      )}

      {loading && calls.length === 0 && (
        <div className="text-[12px] text-[#9CA3AF] italic py-8 text-center">Loading…</div>
      )}
      {!loading && calls.length === 0 && (
        <div className="text-[12px] text-[#9CA3AF] italic py-8 text-center">
          No calls yet. Start dialing to see history here.
        </div>
      )}

      <ul className="overflow-y-auto max-h-[480px] divide-y divide-[#E5E7EB]">
        {calls.map((c) => (
          <li key={c.id} className="px-4 py-2 flex items-center gap-3 hover:bg-[#F3F3EE]/30">
            <CallStatusIndicator status={c.status} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-[#1A1A1A] tabular-nums">
                {c.startedAt
                  ? new Date(c.startedAt).toLocaleString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: 'short',
                    })
                  : '—'}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
                {c.direction} · {c.status}
              </div>
            </div>
            <div className="text-[11px] text-[#6B7280] tabular-nums">
              {c.durationSec ? formatDur(c.durationSec) : '—'}
            </div>
          </li>
        ))}
      </ul>
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
