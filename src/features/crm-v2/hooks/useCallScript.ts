// crm-v2 useCallScript — fetch the agent's active script.
//
// Resolution order:
//   1. Campaign script_md (per-campaign override)
//   2. Default row from wk_call_scripts (is_default=true)
//   3. Empty
//
// Read-only here. Editing UI lives in /crm/settings (smsv2).

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CallScript {
  body: string;
  name: string;
  source: 'campaign' | 'default' | 'empty';
}

export function useCallScript(campaignId: string | null): {
  script: CallScript;
  loading: boolean;
} {
  const [script, setScript] = useState<CallScript>({
    body: '',
    name: '',
    source: 'empty',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // 1. Campaign-specific script first.
      if (campaignId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: camp } = await (supabase.from('wk_dialer_campaigns' as any) as any)
          .select('script_md, name')
          .eq('id', campaignId)
          .maybeSingle();
        const campRow = camp as { script_md: string | null; name: string } | null;
        if (campRow?.script_md && campRow.script_md.trim()) {
          if (!cancelled) {
            setScript({
              body: campRow.script_md,
              name: `${campRow.name} script`,
              source: 'campaign',
            });
            setLoading(false);
          }
          return;
        }
      }
      // 2. Default script.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: def } = await (supabase.from('wk_call_scripts' as any) as any)
        .select('name, body_md')
        .eq('is_default', true)
        .maybeSingle();
      const defRow = def as { name: string; body_md: string } | null;
      if (defRow) {
        if (!cancelled) {
          setScript({
            body: defRow.body_md,
            name: defRow.name,
            source: 'default',
          });
          setLoading(false);
        }
        return;
      }
      if (!cancelled) {
        setScript({ body: '', name: '', source: 'empty' });
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  return { script, loading };
}
