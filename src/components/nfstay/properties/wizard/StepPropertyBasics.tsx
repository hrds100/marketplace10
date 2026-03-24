import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NfsProperty } from '@/lib/nfstay/types';
import { NFS_PROPERTY_TYPES, NFS_RENTAL_TYPES } from '@/lib/nfstay/constants';

interface Props {
  property: NfsProperty;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

const RENTAL_TYPE_LABELS: Record<string, string> = {
  entire_place: 'Entire place',
  private_room: 'Private room',
  shared_room: 'Shared room',
};

export default function StepPropertyBasics({ property, onSave, saving }: Props) {
  const [propertyType, setPropertyType] = useState(property.property_type ?? '');
  const [rentalType, setRentalType] = useState(property.rental_type ?? '');
  const [accommodationType, setAccommodationType] = useState(property.accommodation_type ?? '');
  const [sizeValue, setSizeValue] = useState<number | ''>(property.size_value ?? '');
  const [sizeUnit, setSizeUnit] = useState(property.size_unit ?? 'sqm');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      property_type: propertyType || null,
      rental_type: rentalType || null,
      accommodation_type: accommodationType || null,
      size_value: sizeValue === '' ? null : Number(sizeValue),
      size_unit: sizeUnit || null,
    });
  };

  return (
    <form data-feature="BOOKING_NFSTAY__PROPERTY_WIZARD" id="property-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Property basics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          What kind of property are you listing?
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="propertyType">Property type</Label>
        <Select value={propertyType} onValueChange={setPropertyType} disabled={saving}>
          <SelectTrigger id="propertyType">
            <SelectValue placeholder="Select property type" />
          </SelectTrigger>
          <SelectContent>
            {NFS_PROPERTY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Rental type</Label>
        <div className="flex gap-2">
          {NFS_RENTAL_TYPES.map((t) => (
            <Button
              key={t}
              type="button"
              variant={rentalType === t ? 'default' : 'outline'}
              onClick={() => setRentalType(t)}
              disabled={saving}
              className="flex-1"
            >
              {RENTAL_TYPE_LABELS[t] ?? t}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="accommodationType">Accommodation type</Label>
        <Input
          id="accommodationType"
          value={accommodationType}
          onChange={(e) => setAccommodationType(e.target.value)}
          placeholder="e.g. Serviced apartment, Holiday let"
          disabled={saving}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sizeValue">Size</Label>
          <Input
            id="sizeValue"
            type="number"
            min={0}
            value={sizeValue}
            onChange={(e) => setSizeValue(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="e.g. 85"
            disabled={saving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sizeUnit">Unit</Label>
          <Select value={sizeUnit} onValueChange={setSizeUnit} disabled={saving}>
            <SelectTrigger id="sizeUnit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sqm">sqm</SelectItem>
              <SelectItem value="sqft">sqft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </form>
  );
}
