import { cn } from '@/lib/utils';
import type { SmsLabel } from '../../types';

interface LabelBadgeProps {
  label: SmsLabel;
  className?: string;
}

export default function LabelBadge({ label, className }: LabelBadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full text-xs font-medium px-2 py-0.5', className)}
      style={{
        backgroundColor: `${label.colour}1A`,
        color: label.colour,
      }}
    >
      {label.name}
    </span>
  );
}
