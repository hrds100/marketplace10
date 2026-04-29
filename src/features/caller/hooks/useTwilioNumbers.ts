// Caller — useTwilioNumbers.
// Reads wk_numbers (read-only for Phase 5 skeleton). Number purchase /
// configuration lives in Twilio + the admin's Twilio Connect page —
// the Caller settings tab just lists what's in the DB.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CallerNumber {
  id: string;
  e164: string;
  label: string;
  capabilities: string[];
  recordingEnabled: boolean;
}

interface Row {
  id: string;
  e164: string | null;
  label: string | null;
  capabilities: string[] | null;
  recording_enabled: boolean | null;
}

export function useTwilioNumbers() {
  const [numbers, setNumbers] = useState<CallerNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: e } = await (supabase.from('wk_numbers' as any) as any)
        .select('id, e164, label, capabilities, recording_enabled')
        .order('label', { ascending: true });
      if (cancelled) return;
      if (e) setError(e.message);
      else
        setNumbers(
          ((data ?? []) as Row[]).map((r) => ({
            id: r.id,
            e164: r.e164 ?? '',
            label: r.label ?? '—',
            capabilities: r.capabilities ?? [],
            recordingEnabled: r.recording_enabled ?? false,
          }))
        );
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { numbers, loading, error };
}
