// ContactMetaCompact — top of COL 1 of LiveCallScreen.
//
// Hugo 2026-04-30: "compact the left-side meta area: pipeline, tags,
// last contact. Put them side by side where possible. Free up vertical
// space for the timeline below SMS."
//
// Replaces the previous stacked KV blocks (Pipeline / Last contact /
// Tags / Deal value / custom fields) with a tighter side-by-side
// layout. Saves ~80px of vertical space for the timeline.
//
// Hugo 2026-04-30 (PR E): StageSelector lives next to the SMS sender
// now (stage moves are adjacent to SMS sends per Hugo's instruction).
// The Pipeline tile in the grid below stays as a read-only indicator.

import { Tag, Flame } from 'lucide-react';
import { useSmsV2 } from '../../store/SmsV2Store';
import { formatPence, formatRelativeTime } from '../../data/helpers';
import type { Contact } from '../../types';

interface Props {
  contact: Contact;
}

export default function ContactMetaCompact({ contact }: Props) {
  const store = useSmsV2();
  const stage = store.columns.find((c) => c.id === contact.pipelineColumnId);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-[#F9FAFB] rounded-lg px-2 py-1.5 border border-[#F3F3EE]">
          <div className="text-[9px] uppercase tracking-wide text-[#9CA3AF] font-bold mb-0.5">
            Pipeline
          </div>
          <div className="text-[#1A1A1A] flex items-center gap-1.5 truncate">
            {stage?.colour && (
              <span
                className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                style={{ background: stage.colour }}
              />
            )}
            <span className="truncate">{stage?.name ?? '—'}</span>
          </div>
        </div>
        <div className="bg-[#F9FAFB] rounded-lg px-2 py-1.5 border border-[#F3F3EE]">
          <div className="text-[9px] uppercase tracking-wide text-[#9CA3AF] font-bold mb-0.5">
            Last contact
          </div>
          <div className="text-[#1A1A1A] truncate">
            {contact.lastContactAt
              ? formatRelativeTime(contact.lastContactAt)
              : 'Never'}
          </div>
        </div>
      </div>

      {(contact.tags.length > 0 || contact.isHot) && (
        <div className="flex flex-wrap gap-1">
          {contact.isHot && (
            <span
              className="text-[9px] font-bold uppercase tracking-wide bg-[#FEF2F2] text-[#EF4444] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
            >
              <Flame className="w-2.5 h-2.5" /> HOT
            </span>
          )}
          {contact.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] font-medium bg-[#F3F3EE] text-[#6B7280] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
            >
              <Tag className="w-2.5 h-2.5" /> {t}
            </span>
          ))}
        </div>
      )}

      {contact.dealValuePence !== undefined && contact.dealValuePence > 0 && (
        <div className="text-[11px] text-[#6B7280]">
          Deal value:{' '}
          <span className="font-semibold text-[#1E9A80] tabular-nums">
            {formatPence(contact.dealValuePence)}
          </span>
        </div>
      )}
    </div>
  );
}
