import { Building2 } from 'lucide-react';

export default function NfsProperties() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your vacation rental listings.</p>
      </div>
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/60 rounded-xl bg-muted/20">
        <Building2 className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Property management coming in Phase 2.</p>
      </div>
    </div>
  );
}
