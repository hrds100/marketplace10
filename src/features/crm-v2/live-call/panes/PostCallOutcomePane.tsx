// crm-v2 PostCallOutcomePane — replaces the smsv2 PostCallPanel.
//
// Shows the wrap-up reason (Connected / Busy / No answer / etc.) and
// the pipeline-column outcome cards. Picking a card calls
// ctx.applyOutcome — which dispatches OUTCOME_PICKED through the
// reducer and writes wk_calls.disposition_column_id via wk-outcome-
// apply. Skip / Next call live in the SessionControlBar (footer); we
// don't render duplicates here (PR 155 lesson).

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDialer } from '../../state/DialerProvider';
import { usePipelineColumns } from '../../hooks/usePipelineColumns';

const REASON_LABEL: Record<string, { label: string; tone: 'green' | 'amber' | 'red' | 'gray' }> = {
  connected: { label: 'Connected', tone: 'green' },
  user_hangup: { label: 'Hung up', tone: 'gray' },
  twilio_disconnect: { label: 'Disconnected', tone: 'gray' },
  twilio_cancel: { label: 'Cancelled', tone: 'gray' },
  twilio_reject: { label: 'Rejected', tone: 'red' },
  no_answer: { label: 'No answer', tone: 'amber' },
  busy: { label: 'Busy', tone: 'red' },
  voicemail: { label: 'Voicemail', tone: 'amber' },
  failed: { label: 'Failed', tone: 'red' },
  unreachable: { label: 'Unreachable', tone: 'red' },
  unknown: { label: 'Wrap up', tone: 'gray' },
};

export default function PostCallOutcomePane() {
  const { call, callPhase, reason, applyOutcome, error } = useDialer();
  const { columns } = usePipelineColumns();
  const [pickedColumnId, setPickedColumnId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  // Reset picked id when a new call enters wrap-up.
  useEffect(() => {
    if (callPhase === 'stopped_waiting_outcome' || callPhase === 'error_waiting_outcome') {
      setPickedColumnId(null);
      setNote('');
    }
  }, [callPhase, call?.callId]);

  // Keyboard 1-9 → pick outcome by position.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return;
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        const col = columns.find((c) => c.position === num);
        if (col && callPhase === 'stopped_waiting_outcome') {
          setPickedColumnId(col.id);
          void applyOutcome(col.id, note.trim() || undefined);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [columns, callPhase, applyOutcome, note]);

  const submitted = callPhase === 'outcome_submitting' || callPhase === 'outcome_done';
  const pickEnabled = callPhase === 'stopped_waiting_outcome' || callPhase === 'error_waiting_outcome';
  const reasonInfo = REASON_LABEL[reason] ?? REASON_LABEL.unknown;

  return (
    <div className="flex flex-col h-full" data-testid="incall-postcall-pane">
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            reasonInfo.tone === 'green' && 'bg-[#1E9A80]',
            reasonInfo.tone === 'amber' && 'bg-[#F59E0B]',
            reasonInfo.tone === 'red' && 'bg-[#EF4444]',
            reasonInfo.tone === 'gray' && 'bg-[#9CA3AF]'
          )}
        />
        <span className="text-[13px] font-semibold text-[#1A1A1A]">
          Call ended · {reasonInfo.label}
          {call?.contactName ? ` · ${call.contactName}` : ''}
        </span>
      </div>

      {error && (
        <div className="px-4 py-2 bg-[#FEF2F2] border-b border-[#FCA5A5] text-[12px] text-[#B91C1C]">
          {error.friendlyMessage}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-2">
          Pick an outcome
        </div>
        <div className="grid grid-cols-2 gap-2">
          {columns.map((col) => {
            const isPicked = pickedColumnId === col.id;
            const dimmed = submitted && !isPicked;
            return (
              <button
                key={col.id}
                onClick={() => {
                  if (!pickEnabled) return;
                  setPickedColumnId(col.id);
                  void applyOutcome(col.id, note.trim() || undefined);
                }}
                disabled={!pickEnabled}
                data-testid={`outcome-${col.id}`}
                data-picked={isPicked ? 'true' : undefined}
                className={cn(
                  'p-2 rounded-xl border-2 text-left bg-white transition-all',
                  isPicked
                    ? 'border-[#1E9A80] bg-[#ECFDF5] shadow-[0_4px_16px_rgba(30,154,128,0.35)]'
                    : dimmed
                      ? 'border-[#E5E7EB] opacity-30 cursor-not-allowed'
                      : 'border-[#E5E7EB] hover:border-[#1E9A80]/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: col.colour ? `${col.colour}1A` : '#F3F4F6',
                      color: col.colour ?? '#6B7280',
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold tabular-nums text-[#9CA3AF]">
                        {col.position}.
                      </span>
                      <span className="text-[12px] font-semibold text-[#1A1A1A] truncate">
                        {col.name}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {columns.length === 0 && (
          <div className="text-[12px] text-[#6B7280] italic">
            No pipeline columns yet — create some in Settings → Pipelines.
          </div>
        )}

        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
            Quick note
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note for this call…"
            disabled={!pickEnabled}
            data-testid="outcome-note"
            className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E5E5] rounded-[10px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 focus:border-[#1E9A80] disabled:opacity-50"
          />
        </div>
      </div>

      <div className="px-4 py-2 border-t border-[#E5E7EB] bg-[#F3F3EE]/50 text-[11px] text-[#6B7280]">
        {submitted ? (
          <span>Outcome saved — press Next call below.</span>
        ) : pickEnabled ? (
          <span>Pick an outcome to continue.</span>
        ) : (
          <span>Outcome panel.</span>
        )}
        <span className="ml-2 text-[10px] text-[#9CA3AF]">
          ⌨ 1–9 outcomes · S skip · N next call
        </span>
      </div>
    </div>
  );
}
