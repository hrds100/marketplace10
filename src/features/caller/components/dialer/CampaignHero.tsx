// CampaignHero — Phase 2 dialer header.
// Shows the active campaign + headline counters (pending / connected /
// done) sourced from useDialerCampaigns. Lets the agent switch
// campaigns via a select dropdown.

import type { Campaign } from '../../types';

interface Props {
  campaigns: Campaign[];
  activeCampaignId: string;
  onSelectCampaign: (id: string) => void;
  loading: boolean;
}

export default function CampaignHero({
  campaigns,
  activeCampaignId,
  onSelectCampaign,
  loading,
}: Props) {
  const camp = campaigns.find((c) => c.id === activeCampaignId) ?? campaigns[0] ?? null;

  if (loading && campaigns.length === 0) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
        <div className="h-6 w-48 bg-[#F3F3EE] rounded animate-pulse" />
      </div>
    );
  }

  if (!camp) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center">
        <div className="text-[14px] font-semibold text-[#1A1A1A] mb-1">
          No campaigns yet
        </div>
        <div className="text-[12px] text-[#6B7280]">
          Ask an admin to create a campaign and assign you to it.
        </div>
      </div>
    );
  }

  return (
    <div
      data-feature="CALLER__CAMPAIGN_HERO"
      className="bg-white border border-[#E5E7EB] rounded-2xl p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
            Active campaign
          </div>
          <div className="text-[20px] font-bold text-[#1A1A1A] truncate">
            {camp.name}
          </div>
        </div>
        {campaigns.length > 1 && (
          <select
            value={activeCampaignId}
            onChange={(e) => onSelectCampaign(e.target.value)}
            className="text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-1.5 bg-white"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
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
    <div
      className={`rounded-[10px] px-3 py-2 ${accent ? 'bg-[#ECFDF5]' : 'bg-[#F3F3EE]'}`}
    >
      <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
        {label}
      </div>
      <div
        className={`text-[20px] font-bold tabular-nums ${accent ? 'text-[#1E9A80]' : 'text-[#1A1A1A]'}`}
      >
        {value}
      </div>
    </div>
  );
}
