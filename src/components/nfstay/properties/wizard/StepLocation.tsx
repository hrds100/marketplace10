import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NfsProperty } from '@/lib/nfstay/types';

interface Props {
  property: NfsProperty;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function StepLocation({ property, onSave, saving }: Props) {
  const [address, setAddress] = useState(property.address ?? '');
  const [city, setCity] = useState(property.city ?? '');
  const [state, setState] = useState(property.state ?? '');
  const [country, setCountry] = useState(property.country ?? '');
  const [postalCode, setPostalCode] = useState(property.postal_code ?? '');
  const [lat, setLat] = useState<number | ''>(property.lat ?? '');
  const [lng, setLng] = useState<number | ''>(property.lng ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      address: address || null,
      city: city || null,
      state: state || null,
      country: country || null,
      postal_code: postalCode || null,
      lat: lat === '' ? null : Number(lat),
      lng: lng === '' ? null : Number(lng),
    });
  };

  return (
    <form id="property-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Location</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Where is your property located?
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Start typing an address..."
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">
          Google Places autocomplete will enhance this in a future update.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State / Region</Label>
          <Input
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal code</Label>
          <Input
            id="postalCode"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lat">Latitude</Label>
          <Input
            id="lat"
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value === '' ? '' : Number(e.target.value))}
            disabled={saving}
            readOnly
            className="bg-muted"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lng">Longitude</Label>
          <Input
            id="lng"
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value === '' ? '' : Number(e.target.value))}
            disabled={saving}
            readOnly
            className="bg-muted"
          />
        </div>
      </div>
    </form>
  );
}
