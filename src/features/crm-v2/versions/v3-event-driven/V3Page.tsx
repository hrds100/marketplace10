// V3 Event-driven autonomous dialer.
//
// Inspiration: Twilio's Voice JS SDK best-practices doc says "listen
// to the disconnect event on the Call instance and chain the next
// action from there." We take that literally.
//
// Architecture:
//   - Single React component, plain useState only — no reducer, no
//     context, no class instances.
//   - When you press "Start session" the dialer fetches the next lead
//     and dials it. The Twilio Call's `disconnect` event triggers the
//     SAME function ~3s later (configurable). It loops on its own.
//   - The "Pause" button just stops the auto-chain. "Resume" continues.
//   - No "Next call" button — auto-advance IS the design. The agent
//     just hangs up when the call's done.
//
// Pros: dead simple, no race conditions, no advanceIntent flag, no
// effect-cleanup-cancellation. The state machine is implicit in the
// async function call chain.
//
// Cons: less granular UI feedback while the chain runs. No "skip
// without dialing" mid-flight. If the chain is mid-fetch, hitting
// Pause won't stop the next dial that's already in flight.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Pause, Play, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Call as TwilioCall } from '@twilio/voice-sdk';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTwilioDevice } from '@/features/smsv2/hooks/useTwilioDevice';
import { disconnectAllCalls } from '@/core/integrations/twilio-voice';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useDialerQueue } from '../../hooks/useDialerQueue';
import { useRecentCalls } from '../../hooks/useRecentCalls';
import { api } from '../../data/api';
import { mapTwilioError } from '../../lib/twilioErrorMap';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Phase = 'stopped' | 'dialing' | 'ringing' | 'in_call' | 'wrap_up';

interface CurrentCall {
  contactId: string;
  contactName: string;
  phone: string;
  callId: string | null;
  campaignId: string;
}

