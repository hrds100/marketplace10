import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import type { NfsProperty } from '@/lib/nfstay/types';

interface UseNfsPropertiesReturn {
  properties: NfsProperty[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNfsProperties(): UseNfsPropertiesReturn {
  const { operator, loading: operatorLoading } = useNfsOperator();
  const [properties, setProperties] = useState<NfsProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    if (!operator?.id) {
      setProperties([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: dbError } = await (supabase.from('nfs_properties') as any)
        .select('*')
        .eq('operator_id', operator.id)
        .order('updated_at', { ascending: false });

      if (dbError) {
        if (dbError.code === '42P01') {
          setError('NFStay tables not yet created. Run the Phase 2 migration first.');
        } else {
          setError(dbError.message);
        }
        setProperties([]);
      } else {
        setProperties((data as NfsProperty[]) ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [operator?.id]);

  useEffect(() => {
    if (operatorLoading) return;
    fetchProperties();
  }, [operatorLoading, fetchProperties]);

  return { properties, loading: loading || operatorLoading, error, refetch: fetchProperties };
}
