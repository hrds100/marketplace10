// PR 153 (Hugo 2026-04-29): top bar for the v3 overview page.
// Campaign select, session timer, pacing dropdown.

import { useEffect, useState } from 'react';
import CampaignList from '../CampaignList';
import { useDialerSession } from '../../../hooks/useDialerSession';
import PacingControl from './PacingControl';
import type { Campaign } from '../../../types';

export interface OverviewHeaderProps {
  campaigns: Campaign[];
  activeCampaignId: string;
  onSelectCampaign: (id: string) => void;
  /** Per-campaign default for auto-next delay (suggested). */
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

export default function OverviewHeader({
  campaigns,
  activeCampaignId,
  onSelectCampaign,
  campaignDefaultSeconds,
}: OverviewHeaderProps) {
  const session = useDialerSession();
  // 1Hz tick to update the visible session timer. Only ticks once a
  // session has started (sessionStartedAt non-null).
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session.startedAt) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [session.startedAt]);

  const elapsedMs = session.startedAt ? Date.now() - session.startedAt : 0;
  const elapsed = session.startedAt ? formatElapsed(elapsedMs) : '—';

  return (
    <header
      className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex items-center gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      data-testid="overview-header"
    >
      {/* Campaign picker — reuses the existing CampaignList component
          so the admin's Pause/Stop/Start buttons keep working. */}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
          Campaign
        </div>
        <CampaignList
          activeId={activeCampaignId}
          campaigns={campaigns}
          onSelect={onSelectCampaign}
        />
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          Session
        </div>
        <div
          className="text-[15px] font-semibold tabular-nums text-[#1A1A1A]"
          data-testid="overview-session-timer"
          title={
            session.startedAt
              ? `Started ${new Date(session.startedAt).toLocaleTimeString()}`
              : 'Session timer starts on first dial'
          }
        >
          {elapsed}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <PacingControl campaignDefaultSeconds={campaignDefaultSeconds} />
      </div>
    </header>
  );
}
