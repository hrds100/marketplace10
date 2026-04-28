// CampaignList — sidebar list of the agent's campaigns.
//
// PR 130 (Hugo 2026-04-28): mock fallback removed entirely. The
// previous fallback to MOCK_CAMPAIGNS triggered any time the prop
// was an empty array — including the moment the agent pressed Stop
// (which set is_active=false → useDialerCampaigns filtered the row
// out → empty array → mocks reappeared). Hugo: "If I press Stop, it
// shows April/May/Re-engage. This is dummy data. We don't need it."
// Now: empty list = empty list, with the existing "No campaigns
// yet" empty-state copy.

import { Plus, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Campaign } from '../../types';

interface Props {
  activeId: string;
  onSelect: (id: string) => void;
  /** Campaigns to render. Empty array → empty-state copy below. */
  campaigns: Campaign[];
}

export default function CampaignList({ activeId, onSelect, campaigns }: Props) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide">
          My campaigns
        </h3>
        <button className="text-[#1E9A80] hover:bg-[#ECFDF5] p-1 rounded">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="divide-y divide-[#E5E7EB]">
        {campaigns.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              'w-full text-left px-4 py-3 hover:bg-[#F3F3EE]/50 transition-colors',
              activeId === c.id && 'bg-[#ECFDF5]',
              c.isActive === false && 'opacity-60'
            )}
          >
            <div className="flex items-center gap-2">
              <Megaphone
                className={cn(
                  'w-3.5 h-3.5 flex-shrink-0',
                  activeId === c.id ? 'text-[#1E9A80]' : 'text-[#6B7280]'
                )}
              />
              <span
                className={cn(
                  'text-[13px] font-semibold truncate',
                  activeId === c.id ? 'text-[#1E9A80]' : 'text-[#1A1A1A]'
                )}
              >
                {c.name}
              </span>
              {c.isActive === false && (
                <span className="ml-auto text-[9px] uppercase tracking-wide font-bold text-[#9CA3AF] bg-[#F3F3EE] px-1.5 py-0.5 rounded">
                  Paused
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#6B7280] tabular-nums mt-1 ml-5">
              {c.pendingLeads} left · {c.doneLeads} done
            </div>
          </button>
        ))}
        {campaigns.length === 0 && (
          <div className="px-4 py-8 text-center text-[12px] text-[#9CA3AF] italic">
            No campaigns yet. Ask an admin to create one and assign you.
          </div>
        )}
      </div>
    </div>
  );
}
