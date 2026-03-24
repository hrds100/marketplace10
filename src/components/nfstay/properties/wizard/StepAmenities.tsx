import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { NfsProperty } from '@/lib/nfstay/types';
import { NFS_AMENITY_CATEGORIES } from '@/lib/nfstay/constants';

interface Props {
  property: NfsProperty;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  essentials: 'Essentials',
  safety: 'Safety',
  outdoor: 'Outdoor',
  entertainment: 'Entertainment',
  other: 'Other',
};

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StepAmenities({ property, onSave, saving }: Props) {
  const [amenities, setAmenities] = useState<Record<string, boolean>>(
    property.amenities ?? {},
  );

  const toggle = (key: string) => {
    setAmenities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ amenities });
  };

  return (
    <form data-feature="BOOKING_NFSTAY__PROPERTY_WIZARD" id="property-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Amenities</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select the amenities available at your property.
        </p>
      </div>

      {(Object.entries(NFS_AMENITY_CATEGORIES) as [string, readonly string[]][]).map(
        ([category, items]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-medium">{CATEGORY_LABELS[category] ?? category}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((amenity) => (
                <div key={amenity} className="flex items-center gap-2">
                  <Checkbox
                    data-feature="BOOKING_NFSTAY__WIZARD_TOGGLE"
                    id={`amenity-${amenity}`}
                    checked={!!amenities[amenity]}
                    onCheckedChange={() => toggle(amenity)}
                    disabled={saving}
                  />
                  <Label htmlFor={`amenity-${amenity}`} className="text-sm font-normal cursor-pointer">
                    {formatLabel(amenity)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ),
      )}
    </form>
  );
}
