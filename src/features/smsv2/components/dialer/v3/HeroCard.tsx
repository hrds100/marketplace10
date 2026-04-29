// PR 153 (Hugo 2026-04-29): the hero card on the v3 overview page.
// Renders the next lead, a prominent Dial CTA, and the universal
// SessionControlBar so Pause/Resume/Skip/Next are reachable
// before any call has even started (Hugo's universal-control rule).

import { Phone, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveCallCtx } from '../../live-call/ActiveCallContext';
import { useSmsV2 } from '../../../store/SmsV2Store';
import StageSelector from '../../shared/StageSelector';
import SessionControlBar from './SessionControlBar';
import type { MyQueueLead } from '../../../hooks/useMyDialerQueue';
import type { Contact } from '../../../types';

export interface HeroCardProps {
  next: MyQueueLead | null;
  loading: boolean;
  /** Disabled+hover label when dialing is gated (spend / killswitch). */
  disabledReason?: string | null;
  /** PR 155 (Hugo 2026-04-29): id of the second lead in the queue —
   *  fed into SessionControlBar so Skip-from-idle dials lead #2 (skip
   *  the head). When the queue has only 1 lead, this is null and Skip
   *  falls back to dialing the head. */
  secondLeadId?: string | null;
  onEdit: (contact: Contact) => void;
  onChangeStage: (contactId: string, columnId: string) => void;
}

export default function HeroCard({
  next,
  loading,
  disabledReason,
  secondLeadId = null,
  onEdit,
  onChangeStage,
}: HeroCardProps) {
  const ctx = useActiveCallCtx();
  const { contacts } = useSmsV2();
  const blocked = !!disabledReason;
  const headLeadId = next?.id ?? null;

  const fullContact: Contact | null = next
    ? contacts.find((c) => c.id === next.id) ?? null
    : null;

  return (
    <div
      className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.08)]"
      data-testid="hero-card"
    >
      {loading ? (
        <div className="animate-pulse">
          <div className="h-3 w-20 bg-[#F3F3EE] rounded mb-3" />
          <div className="h-7 w-48 bg-[#F3F3EE] rounded mb-2" />
          <div className="h-4 w-36 bg-[#F3F3EE] rounded" />
        </div>
      ) : !next ? (
        <div className="text-center py-8" data-testid="hero-card-empty">
          <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-2">
            Next up
          </div>
          <div className="text-[18px] font-bold text-[#1A1A1A] mb-1">
            Queue is empty
          </div>
          <div className="text-[12px] text-[#6B7280] mb-4">
            Upload leads or wait for new ones to be assigned.
          </div>
          {/* Even when the queue is empty, session controls stay
              available — Hugo's universal-control rule. */}
          <div className="flex justify-center">
            <SessionControlBar
              size="md"
              headLeadId={headLeadId}
              secondLeadId={secondLeadId}
              pacingDeadlineMs={ctx.pacingDeadlineMs}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
                Next up
              </div>
              <h2
                className="text-[24px] font-bold text-[#1A1A1A] tracking-tight truncate"
                data-testid="hero-lead-name"
              >
                {next.name}
              </h2>
              <div className="text-[15px] text-[#6B7280] tabular-nums">
                {next.phone}
              </div>
              {next.attempts > 0 && (
                <div className="text-[11px] text-[#9CA3AF] mt-1">
                  Attempts: {next.attempts}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StageSelector
                value={next.pipelineColumnId}
                onChange={(col) => onChangeStage(next.id, col)}
                size="sm"
              />
              {fullContact && (
                <button
                  onClick={() => onEdit(fullContact)}
                  className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F3F3EE] text-[#6B7280]"
                  title="Edit lead"
                  data-testid="hero-edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mt-6 items-center">
            <button
              onClick={() => void ctx.startCall(next.id)}
              disabled={blocked}
              title={disabledReason ?? 'Dial this lead'}
              data-testid="hero-dial"
              className={cn(
                'flex items-center justify-center gap-2 rounded-[12px] px-5 py-3 text-[16px] font-semibold transition-colors',
                blocked
                  ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                  : 'bg-[#1E9A80] text-white shadow-[0_4px_16px_rgba(30,154,128,0.35)] hover:bg-[#1E9A80]/90'
              )}
            >
              <Phone className="w-5 h-5" /> Dial
            </button>
            <SessionControlBar
              size="md"
              headLeadId={headLeadId}
              secondLeadId={secondLeadId}
              pacingDeadlineMs={ctx.pacingDeadlineMs}
            />
          </div>

          {disabledReason && (
            <div
              className="mt-3 text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-3 py-2"
              data-testid="hero-blocked-reason"
            >
              {disabledReason}
            </div>
          )}
        </>
      )}
    </div>
  );
}
