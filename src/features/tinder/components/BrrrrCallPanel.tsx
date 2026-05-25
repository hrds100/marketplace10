// In-call BRRRR questionnaire — injected into the CRM dialer-pro WrapUpCard.
//
// Phase 2 of the BRRRR ↔ CRM bridge. When the dialer is dialling a contact
// that was pushed from /tinder/pipeline (custom_fields.source === 'brrrr'),
// this panel renders inline with the WrapUpCard so the VA fills the 19-
// question questionnaire WHILE on the phone. Saves flow back to
// brrrr_call_answers + suggest a stage transition on brrrr_calls.
//
// For non-BRRRR contacts the panel renders null — invisible to the regular
// dialer flow.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCallAnswers } from "../hooks/usePipeline";
import { QuestionnaireForm } from "./QuestionnaireForm";
import { PIPELINE_STAGES, STAGE_LABEL } from "../types";
import type { PipelineStage } from "../types";

const t = (name: string) => (supabase.from as any)(name);

type BrrrrTag = {
  source: "brrrr";
  brrrr_call_id: string;
  brrrr_property_id: string;
  brrrr_address?: string;
  pushed_at: string;
};

type ContactCustomFields = {
  source?: string;
  brrrr?: BrrrrTag;
  brrrr_history?: BrrrrTag[];
};

type Props = {
  contactId: string;
  /** Optional: when this comes from /crm/dialer-pro the parent passes the
   *  active wk_dialer_queue.id so the panel can mark it done after the agent
   *  picks a stage — keeps the BRRRR contact from showing up again. */
  queueRowId?: string | null;
};

// Stage groupings for the quick-pick grid. Mirrors the columns on
// /tinder/pipeline. brrrr_calls.stage is the single source of truth.
const STAGE_TONE: Record<PipelineStage, string> = {
  to_call:          "bg-slate-100 text-slate-700 hover:bg-slate-200",
  called_no_answer: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  called_waiting:   "bg-blue-100 text-blue-800 hover:bg-blue-200",
  offer_made:       "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  offer_rejected:   "bg-rose-100 text-rose-800 hover:bg-rose-200",
  offer_accepted:   "bg-emerald-500 text-white hover:bg-emerald-600",
  viewing_booked:   "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
  under_offer:      "bg-violet-100 text-violet-800 hover:bg-violet-200",
  exchanged:        "bg-green-600 text-white hover:bg-green-700",
  dead:             "bg-slate-300 text-slate-700 hover:bg-slate-400",
};

