import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Minus, Plus } from 'lucide-react';
import type { NfsProperty } from '@/lib/nfstay/types';

interface Props {
  property: NfsProperty;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

interface RoomCount {
  type: string;
  count: number;
}

function parseRoomCounts(raw: unknown[]): Record<string, number> {
  const defaults: Record<string, number> = { bedroom: 0, bathroom: 0, bed: 0 };
  if (!Array.isArray(raw)) return defaults;
  for (const item of raw) {
    const rc = item as RoomCount;
    if (rc && typeof rc.type === 'string' && typeof rc.count === 'number') {
      defaults[rc.type] = rc.count;
    }
  }
  return defaults;
}

function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 50,
  disabled,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center font-medium">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function StepGuestsAndRooms({ property, onSave, saving }: Props) {
  const [maxGuests, setMaxGuests] = useState(property.max_guests ?? 1);
  const [allowChildren, setAllowChildren] = useState(property.allow_children);
  const parsed = parseRoomCounts(property.room_counts);
  const [bedrooms, setBedrooms] = useState(parsed.bedroom);
  const [bathrooms, setBathrooms] = useState(parsed.bathroom);
  const [beds, setBeds] = useState(parsed.bed);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      max_guests: maxGuests,
      allow_children: allowChildren,
      room_counts: [
        { type: 'bedroom', count: bedrooms },
        { type: 'bathroom', count: bathrooms },
        { type: 'bed', count: beds },
      ],
    });
  };

  return (
    <form id="property-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Guests &amp; rooms</h2>
        <p className="text-sm text-muted-foreground mt-1">
          How many guests can you accommodate?
        </p>
      </div>

      <NumberStepper
        label="Max guests"
        value={maxGuests}
        onChange={setMaxGuests}
        min={1}
        disabled={saving}
      />

      <div className="flex items-center justify-between">
        <Label htmlFor="allowChildren">Allow children</Label>
        <Switch
          id="allowChildren"
          checked={allowChildren}
          onCheckedChange={setAllowChildren}
          disabled={saving}
        />
      </div>

      <div className="border-t pt-4 space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Room counts</h3>
        <NumberStepper label="Bedrooms" value={bedrooms} onChange={setBedrooms} disabled={saving} />
        <NumberStepper label="Bathrooms" value={bathrooms} onChange={setBathrooms} disabled={saving} />
        <NumberStepper label="Beds" value={beds} onChange={setBeds} disabled={saving} />
      </div>
    </form>
  );
}
