import { cn } from '@/lib/utils';
import type { ScraperGroup } from '../types';

interface GroupRowProps {
  group: ScraperGroup;
  onToggle: (id: string, isActive: boolean) => void;
  onScan: (groupName: string) => void;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function GroupRow({ group, onToggle, onScan }: GroupRowProps) {
  return (
    <tr className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F3F3EE] transition-colors">
      <td className="py-3 px-4">
        <span className="text-[14px] font-medium text-[#1A1A1A]">{group.group_name}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-[13px] text-[#6B7280]">{group.member_count.toLocaleString()}</span>
      </td>
      <td className="py-3 px-4">
        <button
          onClick={() => onToggle(group.id, !group.is_active)}
          className={cn(
            'relative w-10 h-5 rounded-full transition-colors',
            group.is_active ? 'bg-[#1E9A80]' : 'bg-[#E5E7EB]',
          )}
          role="switch"
          aria-checked={group.is_active}
          aria-label={`Toggle ${group.group_name}`}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
              group.is_active && 'translate-x-5',
            )}
          />
        </button>
      </td>
      <td className="py-3 px-4">
        <span className="text-[13px] text-[#6B7280]">{group.deals_found}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-[13px] text-[#9CA3AF]">{relativeTime(group.last_scanned_at)}</span>
      </td>
      <td className="py-3 px-4">
        <button
          onClick={() => onScan(group.group_name)}
          className="h-7 px-3 rounded-lg bg-[#1E9A80] text-white text-[11px] font-medium hover:bg-[#178a72] transition-colors"
        >
          Scan
        </button>
      </td>
    </tr>
  );
}
