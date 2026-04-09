import { CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScraperActivity } from '../types';

interface ActivityFeedProps {
  activities: ScraperActivity[];
  loading: boolean;
}

function getActionIcon(action: string) {
  if (action.includes('approve') || action.includes('complete') || action.includes('submit')) {
    return <CheckCircle className="w-4 h-4 text-[#1E9A80]" />;
  }
  if (action.includes('reject') || action.includes('error') || action.includes('fail')) {
    return <XCircle className="w-4 h-4 text-red-500" />;
  }
  if (action.includes('warn') || action.includes('pause')) {
    return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  }
  return <Activity className="w-4 h-4 text-[#6B7280]" />;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="w-4 h-4 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-2.5 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-[13px] text-[#9CA3AF] text-center py-6">No recent activity</p>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-[#F3F3EE] transition-colors"
        >
          <div className="mt-0.5 flex-shrink-0">
            {getActionIcon(activity.action)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-[#1A1A1A] truncate">
              {activity.details ?? activity.action}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {activity.group_name && (
                <span className="text-[11px] text-[#6B7280]">{activity.group_name}</span>
              )}
              <span className="text-[11px] text-[#9CA3AF]">{relativeTime(activity.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