export default function BrrrrCallPanel({ contactId, queueRowId }: Props) {
  const [tag, setTag] = useState<BrrrrTag | null>(null);
  const [history, setHistory] = useState<BrrrrTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [askingPrice, setAskingPrice] = useState<string | null>(null);

  // 1. On contact change, fetch custom_fields to detect a BRRRR contact and
  //    pull the history of properties pushed for them.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await t("wk_contacts")
        .select("custom_fields")
        .eq("id", contactId)
        .maybeSingle();
      if (cancelled) return;
      const cf = (data?.custom_fields ?? {}) as ContactCustomFields;
      if (cf?.source !== "brrrr" || !cf.brrrr) {
        setTag(null); setHistory([]); setLoading(false);
        return;
      }
      setTag(cf.brrrr);
      setHistory(cf.brrrr_history ?? [cf.brrrr]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  // 2. When the selected BRRRR call changes, also grab the asking price for
  //    quick reference at the top of the panel.
  useEffect(() => {
    if (!tag) return;
    let cancelled = false;
    (async () => {
      const { data } = await t("brrrr_listings")
        .select("price, price_qualifier")
        .eq("property_id", tag.brrrr_property_id)
        .maybeSingle();
      if (cancelled) return;
      const p = data as { price?: string; price_qualifier?: string } | null;
      setAskingPrice(p ? [p.price_qualifier, p.price].filter(Boolean).join(" ").trim() || null : null);
    })();
    return () => { cancelled = true; };
  }, [tag?.brrrr_property_id]);

  if (loading || !tag) return null;
  return <Panel tag={tag} history={history} setTag={setTag} askingPrice={askingPrice} queueRowId={queueRowId} />;
}

function Panel({
  tag, history, setTag, askingPrice, queueRowId,
}: {
  tag: BrrrrTag;
  history: BrrrrTag[];
  setTag: (t: BrrrrTag) => void;
  askingPrice: string | null;
  queueRowId?: string | null;
}) {
  const { answers, saveAnswers } = useCallAnswers(tag.brrrr_call_id);
  const [savedSuggestion, setSavedSuggestion] = useState<{ stage: PipelineStage; reason: string } | null>(null);
  const [applying, setApplying] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<PipelineStage | null>(null);

  // Load the current stage so the quick-pick grid can highlight it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await t("brrrr_calls")
        .select("stage")
        .eq("id", tag.brrrr_call_id)
        .maybeSingle();
      if (cancelled) return;
      setCurrentStage((data?.stage as PipelineStage | undefined) ?? null);
    })();
    return () => { cancelled = true; };
  }, [tag.brrrr_call_id]);

  const applyStage = useCallback(async (stage: PipelineStage) => {
    setApplying(true);
    setDoneMsg(null);
    const { error } = await t("brrrr_calls")
      .update({ stage, called_at: new Date().toISOString() })
      .eq("id", tag.brrrr_call_id);
    if (error) { setApplying(false); setDoneMsg(`Failed to sync stage: ${error.message}`); return; }

    // Mark the dialer queue row as done so the lead exits the BRRRR queue.
    if (queueRowId) {
      await t("wk_dialer_queue")
        .update({ status: "done", last_attempt_at: new Date().toISOString() })
        .eq("id", queueRowId);
    }

    setCurrentStage(stage);
    setApplying(false);
    setSavedSuggestion(null);
    setDoneMsg(`Synced to /tinder/pipeline → ${STAGE_LABEL[stage]}`);
  }, [tag.brrrr_call_id, queueRowId]);

  return (
    <div className="mx-4 mb-3 rounded-lg border-2 border-emerald-300 bg-emerald-50/50 overflow-hidden">
      {/* Header */}
      <div className="bg-emerald-100 px-3 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">BRRRR call</div>
          <div className="text-[13px] font-semibold text-emerald-900 truncate">
            {tag.brrrr_address || "(no address)"}
          </div>
          {askingPrice && (
            <div className="text-[11px] text-emerald-700">Asking: {askingPrice}</div>
          )}
        </div>
        <a
          href={`/tinder/pipeline`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-[10px] font-medium text-emerald-700 hover:underline whitespace-nowrap"
        >Open card ↗</a>
      </div>

      {/* Stage quick-pick — writes brrrr_calls.stage directly. /tinder/pipeline
          reads the same column, so the card moves there in real time. */}
      <div className="px-3 py-3 border-b border-emerald-200 bg-white">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">
          Pick stage <span className="font-normal text-emerald-600 normal-case">— syncs to /tinder/pipeline</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {PIPELINE_STAGES.map((stage) => {
            const isCurrent = currentStage === stage;
            const tone = STAGE_TONE[stage];
            return (
              <button
                key={stage}
                type="button"
                disabled={applying}
                onClick={() => applyStage(stage)}
                className={`text-[11px] font-medium rounded px-2 py-1.5 transition disabled:opacity-50 ${tone} ${
                  isCurrent ? "ring-2 ring-offset-1 ring-emerald-600" : ""
                }`}
                title={isCurrent ? "Current stage" : `Move to ${STAGE_LABEL[stage]}`}
              >
                {STAGE_LABEL[stage]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-property picker (only if this agent covers multiple BRRRR listings) */}
      {history.length > 1 && (
        <div className="px-3 py-2 border-b border-emerald-200">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-emerald-700 mb-1">
            Which property is this call about?
          </label>
          <select
            value={tag.brrrr_call_id}
            onChange={(e) => {
              const next = history.find((h) => h.brrrr_call_id === e.target.value);
              if (next) setTag(next);
            }}
            className="w-full text-xs px-2 py-1.5 border border-emerald-300 rounded bg-white"
          >
            {history.map((h) => (
              <option key={h.brrrr_call_id} value={h.brrrr_call_id}>
                {h.brrrr_address || h.brrrr_property_id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* The 19-question form */}
      <div className="p-3 bg-white">
        <QuestionnaireForm
          initialAnswers={answers}
          onSave={async (ans, suggested) => {
            await saveAnswers(ans);
            setSavedSuggestion(suggested);
          }}
        />
      </div>

      {/* Auto-stage suggestion */}
      {savedSuggestion && (
        <div className="mx-3 mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-blue-800">
            Suggested next stage: <span className="underline">{STAGE_LABEL[savedSuggestion.stage]}</span>
          </div>
          <div className="text-xs text-blue-700 mt-1">{savedSuggestion.reason}</div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={applying}
              onClick={() => applyStage(savedSuggestion.stage)}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >{applying ? "Syncing…" : "Apply & sync"}</button>
            <button
              type="button"
              onClick={() => setSavedSuggestion(null)}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:underline"
            >Dismiss</button>
          </div>
        </div>
      )}

      {doneMsg && (
        <div className="mx-3 mb-3 text-xs text-emerald-700 bg-emerald-100 rounded px-2 py-1.5">
          {doneMsg}
        </div>
      )}
    </div>
  );
}
