// crm-v2 CampaignBar — compact campaign dropdown + session timer +
// pacing chip. Replaces the bulky "Hugo / Paused / 104 left · 16 done"
// sub-card that PR 155 already shrank in the old code.

import { useEffect, useState } from 'react';
import { useDialer } from '../../state/DialerProvider';
import PacingControl from '../PacingControl';
import type { CampaignWithCounts } from '../../hooks/useCampaigns';

export interface CampaignBarProps {
  campaigns: CampaignWithCounts[];
  activeCampaignId: string;
  onSelectCampaign: (id: string) => void;
  campaignDefaultSeconds?: number | null;
}

function formatElapsed(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CampaignBar({
  campaigns,
  activeCampaignId,
  onSelectCampaign,
  campaignDefaultSeconds,
}: CampaignBarProps) {
  const { session } = useDialer();
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session.startedAt) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [session.startedAt]);

  const elapsed = session.startedAt
    ? formatElapsed(Date.now() - session.startedAt)
    : '—';

  return (
    <header
      className="bg-white border border-[#E5E7EB] rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      data-testid="campaign-bar"
    >
      <div className="flex flex-col gap-1 min-w-[200px]">
        <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          Campaign
        </span>
        <select
          value={activeCampaignId}
          onChange={(e) => onSelectCampaign(e.target.value)}
          className="px-2.5 py-1.5 text-[13px] font-medium bg-white border border-[#E5E7EB] rounded-[10px] cursor-pointer min-w-[180px]"
          data-testid="campaign-select"
        >
          {campaigns.length === 0 && <option value="">No campaigns</option>}
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isActive === false ? ' (paused)' : ''}
              {' · '}
              {c.pendingLeads} left
              {c.doneLeads > 0 ? ` · ${c.doneLeads} done` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          Session
        </span>
        <span
          className="text-[15px] font-semibold tabular-nums text-[#1A1A1A]"
          data-testid="session-timer"
          title={
            session.startedAt
              ? `Started ${new Date(session.startedAt).toLocaleTimeString()}`
              : 'Session timer starts on first dial'
          }
        >
          {elapsed}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <PacingControl campaignDefaultSeconds={campaignDefaultSeconds} />
      </div>
    </header>
  );
}
