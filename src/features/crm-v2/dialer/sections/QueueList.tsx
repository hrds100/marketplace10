// crm-v2 QueueList — full ordered queue (rows 2..N), click-to-dial.

import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QueueLead } from '../../hooks/useDialerQueue';

export interface QueueListProps {
  rows: QueueLead[];
  loading: boolean;
  disabledReason?: string | null;
  onDial: (contactId: string) => void;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length <= 4) return phone || '';
  const tail = phone.slice(-4);
  if (phone.startsWith('+')) {
    const prefix = phone.slice(0, Math.min(3, phone.length - 4));
    return `${prefix}…${tail}`;
  }
  return `…${tail}`;
}

export default function QueueList({
  rows,
  loading,
  disabledReason,
  onDial,
}: QueueListProps) {
  const blocked = !!disabledReason;

  return (
    <div
      className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden"
      data-testid="queue-list"
    >
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide">
          Queue
        </h3>
        <span className="text-[11px] text-[#6B7280] tabular-nums">
          {rows.length} {rows.length === 1 ? 'lead' : 'leads'}
        </span>
      </div>
      <div className="divide-y divide-[#E5E7EB] max-h-[640px] overflow-y-auto">
        {loading && rows.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-[#9CA3AF] italic">
            Loading queue…
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-[#9CA3AF] italic">
            No more leads in this campaign.
          </div>
        )}
        {rows.map((lead, idx) => (
          <div
            key={lead.queueId}
            className="px-4 py-2.5 hover:bg-[#F3F3EE]/50 flex items-center gap-3"
            data-testid={`queue-row-${lead.contactId}`}
          >
            <span className="text-[11px] tabular-nums text-[#9CA3AF] w-6 shrink-0">
              {idx + 1}.
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#1A1A1A] truncate">
                {lead.name}
              </div>
              <div className="text-[11px] text-[#6B7280] tabular-nums">
                {maskPhone(lead.phone)}
              </div>
            </div>
            <button
              onClick={() => onDial(lead.contactId)}
              disabled={blocked}
              title={disabledReason ?? 'Dial this lead'}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors',
                blocked
                  ? 'bg-[#F3F3EE] text-[#9CA3AF] cursor-not-allowed'
                  : 'border border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#ECFDF5] hover:border-[#1E9A80]'
              )}
              data-testid={`queue-row-dial-${lead.contactId}`}
            >
              <Phone className="w-3 h-3" />
              Call
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
