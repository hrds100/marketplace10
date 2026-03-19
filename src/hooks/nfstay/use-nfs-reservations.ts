import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import type { NfsReservation } from '@/lib/nfstay/types';

interface UseNfsReservationsReturn {
  reservations: NfsReservation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNfsReservations(filters?: {
  status?: string;
  propertyId?: string;
}): UseNfsReservationsReturn {
  const { operator, loading: operatorLoading } = useNfsOperator();
  const [reservations, setReservations] = useState<NfsReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    if (!operator?.id) {
      setReservations([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      let query = (supabase.from('nfs_reservations') as any)
        .select('*')
        .eq('operator_id', operator.id)
        .order('check_in', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.propertyId) {
        query = query.eq('property_id', filters.propertyId);
      }

      const { data, error: dbError } = await query;

      if (dbError) {
        if (dbError.code === '42P01') {
          setError('NFStay tables not yet created. Run the Phase 3 migration first.');
        } else {
          setError(dbError.message);
        }
        setReservations([]);
      } else {
        setReservations((data as NfsReservation[]) ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservations');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [operator?.id, filters?.status, filters?.propertyId]);

  useEffect(() => {
    if (operatorLoading) return;
    fetchReservations();
  }, [operatorLoading, fetchReservations]);

  return { reservations, loading: loading || operatorLoading, error, refetch: fetchReservations };
}
