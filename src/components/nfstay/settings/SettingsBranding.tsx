import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { NfsOperator } from '@/lib/nfstay/types';
import { useNfsOperatorUpdate } from '@/hooks/nfstay/use-nfs-operator-update';

interface Props {
  operator: NfsOperator;
}

const COLOR_PRESETS = [
  '#2563eb', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0891b2', '#4f46e5', '#be185d',
];

export default function SettingsBranding({ operator }: Props) {
  const { update, saving, error, success, clearStatus } = useNfsOperatorUpdate();

  const [accentColor, setAccentColor] = useState(operator.accent_color ?? '#2563eb');
  const [logoUrl, setLogoUrl] = useState(operator.logo_url ?? '');
  const [faviconUrl, setFaviconUrl] = useState(operator.favicon_url ?? '');
  const [heroHeadline, setHeroHeadline] = useState(operator.hero_headline ?? '');
  const [heroSubheadline, setHeroSubheadline] = useState(operator.hero_subheadline ?? '');
  const [aboutBio, setAboutBio] = useState(operator.about_bio ?? '');

  useEffect(() => {
    setAccentColor(operator.accent_color ?? '#2563eb');
    setLogoUrl(operator.logo_url ?? '');
    setFaviconUrl(operator.favicon_url ?? '');
    setHeroHeadline(operator.hero_headline ?? '');
    setHeroSubheadline(operator.hero_subheadline ?? '');
    setAboutBio(operator.about_bio ?? '');
  }, [operator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearStatus();
    await update({
      accent_color: accentColor || null,
      logo_url: logoUrl || null,
      favicon_url: faviconUrl || null,
      hero_headline: heroHeadline || null,
      hero_subheadline: heroSubheadline || null,
      about_bio: aboutBio || null,
    });
  };

  return (
    <form data-feature="BOOKING_NFSTAY__SETTINGS" onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold">Branding</h3>
        <p className="text-sm text-muted-foreground">Customize your brand appearance and landing page content.</p>
      </div>

      {error && <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">Saved successfully.</div>}

      <div className="space-y-2">
        <Label>Accent color</Label>
        <div data-feature="BOOKING_NFSTAY__BRAND_COLORS" className="flex items-center gap-2 flex-wrap">
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
          <Input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-8 h-8 p-0 border-0 cursor-pointer" disabled={saving} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sb-logoUrl">Logo URL</Label>
        <Input data-feature="BOOKING_NFSTAY__BRAND_LOGO" id="sb-logoUrl" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" disabled={saving} />
        <p className="text-xs text-muted-foreground">Image upload coming soon.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sb-faviconUrl">Favicon URL</Label>
        <Input id="sb-faviconUrl" value={faviconUrl} onChange={e => setFaviconUrl(e.target.value)} placeholder="https://example.com/favicon.ico" disabled={saving} />
      </div>

      <hr className="border-border/30" />

      <div className="space-y-2">
        <Label htmlFor="sb-headline">Hero headline</Label>
        <Input data-feature="BOOKING_NFSTAY__BRAND_HEADLINE" id="sb-headline" value={heroHeadline} onChange={e => setHeroHeadline(e.target.value)} placeholder="Your perfect stay awaits" disabled={saving} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sb-subheadline">Hero subheadline</Label>
        <Input id="sb-subheadline" value={heroSubheadline} onChange={e => setHeroSubheadline(e.target.value)} placeholder="Luxury holiday rentals in..." disabled={saving} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sb-aboutBio">About / bio</Label>
        <Textarea id="sb-aboutBio" value={aboutBio} onChange={e => setAboutBio(e.target.value)} placeholder="Tell guests about your properties..." rows={4} disabled={saving} />
      </div>

      <Button data-feature="BOOKING_NFSTAY__BRAND_SAVE" type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </form>
  );
}
