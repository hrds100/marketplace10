import { useEffect, useState } from "react";
import { QUESTIONS } from "../questionnaire";
import { suggestStage } from "../lib/offer-rules";
import type { PipelineStage } from "../types";

type Props = {
  initialAnswers: Record<string, string>;
  onSave: (answers: Record<string, string>, suggested: { stage: PipelineStage; reason: string }) => void | Promise<void>;
};

export function QuestionnaireForm({ initialAnswers, onSave }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [busy, setBusy] = useState(false);
  useEffect(() => setAnswers(initialAnswers), [initialAnswers]);

  function set(k: string, v: string) {
    setAnswers((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const suggested = suggestStage(answers);
      await onSave(answers, suggested);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {QUESTIONS.map((q) => {
          const val = answers[q.key] ?? "";
          const common = "mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
          return (
            <label key={q.key} className={q.type === "textarea" ? "col-span-2 block" : "block"}>
              <span className="text-xs font-medium text-slate-700">{q.label}</span>
              {q.type === "textarea" ? (
                <textarea
                  value={val}
                  onChange={(e) => set(q.key, e.target.value)}
                  rows={2}
                  className={common}
                />
              ) : q.type === "select" ? (
                <select value={val} onChange={(e) => set(q.key, e.target.value)} className={common}>
                  <option value="">—</option>
                  {q.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : q.type === "yesno" ? (
                <select value={val} onChange={(e) => set(q.key, e.target.value)} className={common}>
                  <option value="">—</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              ) : (
                <input
                  type={q.type === "number" ? "number" : "text"}
                  value={val}
                  onChange={(e) => set(q.key, e.target.value)}
                  placeholder={q.placeholder}
                  className={common}
                />
              )}
            </label>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50"
        >{busy ? "Saving…" : "Save & suggest next stage"}</button>
      </div>
    </form>
  );
}
