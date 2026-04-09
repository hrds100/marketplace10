import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ScraperGroup } from '../types';

export function useScraperGroups() {
  const [groups, setGroups] = useState<ScraperGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await (supabase.from('wa_scraper_groups') as any)
        .select('id, group_name, member_count, is_active, last_scanned_at, deals_found, created_at, updated_at')
        .order('group_name', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        setGroups([]);
        return;
      }

      setGroups(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const toggleGroup = useCallback(async (id: string, isActive: boolean) => {
    try {
      const { error: updateError } = await (supabase.from('wa_scraper_groups') as any)
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Optimistic update
      setGroups(prev => prev.map(g => g.id === id ? { ...g, is_active: isActive, updated_at: new Date().toISOString() } : g));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle group');
    }
  }, []);

  const refreshGroups = useCallback(async () => {
    try {
      await (supabase.from('wa_scraper_config') as any)
        .upsert({ key: 'force_rescan', value: true, updated_at: new Date().toISOString() });
      await fetchGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh groups');
    }
  }, [fetchGroups]);

  const scanGroup = useCallback(async (groupName: string) => {
    try {
      await (supabase.from('wa_scraper_config') as any).upsert(
        { key: 'scan_group', value: groupName, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger scan');
    }
  }, []);

  return { groups, loading, error, toggleGroup, refreshGroups, scanGroup, refetch: fetchGroups };
}
