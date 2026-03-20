import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { NfsProperty } from '@/lib/nfstay/types';

interface UseNfsPropertyReturn {
  property: NfsProperty | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNfsProperty(propertyId: string | undefined): UseNfsPropertyReturn {
  const [property, setProperty] = useState<NfsProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperty = useCallback(async () => {
    if (!propertyId) {
      setProperty(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: dbError } = await (supabase.from('nfs_properties') as any)
        .select('*')
        .eq('id', propertyId)
        .maybeSingle();

      if (dbError) {
        if (dbError.code === '42P01') {
          setError('NFStay tables not yet created. Run the Phase 2 migration first.');
        } else {
          setError(dbError.message);
        }
        setProperty(null);
      } else {
        setProperty(data as NfsProperty | null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load property');
      setProperty(null);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  return { property, loading, error, refetch: fetchProperty };
}
