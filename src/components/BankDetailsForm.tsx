import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BankDetailsForm({ onSave }: { onSave?: () => void }) {
  const [currency, setCurrency] = useState<'GBP' | 'EUR'>('GBP');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    accountName: '',
    accountNumber: '',
    sortCode: '',
    iban: '',
    bic: '',
    country: 'GB',
  });

  const handleSave = () => {
    setSaved(true);
    onSave?.();
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <CheckCircle2 className="h-10 w-10 text-primary" />
        <p className="font-semibold">Bank details saved</p>
        <p className="text-sm text-muted-foreground text-center">
          You'll receive a WhatsApp confirmation. Details are locked after your first payout.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Currency toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setCurrency('GBP')}
          className={cn(
            'flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-all text-left',
            currency === 'GBP' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:bg-muted/50'
          )}
        >
          <p className="font-semibold">GBP — UK Bank</p>
          <p className="text-xs text-muted-foreground mt-0.5">Faster Payments (same day)</p>
        </button>
        <button
          onClick={() => setCurrency('EUR')}
          className={cn(
            'flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-all text-left',
            currency === 'EUR' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:bg-muted/50'
          )}
        >
          <p className="font-semibold">EUR — International</p>
          <p className="text-xs text-muted-foreground mt-0.5">SEPA (next business day)</p>
        </button>
      </div>

      {/* Account Name (always) */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">Account Holder Name</label>
        <input
          type="text"
          value={form.accountName}
          onChange={(e) => setForm({ ...form, accountName: e.target.value })}
          placeholder="John Smith"
          className="w-full rounded-lg border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* GBP fields */}
      {currency === 'GBP' && (
        <>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Sort Code</label>
            <input
              type="text"
              value={form.sortCode}
              onChange={(e) => setForm({ ...form, sortCode: e.target.value })}
              placeholder="XX-XX-XX"
              maxLength={8}
              className="w-full rounded-lg border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Account Number</label>
            <input
              type="text"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              placeholder="12345678"
              maxLength={8}
              className="w-full rounded-lg border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </>
      )}

      {/* EUR fields */}
      {currency === 'EUR' && (
        <>
          <div>
            <label className="text-sm font-medium mb-1.5 block">IBAN</label>
            <input
              type="text"
              value={form.iban}
              onChange={(e) => setForm({ ...form, iban: e.target.value })}
              placeholder="GB29 NWBK 6016 1331 9268 19"
              className="w-full rounded-lg border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">BIC / SWIFT</label>
            <input
              type="text"
              value={form.bic}
              onChange={(e) => setForm({ ...form, bic: e.target.value })}
              placeholder="NWBKGB2L"
              className="w-full rounded-lg border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </>
      )}

      {/* Country */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">Bank Country</label>
        <select
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          className="w-full rounded-lg border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="GB">United Kingdom</option>
          <option value="AE">United Arab Emirates</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
          <option value="PT">Portugal</option>
          <option value="ES">Spain</option>
          <option value="NL">Netherlands</option>
        </select>
      </div>

      <Button className="w-full" onClick={handleSave} disabled={!form.accountName}>
        <Building2 className="h-4 w-4 mr-2" />
        Save Bank Details
      </Button>

      <p className="text-[11px] text-muted-foreground text-center">
        Your bank details are encrypted and locked after your first successful payout.
      </p>
    </div>
  );
}
