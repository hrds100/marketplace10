import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { TierName } from '@/lib/ghl';

/**
 * Fetches the current user's subscription tier from profiles table.
 * Returns { tier, loading, refetch }.
 */
export function useUserTier() {
  const { user } = useAuth();
  const [tier, setTier] = useState<TierName>('free');
  const [loading, setLoading] = useState(true);

  const fetchTier = async () => {
    if (!user) {
      setTier('free');
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();
    setTier((data?.tier as TierName) || 'free');
    setLoading(false);
  };

  useEffect(() => {
    fetchTier();
  }, [user?.id]);

  return { tier, loading, refetch: fetchTier };
}