async function fetchContact(
  id: string
): Promise<{ id: string; name: string; phone: string } | null> {
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

export default function V3EventDrivenPage() {
  const { user, isAdmin } = useAuth();
  const agentId = user?.id ?? null;
  const device = useTwilioDevice();

  // Campaigns + queue.
  const { campaigns } = useCampaigns({
    agentId,
    isAdmin,
    includeInactive: true,
  });
  const [activeId, setActiveId] = useState('');
  useEffect(() => {
    if (campaigns.length === 0) return;
    if (!campaigns.some((c) => c.id === activeId)) {
      setActiveId(campaigns[0].id);
    }
  }, [campaigns, activeId]);
  const queueCampaignId = UUID_RE.test(activeId) ? activeId : null;
  const queueAgentId = isAdmin ? null : agentId;
  const { rows: queueRows } = useDialerQueue({
    campaignId: queueCampaignId,
    agentId: queueAgentId,
  });
  const { rows: recentRows } = useRecentCalls(agentId);

  // Local component state (no reducer, no context).
  const [phase, setPhase] = useState<Phase>('stopped');
  const [current, setCurrent] = useState<CurrentCall | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [betweenSeconds, setBetweenSeconds] = useState(3);
  const [autoNextAtMs, setAutoNextAtMs] = useState<number | null>(null);
  const [bannerSkipped, setBannerSkipped] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Refs so async chain reads fresh values without React state plumbing.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const betweenRef = useRef(betweenSeconds);
  betweenRef.current = betweenSeconds;
  const dialedRef = useRef<Set<string>>(new Set());
  const activeCallRef = useRef<TwilioCall | null>(null);
  const sessionRunningRef = useRef(false);
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimer = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    setAutoNextAtMs(null);
  }, []);

  const dialNext = useCallback(async (): Promise<void> => {
    if (!queueCampaignId) return;
    if (!sessionRunningRef.current) return;
    if (pausedRef.current) {
      console.info('[v3] dialNext skipped — paused');
      return;
    }
    setBusy(true);
    cancelTimer();
    try {
      // 1. Resolve next lead.
      let nextContactId: string | null = null;
      let skipped = 0;
      for (let attempt = 0; attempt < 5; attempt++) {
        if (!sessionRunningRef.current) return;
        console.info(`[v3] wk-leads-next attempt ${attempt + 1}/5`);
        const res = await api.leadsNext({ campaign_id: queueCampaignId });
        console.info(`[v3] wk-leads-next attempt ${attempt + 1} response`, res);
        if (!res.ok) break;
        const data = res.data;
        if (data.empty || !('contact_id' in data) || !data.contact_id) break;
        if (dialedRef.current.has(data.contact_id)) {
          skipped++;
          continue;
        }
        nextContactId = data.contact_id;
        break;
      }
      if (!nextContactId) {
        setBannerSkipped(skipped);
        setPhase('stopped');
        sessionRunningRef.current = false;
        return;
      }
      const contact = await fetchContact(nextContactId);
      if (!contact) {
        setBannerSkipped(skipped);
        setPhase('stopped');
        sessionRunningRef.current = false;
        return;
      }
      dialedRef.current.add(contact.id);
      setBannerSkipped(null);
      setErrorMsg(null);
      setCurrent({
        contactId: contact.id,
        contactName: contact.name,
        phone: contact.phone,
        callId: null,
        campaignId: queueCampaignId,
      });
      setPhase('dialing');

      // 2. Pre-create wk_calls row.
      const create = await api.callsCreate({
        to_phone: contact.phone,
        contact_id: contact.id,
        campaign_id: queueCampaignId,
      });
      if (!create.ok) {
        setErrorMsg(create.error);
        setPhase('wrap_up');
        scheduleAutoNext();
        return;
      }
      if (!create.data.allowed) {
        setErrorMsg('Spend / kill switch refused this call');
        setPhase('wrap_up');
        scheduleAutoNext();
        return;
      }
      const callId = create.data.call_id;
      setCurrent((c) => (c ? { ...c, callId } : c));

      // 3. Twilio dial.
      let twCall: TwilioCall;
      try {
        twCall = await device.dial(contact.phone, {
          CallId: callId,
          ContactId: contact.id,
          From: create.data.from_e164,
        });
      } catch (e) {
        const code = (e as { code?: number })?.code ?? 0;
        const mapped = mapTwilioError(code, (e as Error)?.message ?? '');
        setErrorMsg(mapped.friendlyMessage);
        setPhase('wrap_up');
        scheduleAutoNext();
        return;
      }

      activeCallRef.current = twCall;
      const isThis = () => activeCallRef.current === twCall;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (twCall as any).on?.('ringing', () => {
        if (!isThis()) return;
        setPhase((p) => (p === 'dialing' ? 'ringing' : p));
      });
      twCall.on('accept', () => {
        if (!isThis()) return;
        setPhase('in_call');
      });
      const onEnd = () => {
        if (!isThis()) return;
        activeCallRef.current = null;
        setPhase('wrap_up');
        // ⚡ THIS is the heart of V3: auto-chain on disconnect.
        scheduleAutoNext();
      };
      twCall.on('disconnect', onEnd);
      twCall.on('cancel', onEnd);
      twCall.on('reject', onEnd);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      twCall.on('error', (err: any) => {
        if (!isThis()) return;
        const code = (err?.code as number | undefined) ?? 0;
        const mapped = mapTwilioError(code, err?.message ?? '');
        setErrorMsg(mapped.friendlyMessage);
        activeCallRef.current = null;
        setPhase('wrap_up');
        scheduleAutoNext();
      });
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueCampaignId, device.dial]);

  const scheduleAutoNext = useCallback(() => {
    if (!sessionRunningRef.current) return;
    if (pausedRef.current) return;
    cancelTimer();
    const delay = Math.max(0, betweenRef.current) * 1000;
    const deadline = Date.now() + delay;
    setAutoNextAtMs(deadline);
    autoNextTimerRef.current = setTimeout(() => {
      autoNextTimerRef.current = null;
      setAutoNextAtMs(null);
      console.info('[v3] auto-chain firing dialNext');
      void dialNext();
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelTimer, dialNext]);

  const startSession = useCallback(() => {
    if (sessionRunningRef.current) return;
    if (!queueCampaignId) return;
    sessionRunningRef.current = true;
    setPaused(false);
    setBannerSkipped(null);
    void dialNext();
  }, [queueCampaignId, dialNext]);

  const stopSession = useCallback(() => {
    sessionRunningRef.current = false;
    cancelTimer();
    const tw = activeCallRef.current;
    activeCallRef.current = null;
    if (tw) {
      try {
        tw.disconnect();
      } catch {
        /* ignore */
      }
    }
    try {
      disconnectAllCalls();
    } catch {
      /* ignore */
    }
    setPhase('stopped');
    setCurrent(null);
  }, [cancelTimer]);

  const hangUp = useCallback(() => {
    const tw = activeCallRef.current;
    activeCallRef.current = null;
    if (tw) {
      try {
        tw.disconnect();
      } catch {
        /* ignore */
      }
    }
    try {
      disconnectAllCalls();
    } catch {
      /* ignore */
    }
    setPhase('wrap_up');
    scheduleAutoNext();
  }, [scheduleAutoNext]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      const next = !p;
      if (next) {
        cancelTimer();
      } else {
        // Resuming — if we're in wrap-up, restart the chain.
        if (phase === 'wrap_up') scheduleAutoNext();
      }
      return next;
    });
  }, [cancelTimer, scheduleAutoNext, phase]);

  // 1Hz tick for the countdown badge.
  const [, setNow] = useState(0);
  useEffect(() => {
    if (autoNextAtMs === null) return;
    const id = window.setInterval(() => setNow((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [autoNextAtMs]);
  const remainingSec =
    autoNextAtMs !== null ? Math.max(0, Math.ceil((autoNextAtMs - Date.now()) / 1000)) : null;

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      sessionRunningRef.current = false;
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      const tw = activeCallRef.current;
      activeCallRef.current = null;
      if (tw) {
        try {
          tw.disconnect();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const isLive = phase === 'dialing' || phase === 'ringing' || phase === 'in_call';
  const sessionRunning = sessionRunningRef.current;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4" data-testid="v3-page">
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">
          My dialer · v3 event-driven
        </h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          Auto-chain on Twilio disconnect · Start once · Pause to stop chain
        </p>
      </div>

      {/* Header */}
      <header className="bg-white border border-[#E5E7EB] rounded-2xl p-3 flex flex-wrap items-center gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
            Campaign
          </div>
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            disabled={sessionRunning}
            className="px-2 py-1 text-[13px] bg-white border border-[#E5E7EB] rounded-[10px] mt-1 min-w-[200px] disabled:opacity-50"
          >
            {campaigns.length === 0 && <option value="">No campaigns</option>}
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isActive === false ? ' (paused)' : ''} · {c.pendingLeads} left
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
            Between calls
          </div>
          <select
            value={betweenSeconds}
            onChange={(e) => setBetweenSeconds(parseInt(e.target.value, 10))}
            className="px-2 py-1 text-[13px] bg-white border border-[#E5E7EB] rounded-[10px] mt-1"
          >
            <option value="0">No delay</option>
            <option value="3">3s</option>
            <option value="5">5s</option>
            <option value="10">10s</option>
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!sessionRunning ? (
            <button
              onClick={startSession}
              disabled={busy || !queueCampaignId}
              className="flex items-center gap-1 px-4 py-2 rounded-[10px] bg-[#1E9A80] text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(30,154,128,0.35)] disabled:opacity-50"
              data-testid="v3-start"
            >
              <Phone className="w-4 h-4" /> Start session
            </button>
          ) : (
            <>
              <button
                onClick={togglePause}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[12px] font-medium',
                  paused
                    ? 'bg-[#1E9A80] text-white'
                    : 'border border-[#E5E7EB] bg-white text-[#1A1A1A]'
                )}
                data-testid="v3-pause-toggle"
              >
                {paused ? (
                  <>
                    <Play className="w-3.5 h-3.5" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                )}
              </button>
              <button
                onClick={stopSession}
                className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] border border-[#EF4444] bg-white text-[#EF4444] text-[12px] font-medium"
                data-testid="v3-stop"
              >
                <Square className="w-3.5 h-3.5" /> Stop session
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.08)]">
        {sessionRunning && current ? (
          <>
            <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
              {phase === 'dialing' && 'Dialing'}
              {phase === 'ringing' && 'Ringing'}
              {phase === 'in_call' && 'Connected'}
              {phase === 'wrap_up' && 'Wrap-up'}
            </div>
            <h2 className="text-[24px] font-bold text-[#1A1A1A] truncate">
              {current.contactName}
            </h2>
            <div className="text-[15px] text-[#6B7280] tabular-nums">{current.phone}</div>
            {errorMsg && (
              <div className="mt-2 text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-3 py-2">
                {errorMsg}
              </div>
            )}
            {phase === 'wrap_up' && remainingSec !== null && remainingSec > 0 && !paused && (
              <div className="mt-3 text-[13px] text-[#1E9A80] font-semibold">
                Next call in {remainingSec}s…
              </div>
            )}
            {phase === 'wrap_up' && paused && (
              <div className="mt-3 text-[13px] text-[#B45309] font-medium">
                Session paused — press Resume to chain to next.
              </div>
            )}
          </>
        ) : sessionRunning ? (
          <div className="text-[13px] text-[#6B7280]">
            {busy ? 'Resolving next lead…' : 'Idle.'}
          </div>
        ) : (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
              Ready
            </div>
            <div className="text-[15px] text-[#1A1A1A]">
              {queueCampaignId
                ? `${queueRows.length} lead${queueRows.length === 1 ? '' : 's'} in this campaign. Press Start.`
                : 'Pick a campaign first.'}
            </div>
            {bannerSkipped !== null && (
              <div className="mt-3 text-[12px] text-[#B45309] bg-[#FEF3C7] border border-[#FDE68A] rounded-lg px-3 py-2">
                Last session ran out of fresh leads — {bannerSkipped} were already
                dialed.
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center gap-2">
          {isLive && (
            <button
              onClick={hangUp}
              className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[16px] font-semibold bg-[#EF4444] text-white hover:bg-[#DC2626]"
              data-testid="v3-hangup"
            >
              <PhoneOff className="w-5 h-5" />
              {phase === 'dialing' || phase === 'ringing' ? 'Cancel' : 'Hang up'}
            </button>
          )}
        </div>
      </div>

      {/* Queue + Recent — small previews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
          <div className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide mb-2">
            Queue · {queueRows.length} left
          </div>
          <div className="max-h-[280px] overflow-y-auto divide-y divide-[#E5E7EB] -mx-4">
            {queueRows.slice(0, 20).map((q, i) => (
              <div key={q.queueId} className="flex items-center gap-2 px-4 py-2">
                <span className="text-[11px] text-[#9CA3AF] w-6">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#1A1A1A] truncate">
                    {q.name}
                  </div>
                  <div className="text-[11px] text-[#6B7280] tabular-nums">{q.phone}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
          <div className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide mb-2">
            Recent calls
          </div>
          <div className="max-h-[280px] overflow-y-auto divide-y divide-[#E5E7EB] -mx-4">
            {recentRows.map((r) => (
              <div key={r.id} className="flex items-center gap-2 px-4 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#1A1A1A] truncate">
                    {r.name}
                  </div>
                  <div className="text-[11px] text-[#6B7280] tabular-nums">
                    {r.phone} · {r.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
