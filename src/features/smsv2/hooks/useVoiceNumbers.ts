// useVoiceNumbers — read-only list of voice-enabled wk_numbers for the
// softphone "Calling from" picker. RLS policy wk_numbers_agent_read lets
// any workspace agent read the table, so no edge function is needed.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VoiceNumber {
  id: string;
  e164: string;
  label: string | null;
}

export function useVoiceNumbers(): { numbers: VoiceNumber[]; loading: boolean } {
  const [numbers, setNumbers] = useState<VoiceNumber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('wk_numbers' as any) as any)
          .select('id, e164, label')
          .eq('voice_enabled', true)
          .order('created_at', { ascending: true });
        if (!cancelled) setNumbers((data ?? []) as VoiceNumber[]);
      } catch {
        // Keep the empty list — the picker simply won't render options and
        // the server falls back to the default caller-ID chain.
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { numbers, loading };
}
