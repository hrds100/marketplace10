// OutcomeSelector — Phase 3 outcome picker.
// Renders the pipeline columns for the active campaign + a notes box.
// Clicking a column dispatches OUTCOME_PICKED (provider) and invokes
// wk-outcome-apply. Phase 3 skeleton: no follow-up modal, no automation
// preview, no badge celebration animation — logged in LOG.md.

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { usePipelineColumns } from '../../hooks/usePipelineColumns';
import { useOutcomeApply } from '../../hooks/useOutcomeApply';

interface Props {
  pipelineId: string | null;
  callId: string | null;
  contactId: string | null;
  /** Called after the apply succeeds; parent uses this to dispatch
   *  OUTCOME_RESOLVED on the reducer. */
  onApplied?: (columnId: string) => void;
  /** Called if the apply fails; parent uses this to dispatch
   *  OUTCOME_FAILED. */
  onFailed?: (message: string) => void;
}

export default function OutcomeSelector({
  pipelineId,
  callId,
  contactId,
  onApplied,
  onFailed,
}: Props) {
  const { columns, loading } = usePipelineColumns(pipelineId);
  const { apply } = useOutcomeApply();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onPick = async (columnId: string) => {
    if (!callId || !contactId) {
      setError('Cannot apply outcome — call_id or contact_id missing.');
      return;
    }
    setSubmitting(columnId);
    setError(null);
    const result = await apply({
      callId,
      contactId,
      columnId,
      agentNote: note.trim() || null,
    });
    setSubmitting(null);
    if (result.ok) {
      onApplied?.(columnId);
    } else {
      setError(result.error ?? 'Outcome failed');
      onFailed?.(result.error ?? 'Outcome failed');
    }
  };

  return (
    <div
      data-feature="CALLER__OUTCOME_SELECTOR"
      className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col gap-3"
    >
      <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
        Pick an outcome
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notes (optional) — what happened, next steps…"
        rows={2}
        className="text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/40 focus:border-[#1E9A80]"
      />

      {loading && (
        <div className="text-[12px] text-[#9CA3AF] italic">Loading columns…</div>
      )}

      {!loading && columns.length === 0 && (
        <div className="text-[12px] text-[#9CA3AF] italic">
          No pipeline columns. Ask admin to add stages in Settings.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {columns.map((c) => {
          const isSubmitting = submitting === c.id;
          return (
            <button
              key={c.id}
              type="button"
              disabled={!!submitting}
              onClick={() => void onPick(c.id)}
              className="inline-flex items-center justify-between gap-2 text-[13px] font-medium text-[#1A1A1A] bg-[#F3F3EE] hover:bg-[#ECFDF5] hover:text-[#1E9A80] px-3 py-2 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="truncate">{c.name}</span>
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 opacity-40" />
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
