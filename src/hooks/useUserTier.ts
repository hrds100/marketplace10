import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { TierName } from '@/lib/ghl';

/**
 * Fetches the current user's subscription tier from profiles table.
 * Also subscribes to Supabase Realtime so the tier updates instantly
 * when n8n's post-payment webhook writes to profiles.tier — no polling needed.
 * Returns { tier, loading, refetch, refreshTier }.
 */
export function useUserTier() {
  const { user } = useAuth();
  const [tier, setTier] = useState<TierName>('free');
  const [loading, setLoading] = useState(true);

  const fetchTier = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    fetchTier();
  }, [fetchTier]);

  // Realtime: automatically update tier the moment n8n writes it to profiles.
  // This fires before any manual refreshTier() call and eliminates the race
  // between payment confirmation and the user hitting Send.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`profile-tier-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const newTier = (payload.new as Record<string, unknown>)?.tier as TierName | undefined;
          if (newTier) setTier(newTier);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return { tier, loading, refetch: fetchTier, refreshTier: fetchTier };
}
