import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import type { NfsProperty } from '@/lib/nfstay/types';

interface UseNfsPropertyMutationReturn {
  create: (fields: Record<string, unknown>) => Promise<NfsProperty | null>;
  update: (id: string, fields: Record<string, unknown>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  bulkUpdateStatus: (ids: string[], listingStatus: string) => Promise<boolean>;
  saving: boolean;
  error: string | null;
  success: boolean;
  clearStatus: () => void;
}

export function useNfsPropertyMutation(): UseNfsPropertyMutationReturn {
  const { operator } = useNfsOperator();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout>>();

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      successTimer.current = setTimeout(() => setSuccess(false), 3000);
    }
    return () => { if (successTimer.current) clearTimeout(successTimer.current); };
  }, [success]);

  const clearStatus = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  const create = useCallback(async (fields: Record<string, unknown>): Promise<NfsProperty | null> => {
    if (!operator?.id) {
      setError('No operator found');
      return null;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { data, error: dbErr } = await (supabase.from('nfs_properties') as any)
        .insert({ ...fields, operator_id: operator.id })
        .select('*')
        .single();

      if (dbErr) {
        setError(dbErr.message);
        return null;
      }

      setSuccess(true);
      return data as NfsProperty;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property');
      return null;
    } finally {
      setSaving(false);
    }
  }, [operator?.id]);

  const update = useCallback(async (id: string, fields: Record<string, unknown>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: dbErr } = await (supabase.from('nfs_properties') as any)
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (dbErr) {
        setError(dbErr.message);
        return false;
      }

      setSuccess(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update property');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: dbErr } = await (supabase.from('nfs_properties') as any)
        .delete()
        .eq('id', id);

      if (dbErr) {
        setError(dbErr.message);
        return false;
      }

      setSuccess(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete property');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const bulkUpdateStatus = useCallback(async (ids: string[], listingStatus: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: dbErr } = await (supabase.rpc as any)('nfs_bulk_update_listing_status', {
        property_ids: ids,
        new_status: listingStatus,
      });

      if (dbErr) {
        setError(dbErr.message);
        return false;
      }

      setSuccess(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update statuses');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { create, update, remove, bulkUpdateStatus, saving, error, success, clearStatus };
}
