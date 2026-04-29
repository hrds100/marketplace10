// crm-v2 HeroCard — next lead + Dial CTA + universal control bar.

import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import SessionControlBar from '../SessionControlBar';
import type { QueueLead } from '../../hooks/useDialerQueue';

export interface HeroCardProps {
  next: QueueLead | null;
  second: QueueLead | null;
  loading: boolean;
  /** Disabled hover label when dialing is gated (spend/admin pause). */
  disabledReason?: string | null;
  onDial: (contactId: string) => void;
}

export default function HeroCard({
  next,
  second,
  loading,
  disabledReason,
  onDial,
}: HeroCardProps) {
  const blocked = !!disabledReason;
  const headLeadId = next?.contactId ?? null;
  const secondLeadId = second?.contactId ?? null;

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
          <div className="flex justify-center">
            <SessionControlBar
              size="md"
              headLeadId={null}
              secondLeadId={null}
              onDial={onDial}
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mt-6 items-center">
            <button
              onClick={() => onDial(next.contactId)}
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
              onDial={onDial}
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
