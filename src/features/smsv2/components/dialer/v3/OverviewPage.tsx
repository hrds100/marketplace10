// PR 153 (Hugo 2026-04-29): v3 overview page. Replaces the v2
// PreCallRoom layout. Composition only — every region is its own
// component. Four-column InCallRoom UI is unchanged.

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import EditContactModal from '../../contacts/EditContactModal';
import { useDialerCampaigns } from '../../../hooks/useDialerCampaigns';
import { useNextLead } from '../../../hooks/useNextLead';
import { useSpendLimit } from '../../../hooks/useSpendLimit';
import { useKillSwitch } from '../../../hooks/useKillSwitch';
import { useSmsV2 } from '../../../store/SmsV2Store';
import { useContactPersistence } from '../../../hooks/useContactPersistence';
import OverviewHeader from './OverviewHeader';
import HeroCard from './HeroCard';
import OrderedQueueList from './OrderedQueueList';
import SessionFooter from './SessionFooter';
import HistoryList from './HistoryList';
import type { Campaign, Contact } from '../../../types';

export default function OverviewPage() {
  const { user, isAdmin } = useAuth();
  const [workspaceRole, setWorkspaceRole] = useState<string | null | undefined>(
    undefined
  );
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
      if (!cancelled)
        setWorkspaceRole((data?.workspace_role as string | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);
  const isEffectiveAdmin =
    workspaceRole === 'admin' || (workspaceRole === null && isAdmin);

  const { campaigns: realCampaigns, loading: campaignsLoading } =
    useDialerCampaigns({
      scopedToAgentId: !isEffectiveAdmin && user ? user.id : null,
      includeInactive: true,
    });

  const [activeId, setActiveId] = useState<string>(realCampaigns[0]?.id ?? '');
  const [editing, setEditing] = useState<Contact | null>(null);

  const spend = useSpendLimit();
  const ks = useKillSwitch();
  const dialerBlocked = spend.isLimitReached || ks.allDialers;
  const blockReason = ks.allDialers
    ? 'All dialers are off (kill switch). Toggle off in Settings → AI Coach.'
    : spend.isLimitReached
      ? 'Daily spend limit reached.'
      : null;

  const { patchContact, upsertContact } = useSmsV2();
  const persist = useContactPersistence();

  useEffect(() => {
    if (realCampaigns.length === 0) return;
    if (!realCampaigns.some((c) => c.id === activeId)) {
      setActiveId(realCampaigns[0].id);
    }
  }, [realCampaigns, activeId]);

  const camp: Campaign | null = useMemo(
    () => realCampaigns.find((c) => c.id === activeId) ?? realCampaigns[0] ?? null,
    [realCampaigns, activeId]
  );

  const isUuid = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const queueCampaignId = isUuid(activeId) ? activeId : null;
  const queueAgentId = isEffectiveAdmin || !user ? null : user.id;

  const {
    next: nextLead,
    all: queueRows,
    loading: queueLoading,
  } = useNextLead(queueCampaignId, queueAgentId, 50);

  const handleStageChange = (contactId: string, columnId: string) => {
    patchContact(contactId, { pipelineColumnId: columnId });
    void persist.moveToColumn(contactId, columnId);
  };

  return (
    <div
      className="p-6 max-w-[1400px] mx-auto space-y-4"
      data-testid="overview-page"
    >
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">
          My dialer
        </h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          One lead at a time · agent-controlled pacing
        </p>
      </div>

      <OverviewHeader
        campaigns={realCampaigns}
        activeCampaignId={activeId}
        onSelectCampaign={setActiveId}
        campaignDefaultSeconds={camp?.autoAdvanceSeconds ?? null}
      />

      {!camp ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center">
          <div className="text-[14px] font-semibold text-[#1A1A1A] mb-1">
            {campaignsLoading ? 'Loading campaigns…' : 'No campaigns yet'}
          </div>
          <div className="text-[12px] text-[#6B7280]">
            {campaignsLoading
              ? ' '
              : 'Ask an admin to create a campaign and assign you to it.'}
          </div>
        </div>
      ) : (
        <>
          <HeroCard
            next={nextLead}
            loading={queueLoading && !nextLead}
            disabledReason={dialerBlocked ? blockReason : null}
            onEdit={(c) => setEditing(c)}
            onChangeStage={handleStageChange}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
            <OrderedQueueList
              rows={queueRows.slice(1)} /* skip the head — it's in HeroCard */
              loading={queueLoading}
              disabledReason={dialerBlocked ? blockReason : null}
              onEdit={(c) => setEditing(c)}
              onChangeStage={handleStageChange}
            />
            <HistoryList />
          </div>

          <SessionFooter
            campaignId={queueCampaignId}
            agentId={queueAgentId}
          />
        </>
      )}

      <EditContactModal
        contact={editing}
        onClose={() => setEditing(null)}
        onSave={(updated) => upsertContact(updated)}
      />
    </div>
  );
}
