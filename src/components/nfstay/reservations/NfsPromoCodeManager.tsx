import { useState } from 'react';
import { useNfsPromoCodes } from '@/hooks/nfstay/use-nfs-promo-codes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, AlertCircle, Tag } from 'lucide-react';

interface NfsPromoCodeManagerProps {
  onGatedAction?: (action: () => void) => void;
}

export default function NfsPromoCodeManager({ onGatedAction }: NfsPromoCodeManagerProps = {}) {
  const { promoCodes, loading, error, createPromoCode, updatePromoCode, deletePromoCode, saving } = useNfsPromoCodes();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    discount_type: 'percentage' as 'fixed' | 'percentage',
    value: '',
    currency: 'GBP',
    valid_from: '',
    valid_to: '',
    limited_uses: false,
    max_uses: '',
  });

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const doCreate = async () => {
    if (!form.code || !form.value) return;

    await createPromoCode({
      name: form.name || null,
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      value: parseFloat(form.value),
      currency: form.discount_type === 'fixed' ? form.currency : null,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      limited_uses: form.limited_uses,
      max_uses: form.limited_uses && form.max_uses ? parseInt(form.max_uses) : null,
      status: 'active',
    });

    setForm({ name: '', code: '', discount_type: 'percentage', value: '', currency: 'GBP', valid_from: '', valid_to: '', limited_uses: false, max_uses: '' });
    setShowForm(false);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (onGatedAction) {
      onGatedAction(doCreate);
    } else {
      doCreate();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await updatePromoCode(id, { status: newStatus } as any);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this promo code?')) return;
    await deletePromoCode(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-feature="BOOKING_NFSTAY__RESERVATIONS" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Promo Codes</h2>
        <Button size="sm" onClick={() => onGatedAction ? onGatedAction(() => setShowForm(!showForm)) : setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" /> New Code
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="border border-border/40 rounded-xl p-4 space-y-3 bg-muted/10">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Display name (optional)" value={form.name} onChange={e => set('name', e.target.value)} />
            <Input data-feature="BOOKING_NFSTAY__PROMO_CODE_INPUT" placeholder="CODE" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} required className="font-mono" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.discount_type}
              onChange={e => set('discount_type', e.target.value)}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed amount</option>
            </select>
            <Input type="number" step="0.01" min={0} placeholder="Value" value={form.value} onChange={e => set('value', e.target.value)} required />
            {form.discount_type === 'fixed' && (
              <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Valid from</label>
              <Input type="date" value={form.valid_from} onChange={e => set('valid_from', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Valid to</label>
              <Input type="date" value={form.valid_to} onChange={e => set('valid_to', e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.limited_uses} onChange={e => set('limited_uses', e.target.checked)} />
              Limit uses
            </label>
            {form.limited_uses && (
              <Input type="number" min={1} placeholder="Max uses" value={form.max_uses} onChange={e => set('max_uses', e.target.value)} className="w-32" />
            )}
          </div>
          <div className="flex gap-2">
            <Button data-feature="BOOKING_NFSTAY__PROMO_CREATE" type="submit" size="sm" disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Promo code list */}
      {promoCodes.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/60 rounded-xl bg-muted/20">
          <Tag className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No promo codes yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {promoCodes.map(pc => (
            <div key={pc.id} data-feature="BOOKING_NFSTAY__PROMO_ROW" className="flex items-center justify-between border border-border/40 rounded-lg p-3 bg-white dark:bg-card">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-sm">{pc.code}</span>
                  {pc.name && <span className="text-xs text-muted-foreground">({pc.name})</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    pc.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {pc.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pc.discount_type === 'percentage' ? `${pc.value}% off` : `${pc.currency} ${pc.value} off`}
                  {pc.limited_uses && ` · ${pc.current_uses}/${pc.max_uses} uses`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onGatedAction ? onGatedAction(() => handleToggleStatus(pc.id, pc.status)) : handleToggleStatus(pc.id, pc.status)}
                  disabled={saving}
                >
                  {pc.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
                <Button data-feature="BOOKING_NFSTAY__PROMO_DELETE" variant="ghost" size="sm" onClick={() => onGatedAction ? onGatedAction(() => handleDelete(pc.id)) : handleDelete(pc.id)} disabled={saving}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
