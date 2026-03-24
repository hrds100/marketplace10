import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { NfsOperator } from '@/lib/nfstay/types';
import { useNfsOperatorUpdate } from '@/hooks/nfstay/use-nfs-operator-update';

interface Props {
  operator: NfsOperator;
}

const PERSONA_OPTIONS = [
  { value: 'owner', label: 'Property Owner' },
  { value: 'property_manager', label: 'Property Manager' },
] as const;

export default function SettingsProfile({ operator }: Props) {
  const { update, saving, error, success, clearStatus } = useNfsOperatorUpdate();

  const [firstName, setFirstName] = useState(operator.first_name ?? '');
  const [lastName, setLastName] = useState(operator.last_name ?? '');
  const [personaType, setPersonaType] = useState(operator.persona_type ?? '');
  const [brandName, setBrandName] = useState(operator.brand_name ?? '');
  const [legalName, setLegalName] = useState(operator.legal_name ?? '');
  const [subdomain, setSubdomain] = useState(operator.subdomain ?? '');

  useEffect(() => {
    setFirstName(operator.first_name ?? '');
    setLastName(operator.last_name ?? '');
    setPersonaType(operator.persona_type ?? '');
    setBrandName(operator.brand_name ?? '');
    setLegalName(operator.legal_name ?? '');
    setSubdomain(operator.subdomain ?? '');
  }, [operator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearStatus();
    await update({
      first_name: firstName || null,
      last_name: lastName || null,
      persona_type: personaType || null,
      brand_name: brandName || null,
      legal_name: legalName || null,
      subdomain: subdomain || null,
    });
  };

  return (
    <form data-feature="BOOKING_NFSTAY__SETTINGS" onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold">Profile</h3>
        <p className="text-sm text-muted-foreground">Your identity and business details.</p>
      </div>

      {error && <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">Saved successfully.</div>}

      <div data-feature="BOOKING_NFSTAY__PROFILE_NAME" className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sp-firstName">First name</Label>
          <Input id="sp-firstName" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={saving} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sp-lastName">Last name</Label>
          <Input id="sp-lastName" value={lastName} onChange={e => setLastName(e.target.value)} disabled={saving} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Persona</Label>
        <div className="flex gap-3">
          {PERSONA_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              disabled={saving}
              onClick={() => setPersonaType(opt.value)}
              className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                personaType === opt.value
                  ? 'border-primary bg-primary/5 font-medium'
                  : 'border-border/40 hover:border-primary/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sp-brandName">Brand name</Label>
        <Input data-feature="BOOKING_NFSTAY__PROFILE_BRAND" id="sp-brandName" value={brandName} onChange={e => setBrandName(e.target.value)} disabled={saving} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sp-legalName">Legal / company name</Label>
        <Input id="sp-legalName" value={legalName} onChange={e => setLegalName(e.target.value)} disabled={saving} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sp-subdomain">Subdomain</Label>
        <div className="flex items-center gap-2">
          <Input
            id="sp-subdomain"
            value={subdomain}
            onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            disabled={saving}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">.nfstay.app</span>
        </div>
      </div>

      <Button data-feature="BOOKING_NFSTAY__PROFILE_SAVE" type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </form>
  );
}
