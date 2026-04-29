// DialerPage — Phase 2 + 3 dialer surface.
//
// Phase 2 ships pre-call composition (CampaignHero + PacingControl +
// QueuePreview). Phase 3 adds the LiveCallScreen (timeline + outcome
// selector + hangup) which replaces the pre-call body when a call is
// active or in wrap-up.
//
// Spend gate + kill switch are enforced client-side as a UX hint; the
// server is the source of truth (wk-calls-create rejects on its gate).
//
// Deferred (Phase 4+): mid-call SMS, dedicated coach pane, script
// navigator with stage cursor, recording playback, post-call AI
// summary card, parallel-mode UI.

import { useEffect, useMemo, useState } from 'react';
import { Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import CampaignHero from '../components/dialer/CampaignHero';
import PacingControl from '../components/dialer/PacingControl';
import QueuePreview from '../components/dialer/QueuePreview';
import LiveCallScreen from '../components/live-call/LiveCallScreen';
import { useDialerCampaigns } from '../hooks/useDialerCampaigns';
import { useMyDialerQueue, type MyQueueLead } from '../hooks/useMyDialerQueue';
import { useSpendLimit } from '../hooks/useSpendLimit';
import { useKillSwitch } from '../hooks/useKillSwitch';
import { useActiveCall } from '../store/activeCallProvider';
import { useDialerSession } from '../store/dialerSessionProvider';
import { useCalls } from '../hooks/useCalls';

export default function DialerPage() {
  const { user, isAdmin } = useAuth();
  const ctx = useActiveCall();
  const spend = useSpendLimit();
  const ks = useKillSwitch();
  const session = useDialerSession();

  // Workspace-role admin check (mirrors CallerGuard / smsv2 OverviewPage).
  const [workspaceRole, setWorkspaceRole] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!user) {
      setWorkspaceRole(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('profiles' as any) as any)
        .select('workspace_role')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setWorkspaceRole((data?.workspace_role as string | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);
  const isEffectiveAdmin =
    workspaceRole === 'admin' || (workspaceRole === null && isAdmin);

  const { campaigns, loading: campaignsLoading } = useDialerCampaigns({
    scopedToAgentId: !isEffectiveAdmin && user ? user.id : null,
    includeInactive: true,
  });

  const [activeId, setActiveId] = useState<string>('');
  useEffect(() => {
    if (campaigns.length === 0) return;
    if (!campaigns.some((c) => c.id === activeId)) {
      setActiveId(campaigns[0].id);
    }
  }, [campaigns, activeId]);

  const camp = useMemo(
    () => campaigns.find((c) => c.id === activeId) ?? campaigns[0] ?? null,
    [campaigns, activeId]
  );

  const isUuid = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  const queueCampaignId = activeId && isUuid(activeId) ? activeId : null;
  const queueAgentId = isEffectiveAdmin || !user ? null : user.id;

  const { items: queue, loading: queueLoading, error: queueError } = useMyDialerQueue(
    queueCampaignId,
    queueAgentId,
    5
  );

  const dialerBlocked = spend.isLimitReached || ks.allDialers || !ctx.deviceReady;
  const blockReason = ks.allDialers
    ? 'All dialers are off (kill switch). Toggle off in Settings → AI Coach.'
    : spend.isLimitReached
      ? 'Daily spend limit reached.'
      : !ctx.deviceReady
        ? 'Phone is starting up — try again in a moment.'
        : null;

  // Block any new dial while a call is already live.
  const callActive =
    ctx.callPhase === 'dialing' ||
    ctx.callPhase === 'ringing' ||
    ctx.callPhase === 'in_call';

  const onCall = (lead: MyQueueLead) => {
    if (callActive) return;
    void ctx.startCall({
      contactId: lead.id,
      contactName: lead.name,
      phone: lead.phone,
      campaignId: queueCampaignId,
    });
  };

  // "Back to dialer" — returns to the pre-call surface (campaign hero +
  // queue + pacing). The agent picks manual / auto next from there.
  const onBackToQueue = () => ctx.clearCall();

  // Anti-loop pick: skip the current contact AND every contact we've
  // already dialed in this session. Hugo flagged the dialer cycling
  // between the same two numbers because a failed call's queue row
  // wasn't transitioning out of `pending` server-side.
  const pickNextLead = (): MyQueueLead | null => {
    const currentId = ctx.call?.contactId ?? null;
    const eligible = queue.find(
      (l) => l.id !== currentId && !session.dialedThisSession.has(l.id)
    );
    if (eligible) return eligible;
    // Fall back: a different contact (even if dialed already) is
    // preferable to dialing the same one again.
    return queue.find((l) => l.id !== currentId) ?? null;
  };

  // "Skip & dial next" — handles every phase:
  //   - Live  → endCall() to kill audio synchronously, then dial next
  //   - Wrap  → clearCall + dial next
  //   - Done  → clearCall + dial next (overrides auto-next pacing)
  const onDialNext = async () => {
    if (callActive) {
      try { await ctx.endCall(); } catch { /* ignore */ }
    }
    ctx.clearCall();
    const next = pickNextLead();
    if (next) {
      setTimeout(() => onCall(next), 200);
    }
  };

  const hasNextLead = !!pickNextLead();

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-4">
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">
          Dialer
        </h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          One lead at a time · agent-controlled pacing
        </p>
      </div>

      {dialerBlocked && blockReason && ctx.callPhase === 'idle' && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[12px] rounded-[10px] px-3 py-2">
          {blockReason}
        </div>
      )}

      {/* CampaignHero is now visible in EVERY phase so Hugo can see
          pending / connected / done counts during a live call. */}
      <CampaignHero
        campaigns={campaigns}
        activeCampaignId={activeId}
        onSelectCampaign={setActiveId}
        loading={campaignsLoading}
      />

      {ctx.callPhase === 'idle' ? (
        <>
          {camp && (
            <>
              <button
                type="button"
                onClick={() => queue[0] && onCall(queue[0])}
                disabled={dialerBlocked || callActive || queue.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 text-[16px] font-semibold text-white bg-[#1E9A80] hover:bg-[#1E9A80]/90 px-5 py-4 rounded-2xl shadow-[0_4px_16px_rgba(30,154,128,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <Phone className="w-4 h-4" />
                {queue.length === 0
                  ? 'Queue empty'
                  : `Start dialing — ${queue[0].name}`}
              </button>

              <PacingControl />

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
                <QueuePreview
                  items={queue}
                  loading={queueLoading}
                  error={queueError}
                  onCall={onCall}
                  disabled={dialerBlocked || callActive}
                  disabledReason={
                    callActive ? 'A call is already active.' : blockReason
                  }
                />
                <RecentCallsPanel agentId={queueAgentId} />
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <LiveCallScreen
            pipelineId={camp?.pipelineId ?? null}
            scriptMd={camp?.scriptMd ?? null}
            onBackToQueue={onBackToQueue}
            onDialNext={() => void onDialNext()}
            hasNextLead={hasNextLead}
          />

          {/* During a call, surface the next 5 queue entries + recent
              call history alongside, per Hugo's "I want to see the
              queue and history while on the call" ask. */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
            <QueuePreview
              items={queue.slice(0, 5)}
              loading={queueLoading}
              error={queueError}
              onCall={onCall}
              disabled
              disabledReason="Hang up the current call to dial a different lead."
            />
            <RecentCallsPanel agentId={queueAgentId} />
          </div>
        </>
      )}
    </div>
  );
}

// Recent-calls strip — last 8 calls with status pills. Subscribed via
// useCalls realtime so it updates as calls finish.
function RecentCallsPanel({ agentId }: { agentId: string | null }) {
  const { calls, loading } = useCalls({ agentId, limit: 8 });
  return (
    <div
      data-feature="CALLER__RECENT_CALLS"
      className="bg-white border border-[#E5E7EB] rounded-2xl p-4"
    >
      <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-2">
        Recent calls
      </div>
      {loading && calls.length === 0 && (
        <div className="text-[11px] text-[#9CA3AF] italic py-3 text-center">
          Loading…
        </div>
      )}
      {!loading && calls.length === 0 && (
        <div className="text-[11px] text-[#9CA3AF] italic py-3 text-center">
          No calls yet.
        </div>
      )}
      <ul className="divide-y divide-[#E5E7EB]">
        {calls.map((c) => (
          <li
            key={c.id}
            className="py-2 flex items-center justify-between gap-2 text-[12px]"
          >
            <span className="text-[#6B7280] tabular-nums truncate">
              {c.startedAt ? new Date(c.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
              {c.status}
            </span>
            <span className="text-[#6B7280] tabular-nums truncate">
              {c.durationSec ? `${c.durationSec}s` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
