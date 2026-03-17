import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NfsOperator } from '@/lib/nfstay/types';

interface Props {
  operator: NfsOperator;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function StepContactInfo({ operator, onSave, saving }: Props) {
  const op = operator as any;
  const [contactEmail, setContactEmail] = useState<string>(operator.contact_email ?? '');
  const [contactPhone, setContactPhone] = useState<string>(operator.contact_phone ?? '');
  const [contactWhatsapp, setContactWhatsapp] = useState<string>(op.contact_whatsapp ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      contact_whatsapp: contactWhatsapp || null,
    });
  };

  return (
    <form id="onboarding-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Contact information</h2>
        <p className="text-sm text-muted-foreground mt-1">How guests can reach you. Shown on your booking site.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact email</Label>
          <Input id="contactEmail" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="hello@yourbrand.com" disabled={saving} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Phone number</Label>
          <Input id="contactPhone" type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+44 7700 900000" disabled={saving} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactWhatsapp">WhatsApp (optional)</Label>
          <Input id="contactWhatsapp" type="tel" value={contactWhatsapp} onChange={e => setContactWhatsapp(e.target.value)} placeholder="+44 7700 900000" disabled={saving} />
        </div>
      </div>
    </form>
  );
}
