// Kanban board for the BRRRR calling pipeline.
// Click a card → expand for property details + VA questionnaire + stage controls.

import { useMemo, useState } from "react";
import { usePipeline, useCallAnswers } from "./hooks/usePipeline";
import { QuestionnaireForm } from "./components/QuestionnaireForm";
import { PIPELINE_STAGES, STAGE_LABEL } from "./types";
import type { PipelineStage, PipelineCard } from "./types";

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
              {grouped[stage].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setOpenId(c.id)}
                  className="block w-full text-left bg-white border border-slate-200 rounded-lg p-2 hover:border-emerald-500 transition"
                >
                  <div className="text-xs font-medium text-slate-800 truncate">{c.listing.address}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{c.listing.price}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    {c.offer_amount ? (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                        Offer £{parseInt(c.offer_amount).toLocaleString()}
                      </span>
                    ) : <span />}
                    {c.agent_name && (
                      <span className="text-[10px] text-slate-400 truncate">{c.agent_name}</span>
                    )}
                  </div>
                </button>
              ))}
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
  const [suggestion, setSuggestion] = useState<{ stage: PipelineStage; reason: string } | null>(null);
  const [agentName, setAgentName] = useState(card.agent_name ?? "");
  const [agentPhone, setAgentPhone] = useState(card.agent_phone ?? "");
  const [notes, setNotes] = useState(card.notes ?? "");

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{card.listing.address}</h2>
            <p className="text-sm text-slate-500">
              {card.listing.price} · {card.listing.bedrooms || "?"} bed · {card.listing.property_type || ""}
              {card.offer_amount && <span className="ml-2 text-emerald-700 font-medium">Offer: £{parseInt(card.offer_amount).toLocaleString()}</span>}
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
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
              />
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
