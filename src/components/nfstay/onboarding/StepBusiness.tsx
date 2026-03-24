import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NfsOperator } from '@/lib/nfstay/types';

interface Props {
  operator: NfsOperator;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function StepBusiness({ operator, onSave, saving }: Props) {
  const [brandName, setBrandName] = useState(operator.brand_name ?? '');
  const [legalName, setLegalName] = useState(operator.legal_name ?? '');
  const [subdomain, setSubdomain] = useState(operator.subdomain ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      brand_name: brandName || null,
      legal_name: legalName || null,
      subdomain: subdomain || null,
    });
  };

  return (
    <form data-feature="BOOKING_NFSTAY__ONBOARDING" id="onboarding-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Your business</h2>
        <p className="text-sm text-muted-foreground mt-1">Tell us about your brand.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="brandName">Brand name</Label>
          <Input id="brandName" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Sunny Stays" disabled={saving} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="legalName">Legal / company name (optional)</Label>
          <Input id="legalName" value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Sunny Stays Ltd" disabled={saving} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subdomain">Subdomain</Label>
          <div className="flex items-center gap-2">
            <Input id="subdomain" value={subdomain} onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="sunny-stays" disabled={saving} className="flex-1" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">.nfstay.app</span>
          </div>
        </div>
      </div>
    </form>
  );
}
