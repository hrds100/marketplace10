// V2 Imperative Dialer — mounts the DialerEngine class instance and
// subscribes to its state. Pure imperative.

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Phone, PhoneOff, Pause, Play, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTwilioDevice } from '@/features/smsv2/hooks/useTwilioDevice';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useDialerQueue } from '../../hooks/useDialerQueue';
import { useRecentCalls } from '../../hooks/useRecentCalls';
import { DialerEngine, type EngineState } from './DialerEngine';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchContactLite(
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

function REASON_LABEL(reason: EngineState['reason']): string {
  return (
    {
      connected: 'Connected',
      user_hangup: 'Hung up',
      twilio_disconnect: 'Disconnected',
      no_answer: 'No answer',
      busy: 'Busy',
      voicemail: 'Voicemail',
      failed: 'Failed',
      unknown: 'Wrap-up',
    } as const
  )[reason];
}

export default function V2ImperativePage() {
  const { user, isAdmin } = useAuth();
  const agentId = user?.id ?? null;
  const device = useTwilioDevice();

  // One engine instance for the page lifetime.
  const engine = useMemo(
    () =>
      new DialerEngine({
        dial: device.dial,
        fetchContact: fetchContactLite,
        toast: (msg, tone) => {
          console.info(`[v2 toast ${tone}]`, msg);
        },
      }),
    [device.dial]
  );

  // Subscribe to engine via useSyncExternalStore — no React state machine.
  const state = useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.getState()
  );

  useEffect(() => {
    return () => engine.destroy();
  }, [engine]);

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
  const { rows: queueRows, loading: queueLoading } = useDialerQueue({
    campaignId: queueCampaignId,
    agentId: queueAgentId,
  });
  const { rows: recentRows } = useRecentCalls(agentId);

  // Tell the engine what campaign to use for next() resolution.
  useEffect(() => {
    engine.setCampaign(queueCampaignId);
  }, [engine, queueCampaignId]);

  const head = queueRows[0] ?? null;

  const onDialHead = () => {
    if (!head || !queueCampaignId) return;
    void engine.dialContact({
      contactId: head.contactId,
      contactName: head.name,
      phone: head.phone,
      campaignId: queueCampaignId,
    });
  };

  // 1Hz tick for the auto-next countdown badge.
  const [, setNow] = useState(0);
  useEffect(() => {
    if (state.autoNextAtMs === null) return;
    const id = window.setInterval(() => setNow((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [state.autoNextAtMs]);
  const remainingSec =
    state.autoNextAtMs !== null
      ? Math.max(0, Math.ceil((state.autoNextAtMs - Date.now()) / 1000))
      : null;

  const isLive = ['dialing', 'ringing', 'in_call'].includes(state.callPhase);
  const isWrap = state.callPhase === 'wrap_up' || state.callPhase === 'outcome_done';

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4" data-testid="v2-page">
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">
          My dialer · v2 imperative
        </h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          Class-based engine · no React state machine · no effect chains
        </p>
      </div>

      {/* Campaign + auto-next + Pause/Resume */}
      <header className="bg-white border border-[#E5E7EB] rounded-2xl p-3 flex flex-wrap items-center gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
            Campaign
          </div>
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="px-2 py-1 text-[13px] bg-white border border-[#E5E7EB] rounded-[10px] mt-1 min-w-[200px]"
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
            Auto-next
          </div>
          <select
            value={state.autoNextSeconds}
            onChange={(e) => engine.setAutoNextSeconds(parseInt(e.target.value, 10))}
            className="px-2 py-1 text-[13px] bg-white border border-[#E5E7EB] rounded-[10px] mt-1"
          >
            <option value="0">Manual</option>
            <option value="5">5s delay</option>
            <option value="10">10s delay</option>
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {state.paused ? (
            <button
              onClick={() => engine.resume()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] bg-[#1E9A80] text-white text-[12px] font-semibold"
              data-testid="v2-resume"
            >
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
          ) : (
            <button
              onClick={() => engine.pause()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] border border-[#E5E7EB] bg-white text-[12px] font-medium"
              data-testid="v2-pause"
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          )}
        </div>
      </header>

      {/* Hero / current state */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.08)]">
        {state.call ? (
          <>
            <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
              {state.callPhase === 'dialing' && 'Dialing'}
              {state.callPhase === 'ringing' && 'Ringing'}
              {state.callPhase === 'in_call' && 'Connected'}
              {state.callPhase === 'wrap_up' && `Wrap-up · ${REASON_LABEL(state.reason)}`}
              {state.callPhase === 'outcome_done' && 'Outcome saved'}
            </div>
            <h2 className="text-[24px] font-bold text-[#1A1A1A] truncate">
              {state.call.contactName}
            </h2>
            <div className="text-[15px] text-[#6B7280] tabular-nums">
              {state.call.phone}
            </div>
            {state.errorMessage && (
              <div className="mt-2 text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-3 py-2">
                {state.errorMessage}
              </div>
            )}
          </>
        ) : head ? (
          <>
            <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
              Next up
            </div>
            <h2 className="text-[24px] font-bold text-[#1A1A1A] truncate">
              {head.name}
            </h2>
            <div className="text-[15px] text-[#6B7280] tabular-nums">{head.phone}</div>
          </>
        ) : (
          <div className="text-[14px] text-[#6B7280]">
            {queueLoading ? 'Loading…' : 'Queue is empty.'}
          </div>
        )}

        {state.noNewLeadsBanner !== null && (
          <div className="mt-3 text-[12px] text-[#B45309] bg-[#FEF3C7] border border-[#FDE68A] rounded-lg px-3 py-2">
            No new leads — {state.noNewLeadsBanner} already dialed this session.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 mt-6 items-center">
          {/* Primary CTA — Dial (idle) or Hang up (live) */}
          {!isLive && !isWrap && head && (
            <button
              onClick={onDialHead}
              disabled={state.busy}
              className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[16px] font-semibold bg-[#1E9A80] text-white shadow-[0_4px_16px_rgba(30,154,128,0.35)] hover:bg-[#1E9A80]/90 disabled:opacity-50"
              data-testid="v2-dial"
            >
              <Phone className="w-5 h-5" /> Dial
            </button>
          )}
          {isLive && (
            <button
              onClick={() => engine.hangUp()}
              className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[16px] font-semibold bg-[#EF4444] text-white hover:bg-[#DC2626]"
              data-testid="v2-hangup"
            >
              <PhoneOff className="w-5 h-5" />
              {state.callPhase === 'dialing' || state.callPhase === 'ringing'
                ? 'Cancel'
                : 'Hang up'}
            </button>
          )}

          {/* Secondary controls — Skip / Next */}
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => void engine.next()}
              disabled={state.busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[#E5E7EB] bg-white text-[12px] font-medium text-[#6B7280] disabled:opacity-50"
              data-testid="v2-skip"
            >
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </button>
            <button
              onClick={() => void engine.next()}
              disabled={state.busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#1E9A80] text-white text-[12px] font-semibold shadow-[0_4px_12px_rgba(30,154,128,0.35)] disabled:opacity-50"
              data-testid="v2-next"
            >
              <Phone className="w-3.5 h-3.5" /> Next call
              {remainingSec !== null && remainingSec > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/25 text-[10px] font-bold tabular-nums">
                  {remainingSec}s
                </span>
              )}
            </button>
          </div>
        </div>

        {state.busy && (
          <div className="mt-3 text-[11px] text-[#9CA3AF] italic">Working…</div>
        )}
      </div>

      {/* Queue + recent — read-only here, focused panel for V2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
          <div className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide mb-2">
            Queue · {queueRows.length} left
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-[#E5E7EB] -mx-4">
            {queueRows.slice(1).map((q, i) => (
              <div key={q.queueId} className="flex items-center gap-2 px-4 py-2">
                <span className="text-[11px] text-[#9CA3AF] w-6">{i + 2}.</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#1A1A1A] truncate">
                    {q.name}
                  </div>
                  <div className="text-[11px] text-[#6B7280] tabular-nums">
                    {q.phone}
                  </div>
                </div>
              </div>
            ))}
            {queueRows.length === 0 && !queueLoading && (
              <div className="px-4 py-6 text-center text-[12px] text-[#9CA3AF] italic">
                Empty.
              </div>
            )}
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
          <div className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide mb-2">
            Recent calls
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-[#E5E7EB] -mx-4">
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
            {recentRows.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-[#9CA3AF] italic">
                No calls yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Outcome cards — wrap-up only */}
      {isWrap && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-2">
            Pick an outcome
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['New Leads', 'Callback', 'No pickup', 'Not interested', 'Nurturing', 'Closed'].map(
              (label) => (
                <button
                  key={label}
                  className={cn(
                    'p-2 rounded-xl border-2 text-left bg-white hover:border-[#1E9A80]',
                    state.callPhase === 'outcome_done'
                      ? 'border-[#E5E7EB] opacity-50'
                      : 'border-[#E5E7EB]'
                  )}
                  onClick={() => {
                    // V2 doesn't have full pipeline column lookup; we
                    // submit a 'skipped' sentinel for any pick to keep
                    // this page minimal. The point of V2 is the
                    // call-chain logic, not the outcome editor.
                    void engine.applyOutcome('skipped');
                  }}
                >
                  <div className="text-[12px] font-semibold text-[#1A1A1A]">{label}</div>
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
