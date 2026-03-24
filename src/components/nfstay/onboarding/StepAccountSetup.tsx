import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NfsOperator } from '@/lib/nfstay/types';

interface Props {
  operator: NfsOperator;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function StepAccountSetup({ operator, onSave, saving }: Props) {
  const [firstName, setFirstName] = useState(operator.first_name ?? '');
  const [lastName, setLastName] = useState(operator.last_name ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ first_name: firstName || null, last_name: lastName || null });
  };

  return (
    <form data-feature="BOOKING_NFSTAY__ONBOARDING" id="onboarding-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Account setup</h2>
        <p className="text-sm text-muted-foreground mt-1">Confirm your name to get started.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input data-feature="BOOKING_NFSTAY__ONBOARDING_INPUT" id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required disabled={saving} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input data-feature="BOOKING_NFSTAY__ONBOARDING_INPUT" id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required disabled={saving} />
        </div>
      </div>
    </form>
  );
}
