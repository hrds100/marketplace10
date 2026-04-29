// crm-v2 RecentCallsList — last 10 unique-contact calls for the agent.
//
// PR B scope: read-only display. Edit / Open / Hangup / Recording
// playback / Transcript expand land in PR C alongside the InCallRoom.

import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecentCall } from '../../hooks/useRecentCalls';

export interface RecentCallsListProps {
  rows: RecentCall[];
  loading: boolean;
  /** Map of pipeline_column_id → { name, colour } for outcome chips. */
  pipelineColumns: Map<string, { name: string; colour: string | null }>;
}

function statusBadge(status: RecentCall['status']): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'completed':
    case 'in_progress':
      return { label: 'Connected', className: 'bg-[#ECFDF5] text-[#1E9A80]' };
    case 'voicemail':
      return { label: 'Voicemail', className: 'bg-[#FEF3C7] text-[#B45309]' };
    case 'no_answer':
    case 'missed':
      return { label: 'No pickup', className: 'bg-[#F3F4F6] text-[#6B7280]' };
    case 'busy':
      return { label: 'Busy', className: 'bg-[#FEE2E2] text-[#B91C1C]' };
    case 'failed':
      return { label: 'Failed', className: 'bg-[#FEE2E2] text-[#B91C1C]' };
    case 'canceled':
      return { label: 'Cancelled', className: 'bg-[#F3F4F6] text-[#6B7280]' };
    case 'queued':
    case 'ringing':
      return { label: 'Ringing', className: 'bg-[#DBEAFE] text-[#1D4ED8]' };
    default:
      return { label: status, className: 'bg-[#F3F4F6] text-[#6B7280]' };
  }
}

function formatDuration(sec: number): string {
  if (sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return 'just now';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
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

export default function RecentCallsList({
  rows,
  loading,
  pipelineColumns,
}: RecentCallsListProps) {
  return (
    <div
      className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden"
      data-testid="recent-calls-list"
    >
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
          Recent calls
        </h3>
        <span className="text-[11px] text-[#6B7280]">Last 10</span>
      </div>
      <div className="divide-y divide-[#E5E7EB] max-h-[640px] overflow-y-auto">
        {loading && rows.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-[#9CA3AF] italic">
            Loading recent calls…
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-[#9CA3AF] italic">
            No calls yet today.
          </div>
        )}
        {rows.map((row) => {
          const badge = statusBadge(row.status);
          const outcome = row.dispositionColumnId
            ? pipelineColumns.get(row.dispositionColumnId)
            : undefined;
          return (
            <div
              key={row.id}
              className="px-4 py-2.5 hover:bg-[#F3F3EE]/50"
              data-testid={`recent-call-row-${row.id}`}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#1A1A1A] truncate flex items-center gap-1.5">
                    <span className="truncate">{row.name}</span>
                    <span
                      className={cn(
                        'text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded shrink-0',
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                    {row.durationSec > 0 && (
                      <span className="text-[10px] tabular-nums text-[#6B7280] shrink-0">
                        {formatDuration(row.durationSec)}
                      </span>
                    )}
                    <span className="text-[10px] text-[#9CA3AF] tabular-nums shrink-0 ml-auto">
                      {relativeTime(row.startedAt)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[#6B7280] tabular-nums">
                  {maskPhone(row.phone)}
                </span>
                {outcome && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded ring-1 ring-inset"
                    style={{
                      backgroundColor: outcome.colour
                        ? `${outcome.colour}26`
                        : '#F3F4F6',
                      color: outcome.colour ?? '#6B7280',
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ['--tw-ring-color' as any]: outcome.colour ?? '#E5E7EB',
                    }}
                    title={`Outcome saved on this call: ${outcome.name}`}
                    data-testid={`recent-call-outcome-${row.id}`}
                  >
                    ✓ {outcome.name}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
