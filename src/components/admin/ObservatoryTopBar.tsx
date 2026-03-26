import { Telescope, Users, MessageSquare, Activity, Wifi } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ObsStats } from '@/hooks/useObservatory';

interface Props {
  stats: ObsStats;
  loading: boolean;
}

export default function ObservatoryTopBar({ stats, loading }: Props) {
  const items = [
    { label: 'Users', value: stats.totalUsers, icon: Users },
    { label: 'Threads', value: stats.totalThreads, icon: MessageSquare },
    { label: 'Active', value: stats.activeThreads, icon: Activity },
    { label: 'Online (24h)', value: stats.onlineRecent, icon: Wifi },
  ];

  return (
    <div className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-2xl px-5 py-3">
      <div className="flex items-center gap-2">
        <Telescope className="w-5 h-5 text-[#1E9A80]" />
        <span className="text-[15px] font-semibold text-[#1A1A1A]">Observatory</span>
      </div>
      <div className="flex items-center gap-5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <item.icon className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-[12px] text-[#6B7280]">{item.label}:</span>
            {loading ? (
              <Skeleton className="w-6 h-4" />
            ) : (
              <span className="text-[13px] font-semibold text-[#1A1A1A]">{item.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
