import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { NfsOperator } from '@/lib/nfstay/types';

interface UseNfsOperatorReturn {
  operator: NfsOperator | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNfsOperator(): UseNfsOperatorReturn {
  const { user, loading: authLoading } = useAuth();
  const [operator, setOperator] = useState<NfsOperator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOperator = async () => {
    if (!user?.id) {
      setOperator(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      // nfs_operators is not in auto-generated types — requires cast
      const { data, error: dbError } = await (supabase.from('nfs_operators') as any)
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (dbError) {
        // Table may not exist yet during development
        if (dbError.code === '42P01') {
          setError('nfstay tables not yet created. Run the Phase 1 migration first.');
        } else {
          setError(dbError.message);
        }
        setOperator(null);
      } else {
        setOperator(data as NfsOperator | null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load operator');
      setOperator(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchOperator();
  }, [user?.id, authLoading]);

  return { operator, loading: loading || authLoading, error, refetch: fetchOperator };
}
