// crm-v2 OverviewPage — top-level layout for /crm/dialer-v2.
//
// Composition only. Every region is its own component. No supabase
// calls in this file — all data flows through hooks under hooks/.

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import CampaignBar from './sections/CampaignBar';
import SessionStats from './sections/SessionStats';
import HeroCard from './sections/HeroCard';
import QueueList from './sections/QueueList';
import RecentCallsList from './sections/RecentCallsList';
import { useDialer } from '../state/DialerProvider';
import { useCampaigns } from '../hooks/useCampaigns';
import { useNextLead } from '../hooks/useNextLead';
import { useRecentCalls } from '../hooks/useRecentCalls';
import { useAgentLimits } from '../hooks/useAgentLimits';
import { usePipelineColumns } from '../hooks/usePipelineColumns';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function OverviewPage() {
  const { user, isAdmin } = useAuth();
  const agentId = user?.id ?? null;
  const ctx = useDialer();

  const { campaigns } = useCampaigns({ agentId, isAdmin });
  const [activeId, setActiveId] = useState<string>('');
  useEffect(() => {
    if (campaigns.length === 0) return;
    if (!campaigns.some((c) => c.id === activeId)) {
      setActiveId(campaigns[0].id);
    }
  }, [campaigns, activeId]);

  const queueCampaignId = UUID_RE.test(activeId) ? activeId : null;
  const queueAgentId = isAdmin ? null : agentId;

  // Stamp the active campaign on the dialer context so future PR-C
  // wiring can resolve wk-leads-next when needed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueCampaignId]);
  useEffect(() => {
    // session.activeCampaignId is set via DialerProvider's
    // setActiveCampaignId; keep this hook structurally stable.
    if (ctx.session.activeCampaignId !== queueCampaignId) {
      ctx.setActiveCampaignId(queueCampaignId);
    }
  }, [queueCampaignId, ctx]);

  const { next, second, all, loading: queueLoading, error: queueError } =
    useNextLead({ campaignId: queueCampaignId, agentId: queueAgentId });

  const { rows: recentRows, loading: recentLoading } =
    useRecentCalls(agentId);
  const { byId: pipelineColumnsById } = usePipelineColumns();

  const { limits } = useAgentLimits(agentId);
  const campaign = campaigns.find((c) => c.id === activeId) ?? null;

  const blockedReason: string | null =
    limits?.blocked
      ? 'Daily spend limit reached'
      : campaign?.is_active === false
        ? 'Campaign paused by admin'
        : null;

  // PR B: HeroCard's onDial just dispatches START_CALL via the
  // reducer + records the dial. The Twilio side-effects layer
  // (wk-calls-create + device.dial + listeners) lands in PR C.
  const onDial = (contactId: string) => {
    const lead = all.find((l) => l.contactId === contactId);
    if (!lead) return;
    ctx.recordDialed(lead.contactId);
    ctx.dispatch({
      type: 'START_CALL',
      call: {
        contactId: lead.contactId,
        contactName: lead.name,
        phone: lead.phone,
        startedAt: Date.now(),
        callId: null,
        campaignId: queueCampaignId,
      },
    });
  };

  return (
    <div
      className="p-6 max-w-[1400px] mx-auto space-y-4"
      data-testid="crm-v2-overview-page"
    >
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">
          My dialer
        </h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          One lead at a time · agent-controlled pacing
        </p>
      </div>

      <CampaignBar
        campaigns={campaigns}
        activeCampaignId={activeId}
        onSelectCampaign={setActiveId}
        campaignDefaultSeconds={campaign?.auto_advance_seconds ?? null}
      />

      {!campaign ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center">
          <div className="text-[14px] font-semibold text-[#1A1A1A] mb-1">
            {campaigns.length === 0 ? 'No campaigns yet' : 'Pick a campaign'}
          </div>
          <div className="text-[12px] text-[#6B7280]">
            {campaigns.length === 0
              ? 'Ask an admin to create a campaign and assign you to it.'
              : 'Use the dropdown above.'}
          </div>
        </div>
      ) : (
        <>
          <SessionStats
            agentId={agentId}
            leadsLeft={queueError ? null : all.length}
            leadsLeftError={!!queueError}
          />

          <HeroCard
            next={next}
            second={second}
            loading={queueLoading && !next}
            disabledReason={blockedReason}
            onDial={onDial}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
            <QueueList
              rows={all.slice(1)}
              loading={queueLoading}
              disabledReason={blockedReason}
              onDial={onDial}
            />
            <RecentCallsList
              rows={recentRows}
              loading={recentLoading}
              pipelineColumns={pipelineColumnsById}
            />
          </div>
        </>
      )}
    </div>
  );
}
