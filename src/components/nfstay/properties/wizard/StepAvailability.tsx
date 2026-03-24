import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NfsProperty } from '@/lib/nfstay/types';

interface Props {
  property: NfsProperty;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

const WINDOW_OPTIONS = [
  { value: '3_months', label: '3 months' },
  { value: '6_months', label: '6 months' },
  { value: '1_year', label: '1 year' },
  { value: '2_years', label: '2 years' },
];

export default function StepAvailability({ property, onSave, saving }: Props) {
  const [availabilityWindow, setAvailabilityWindow] = useState(
    property.availability_window ?? '6_months',
  );
  const [advanceNotice, setAdvanceNotice] = useState<number | ''>(property.advance_notice ?? 1);
  const [minimumStay, setMinimumStay] = useState<number | ''>(property.minimum_stay ?? 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      availability_window: availabilityWindow,
      advance_notice: advanceNotice === '' ? 1 : Number(advanceNotice),
      minimum_stay: minimumStay === '' ? 1 : Number(minimumStay),
    });
  };

  return (
    <form data-feature="BOOKING_NFSTAY__PROPERTY_WIZARD" id="property-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Availability</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure how far in advance guests can book.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="availabilityWindow">Availability window</Label>
        <Select value={availabilityWindow} onValueChange={setAvailabilityWindow} disabled={saving}>
          <SelectTrigger id="availabilityWindow">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOW_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="advanceNotice">Advance notice (days)</Label>
        <Input
          id="advanceNotice"
          type="number"
          min={0}
          value={advanceNotice}
          onChange={(e) => setAdvanceNotice(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">
          Minimum number of days before a guest can book.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="minimumStay">Minimum stay (nights)</Label>
        <Input
          id="minimumStay"
          type="number"
          min={1}
          value={minimumStay}
          onChange={(e) => setMinimumStay(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={saving}
        />
      </div>

      <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        Calendar management and date blocking coming in Phase 3.
      </div>
    </form>
  );
}
