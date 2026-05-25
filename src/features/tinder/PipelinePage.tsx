// Kanban board for the BRRRR calling pipeline.
// Click a card → expand for property details + floor plans + comps summary
// + VA questionnaire + stage controls (matches TAJU-BUILD-BRIEF Phase 2 spec).

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePipeline, useCallAnswers } from "./hooks/usePipeline";
import { usePushToCrm } from "./hooks/usePushToCrm";
import { useIsBrrrrAdmin } from "./hooks/useIsBrrrrAdmin";
import { useDerivedOffer, useDerivedOffers } from "./hooks/useDerivedOffer";
import { QuestionnaireForm } from "./components/QuestionnaireForm";
import { FloorPlanViewer } from "./components/FloorPlanViewer";
import { filterRent, filterSaleTarget, parsePrice, fmt } from "./lib/gdv";
import { formatGBP } from "./lib/offer";
import { PIPELINE_STAGES, STAGE_LABEL } from "./types";
import type { BrrrrComp, BrrrrFloorplan, PipelineStage, PipelineCard } from "./types";

const t = (name: string) => (supabase.from as any)(name);

function useCardExtras(property_id: string) {
  const [floorplans, setFloorplans] = useState<BrrrrFloorplan[]>([]);
  const [comps, setComps] = useState<BrrrrComp[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: fps }, { data: cs }] = await Promise.all([
        t("brrrr_floorplans").select("*").eq("property_id", property_id).order("page_number", { ascending: true }),
        t("brrrr_comps").select("*").eq("property_id", property_id),
      ]);
      if (cancelled) return;
      setFloorplans(((fps as BrrrrFloorplan[] | null) ?? []));
      setComps(((cs as BrrrrComp[] | null) ?? []));
    })();
    return () => { cancelled = true; };
  }, [property_id]);
  return { floorplans, comps };
}

const STAGE_COLOR: Record<PipelineStage, string> = {
  to_call: "bg-slate-100 text-slate-700",
  called_no_answer: "bg-amber-100 text-amber-700",
  called_waiting: "bg-blue-100 text-blue-700",
  offer_made: "bg-emerald-100 text-emerald-700",
  offer_rejected: "bg-rose-100 text-rose-700",
  offer_accepted: "bg-emerald-500 text-white",
  viewing_booked: "bg-indigo-100 text-indigo-700",
  under_offer: "bg-violet-100 text-violet-700",
  exchanged: "bg-green-600 text-white",
  dead: "bg-slate-300 text-slate-600",
};

