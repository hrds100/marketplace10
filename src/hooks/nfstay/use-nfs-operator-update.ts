import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';

interface UseNfsOperatorUpdateReturn {
  update: (fields: Record<string, unknown>) => Promise<boolean>;
  saving: boolean;
  error: string | null;
  success: boolean;
  clearStatus: () => void;
}

export function useNfsOperatorUpdate(): UseNfsOperatorUpdateReturn {
  const { operator, refetch } = useNfsOperator();
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

  const update = useCallback(async (fields: Record<string, unknown>): Promise<boolean> => {
    if (!operator?.id) {
      setError('No operator found');
      return false;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: dbErr } = await (supabase.from('nfs_operators') as any)
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', operator.id);

      if (dbErr) {
        setError(dbErr.message);
        return false;
      }

      await refetch();
      setSuccess(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  }, [operator?.id, refetch]);

  return { update, saving, error, success, clearStatus };
}
