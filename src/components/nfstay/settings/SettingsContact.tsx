import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { NfsOperator } from '@/lib/nfstay/types';
import { useNfsOperatorUpdate } from '@/hooks/nfstay/use-nfs-operator-update';

interface Props {
  operator: NfsOperator;
}

export default function SettingsContact({ operator }: Props) {
  const { update, saving, error, success, clearStatus } = useNfsOperatorUpdate();

  const [contactEmail, setContactEmail] = useState(operator.contact_email ?? '');
  const [contactPhone, setContactPhone] = useState(operator.contact_phone ?? '');
  const [contactWhatsapp, setContactWhatsapp] = useState(operator.contact_whatsapp ?? '');
  const [contactTelegram, setContactTelegram] = useState(operator.contact_telegram ?? '');

  useEffect(() => {
    setContactEmail(operator.contact_email ?? '');
    setContactPhone(operator.contact_phone ?? '');
    setContactWhatsapp(operator.contact_whatsapp ?? '');
    setContactTelegram(operator.contact_telegram ?? '');
  }, [operator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearStatus();
    await update({
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      contact_whatsapp: contactWhatsapp || null,
      contact_telegram: contactTelegram || null,
    });
  };

  return (
    <form data-feature="BOOKING_NFSTAY__SETTINGS" onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold">Contact information</h3>
        <p className="text-sm text-muted-foreground">How guests can reach you. Shown on your booking site.</p>
      </div>

      {error && <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">Saved successfully.</div>}

      <div className="space-y-2">
        <Label htmlFor="sc-email">Contact email</Label>
        <Input id="sc-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="hello@yourbrand.com" disabled={saving} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sc-phone">Phone number</Label>
        <Input id="sc-phone" type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+44 7700 900000" disabled={saving} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sc-whatsapp">WhatsApp</Label>
        <Input id="sc-whatsapp" type="tel" value={contactWhatsapp} onChange={e => setContactWhatsapp(e.target.value)} placeholder="+44 7700 900000" disabled={saving} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sc-telegram">Telegram</Label>
        <Input id="sc-telegram" value={contactTelegram} onChange={e => setContactTelegram(e.target.value)} placeholder="@yourusername" disabled={saving} />
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </form>
  );
}
