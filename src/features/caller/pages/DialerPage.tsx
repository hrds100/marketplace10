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

export default function DialerPage() {
  const { user, isAdmin } = useAuth();
  const ctx = useActiveCall();
  const spend = useSpendLimit();
  const ks = useKillSwitch();

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

      {ctx.callPhase === 'idle' ? (
        <>
          {dialerBlocked && blockReason && (
            <div className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[12px] rounded-[10px] px-3 py-2">
              {blockReason}
            </div>
          )}

          <CampaignHero
            campaigns={campaigns}
            activeCampaignId={activeId}
            onSelectCampaign={setActiveId}
            loading={campaignsLoading}
          />

          {camp && (
            <>
              <PacingControl />
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
            </>
          )}
        </>
      ) : (
        <LiveCallScreen
          pipelineId={camp?.pipelineId ?? null}
          scriptMd={camp?.scriptMd ?? null}
        />
      )}
    </div>
  );
}
