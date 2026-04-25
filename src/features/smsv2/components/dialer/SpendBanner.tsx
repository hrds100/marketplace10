import { useSpendLimit } from '../../hooks/useSpendLimit';
import { formatPence } from '../../data/helpers';
import { cn } from '@/lib/utils';

export default function SpendBanner() {
  const s = useSpendLimit();
  const tone =
    s.percentUsed > 90 ? 'red' : s.percentUsed > 70 ? 'amber' : 'green';
  const colour =
    tone === 'red' ? '#EF4444' : tone === 'amber' ? '#F59E0B' : '#1E9A80';

  return (
    <div
      className={cn(
        'rounded-2xl p-4 border bg-white flex items-center gap-4',
        s.isLimitReached && 'border-[#EF4444] bg-[#FEF2F2]'
      )}
      style={{ borderColor: s.isLimitReached ? '#EF4444' : '#E5E7EB' }}
    >
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          Spend today
        </div>
        <div className="text-[20px] font-bold text-[#1A1A1A] tabular-nums mt-0.5">
          {formatPence(s.spendPence)}
          <span className="text-[#9CA3AF] font-normal text-[14px]">
            {' / '}
            {s.isAdmin ? '∞ (admin)' : formatPence(s.limitPence)}
          </span>
        </div>
        <div className="mt-1.5 w-full h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${s.percentUsed}%`, background: colour }}
          />
        </div>
      </div>
      {s.isLimitReached && (
        <div className="text-[12px] text-[#B91C1C] font-medium">
          Daily limit reached. Ask admin to raise.
        </div>
      )}
    </div>
  );
}
