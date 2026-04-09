import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
  className?: string;
}

export default function StatCard({ icon: Icon, label, value, trend, className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-[#E5E7EB] p-5', className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[rgba(30,154,128,0.08)] flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-[#1E9A80]" />
        </div>
        <span className="text-[13px] font-medium text-[#6B7280]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[#1A1A1A]">{value}</div>
      {trend && (
        <div className={cn(
          'text-[12px] font-medium mt-1',
          trend.direction === 'up' && 'text-[#1E9A80]',
          trend.direction === 'down' && 'text-red-500',
          trend.direction === 'flat' && 'text-[#9CA3AF]',
        )}>
          {trend.direction === 'up' && '+'}{trend.label}
        </div>
      )}
    </div>
  );
}
