// NFStay — Traveler reservations hook
// Fetches reservations where the current user is the guest (by email)
// This is NOT the operator hook — that one filters by operator_id

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { NfsReservation } from '@/lib/nfstay/types';

interface UseNfsTravelerReservationsReturn {
  reservations: NfsReservation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNfsTravelerReservations(): UseNfsTravelerReservationsReturn {
  const { user, loading: authLoading } = useAuth();
  const [reservations, setReservations] = useState<NfsReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    if (!user?.email) {
      setReservations([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: dbError } = await (supabase.from('nfs_reservations') as any)
        .select('*')
        .eq('guest_email', user.email)
        .order('check_in', { ascending: false });

      if (dbError) {
        if (dbError.code === '42P01') {
          setError('Booking system is being set up. Please try again later.');
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
  }, [user?.email]);

  useEffect(() => {
    if (authLoading) return;
    fetchReservations();
  }, [authLoading, fetchReservations]);

  return { reservations, loading: loading || authLoading, error, refetch: fetchReservations };
}
