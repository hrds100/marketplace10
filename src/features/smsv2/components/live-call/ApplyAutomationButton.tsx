// ApplyAutomationButton — fire the current pipeline column's automation
// mid-call without ending the call.
//
// Usually wk-outcome-apply runs from PostCallPanel after the agent picks
// an outcome. Hugo's 2026-04-26 ask: "Mid-call actions (… change pipeline
// stage) need to be reachable from the live-call screen". The agent
// changes the stage with StageSelector → its automations (templated SMS,
// task, retry-dial, tag) only fire post-call. This button gives the
// agent a way to fire those server-side automations *now* (e.g. push the
// breakdown SMS while still on the call) without bringing the call to an
// end.
//
// Endpoint reuses the existing wk-outcome-apply edge fn — no new infra.

import { useState } from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSmsV2 } from '../../store/SmsV2Store';

interface OutcomeInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { applied?: string[]; error?: string } | null;
    error: { message: string; context?: Response } | null;
  }>;
}

interface Props {
  callId: string | null;
  contactId: string;
  /** The pipeline column whose automation should fire — usually the
   *  contact's current `pipelineColumnId`. */
  columnId: string | null | undefined;
  /** Optional note attached to the wk_calls row (passed through to
   *  wk-outcome-apply). */
  note?: string | null;
  size?: 'sm' | 'md';
}

export default function ApplyAutomationButton({
  callId,
  contactId,
  columnId,
  note = null,
  size = 'sm',
}: Props) {
  const { pushToast } = useSmsV2();
  const [busy, setBusy] = useState(false);

  const disabled = !callId || !columnId || busy;

  const apply = async () => {
    if (!callId || !columnId || busy) return;
    if (
      !confirm(
        "Fire this stage's automation now (templated SMS, task, retry-dial)? The call stays open."
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await (
        supabase.functions as unknown as OutcomeInvoke
      ).invoke('wk-outcome-apply', {
        body: {
          call_id: callId,
          contact_id: contactId,
          column_id: columnId,
          agent_note: note,
        },
      });
      if (error) {
        let real = error.message;
        const ctx = error.context;
        if (ctx) {
          try {
            const body = await ctx.clone().text();
            let parsed: { error?: string } | null = null;
            try {
              parsed = body ? JSON.parse(body) : null;
            } catch {
              /* not JSON */
            }
            real = `${ctx.status} ${parsed?.error || body || error.message}`.trim();
          } catch {
            // fall through
          }
        }
        pushToast(`Automation failed: ${real}`, 'error');
      } else {
        const applied = data?.applied ?? [];
        pushToast(
          applied.length > 0
            ? `Automation fired: ${applied.join(' · ')}`
            : 'Automation fired (no actions configured for this stage)',
          'success'
        );
      }
    } catch (e) {
      pushToast(
        `Automation crashed: ${e instanceof Error ? e.message : 'unknown'}`,
        'error'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={() => void apply()}
      disabled={disabled}
      title={
        !callId
          ? 'Available once the call connects'
          : !columnId
            ? 'Pick a pipeline stage first'
            : "Fire this stage's automation now (call stays open)"
      }
      className={cn(
        'inline-flex items-center gap-1 rounded-[8px] font-semibold transition-colors',
        size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-[12px]',
        disabled
          ? 'bg-[#F3F3EE] text-[#9CA3AF] cursor-not-allowed'
          : 'bg-[#1E9A80]/10 text-[#1E9A80] hover:bg-[#1E9A80]/15'
      )}
    >
      <Zap className="w-3 h-3" strokeWidth={2.2} />
      {busy ? 'Applying…' : 'Apply automation'}
    </button>
  );
}
