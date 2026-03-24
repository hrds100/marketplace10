import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NfsEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function NfsEmptyState({ icon: Icon, title, description, actionLabel, onAction }: NfsEmptyStateProps) {
  return (
    <div data-feature="BOOKING_NFSTAY__MAIN_SITE" className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
