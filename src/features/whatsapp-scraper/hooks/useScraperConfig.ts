import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ScraperConfig } from '../types';

const DEFAULT_CONFIG: ScraperConfig = {
  selected_groups: [],
  scan_interval_minutes: 15,
  lookback_hours: 24,
  is_paused: false,
  notifications_enabled: true,
  notification_email: 'admin@hub.nfstay.com',
  max_messages_per_group: 100,
  auto_submit_approved: false,
  duplicate_window_days: 7,
};

export function useScraperConfig() {
  const [config, setConfig] = useState<ScraperConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase.from('wa_scraper_config') as any)
        .select('key, value');

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      if (data && data.length > 0) {
        const merged = { ...DEFAULT_CONFIG };
        for (const row of data) {
          if (row.key in merged) {
            (merged as Record<string, unknown>)[row.key] = row.value;
          }
        }
        setConfig(merged);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = useCallback(async (partial: Partial<ScraperConfig>) => {
    try {
      setError(null);
      const now = new Date().toISOString();
      const upserts = Object.entries(partial).map(([key, value]) => ({
        key,
        value,
        updated_at: now,
      }));

      const { error: upsertError } = await (supabase.from('wa_scraper_config') as any)
        .upsert(upserts);

      if (upsertError) {
        setError(upsertError.message);
        return false;
      }

      setConfig(prev => ({ ...prev, ...partial }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config');
      return false;
    }
  }, []);

  return { config, loading, error, updateConfig, refetch: fetchConfig };
}