export default function PipelinePage() {
  const { cards, loading, setStage, updateCall } = usePipeline();
  const [openId, setOpenId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m: Record<PipelineStage, PipelineCard[]> = Object.fromEntries(
      PIPELINE_STAGES.map((s) => [s, []])
    ) as Record<PipelineStage, PipelineCard[]>;
    cards.forEach((c) => m[c.stage]?.push(c));
    return m;
  }, [cards]);

  // Bulk-derive the calculated offer (or override) for every card.
  const propertyIds = useMemo(() => cards.map((c) => c.property_id), [cards]);
  const overrides = useMemo(() => {
    const m: Record<string, string | null> = {};
    cards.forEach((c) => { m[c.property_id] = c.offer_amount; });
    return m;
  }, [cards]);
  const { offers } = useDerivedOffers(propertyIds, overrides);

  return (
    <div className="p-4 bg-slate-50 min-h-full">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">BRRRR pipeline</h1>
        <p className="text-sm text-slate-500">{cards.length} deal{cards.length === 1 ? "" : "s"} active</p>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <div key={stage} className="flex-shrink-0 w-72 bg-white rounded-xl border border-slate-200">
            <div className={`px-3 py-2 rounded-t-xl text-xs font-semibold uppercase tracking-wide ${STAGE_COLOR[stage]}`}>
              {STAGE_LABEL[stage]} <span className="ml-1 opacity-70">({grouped[stage].length})</span>
            </div>
            <div className="p-2 space-y-2 max-h-[calc(100vh-13rem)] overflow-y-auto">
              {loading && stage === "to_call" && <div className="text-xs text-slate-400 p-2">Loading…</div>}
              {grouped[stage].map((c) => {
                const offer = offers.get(c.property_id);
                const offerBadge =
                  offer?.source === "override"
                    ? { tone: "bg-violet-100 text-violet-700", label: `Offer ${formatGBP(offer.amount)}`, hint: "Hugo override" }
                    : offer?.source === "calculated"
                    ? { tone: "bg-emerald-50 text-emerald-700", label: `Offer ${formatGBP(offer.amount)}`, hint: "calculated from GDV" }
                    : { tone: "bg-slate-100 text-slate-500", label: "Offer pending", hint: "No GDV data — Hugo to override" };
                return (
                  <button
                    key={c.id}
                    onClick={() => setOpenId(c.id)}
                    className="block w-full text-left bg-white border border-slate-200 rounded-lg p-2 hover:border-emerald-500 transition"
                  >
                    <div className="text-xs font-medium text-slate-800 truncate">{c.listing.address}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{c.listing.price}</div>
                    <div className="flex items-center justify-between mt-1.5 gap-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${offerBadge.tone}`} title={offerBadge.hint}>
                        {offerBadge.label}
                      </span>
                      {c.agent_name && (
                        <span className="text-[10px] text-slate-400 truncate">{c.agent_name}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {openId && (
        <CardDetail
          card={cards.find((c) => c.id === openId)!}
          onClose={() => setOpenId(null)}
          onStageChange={(stage) => setStage(openId, stage)}
          onUpdateCall={(patch) => updateCall(openId, patch)}
        />
      )}
    </div>
  );
}

function CardDetail({
  card,
  onClose,
  onStageChange,
  onUpdateCall,
}: {
  card: PipelineCard;
  onClose: () => void;
  onStageChange: (s: PipelineStage) => Promise<void>;
  onUpdateCall: (patch: Partial<PipelineCard>) => Promise<void>;
}) {
  const { answers, saveAnswers } = useCallAnswers(card.id);
  const { floorplans, comps } = useCardExtras(card.property_id);
  const { push } = usePushToCrm();
  const { isAdmin } = useIsBrrrrAdmin();
  const { offer: derivedOffer } = useDerivedOffer(card.property_id, card.offer_amount);
  const [suggestion, setSuggestion] = useState<{ stage: PipelineStage; reason: string } | null>(null);
  const [agentName, setAgentName] = useState(card.agent_name ?? "");
  const [agentPhone, setAgentPhone] = useState(card.agent_phone ?? "");
  const [notes, setNotes] = useState(card.notes ?? "");
  const [overrideInput, setOverrideInput] = useState(card.offer_amount ?? "");
  const [savingOverride, setSavingOverride] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  async function applyOverride() {
    if (!isAdmin) return;
    const trimmed = overrideInput.trim();
    setSavingOverride(true);
    try {
      // Send null when admin clears the field — reverts to calculated.
      await onUpdateCall({ offer_amount: trimmed || null });
    } finally {
      setSavingOverride(false);
    }
  }
  async function clearOverride() {
    if (!isAdmin) return;
    setSavingOverride(true);
    try {
      await onUpdateCall({ offer_amount: null });
      setOverrideInput("");
    } finally {
      setSavingOverride(false);
    }
  }

  async function handlePushToCrm() {
    setPushing(true);
    setPushError(null);
    const result = await push(card);
    setPushing(false);
    if (!result.ok) setPushError(result.error);
    // On success, push() already navigated to /crm/dialer-pro
  }

  const compsSummary = useMemo(() => {
    const sold = filterSaleTarget(comps).map((c) => parsePrice(c.price)).filter((v) => v > 0);
    const rent = filterRent(comps).map((c) => parsePrice(c.price)).filter((v) => v > 0);
    const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
    return {
      soldCount: sold.length,
      soldAvg: avg(sold),
      rentCount: rent.length,
      rentAvg: avg(rent),
    };
  }, [comps]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{card.listing.address}</h2>
            <p className="text-sm text-slate-500">
              {card.listing.price} · {card.listing.bedrooms || "?"} bed · {card.listing.property_type || ""}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">Stage:</span>
              <select
                value={card.stage}
                onChange={(e) => onStageChange(e.target.value as PipelineStage)}
                className="text-xs px-2 py-1 border border-slate-300 rounded"
              >
                {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
              </select>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        {/* Offer panel — derived from GDV by default. Hugo can override. */}
        <div className={`mx-6 mt-4 rounded-lg border p-4 ${
          derivedOffer?.source === "override" ? "border-violet-200 bg-violet-50"
          : derivedOffer?.source === "calculated" ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"
        }`}>
          <div className="flex items-baseline justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Offer to float
                {derivedOffer?.source === "override" && (
                  <span className="ml-1.5 normal-case text-violet-700">· Hugo override</span>
                )}
                {derivedOffer?.source === "calculated" && (
                  <span className="ml-1.5 normal-case text-emerald-700">· auto from GDV</span>
                )}
                {derivedOffer?.source === "unavailable" && (
                  <span className="ml-1.5 normal-case text-amber-700">· needs override</span>
                )}
              </div>
              <div className={`text-2xl font-bold ${
                derivedOffer?.source === "override" ? "text-violet-800"
                : derivedOffer?.source === "calculated" ? "text-emerald-800"
                : "text-amber-800"
              }`}>
                {derivedOffer?.amount != null ? formatGBP(derivedOffer.amount) : "—"}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">{derivedOffer?.reason ?? ""}</div>
            </div>
          </div>

          {isAdmin && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-end gap-2">
              <label className="flex-1">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Override offer (£)</span>
                <input
                  type="number"
                  value={overrideInput}
                  onChange={(e) => setOverrideInput(e.target.value)}
                  placeholder={derivedOffer?.source === "calculated" ? `${derivedOffer.amount} (calculated)` : "Hugo sets the number"}
                  disabled={savingOverride}
                  className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                />
              </label>
              <button
                type="button"
                onClick={applyOverride}
                disabled={savingOverride || overrideInput.trim() === (card.offer_amount ?? "")}
                className="px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded disabled:opacity-50"
              >Save override</button>
              {card.offer_amount && (
                <button
                  type="button"
                  onClick={clearOverride}
                  disabled={savingOverride}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >Clear → use calculated</button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 p-6">
          <div className="col-span-2">
            <h3 className="font-bold text-slate-800 mb-3">VA questionnaire</h3>
            <QuestionnaireForm
              initialAnswers={answers}
              onSave={async (ans, suggested) => {
                await saveAnswers(ans);
                setSuggestion(suggested);
              }}
            />

            {suggestion && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm font-semibold text-blue-800">
                  Suggested next stage: <span className="underline">{STAGE_LABEL[suggestion.stage]}</span>
                </div>
                <div className="text-xs text-blue-700 mt-1">{suggestion.reason}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => { onStageChange(suggestion.stage); setSuggestion(null); }}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >Apply suggestion</button>
                  <button
                    onClick={() => setSuggestion(null)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:underline"
                  >Dismiss</button>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <section className="bg-slate-50 rounded-lg overflow-hidden">
              <h4 className="px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Floor plan</h4>
              <div className="h-56 bg-white">
                <FloorPlanViewer floorplans={floorplans} />
              </div>
            </section>

            <section className="bg-slate-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Comps summary</h4>
              {compsSummary.soldCount === 0 && compsSummary.rentCount === 0 ? (
                <p className="text-xs text-slate-400">No comps fetched yet for this property.</p>
              ) : (
                <ul className="text-xs space-y-1">
                  <li className="flex justify-between">
                    <span className="text-slate-500">Target-bed sold avg ({compsSummary.soldCount})</span>
                    <span className="font-medium text-slate-800">{compsSummary.soldAvg ? fmt(compsSummary.soldAvg) : "—"}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-500">Rent avg ({compsSummary.rentCount})</span>
                    <span className="font-medium text-slate-800">{compsSummary.rentAvg ? `${fmt(compsSummary.rentAvg)} pcm` : "—"}</span>
                  </li>
                </ul>
              )}
            </section>

            <section className="bg-slate-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Agent</h4>
              <input
                placeholder="Name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                onBlur={() => onUpdateCall({ agent_name: agentName })}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm mb-2"
              />
              <input
                placeholder="Phone"
                value={agentPhone}
                onChange={(e) => setAgentPhone(e.target.value)}
                onBlur={() => onUpdateCall({ agent_phone: agentPhone })}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm mb-2"
              />
              <button
                type="button"
                onClick={handlePushToCrm}
                disabled={pushing || !agentPhone}
                className={`w-full px-2 py-2 rounded text-sm font-semibold transition ${
                  pushing
                    ? "bg-slate-200 text-slate-400 cursor-wait"
                    : agentPhone
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {pushing ? "Pushing to CRM…" : "📞 Push to CRM dialer"}
              </button>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
                Opens /crm/dialer-pro with this agent queued in the BRRRR campaign. Twilio dials from there.
              </p>
              {pushError && (
                <p className="text-[10px] text-rose-600 mt-1.5">{pushError}</p>
              )}
            </section>

            <section className="bg-slate-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Notes</h4>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => onUpdateCall({ notes })}
                rows={5}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
              />
            </section>

            {card.listing.listing_url && (
              <a href={card.listing.listing_url} target="_blank" rel="noreferrer"
                className="block text-sm font-medium text-emerald-700 hover:underline">
                View original Rightmove listing ↗
              </a>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
