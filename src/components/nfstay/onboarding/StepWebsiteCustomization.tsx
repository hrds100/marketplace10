import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NfsOperator } from '@/lib/nfstay/types';

interface Props {
  operator: NfsOperator;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

const COLOR_PRESETS = [
  '#2563eb', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0891b2', '#4f46e5', '#be185d',
];

export default function StepWebsiteCustomization({ operator, onSave, saving }: Props) {
  const [accentColor, setAccentColor] = useState(operator.accent_color ?? '#2563eb');
  const [logoUrl, setLogoUrl] = useState(operator.logo_url ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      accent_color: accentColor || null,
      logo_url: logoUrl || null,
    });
  };

  return (
    <form data-feature="BOOKING_NFSTAY__ONBOARDING" id="onboarding-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Website customization</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose your brand color and logo. You can update these anytime.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Accent color</Label>
          <div className="flex items-center gap-2 flex-wrap">
            {COLOR_PRESETS.map(color => (
              <button
                key={color}
                type="button"
                disabled={saving}
                onClick={() => setAccentColor(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  accentColor === color ? 'border-foreground scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <Input
              type="color"
              value={accentColor}
              onChange={e => setAccentColor(e.target.value)}
              className="w-8 h-8 p-0 border-0 cursor-pointer"
              disabled={saving}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="logoUrl">Logo URL (optional)</Label>
          <Input id="logoUrl" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" disabled={saving} />
          <p className="text-xs text-muted-foreground">Image upload coming soon. For now, paste a URL.</p>
        </div>
      </div>
    </form>
  );
}
