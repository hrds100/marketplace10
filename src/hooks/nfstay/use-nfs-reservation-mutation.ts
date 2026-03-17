import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import type { NfsReservation } from '@/lib/nfstay/types';

interface UseNfsReservationMutationReturn {
  creating: boolean;
  updating: boolean;
  error: string | null;
  success: boolean;
  createReservation: (data: Partial<NfsReservation>) => Promise<NfsReservation | null>;
  updateReservation: (id: string, data: Partial<NfsReservation>) => Promise<boolean>;
  updateStatus: (id: string, status: string) => Promise<boolean>;
}

export function useNfsReservationMutation(): UseNfsReservationMutationReturn {
  const { operator } = useNfsOperator();
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createReservation = async (data: Partial<NfsReservation>): Promise<NfsReservation | null> => {
    if (!operator?.id) {
      setError('No operator found');
      return null;
    }

    try {
      setCreating(true);
      setError(null);
      setSuccess(false);

      const { data: result, error: dbError } = await (supabase.from('nfs_reservations') as any)
        .insert({
          ...data,
          operator_id: operator.id,
          booking_source: data.booking_source || 'operator_direct',
        })
        .select()
        .single();

      if (dbError) {
        setError(dbError.message);
        return null;
      }

      setSuccess(true);
      return result as NfsReservation;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation');
      return null;
    } finally {
      setCreating(false);
    }
  };

  const updateReservation = async (id: string, data: Partial<NfsReservation>): Promise<boolean> => {
    try {
      setUpdating(true);
      setError(null);
      setSuccess(false);

      const { error: dbError } = await (supabase.from('nfs_reservations') as any)
        .update(data)
        .eq('id', id);

      if (dbError) {
        setError(dbError.message);
        return false;
      }

      setSuccess(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reservation');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const updateStatus = async (id: string, status: string): Promise<boolean> => {
    return updateReservation(id, { status } as Partial<NfsReservation>);
  };

  return { creating, updating, error, success, createReservation, updateReservation, updateStatus };
}
