// TimelinePane — read-only call timeline.
// Renders rows from the wk_call_timeline view (transcript / coach /
// sms / activity) in chronological order, newest first. Skeleton: no
// streaming animation, no per-kind grouping, no speaker avatars —
// each is logged as deferred in docs/caller/LOG.md.

import { Bot, MessageSquare, Mic, ListTree } from 'lucide-react';
import { useCallTimeline, type TimelineRow } from '../../hooks/useCallTimeline';

interface Props {
  callId: string | null;
  /** When false (PastCallScreen), the empty state copy nudges the
   *  reader toward "this call has no timeline" instead of "still
   *  ringing". */
  isLive?: boolean;
}

export default function TimelinePane({ callId, isLive }: Props) {
  const { items, loading, error } = useCallTimeline(callId);

  return (
    <div
      data-feature="CALLER__TIMELINE_PANE"
      className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col min-h-[400px]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          Call timeline
        </div>
        <div className="text-[10px] text-[#9CA3AF] tabular-nums">
          {items.length} entries
        </div>
      </div>

      {error && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="text-[12px] text-[#9CA3AF] italic py-12 text-center">
          Loading timeline…
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="text-[12px] text-[#9CA3AF] italic py-12 text-center">
          {isLive
            ? 'Waiting for first transcript / coach event…'
            : 'No timeline entries on this call.'}
        </div>
      )}

      <ul className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB]">
        {items.map((row, i) => (
          <TimelineRowItem key={`${row.kind}-${row.ref_id ?? i}-${row.ts}`} row={row} />
        ))}
      </ul>
    </div>
  );
}

function TimelineRowItem({ row }: { row: TimelineRow }) {
  const Icon = ICON_FOR_KIND[row.kind] ?? ListTree;
  const colour = COLOUR_FOR_KIND[row.kind] ?? 'text-[#6B7280]';
  const stamp = formatStamp(row.ts);
  return (
    <li className="flex items-start gap-2 py-2.5">
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colour}`} strokeWidth={1.8} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            {row.kind} {row.subtype ? `· ${row.subtype}` : ''}
          </span>
          <span className="text-[10px] text-[#9CA3AF] tabular-nums">{stamp}</span>
        </div>
        <div className="text-[12px] text-[#1A1A1A] leading-relaxed whitespace-pre-wrap break-words">
          {row.body || '—'}
        </div>
      </div>
    </li>
  );
}

const ICON_FOR_KIND = {
  transcript: Mic,
  coach: Bot,
  sms: MessageSquare,
  activity: ListTree,
} as const;

const COLOUR_FOR_KIND = {
  transcript: 'text-[#1E9A80]',
  coach: 'text-[#7C3AED]',
  sms: 'text-[#3B82F6]',
  activity: 'text-[#9CA3AF]',
} as const;

function formatStamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}
