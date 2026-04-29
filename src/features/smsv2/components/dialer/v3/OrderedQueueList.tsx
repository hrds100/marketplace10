// PR 153 (Hugo 2026-04-29): full ordered queue list. Replaces the
// "Up next 3" slice with the actual ordered next-N (default 50).
// Click-to-dial fires startCall.

import { ArrowRight, Pencil, Flame } from 'lucide-react';
import { useActiveCallCtx } from '../../live-call/ActiveCallContext';
import { useSmsV2 } from '../../../store/SmsV2Store';
import StageSelector from '../../shared/StageSelector';
import type { MyQueueLead } from '../../../hooks/useMyDialerQueue';
import type { Contact } from '../../../types';

export interface OrderedQueueListProps {
  rows: MyQueueLead[];
  loading: boolean;
  /** Disabled+hover label when dialing is gated. */
  disabledReason?: string | null;
  onEdit: (contact: Contact) => void;
  onChangeStage: (contactId: string, columnId: string) => void;
}

export default function OrderedQueueList({
  rows,
  loading,
  disabledReason,
  onEdit,
  onChangeStage,
}: OrderedQueueListProps) {
  const { startCall } = useActiveCallCtx();
  const { contacts } = useSmsV2();
  const blocked = !!disabledReason;

  return (
    <aside
      className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden flex flex-col"
      data-testid="ordered-queue-list"
    >
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <h3 className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-wide">
          Queue
        </h3>
        <span className="text-[10px] text-[#6B7280] tabular-nums">
          {loading ? '…' : `${rows.length} lead${rows.length === 1 ? '' : 's'}`}
        </span>
      </div>
      <div className="divide-y divide-[#E5E7EB] flex-1 overflow-y-auto max-h-[60vh]">
        {loading && rows.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] text-[#9CA3AF] italic">
            Loading queue…
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div
            className="px-3 py-6 text-center text-[11px] text-[#9CA3AF] italic"
            data-testid="ordered-queue-empty"
          >
            Queue is empty.
          </div>
        )}
        {rows.map((lead, idx) => {
          const fullContact = contacts.find((co) => co.id === lead.id);
          return (
            <div
              key={lead.queueId}
              className="px-3 py-2 hover:bg-[#F3F3EE]/50 flex items-center gap-2"
              data-testid={`queue-row-${idx}`}
            >
              <span className="text-[10px] text-[#9CA3AF] font-semibold tabular-nums w-6 text-right">
                {idx + 1}.
              </span>
              <button
                onClick={() => startCall(lead.id)}
                disabled={blocked}
                className="flex-1 min-w-0 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                title={disabledReason ?? 'Dial this lead'}
              >
                <div className="text-[12px] font-medium text-[#1A1A1A] truncate flex items-center gap-1">
                  {lead.name}
                  {lead.priority > 0 && (
                    <Flame
                      className="w-3 h-3 text-[#EF4444]"
                      title="Priority lead"
                    />
                  )}
                </div>
                <div className="text-[10px] text-[#6B7280] tabular-nums">
                  {lead.phone}
                </div>
              </button>
              <StageSelector
                value={lead.pipelineColumnId}
                onChange={(col) => onChangeStage(lead.id, col)}
                size="sm"
              />
              {fullContact && (
                <button
                  onClick={() => onEdit(fullContact)}
                  className="p-1 rounded hover:bg-white text-[#6B7280]"
                  title="Edit lead"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => startCall(lead.id)}
                disabled={blocked}
                className="p-1 rounded hover:bg-white text-[#9CA3AF] disabled:opacity-50"
                title="Dial this lead"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
