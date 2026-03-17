import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseNfsAvailabilityReturn {
  available: boolean | null;
  checking: boolean;
  error: string | null;
  checkAvailability: (propertyId: string, checkIn: string, checkOut: string) => Promise<boolean>;
}

export function useNfsAvailability(): UseNfsAvailabilityReturn {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAvailability = useCallback(async (propertyId: string, checkIn: string, checkOut: string): Promise<boolean> => {
    try {
      setChecking(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('nfs_check_availability', {
        p_property_id: propertyId,
        p_check_in: checkIn,
        p_check_out: checkOut,
      });

      if (rpcError) {
        // Fallback: query directly if RPC not available
        if (rpcError.code === '42883') {
          const { data: conflicts, error: queryError } = await (supabase.from('nfs_reservations') as any)
            .select('id')
            .eq('property_id', propertyId)
            .in('status', ['pending', 'confirmed'])
            .lt('check_in', checkOut)
            .gt('check_out', checkIn)
            .limit(1);

          if (queryError) {
            setError(queryError.message);
            setAvailable(null);
            return false;
          }

          const isAvailable = !conflicts || conflicts.length === 0;
          setAvailable(isAvailable);
          return isAvailable;
        }

        setError(rpcError.message);
        setAvailable(null);
        return false;
      }

      setAvailable(data as boolean);
      return data as boolean;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Availability check failed');
      setAvailable(null);
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  return { available, checking, error, checkAvailability };
}
