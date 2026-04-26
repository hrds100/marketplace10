// ParallelDialerBoard — what's ringing right now.
//
// PR 24 (Hugo 2026-04-27): replaced the MOCK_DIALER_LEGS hardcoded
// fixture with live wk_calls data. Each leg is a Twilio call in
// queued / ringing / in_progress for the current agent. Once a call
// resolves (winner answers, others hang up via wk-dialer-answer), the
// row drops out of ACTIVE_STATUSES and disappears from the board.

import { useEffect, useState } from 'react';
import { Phone, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveDialerLegs, type DialerLegStatus } from '../../hooks/useActiveDialerLegs';

const STATUS_BADGE: Record<DialerLegStatus, { bg: string; text: string; label: string }> = {
  queued: { bg: '#DBEAFE', text: '#1D4ED8', label: '📞 Dialing' },
  ringing: { bg: '#FEF3C7', text: '#B45309', label: '🔔 Ringing' },
  in_progress: { bg: '#D1FAE5', text: '#065F46', label: '🟢 Connected' },
  // Anything below shouldn't normally render (the hook filters them
  // out) but we keep the styling so the board doesn't crash if it
  // does slip through.
  completed: { bg: '#F3F3EE', text: '#6B7280', label: '✓ Done' },
  busy: { bg: '#FEE2E2', text: '#B91C1C', label: '⛔ Busy' },
  no_answer: { bg: '#FEE2E2', text: '#B91C1C', label: '🔴 No answer' },
  failed: { bg: '#FEE2E2', text: '#B91C1C', label: '⚠ Failed' },
  canceled: { bg: '#F3F3EE', text: '#6B7280', label: '⊘ Cancelled' },
  missed: { bg: '#FEE2E2', text: '#B91C1C', label: '⚪ Missed' },
  voicemail: { bg: '#F3F3EE', text: '#6B7280', label: '📭 Voicemail' },
};

interface Props {
  active: boolean;
}

export default function ParallelDialerBoard({ active }: Props) {
  const { legs, loading } = useActiveDialerLegs();

  // 1s tick so the elapsed-seconds counter on each leg refreshes.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (legs.length === 0) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [legs.length]);

  return (
    <div className="border border-[#E5E7EB] rounded-2xl bg-[#F3F3EE]/40 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#E5E7EB] bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhoneCall
            className={cn(
              'w-4 h-4',
              active && legs.length > 0 ? 'text-[#1E9A80]' : 'text-[#9CA3AF]'
            )}
          />
          <span className="text-[12px] font-semibold text-[#1A1A1A]">
            Dialing now
          </span>
          {active && legs.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E9A80] animate-pulse" />
          )}
        </div>
        <span className="text-[11px] text-[#6B7280]">
          {legs.length === 0
            ? 'No active legs'
            : `${legs.length} ${legs.length === 1 ? 'line' : 'lines'} · first answer wins`}
        </span>
      </div>

      <div className="p-3 space-y-2">
        {loading && legs.length === 0 && (
          <div className="text-[11px] text-[#9CA3AF] italic px-2 py-3 text-center">
            Loading…
          </div>
        )}
        {!loading && legs.length === 0 && (
          <div className="text-[11px] text-[#9CA3AF] italic px-2 py-3 text-center">
            Press Start to fire the campaign — live legs will appear here as Twilio rings them.
          </div>
        )}
        {legs.map((leg, idx) => {
          const badge = STATUS_BADGE[leg.status] ?? STATUS_BADGE.queued;
          const elapsed = Math.max(0, Math.floor((Date.now() - leg.startedAt) / 1000));
          return (
            <div
              key={leg.id}
              className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2.5 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-[#F3F3EE] flex items-center justify-center text-[12px] font-bold text-[#6B7280] flex-shrink-0">
                L{idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#1A1A1A] truncate">
                  {leg.contactName}
                </div>
                <div className="text-[11px] text-[#6B7280] tabular-nums">{leg.phone}</div>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: badge.bg, color: badge.text }}
              >
                {badge.label}
              </span>
              <span className="text-[11px] text-[#9CA3AF] tabular-nums">{elapsed}s</span>
              <button
                title="Hang up this leg"
                disabled
                className="p-1 text-[#EF4444] opacity-50 cursor-not-allowed"
              >
                <Phone className="w-3.5 h-3.5 rotate-[135deg]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
