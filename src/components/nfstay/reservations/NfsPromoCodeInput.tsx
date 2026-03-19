import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Loader2 } from 'lucide-react';

interface Props {
  onValidated: (discount: { type: 'fixed' | 'percentage'; value: number } | null) => void;
}

export default function NfsPromoCodeInput({ onValidated }: Props) {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{ code: string; type: string; value: number } | null>(null);

  const handleValidate = async () => {
    if (!code.trim()) return;

    try {
      setValidating(true);
      setError(null);

      const { data, error: dbError } = await (supabase.from('nfs_promo_codes') as any)
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .eq('status', 'active')
        .single();

      if (dbError || !data) {
        setError('Invalid or expired promo code');
        onValidated(null);
        return;
      }

      // Check date validity
      const now = new Date();
      if (data.valid_from && new Date(data.valid_from) > now) {
        setError('This code is not yet valid');
        onValidated(null);
        return;
      }
      if (data.valid_to && new Date(data.valid_to) < now) {
        setError('This code has expired');
        onValidated(null);
        return;
      }

      // Check usage limit
      if (data.limited_uses && data.max_uses && data.current_uses >= data.max_uses) {
        setError('This code has reached its usage limit');
        onValidated(null);
        return;
      }

      setApplied({ code: data.code, type: data.discount_type, value: data.value });
      onValidated({ type: data.discount_type, value: data.value });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate code');
      onValidated(null);
    } finally {
      setValidating(false);
    }
  };

  const handleRemove = () => {
    setApplied(null);
    setCode('');
    setError(null);
    onValidated(null);
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between text-sm bg-green-50 dark:bg-green-950/20 px-3 py-2 rounded-lg">
        <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span className="font-mono">{applied.code}</span>
          <span className="text-xs">
            ({applied.type === 'percentage' ? `${applied.value}% off` : `${applied.value} off`})
          </span>
        </span>
        <button onClick={handleRemove} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          placeholder="Promo code"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
          className="text-sm font-mono"
        />
        <Button variant="outline" size="sm" onClick={handleValidate} disabled={!code.trim() || validating}>
          {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
