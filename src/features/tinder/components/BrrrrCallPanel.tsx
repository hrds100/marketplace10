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
import { STAGE_LABEL } from "../types";
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

type Props = { contactId: string };

export default function BrrrrCallPanel({ contactId }: Props) {
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
  return <Panel tag={tag} history={history} setTag={setTag} askingPrice={askingPrice} />;
}

function Panel({
  tag, history, setTag, askingPrice,
}: {
  tag: BrrrrTag;
  history: BrrrrTag[];
  setTag: (t: BrrrrTag) => void;
  askingPrice: string | null;
}) {
  const { answers, saveAnswers } = useCallAnswers(tag.brrrr_call_id);
  const [savedSuggestion, setSavedSuggestion] = useState<{ stage: PipelineStage; reason: string } | null>(null);
  const [applying, setApplying] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const applyStage = useCallback(async (stage: PipelineStage) => {
    setApplying(true);
    const { error } = await t("brrrr_calls")
      .update({ stage, called_at: new Date().toISOString() })
      .eq("id", tag.brrrr_call_id);
    setApplying(false);
    if (error) { setDoneMsg(`Failed to sync stage: ${error.message}`); return; }
    setDoneMsg(`Synced to /tinder/pipeline → ${STAGE_LABEL[stage]}`);
    setSavedSuggestion(null);
  }, [tag.brrrr_call_id]);

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
