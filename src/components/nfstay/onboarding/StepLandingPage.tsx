import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { NfsOperator } from '@/lib/nfstay/types';

interface Props {
  operator: NfsOperator;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function StepLandingPage({ operator, onSave, saving }: Props) {
  const op = operator as any; // access landing page fields not in minimal type
  const [headline, setHeadline] = useState<string>(op.hero_headline ?? '');
  const [subheadline, setSubheadline] = useState<string>(op.hero_subheadline ?? '');
  const [aboutBio, setAboutBio] = useState<string>(op.about_bio ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      hero_headline: headline || null,
      hero_subheadline: subheadline || null,
      about_bio: aboutBio || null,
    });
  };

  return (
    <form id="onboarding-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Landing page content</h2>
        <p className="text-sm text-muted-foreground mt-1">This appears on your public booking site. You can refine it later.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="headline">Hero headline</Label>
          <Input id="headline" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Your perfect stay awaits" disabled={saving} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subheadline">Subheadline</Label>
          <Input id="subheadline" value={subheadline} onChange={e => setSubheadline(e.target.value)} placeholder="Luxury holiday rentals in the heart of..." disabled={saving} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="aboutBio">About you / your business</Label>
          <Textarea id="aboutBio" value={aboutBio} onChange={e => setAboutBio(e.target.value)} placeholder="Tell guests about your properties and hosting philosophy..." rows={4} disabled={saving} />
        </div>
      </div>
    </form>
  );
}
