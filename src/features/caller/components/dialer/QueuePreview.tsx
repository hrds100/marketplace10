// QueuePreview — Phase 2 next-N leads list.
// Renders the agent's actual queue from useMyDialerQueue (priority,
// scheduled_for, attempts ordering). Each row exposes a Call button.

import { Phone } from 'lucide-react';
import type { MyQueueLead } from '../../hooks/useMyDialerQueue';

interface Props {
  items: MyQueueLead[];
  loading: boolean;
  error: string | null;
  onCall: (lead: MyQueueLead) => void;
  disabled?: boolean;
  disabledReason?: string | null;
}

export default function QueuePreview({
  items,
  loading,
  error,
  onCall,
  disabled,
  disabledReason,
}: Props) {
  return (
    <div
      data-feature="CALLER__QUEUE_PREVIEW"
      className="bg-white border border-[#E5E7EB] rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          Next leads
        </div>
        <div className="text-[11px] text-[#6B7280] tabular-nums">
          {items.length} pending
        </div>
      </div>

      {loading && items.length === 0 && (
        <div className="text-[12px] text-[#9CA3AF] italic py-6 text-center">
          Loading queue…
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="text-[12px] text-[#9CA3AF] italic py-6 text-center">
          Queue empty. Ask admin to add leads to this campaign.
        </div>
      )}

      {error && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2">
          {error}
        </div>
      )}

      <ul className="divide-y divide-[#E5E7EB]">
        {items.map((lead, idx) => (
          <li key={lead.queueId} className="flex items-center gap-3 py-2.5">
            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-[#F3F3EE] text-[11px] font-bold text-[#6B7280] tabular-nums">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[#1A1A1A] truncate">
                {lead.name}
              </div>
              <div className="text-[11px] text-[#6B7280] tabular-nums truncate">
                {lead.phone || '— no phone —'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onCall(lead)}
              disabled={disabled || !lead.phone}
              title={disabled ? (disabledReason ?? '') : `Call ${lead.name}`}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#1E9A80] px-3 py-1.5 rounded-[10px] shadow-[0_2px_8px_rgba(30,154,128,0.25)] hover:bg-[#1E9A80]/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Phone className="w-3.5 h-3.5" />
              Call
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
