// ContactMetaCompact — top of COL 1 of LiveCallScreen.
//
// Hugo 2026-04-26 (PR 1, phase 2 polish): drop the boxed Pipeline /
// Last contact tiles — the borders + bg-grey ate too much vertical
// space for two values that fit on one line. Render them inline
// instead: `Stage · {dot}{name}  ·  Last {relTime}`.
//
// Also dedupe the contact.tags list against the active stage name —
// a contact whose tags include "interested" while the stage is
// "Interested" was rendering the same word twice. Filter out any tag
// whose lowercase matches the stage label before rendering.

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

  const stageNameLower = stage?.name.trim().toLowerCase() ?? '';
  const visibleTags = contact.tags.filter(
    (t) => t.trim().toLowerCase() !== stageNameLower
  );

  const lastContactLabel = contact.lastContactAt
    ? formatRelativeTime(contact.lastContactAt)
    : 'Never';

  return (
    <div className="space-y-1.5">
      {/* Inline meta: Stage + Last contact, separated by a thin dot. */}
      <div className="flex items-center gap-2 text-[11px] text-[#1A1A1A] flex-wrap">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
            Stage
          </span>
          {stage?.colour && (
            <span
              className="w-2 h-2 rounded-full inline-block flex-shrink-0"
              style={{ background: stage.colour }}
            />
          )}
          <span className="truncate">{stage?.name ?? '—'}</span>
        </span>
        <span className="text-[#E5E7EB]">·</span>
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
            Last
          </span>
          <span className="text-[#6B7280] truncate">{lastContactLabel}</span>
        </span>
      </div>

      {(visibleTags.length > 0 || contact.isHot) && (
        <div className="flex flex-wrap gap-1">
          {contact.isHot && (
            <span
              className="text-[9px] font-bold uppercase tracking-wide bg-[#FEF2F2] text-[#EF4444] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
            >
              <Flame className="w-2.5 h-2.5" /> HOT
            </span>
          )}
          {visibleTags.map((t) => (
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
