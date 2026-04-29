// crm-v2 ScriptPane — campaign script with line numbers.
//
// PR C scope: read-only render of campaign.script_md. Stage matching
// (advance cursor when agent reads a line aloud) is deferred — the
// smsv2 implementation lives in scriptMatcher; we'll port if/when
// Hugo asks. For now: just the script.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ScriptPaneProps {
  campaignId: string | null;
}

export default function ScriptPane({ campaignId }: ScriptPaneProps) {
  const [script, setScript] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setScript(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_dialer_campaigns' as any) as any)
        .select('script_md')
        .eq('id', campaignId)
        .maybeSingle();
      if (cancelled) return;
      setScript(((data as { script_md: string | null } | null)?.script_md) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  return (
    <div className="flex flex-col h-full" data-testid="incall-script-pane">
      <div className="px-4 py-2 border-b border-[#E5E7EB]">
        <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide">
          Script
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 text-[12px] leading-relaxed text-[#1A1A1A] whitespace-pre-wrap">
        {script ? (
          script
        ) : (
          <span className="text-[11px] text-[#9CA3AF] italic">
            No script set on this campaign.
          </span>
        )}
      </div>
    </div>
  );
}
