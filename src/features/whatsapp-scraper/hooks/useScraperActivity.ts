import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ScraperActivity } from '../types';

export function useScraperActivity(limit = 50) {
  const [activities, setActivities] = useState<ScraperActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await (supabase.from('wa_scraper_activity') as any)
        .select('id, action, details, group_name, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        setError(fetchError.message);
        setActivities([]);
        return;
      }

      setActivities(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivity();

    // Auto-refresh every 10 seconds
    intervalRef.current = setInterval(fetchActivity, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchActivity]);

  return { activities, loading, error, refetch: fetchActivity };
}
