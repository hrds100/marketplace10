import { Phone, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_DIALER_LEGS } from '../../data/mockDialer';

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  ringing: { bg: '#FEF3C7', text: '#B45309', label: '🔔 Ringing' },
  dialing: { bg: '#DBEAFE', text: '#1D4ED8', label: '📞 Dialing' },
  connecting: { bg: '#ECFDF5', text: '#1E9A80', label: '📞 Connect…' },
  connected: { bg: '#D1FAE5', text: '#065F46', label: '🟢 Connected' },
  voicemail: { bg: '#F3F3EE', text: '#6B7280', label: '📭 Voicemail' },
  no_answer: { bg: '#FEE2E2', text: '#B91C1C', label: '🔴 No answer' },
};

interface Props {
  active: boolean;
}

export default function ParallelDialerBoard({ active }: Props) {
  return (
    <div className="border border-[#E5E7EB] rounded-2xl bg-[#F3F3EE]/40 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#E5E7EB] bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhoneCall
            className={cn(
              'w-4 h-4',
              active ? 'text-[#1E9A80]' : 'text-[#9CA3AF]'
            )}
          />
          <span className="text-[12px] font-semibold text-[#1A1A1A]">
            Dialing now
          </span>
          {active && <span className="w-1.5 h-1.5 rounded-full bg-[#1E9A80] animate-pulse" />}
        </div>
        <span className="text-[11px] text-[#6B7280]">3 lines · first answer wins</span>
      </div>

      <div className="p-3 space-y-2">
        {MOCK_DIALER_LEGS.map((leg) => {
          const badge = STATUS_BADGE[leg.status];
          return (
            <div
              key={leg.id}
              className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2.5 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-[#F3F3EE] flex items-center justify-center text-[12px] font-bold text-[#6B7280] flex-shrink-0">
                L{leg.line}
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
              <span className="text-[11px] text-[#9CA3AF] tabular-nums">
                {Math.floor((Date.now() - leg.startedAt) / 1000)}s
              </span>
              <button className="p-1 text-[#EF4444] hover:bg-[#FEF2F2] rounded">
                <Phone className="w-3.5 h-3.5 rotate-[135deg]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
