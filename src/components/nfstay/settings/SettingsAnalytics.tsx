import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { NfsOperator } from '@/lib/nfstay/types';
import { useNfsOperatorUpdate } from '@/hooks/nfstay/use-nfs-operator-update';

interface Props {
  operator: NfsOperator;
  onGatedAction?: (action: () => void) => void;
}

export default function SettingsAnalytics({ operator, onGatedAction }: Props) {
  const { update, saving, error, success, clearStatus } = useNfsOperatorUpdate();

  const [gaId, setGaId] = useState(operator.google_analytics_id ?? '');
  const [pixelId, setPixelId] = useState(operator.meta_pixel_id ?? '');
  const [metaTitle, setMetaTitle] = useState(operator.meta_title ?? '');
  const [metaDescription, setMetaDescription] = useState(operator.meta_description ?? '');

  useEffect(() => {
    setGaId(operator.google_analytics_id ?? '');
    setPixelId(operator.meta_pixel_id ?? '');
    setMetaTitle(operator.meta_title ?? '');
    setMetaDescription(operator.meta_description ?? '');
  }, [operator]);

  const doSave = async () => {
    clearStatus();
    await update({
      google_analytics_id: gaId || null,
      meta_pixel_id: pixelId || null,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onGatedAction) {
      onGatedAction(doSave);
    } else {
      doSave();
    }
  };

  return (
    <form data-feature="BOOKING_NFSTAY__SETTINGS" onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold">Analytics & SEO</h3>
        <p className="text-sm text-muted-foreground">Tracking codes and SEO metadata for your booking site.</p>
      </div>

      {error && <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">Saved successfully.</div>}

      <div className="space-y-2">
        <Label htmlFor="sa-gaId">Google Analytics ID</Label>
        <Input data-feature="BOOKING_NFSTAY__ANALYTICS_GA" id="sa-gaId" value={gaId} onChange={e => setGaId(e.target.value)} placeholder="G-XXXXXXXXXX" disabled={saving} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sa-pixelId">Meta Pixel ID</Label>
        <Input data-feature="BOOKING_NFSTAY__ANALYTICS_META" id="sa-pixelId" value={pixelId} onChange={e => setPixelId(e.target.value)} placeholder="123456789012345" disabled={saving} />
      </div>

      <hr className="border-border/30" />

      <div className="space-y-2">
        <Label htmlFor="sa-metaTitle">SEO title</Label>
        <Input data-feature="BOOKING_NFSTAY__ANALYTICS_SEO" id="sa-metaTitle" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Your Brand — Holiday Rentals" disabled={saving} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sa-metaDesc">SEO description</Label>
        <Textarea data-feature="BOOKING_NFSTAY__ANALYTICS_SEO" id="sa-metaDesc" value={metaDescription} onChange={e => setMetaDescription(e.target.value)} placeholder="Book luxury holiday rentals directly..." rows={3} disabled={saving} />
      </div>

      <Button data-feature="BOOKING_NFSTAY__ANALYTICS_SAVE" type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </form>
  );
}
