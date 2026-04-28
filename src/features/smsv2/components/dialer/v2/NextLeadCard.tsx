// PR 140 (Hugo 2026-04-28): the new pre-call room hero — one big card
// that shows the next lead the agent will dial, a one-click DIAL CTA,
// and a Skip button. No campaign tabs, no stats chrome between the
// agent and the lead. Standard power-dialer "what am I about to do"
// surface.
//
// Hugo's brief: one lead at a time, agent-controlled pacing. This is
// the contract made visible.

import { Phone, ArrowRight, Pencil, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import StageSelector from '../../shared/StageSelector';
import type { MyQueueLead } from '../../../hooks/useMyDialerQueue';
import type { Contact } from '../../../types';

export interface NextLeadCardProps {
  lead: MyQueueLead | null;
  /** Hydrated contact (if available) — drives the Edit button. */
  fullContact: Contact | null;
  loading: boolean;
  /** Disabled+hover label when dialing is gated (spend / killswitch). */
  disabledReason?: string | null;
  onDial: (contactId: string) => void;
  onSkip: (contactId: string) => void;
  onEdit: (contact: Contact) => void;
  onChangeStage: (contactId: string, columnId: string) => void;
}

export default function NextLeadCard({
  lead,
  fullContact,
  loading,
  disabledReason,
  onDial,
  onSkip,
  onEdit,
  onChangeStage,
}: NextLeadCardProps) {
  const blocked = !!disabledReason;

  if (loading) {
    return (
      <div
        data-testid="next-lead-card-loading"
        className="bg-white border border-[#E5E7EB] rounded-2xl p-6 animate-pulse"
      >
        <div className="h-3 w-20 bg-[#F3F3EE] rounded mb-3" />
        <div className="h-7 w-48 bg-[#F3F3EE] rounded mb-2" />
        <div className="h-4 w-36 bg-[#F3F3EE] rounded" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div
        data-testid="next-lead-card-empty"
        className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center"
      >
        <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-2">
          Next up
        </div>
        <div className="text-[18px] font-bold text-[#1A1A1A] mb-1">
          Queue is empty
        </div>
        <div className="text-[12px] text-[#6B7280]">
          Upload leads or wait for new ones to be assigned.
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="next-lead-card"
      className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
            Next up
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h2
              className="text-[24px] font-bold text-[#1A1A1A] tracking-tight truncate"
              data-testid="next-lead-name"
            >
              {lead.name}
            </h2>
            {lead.priority > 0 && (
              <span
                className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#EF4444]"
                title="Priority lead"
              >
                <Flame className="w-3 h-3" /> HOT
              </span>
            )}
          </div>
          <div className="text-[15px] text-[#6B7280] tabular-nums">{lead.phone}</div>
          {lead.attempts > 0 && (
            <div className="text-[11px] text-[#9CA3AF] mt-1">
              Attempts: {lead.attempts}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <StageSelector
            value={lead.pipelineColumnId}
            onChange={(col) => onChangeStage(lead.id, col)}
            size="sm"
          />
          {fullContact && (
            <button
              onClick={() => onEdit(fullContact)}
              className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F3F3EE] text-[#6B7280] hover:text-[#1A1A1A]"
              title="Edit lead"
              data-testid="next-lead-edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mt-6">
        <button
          onClick={() => onDial(lead.id)}
          disabled={blocked}
          title={disabledReason ?? 'Dial this lead'}
          data-testid="next-lead-dial"
          className={cn(
            'flex items-center justify-center gap-2 rounded-[12px] px-5 py-3 text-[16px] font-semibold transition-colors',
            blocked
              ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
              : 'bg-[#1E9A80] text-white shadow-[0_4px_16px_rgba(30,154,128,0.35)] hover:bg-[#1E9A80]/90'
          )}
        >
          <Phone className="w-5 h-5" /> Dial
        </button>
        <button
          onClick={() => onSkip(lead.id)}
          data-testid="next-lead-skip"
          className="flex items-center justify-center gap-2 rounded-[12px] px-4 py-3 text-[14px] font-medium border border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE]"
        >
          Skip <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {disabledReason && (
        <div
          data-testid="next-lead-blocked-reason"
          className="mt-3 text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-3 py-2"
        >
          {disabledReason}
        </div>
      )}
    </div>
  );
}
