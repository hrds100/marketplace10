import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

const CURRENCIES = ['USD', 'EUR', 'GBP'];

export default function StepPricing({ property, onSave, saving }: Props) {
  const [currency, setCurrency] = useState(property.base_rate_currency ?? 'GBP');
  const [baseRate, setBaseRate] = useState<number | ''>(property.base_rate_amount ?? '');

  const [cleaningEnabled, setCleaningEnabled] = useState(property.cleaning_fee?.enabled ?? false);
  const [cleaningAmount, setCleaningAmount] = useState<number | ''>(
    property.cleaning_fee?.amount ?? '',
  );

  const [extraGuestEnabled, setExtraGuestEnabled] = useState(
    property.extra_guest_fee?.enabled ?? false,
  );
  const [extraGuestAmount, setExtraGuestAmount] = useState<number | ''>(
    property.extra_guest_fee?.amount ?? '',
  );
  const [afterGuests, setAfterGuests] = useState<number | ''>(
    property.extra_guest_fee?.after_guests ?? '',
  );

  const [weeklyEnabled, setWeeklyEnabled] = useState(property.weekly_discount?.enabled ?? false);
  const [weeklyPct, setWeeklyPct] = useState<number | ''>(
    property.weekly_discount?.percentage ?? '',
  );

  const [monthlyEnabled, setMonthlyEnabled] = useState(
    property.monthly_discount?.enabled ?? false,
  );
  const [monthlyPct, setMonthlyPct] = useState<number | ''>(
    property.monthly_discount?.percentage ?? '',
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      base_rate_currency: currency,
      base_rate_amount: baseRate === '' ? 0 : Number(baseRate),
      cleaning_fee: {
        enabled: cleaningEnabled,
        ...(cleaningEnabled && cleaningAmount !== '' ? { amount: Number(cleaningAmount) } : {}),
      },
      extra_guest_fee: {
        enabled: extraGuestEnabled,
        ...(extraGuestEnabled && extraGuestAmount !== '' ? { amount: Number(extraGuestAmount) } : {}),
        ...(extraGuestEnabled && afterGuests !== '' ? { after_guests: Number(afterGuests) } : {}),
      },
      weekly_discount: {
        enabled: weeklyEnabled,
        ...(weeklyEnabled && weeklyPct !== '' ? { percentage: Number(weeklyPct) } : {}),
      },
      monthly_discount: {
        enabled: monthlyEnabled,
        ...(monthlyEnabled && monthlyPct !== '' ? { percentage: Number(monthlyPct) } : {}),
      },
    });
  };

  return (
    <form data-feature="BOOKING_NFSTAY__PROPERTY_WIZARD" id="property-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Pricing</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set your nightly rate, fees, and discounts.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={currency} onValueChange={setCurrency} disabled={saving}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="baseRate">Nightly rate</Label>
          <Input
            id="baseRate"
            type="number"
            min={0}
            step="0.01"
            value={baseRate}
            onChange={(e) => setBaseRate(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0.00"
            disabled={saving}
          />
        </div>
      </div>

      {/* Cleaning fee */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label>Cleaning fee</Label>
          <Switch
            checked={cleaningEnabled}
            onCheckedChange={setCleaningEnabled}
            disabled={saving}
          />
        </div>
        {cleaningEnabled && (
          <Input
            type="number"
            min={0}
            step="0.01"
            value={cleaningAmount}
            onChange={(e) => setCleaningAmount(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Amount"
            disabled={saving}
          />
        )}
      </div>

      {/* Extra guest fee */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label>Extra guest fee</Label>
          <Switch
            checked={extraGuestEnabled}
            onCheckedChange={setExtraGuestEnabled}
            disabled={saving}
          />
        </div>
        {extraGuestEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="extraGuestAmount">Fee per guest</Label>
              <Input
                id="extraGuestAmount"
                type="number"
                min={0}
                step="0.01"
                value={extraGuestAmount}
                onChange={(e) =>
                  setExtraGuestAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="Amount"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="afterGuests">After # guests</Label>
              <Input
                id="afterGuests"
                type="number"
                min={1}
                value={afterGuests}
                onChange={(e) =>
                  setAfterGuests(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="e.g. 2"
                disabled={saving}
              />
            </div>
          </div>
        )}
      </div>

      {/* Weekly discount */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label>Weekly discount</Label>
          <Switch
            checked={weeklyEnabled}
            onCheckedChange={setWeeklyEnabled}
            disabled={saving}
          />
        </div>
        {weeklyEnabled && (
          <div className="space-y-2">
            <Label htmlFor="weeklyPct">Discount (%)</Label>
            <Input
              id="weeklyPct"
              type="number"
              min={0}
              max={100}
              value={weeklyPct}
              onChange={(e) => setWeeklyPct(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 10"
              disabled={saving}
            />
          </div>
        )}
      </div>

      {/* Monthly discount */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label>Monthly discount</Label>
          <Switch
            checked={monthlyEnabled}
            onCheckedChange={setMonthlyEnabled}
            disabled={saving}
          />
        </div>
        {monthlyEnabled && (
          <div className="space-y-2">
            <Label htmlFor="monthlyPct">Discount (%)</Label>
            <Input
              id="monthlyPct"
              type="number"
              min={0}
              max={100}
              value={monthlyPct}
              onChange={(e) => setMonthlyPct(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 20"
              disabled={saving}
            />
          </div>
        )}
      </div>
    </form>
  );
}
