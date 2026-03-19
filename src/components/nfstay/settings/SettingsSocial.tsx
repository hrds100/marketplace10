import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { NfsOperator } from '@/lib/nfstay/types';
import { useNfsOperatorUpdate } from '@/hooks/nfstay/use-nfs-operator-update';

interface Props {
  operator: NfsOperator;
}

export default function SettingsSocial({ operator }: Props) {
  const { update, saving, error, success, clearStatus } = useNfsOperatorUpdate();

  const [googleBusiness, setGoogleBusiness] = useState(operator.google_business_url ?? '');
  const [airbnb, setAirbnb] = useState(operator.airbnb_url ?? '');
  const [twitter, setTwitter] = useState(operator.social_twitter ?? '');
  const [instagram, setInstagram] = useState(operator.social_instagram ?? '');
  const [facebook, setFacebook] = useState(operator.social_facebook ?? '');
  const [tiktok, setTiktok] = useState(operator.social_tiktok ?? '');
  const [youtube, setYoutube] = useState(operator.social_youtube ?? '');

  useEffect(() => {
    setGoogleBusiness(operator.google_business_url ?? '');
    setAirbnb(operator.airbnb_url ?? '');
    setTwitter(operator.social_twitter ?? '');
    setInstagram(operator.social_instagram ?? '');
    setFacebook(operator.social_facebook ?? '');
    setTiktok(operator.social_tiktok ?? '');
    setYoutube(operator.social_youtube ?? '');
  }, [operator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearStatus();
    await update({
      google_business_url: googleBusiness || null,
      airbnb_url: airbnb || null,
      social_twitter: twitter || null,
      social_instagram: instagram || null,
      social_facebook: facebook || null,
      social_tiktok: tiktok || null,
      social_youtube: youtube || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold">Social & external accounts</h3>
        <p className="text-sm text-muted-foreground">Links shown on your booking site and used for SEO.</p>
      </div>

      {error && <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">Saved successfully.</div>}

      <div className="space-y-2">
        <Label htmlFor="ss-google">Google Business URL</Label>
        <Input id="ss-google" value={googleBusiness} onChange={e => setGoogleBusiness(e.target.value)} placeholder="https://g.page/yourbusiness" disabled={saving} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ss-airbnb">Airbnb profile URL</Label>
        <Input id="ss-airbnb" value={airbnb} onChange={e => setAirbnb(e.target.value)} placeholder="https://airbnb.com/users/show/..." disabled={saving} />
      </div>

      <hr className="border-border/30" />

      <div className="space-y-2">
        <Label htmlFor="ss-instagram">Instagram</Label>
        <Input id="ss-instagram" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@yourbrand" disabled={saving} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ss-facebook">Facebook</Label>
        <Input id="ss-facebook" value={facebook} onChange={e => setFacebook(e.target.value)} placeholder="https://facebook.com/yourbrand" disabled={saving} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ss-twitter">X / Twitter</Label>
        <Input id="ss-twitter" value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="@yourbrand" disabled={saving} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ss-tiktok">TikTok</Label>
        <Input id="ss-tiktok" value={tiktok} onChange={e => setTiktok(e.target.value)} placeholder="@yourbrand" disabled={saving} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ss-youtube">YouTube</Label>
        <Input id="ss-youtube" value={youtube} onChange={e => setYoutube(e.target.value)} placeholder="https://youtube.com/@yourbrand" disabled={saving} />
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </form>
  );
}
