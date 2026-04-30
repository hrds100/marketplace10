// crm-v2 ScriptPane — agent's call script during a live call.
//
// PR C.3: shows the resolved script (campaign-specific OR default
// from wk_call_scripts.is_default=true) with merge-field
// interpolation. Stage cursor (teleprompter) is deferred — port
// from smsv2/hooks/useScriptReadTracking when Hugo asks.

import { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { useDialer } from '../../state/DialerProvider';
import { useCallScript } from '../../hooks/useCallScript';
import { interpolateTemplate } from '../../lib/interpolateTemplate';

export interface ScriptPaneProps {
  campaignId: string | null;
  /** Agent first name for {{agent_first_name}}. Pass empty string if unknown. */
  agentFirstName?: string;
}

export default function ScriptPane({ campaignId, agentFirstName = '' }: ScriptPaneProps) {
  const { call } = useDialer();
  const { script, loading } = useCallScript(campaignId);

  const contactFirstName = useMemo(
    () => (call?.contactName ?? '').trim().split(/\s+/)[0] ?? '',
    [call?.contactName]
  );

  const rendered = useMemo(() => {
    if (!script.body) return '';
    return interpolateTemplate(script.body, {
      firstName: contactFirstName,
      agentFirstName,
    });
  }, [script.body, contactFirstName, agentFirstName]);

  return (
    <div className="flex flex-col h-full bg-white" data-testid="incall-script-pane">
      <div className="px-4 py-2.5 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[#1E9A80]" />
          <span className="text-[12px] font-semibold text-[#1A1A1A]">
            Call script
          </span>
        </div>
        {script.name && (
          <span className="text-[10px] text-[#9CA3AF] truncate max-w-[120px]">
            {script.name}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 text-[12px] leading-relaxed text-[#1A1A1A] whitespace-pre-wrap">
        {loading ? (
          <span className="text-[11px] text-[#9CA3AF] italic">Loading script…</span>
        ) : rendered ? (
          rendered
        ) : (
          <span className="text-[11px] text-[#9CA3AF] italic">
            No script set. Add one in /crm/settings → AI coach → Call script.
          </span>
        )}
      </div>
    </div>
  );
}
