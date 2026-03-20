import { cn } from "@/lib/utils";

interface NfsStatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-[hsl(46_100%_97%)] text-[hsl(28_73%_26%)]',
  unlisted: 'bg-[hsl(46_100%_97%)] text-[hsl(28_73%_26%)]',
  confirmed: 'bg-accent-light text-accent-foreground',
  listed: 'bg-accent-light text-accent-foreground',
  paid: 'bg-accent-light text-accent-foreground',
  approved: 'bg-accent-light text-accent-foreground',
  active: 'bg-accent-light text-accent-foreground',
  cancelled: 'bg-[hsl(0_86%_97%)] text-[hsl(0_72%_51%)]',
  archived: 'bg-[hsl(0_86%_97%)] text-[hsl(0_72%_51%)]',
  failed: 'bg-[hsl(0_86%_97%)] text-[hsl(0_72%_51%)]',
  refunded: 'bg-[hsl(0_86%_97%)] text-[hsl(0_72%_51%)]',
  rejected: 'bg-[hsl(0_86%_97%)] text-[hsl(0_72%_51%)]',
  suspended: 'bg-[hsl(0_86%_97%)] text-[hsl(0_72%_51%)]',
  completed: 'bg-foreground text-background',
  no_show: 'bg-muted text-muted-foreground',
  expired: 'bg-muted text-muted-foreground',
  draft: 'bg-muted text-muted-foreground',
  traveler: 'bg-muted text-muted-foreground',
  operator: 'bg-accent-light text-accent-foreground',
  admin: 'bg-foreground text-background',
};

export function NfsStatusBadge({ status, className }: NfsStatusBadgeProps) {
  const style = statusStyles[status] || statusStyles.draft;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', style, className)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
