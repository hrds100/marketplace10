import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import type { NfsPromoCode } from '@/lib/nfstay/types';

interface UseNfsPromoCodesReturn {
  promoCodes: NfsPromoCode[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createPromoCode: (data: Partial<NfsPromoCode>) => Promise<NfsPromoCode | null>;
  updatePromoCode: (id: string, data: Partial<NfsPromoCode>) => Promise<boolean>;
  deletePromoCode: (id: string) => Promise<boolean>;
  saving: boolean;
}

export function useNfsPromoCodes(): UseNfsPromoCodesReturn {
  const { operator, loading: operatorLoading } = useNfsOperator();
  const [promoCodes, setPromoCodes] = useState<NfsPromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPromoCodes = useCallback(async () => {
    if (!operator?.id) {
      setPromoCodes([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: dbError } = await (supabase.from('nfs_promo_codes') as any)
        .select('*')
        .eq('operator_id', operator.id)
        .order('created_at', { ascending: false });

      if (dbError) {
        setError(dbError.message);
        setPromoCodes([]);
      } else {
        setPromoCodes((data as NfsPromoCode[]) ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load promo codes');
      setPromoCodes([]);
    } finally {
      setLoading(false);
    }
  }, [operator?.id]);

  useEffect(() => {
    if (operatorLoading) return;
    fetchPromoCodes();
  }, [operatorLoading, fetchPromoCodes]);

  const createPromoCode = async (data: Partial<NfsPromoCode>): Promise<NfsPromoCode | null> => {
    if (!operator?.id) return null;

    try {
      setSaving(true);
      setError(null);

      const { data: result, error: dbError } = await (supabase.from('nfs_promo_codes') as any)
        .insert({ ...data, operator_id: operator.id })
        .select()
        .single();

      if (dbError) {
        setError(dbError.message);
        return null;
      }

      await fetchPromoCodes();
      return result as NfsPromoCode;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create promo code');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updatePromoCode = async (id: string, data: Partial<NfsPromoCode>): Promise<boolean> => {
    try {
      setSaving(true);
      setError(null);

      const { error: dbError } = await (supabase.from('nfs_promo_codes') as any)
        .update(data)
        .eq('id', id);

      if (dbError) {
        setError(dbError.message);
        return false;
      }

      await fetchPromoCodes();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update promo code');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deletePromoCode = async (id: string): Promise<boolean> => {
    try {
      setSaving(true);
      setError(null);

      const { error: dbError } = await (supabase.from('nfs_promo_codes') as any)
        .delete()
        .eq('id', id);

      if (dbError) {
        setError(dbError.message);
        return false;
      }

      await fetchPromoCodes();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete promo code');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { promoCodes, loading: loading || operatorLoading, error, refetch: fetchPromoCodes, createPromoCode, updatePromoCode, deletePromoCode, saving };
}
