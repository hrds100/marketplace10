import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NfsProperty } from '@/lib/nfstay/types';
import { NFS_CANCELLATION_POLICIES } from '@/lib/nfstay/constants';

interface Props {
  property: NfsProperty;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return `${h}:00`;
});

export default function StepHouseRules({ property, onSave, saving }: Props) {
  const [checkInTime, setCheckInTime] = useState(property.check_in_time ?? '');
  const [checkOutTime, setCheckOutTime] = useState(property.check_out_time ?? '');
  const [maxPets, setMaxPets] = useState<number | ''>(property.max_pets ?? 0);
  const [rules, setRules] = useState(property.rules ?? '');
  const [cancellationPolicy, setCancellationPolicy] = useState(property.cancellation_policy ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      check_in_time: checkInTime || null,
      check_out_time: checkOutTime || null,
      max_pets: maxPets === '' ? 0 : Number(maxPets),
      rules: rules || null,
      cancellation_policy: cancellationPolicy || null,
    });
  };

  return (
    <form data-feature="BOOKING_NFSTAY__PROPERTY_WIZARD" id="property-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">House rules</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set check-in/out times and rules for your guests.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="checkInTime">Check-in time</Label>
          <Select value={checkInTime} onValueChange={setCheckInTime} disabled={saving}>
            <SelectTrigger data-feature="BOOKING_NFSTAY__WIZARD_SELECT" id="checkInTime">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="checkOutTime">Check-out time</Label>
          <Select value={checkOutTime} onValueChange={setCheckOutTime} disabled={saving}>
            <SelectTrigger data-feature="BOOKING_NFSTAY__WIZARD_SELECT" id="checkOutTime">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxPets">Max pets allowed</Label>
        <Input
          data-feature="BOOKING_NFSTAY__WIZARD_INPUT"
          id="maxPets"
          type="number"
          min={0}
          value={maxPets}
          onChange={(e) => setMaxPets(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">Set to 0 if pets are not allowed.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rules">Custom rules</Label>
        <Textarea
          data-feature="BOOKING_NFSTAY__WIZARD_INPUT"
          id="rules"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          rows={4}
          placeholder="Any additional rules guests should know about..."
          disabled={saving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cancellationPolicy">Cancellation policy</Label>
        <Select value={cancellationPolicy} onValueChange={setCancellationPolicy} disabled={saving}>
          <SelectTrigger data-feature="BOOKING_NFSTAY__WIZARD_SELECT" id="cancellationPolicy">
            <SelectValue placeholder="Select policy" />
          </SelectTrigger>
          <SelectContent>
            {NFS_CANCELLATION_POLICIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </form>
  );
}
