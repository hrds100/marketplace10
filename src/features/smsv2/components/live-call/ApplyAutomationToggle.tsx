// ApplyAutomationToggle — fire the current pipeline column's automation
// mid-call, and remember it was fired so the agent doesn't accidentally
// double-send.
//
// Replaces the one-shot ApplyAutomationButton (Hugo 2026-04-26 PR 2).
//
// State machine:
//   idle    → toggle reads "Apply automation"; click → confirm → applying
//   applying→ disabled, "Applying…"
//   applied → toggle reads "Applied"; click → idle (visual reset only —
//             no undo of server-side actions, see PR 2 plan)
//   error   → toggle goes back to idle and a toast shows the error
//
// Off semantics confirmed with Hugo 2026-04-26: clicking OFF clears the
// local applied flag and re-enables the toggle. Server-side SMS / task /
// tag / stage move STAY in place — those can't be safely undone (an SMS
// already sent by Twilio cannot be unsent). Clicking ON again will RE-
// fire the apply with the existing confirm dialog so the agent sees the
// confirm prompt before any double-send.
//
// Applied state is ephemeral (per call → contact pair, in-component) —
// deliberate: refreshing the call screen resets the flag, which is fine
// because re-applying always re-confirms.
//
// The trailing info icon opens a popover that synthesises what the
// automation will actually do for THIS stage (template name, task title,
// retry hours, tag, target stage) — pulled from ColumnAutomation config.
// No DB description field needed; the data is already there.

import { useState, useMemo } from 'react';
import { Zap, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSmsV2 } from '../../store/SmsV2Store';
import { MOCK_TEMPLATES } from '../../data/mockCampaigns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
}

export default function ApplyAutomationToggle({
  callId,
  contactId,
  columnId,
  note = null,
}: Props) {
  const { pushToast, columns } = useSmsV2();
  const [phase, setPhase] = useState<'idle' | 'applying' | 'applied'>('idle');

  const column = useMemo(
    () => (columnId ? columns.find((c) => c.id === columnId) : undefined),
    [columns, columnId]
  );

  const targetColumn = useMemo(
    () =>
      column?.automation.moveToPipelineId
        ? columns.find((c) => c.id === column.automation.moveToPipelineId)
        : undefined,
    [column, columns]
  );

  const explanationItems = useMemo(
    () => buildAutomationExplanation(column, columns),
    [column, columns]
  );

  const disabled = !callId || !columnId || phase === 'applying';

  const onClick = async () => {
    if (!callId || !columnId) return;

    // Toggle OFF: applied → idle (visual reset only — server actions stay).
    if (phase === 'applied') {
      setPhase('idle');
      return;
    }

    if (phase === 'applying') return;

    if (
      !confirm(
        "Fire this stage's automation now (templated SMS, task, retry-dial)? The call stays open."
      )
    ) {
      return;
    }

    setPhase('applying');
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
            /* fall through */
          }
        }
        pushToast(`Automation failed: ${real}`, 'error');
        setPhase('idle');
      } else {
        const applied = data?.applied ?? [];
        pushToast(
          applied.length > 0
            ? `Automation fired: ${applied.join(' · ')}`
            : 'Automation fired (no actions configured for this stage)',
          'success'
        );
        setPhase('applied');
      }
    } catch (e) {
      pushToast(
        `Automation crashed: ${e instanceof Error ? e.message : 'unknown'}`,
        'error'
      );
      setPhase('idle');
    }
  };

  const isApplied = phase === 'applied';
  const isApplying = phase === 'applying';

  const stageLabel = column?.name ?? 'this stage';

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => void onClick()}
        disabled={disabled && !isApplied}
        title={
          isApplied
            ? 'Applied — toggle off to allow re-applying. Server-side actions are not undone.'
            : !callId
              ? 'Available once the call connects'
              : !columnId
                ? 'Pick a pipeline stage first'
                : `Fire ${stageLabel}'s automation now (call stays open)`
        }
        className={cn(
          'inline-flex items-center gap-1 rounded-[8px] font-semibold transition-colors px-2 py-1 text-[11px]',
          disabled && !isApplied
            ? 'bg-[#F3F3EE] text-[#9CA3AF] cursor-not-allowed'
            : isApplied
              ? 'bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90'
              : 'bg-[#1E9A80]/10 text-[#1E9A80] hover:bg-[#1E9A80]/15'
        )}
        aria-pressed={isApplied}
      >
        {isApplied ? (
          <Check className="w-3 h-3" strokeWidth={2.4} />
        ) : (
          <Zap className="w-3 h-3" strokeWidth={2.2} />
        )}
        {isApplying ? 'Applying…' : isApplied ? 'Applied' : 'Apply automation'}
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="What this automation will fire"
            className="p-1 rounded-md text-[#9CA3AF] hover:text-[#1A1A1A] hover:bg-[#F3F3EE]"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF] mb-1.5">
            {column ? `Automation · ${column.name}` : 'Automation'}
          </div>
          {explanationItems.length === 0 ? (
            <div className="text-[12px] text-[#6B7280] leading-snug">
              No actions configured for this stage. Clicking apply still logs
              the outcome on the call.
            </div>
          ) : (
            <ul className="space-y-1 text-[12px] text-[#1A1A1A]">
              {explanationItems.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 leading-snug"
                >
                  <span className="text-[#1E9A80] mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {targetColumn && (
            <div className="mt-2 pt-2 border-t border-[#F3F3EE] text-[10px] text-[#9CA3AF]">
              Stage will move to{' '}
              <span className="font-semibold text-[#1A1A1A]">
                {targetColumn.name}
              </span>
              .
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Render a human-friendly bullet list of what the automation will do
// for the given column. Pulls names where possible (template, target
// stage) so the agent reads "Send SMS \"Thanks — Interested\"" rather
// than "Send SMS tpl-thanks".
function buildAutomationExplanation(
  column: { automation: import('../../types').ColumnAutomation } | undefined,
  allColumns: import('../../types').PipelineColumn[]
): string[] {
  if (!column) return [];
  const a = column.automation;
  const items: string[] = [];

  if (a.sendSms) {
    const tpl = a.smsTemplateId
      ? MOCK_TEMPLATES.find((t) => t.id === a.smsTemplateId)
      : undefined;
    items.push(
      tpl
        ? `Send SMS "${tpl.name}"`
        : 'Send SMS (no template configured — will skip)'
    );
  }

  if (a.createTask) {
    const dueLabel = a.taskDueInHours
      ? a.taskDueInHours >= 24
        ? `${Math.round(a.taskDueInHours / 24)}d`
        : `${a.taskDueInHours}h`
      : null;
    items.push(
      a.taskTitle
        ? `Create task "${a.taskTitle}"${dueLabel ? ` · due ${dueLabel}` : ''}`
        : 'Create task (no title configured)'
    );
  }

  if (a.retryDial) {
    const retryLabel = a.retryInHours
      ? a.retryInHours >= 24
        ? `${Math.round(a.retryInHours / 24)}d`
        : `${a.retryInHours}h`
      : 'later';
    items.push(`Schedule retry dial in ${retryLabel}`);
  }

  if (a.addTag && a.tag) {
    items.push(`Add tag "${a.tag}"`);
  }

  if (a.moveToPipelineId) {
    const target = allColumns.find((c) => c.id === a.moveToPipelineId);
    if (target) items.push(`Move to "${target.name}"`);
  }

  return items;
}
