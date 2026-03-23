import { useState } from 'react';
import type { NfsOperator } from '@/lib/nfstay/types';

interface Props {
  operator: NfsOperator;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

const OPTIONS = [
  { value: 'direct_booking', label: 'Direct Booking Website', desc: 'Accept bookings directly from guests' },
  { value: 'vacation_rental', label: 'Vacation Rental Management', desc: 'Manage listings across platforms' },
  { value: 'booking_widget', label: 'Booking Widget', desc: 'Embed a booking widget on my existing site' },
  { value: 'undecided', label: 'Not sure yet', desc: 'I want to explore my options' },
] as const;

export default function StepUsageIntent({ operator, onSave, saving }: Props) {
  const [selected, setSelected] = useState<string>(operator.usage_intent ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    onSave({ usage_intent: selected });
  };

  return (
    <form id="onboarding-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">How do you plan to use nfstay?</h2>
        <p className="text-sm text-muted-foreground mt-1">You can change this later.</p>
      </div>
      <div className="grid gap-3">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            disabled={saving}
            onClick={() => setSelected(opt.value)}
            className={`text-left p-4 rounded-xl border transition-all ${
              selected === opt.value
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border/40 bg-white dark:bg-card hover:border-primary/30'
            }`}
          >
            <p className="font-medium text-sm">{opt.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>
    </form>
  );
}
