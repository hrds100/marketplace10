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

// DB key → TypeScript property name mapping
const DB_KEY_TO_PROP: Record<string, string> = {
  scan_interval: 'scan_interval_minutes',
};

// DB key → value unwrapper (DB stores wrapped JSONB, TS expects flat primitives)
const VALUE_UNWRAP: Record<string, (v: any) => any> = {
  scan_interval: (v) => v?.minutes ?? 15,
  lookback_hours: (v) => typeof v === 'number' ? v : v?.hours ?? 24,
  notifications_enabled: (v) => typeof v === 'boolean' ? v : v?.enabled ?? true,
};

// TypeScript property name → DB key mapping (reverse of above)
const PROP_TO_DB_KEY: Record<string, string> = {
  scan_interval_minutes: 'scan_interval',
};

// TypeScript property → DB value wrapper (reverse of VALUE_UNWRAP)
const VALUE_WRAP: Record<string, (v: any) => any> = {
  scan_interval_minutes: (v) => ({ minutes: v }),
  lookback_hours: (v) => ({ hours: v }),
  notifications_enabled: (v) => ({ enabled: v }),
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
          // Map DB key to TypeScript property name
          const propName = DB_KEY_TO_PROP[row.key] ?? row.key;
          if (propName in merged) {
            // Unwrap JSONB value if needed
            const unwrap = VALUE_UNWRAP[row.key];
            const value = unwrap ? unwrap(row.value) : row.value;
            (merged as Record<string, unknown>)[propName] = value;
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

      // Map TypeScript property names back to DB keys and wrap values
      const upserts = Object.entries(partial).map(([propName, value]) => {
        const dbKey = PROP_TO_DB_KEY[propName] ?? propName;
        const wrap = VALUE_WRAP[propName];
        const dbValue = wrap ? wrap(value) : value;
        return { key: dbKey, value: dbValue, updated_at: now };
      });

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
