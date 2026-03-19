import type { NfsOperator } from '@/lib/nfstay/types';

interface Props {
  operator: NfsOperator;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function StepPaymentMethods({ operator, onSave, saving }: Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No fields to save — Stripe Connect is Phase 4.
    // Mark step as visited so onboarding can complete.
    onSave({});
  };

  return (
    <form id="onboarding-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Payment methods</h2>
        <p className="text-sm text-muted-foreground mt-1">Connect Stripe to accept payments from guests.</p>
      </div>
      <div className="rounded-xl border border-border/40 bg-white dark:bg-card p-6 text-center space-y-3">
        <div className="text-4xl">💳</div>
        <p className="font-medium text-sm">Stripe Connect</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Stripe Connect integration is coming soon. You can skip this step and connect Stripe later from Settings.
        </p>
      </div>
    </form>
  );
}
