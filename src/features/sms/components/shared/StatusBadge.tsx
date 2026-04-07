import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_COLOURS: Record<string, string> = {
  delivered: '#1E9A80',
  complete: '#1E9A80',
  active: '#1E9A80',
  received: '#1E9A80',
  sent: '#9CA3AF',
  sending: '#9CA3AF',
  scheduled: '#9CA3AF',
  queued: '#9CA3AF',
  failed: '#EF4444',
  cancelled: '#EF4444',
  undelivered: '#F59E0B',
  skipped_opt_out: '#F59E0B',
  draft: '#6B7280',
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const colour = STATUS_COLOURS[status] ?? '#9CA3AF';

  return (
    <span
      className={cn('inline-flex items-center rounded-full text-xs font-medium px-2 py-0.5', className)}
      style={{
        backgroundColor: `${colour}1A`,
        color: colour,
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
