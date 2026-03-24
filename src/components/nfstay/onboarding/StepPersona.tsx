import { useState } from 'react';
import type { NfsOperator } from '@/lib/nfstay/types';

interface Props {
  operator: NfsOperator;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

const OPTIONS = [
  { value: 'owner', label: 'Property Owner', desc: 'I own the properties I rent out' },
  { value: 'property_manager', label: 'Property Manager', desc: 'I manage properties on behalf of owners' },
] as const;

export default function StepPersona({ operator, onSave, saving }: Props) {
  const [selected, setSelected] = useState<string>(operator.persona_type ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    onSave({ persona_type: selected });
  };

  return (
    <form data-feature="BOOKING_NFSTAY__ONBOARDING" id="onboarding-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">What describes you best?</h2>
        <p className="text-sm text-muted-foreground mt-1">This helps us tailor your experience.</p>
      </div>
      <div className="grid gap-3">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            data-feature="BOOKING_NFSTAY__ONBOARDING_OPTION"
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
