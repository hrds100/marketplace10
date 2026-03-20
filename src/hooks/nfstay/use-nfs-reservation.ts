import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { NfsReservation } from '@/lib/nfstay/types';

interface UseNfsReservationReturn {
  reservation: NfsReservation | null;
  loading: boolean;
  error: string | null;
}

export function useNfsReservation(id: string): UseNfsReservationReturn {
  const [reservation, setReservation] = useState<NfsReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        setError(null);
        const { data, error: dbError } = await (supabase.from('nfs_reservations') as any)
          .select('*')
          .eq('id', id)
          .single();

        if (dbError) {
          setError(dbError.message);
          setReservation(null);
        } else {
          setReservation(data as NfsReservation);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reservation');
        setReservation(null);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [id]);

  return { reservation, loading, error };
}
