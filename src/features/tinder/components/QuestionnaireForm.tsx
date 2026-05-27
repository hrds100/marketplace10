// QuestionnaireForm — renders the 19-question BRRRR call questionnaire.
//
// Rendered in two places:
//   • BrrrrCallPanel (dialer's COL 2 during / after a BRRRR call)
//   • BrrrrDetailModal (when clicking a BRRRR card on /crm/pipelines)
//
// Save semantics:
//   • As you type, on input BLUR we autosave the current state via
//     onAutoSave (no UI noise). Lets the VA fill answers during the call
//     without remembering to hit Save — the next time the form mounts
//     for the same call_id, the values are pre-populated.
//   • Clicking "Save & suggest next stage" calls onSave, which also
//     evaluates the stage-suggestion ruleset (e.g. "Property is sold,
//     suggest moving to Dead"). The dialer panel renders the suggestion
//     as a banner so the VA can apply it with one click.
//
// initialAnswers can change at runtime (e.g. another tab saves a new
// answer + realtime). We sync local state to incoming initialAnswers,
// but ONLY for keys the user hasn't started editing locally — otherwise
// a stale realtime ping would wipe the VA's in-flight typing.

import { useCallback, useEffect, useRef, useState } from "react";
import { QUESTIONS } from "../questionnaire";
import { suggestStage } from "../lib/offer-rules";
import type { PipelineStage } from "../types";

type Props = {
  initialAnswers: Record<string, string>;
  /** Explicit save (e.g. clicking the green button). Also returns a
   *  stage suggestion so the parent can show "Apply & sync" banner. */
  onSave: (answers: Record<string, string>, suggested: { stage: PipelineStage; reason: string }) => void | Promise<void>;
  /** Optional silent autosave fired on input blur. If unset, the form
   *  saves only on explicit submit. */
  onAutoSave?: (answers: Record<string, string>) => void | Promise<void>;
};

export function QuestionnaireForm({ initialAnswers, onSave, onAutoSave }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [busy, setBusy] = useState(false);
  const [autoSaveMsg, setAutoSaveMsg] = useState<string | null>(null);
  // Track which keys the user has touched locally so realtime initialAnswers
  // updates don't clobber in-flight typing. Reset when call_id changes
  // (initialAnswers' identity changes anyway).
  const dirtyKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Merge: take initialAnswers for untouched keys, keep local answers
    // for keys the user has typed in.
    setAnswers((prev) => {
      const merged: Record<string, string> = { ...initialAnswers };
      for (const k of dirtyKeys.current) {
        if (prev[k] !== undefined) merged[k] = prev[k];
      }
      return merged;
    });
  }, [initialAnswers]);

  const set = useCallback((k: string, v: string) => {
    dirtyKeys.current.add(k);
    setAnswers((prev) => ({ ...prev, [k]: v }));
  }, []);

  const handleBlur = useCallback(async () => {
    if (!onAutoSave) return;
    try {
      await onAutoSave(answers);
      setAutoSaveMsg("Saved");
      window.setTimeout(() => setAutoSaveMsg((m) => (m === "Saved" ? null : m)), 1500);
    } catch (e) {
      setAutoSaveMsg(`Autosave failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [answers, onAutoSave]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const suggested = suggestStage(answers);
      await onSave(answers, suggested);
      // Clear dirty so the next initialAnswers update can sync cleanly.
      dirtyKeys.current.clear();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {QUESTIONS.map((q) => {
          const val = answers[q.key] ?? "";
          const common =
            "mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
          return (
            <label key={q.key} className={q.type === "textarea" ? "col-span-2 block" : "block"}>
              <span className="text-xs font-medium text-slate-700">{q.label}</span>
              {q.type === "textarea" ? (
                <textarea
                  value={val}
                  onChange={(e) => set(q.key, e.target.value)}
                  onBlur={handleBlur}
                  rows={2}
                  className={common}
                />
              ) : q.type === "select" ? (
                <select
                  value={val}
                  onChange={(e) => set(q.key, e.target.value)}
                  onBlur={handleBlur}
                  className={common}
                >
                  <option value="">—</option>
                  {q.options!.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : q.type === "yesno" ? (
                <select
                  value={val}
                  onChange={(e) => set(q.key, e.target.value)}
                  onBlur={handleBlur}
                  className={common}
                >
                  <option value="">—</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              ) : (
                <input
                  type={q.type === "number" ? "number" : "text"}
                  value={val}
                  onChange={(e) => set(q.key, e.target.value)}
                  onBlur={handleBlur}
                  placeholder={q.placeholder}
                  className={common}
                />
              )}
            </label>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-3">
        {autoSaveMsg && (
          <span
            className={
              autoSaveMsg === "Saved"
                ? "text-[11px] text-emerald-700"
                : "text-[11px] text-rose-700"
            }
          >
            {autoSaveMsg}
          </span>
        )}
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save & suggest next stage"}
        </button>
      </div>
    </form>
  );
}
