// PR 153 (Hugo 2026-04-29): top bar for the v3 overview page.
// PR 155 (Hugo 2026-04-29): simplified — the verbose CampaignList card
// (with "Hugo / Paused / 104 left · 16 done" sub-block) was confusing
// agents because the campaign-pause label collided with the session
// pause concept. Replaced with a compact <select>; admin's
// Start/Pause/Stop controls stay on the dedicated /smsv2/admin
// dialer page where they belong.

import { useEffect, useState } from 'react';
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
      className="bg-white border border-[#E5E7EB] rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      data-testid="overview-header"
    >
      <div className="flex flex-col gap-1 min-w-[200px]">
        <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          Campaign
        </span>
        <select
          value={activeCampaignId}
          onChange={(e) => onSelectCampaign(e.target.value)}
          className="px-2.5 py-1.5 text-[13px] font-medium bg-white border border-[#E5E7EB] rounded-[10px] cursor-pointer min-w-[180px]"
          data-testid="overview-campaign-select"
        >
          {campaigns.length === 0 && <option value="">No campaigns</option>}
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isActive === false ? ' (paused)' : ''}
              {' · '}
              {c.pendingLeads} left
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
          data-testid="overview-session-timer"
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
