// Comps + GDV per shortlisted property. Left list, right comps + calculator.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useShortlistedWithComps } from "./hooks/useComps";
import { usePipeline } from "./hooks/usePipeline";
import { useRefreshComps } from "./hooks/useRefreshComps";
import { CompTable } from "./components/CompTable";
import { GDVCalculator } from "./components/GDVCalculator";
import { DealCalculator } from "./components/DealCalculator";
import { PushToPipelineModal } from "./components/PushToPipelineModal";
import { filterRent, filterSaleSame, filterSaleTarget, fmt } from "./lib/gdv";
import type { ShortlistedSubject } from "./hooks/useComps";

export default function CompsPage() {
  const { subjects, loading, reload: reloadComps } = useShortlistedWithComps();
  const { cards, pushToPipeline, reload: reloadPipeline } = usePipeline();
  const { refresh: refreshComps, isBusy: isRefreshing, error: refreshError } = useRefreshComps();
  const [selectedPid, setSelectedPid] = useState<string | null>(null);
  const [gdv, setGdv] = useState(0);
  const [pushing, setPushing] = useState<ShortlistedSubject | null>(null);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  async function handleRefreshComps(property_id: string) {
    setRefreshMsg(null);
    const result = await refreshComps(property_id);
    if (result.ok) {
      setRefreshMsg(`✓ Fetched ${result.count} comp${result.count === 1 ? "" : "s"}`);
      await reloadComps();
      // Clear the success message after 5 seconds
      setTimeout(() => setRefreshMsg((m) => (m?.startsWith("✓") ? null : m)), 5000);
    } else {
      setRefreshMsg(`✗ ${result.error}`);
    }
  }

  const subject = useMemo(
    () => subjects.find((s) => s.property_id === selectedPid) ?? subjects[0] ?? null,
    [subjects, selectedPid]
  );

  const inPipeline = useMemo(
    () => new Set(cards.map((c) => c.property_id)),
    [cards]
  );
  const compsReady = !!subject && subject.comps.length > 0;
  const isInPipeline = !!subject && inPipeline.has(subject.property_id);
  // Suggested offer = 70% of GDV (opening) — what gets pre-filled in the modal.
  const suggestedOffer = gdv > 0 ? Math.round(gdv * 0.70) : null;

  return (
    <div className="flex h-full bg-white">
      <aside className="w-[28%] min-w-[300px] border-r border-slate-200 overflow-y-auto">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Shortlist</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subjects.length} propert{subjects.length === 1 ? "y" : "ies"}</p>
        </div>
        {loading && <div className="p-4 text-sm text-slate-500">Loading…</div>}
        {!loading && subjects.length === 0 && (
          <div className="p-4 text-sm text-slate-400">No shortlisted properties. Mark some as Potential in /tinder.</div>
        )}
        {subjects.map((s) => {
          const price = s.price_qualifier ? `${s.price_qualifier} ${s.price}` : s.price;
          const hasComps = s.comps.length > 0;
          return (
            <button
              key={s.property_id}
              onClick={() => setSelectedPid(s.property_id)}
              className={`block w-full text-left p-3 border-b border-slate-100 ${subject?.property_id === s.property_id ? "bg-emerald-50 border-l-4 border-l-emerald-500" : "hover:bg-slate-50"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">{price}</div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{s.address}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.bedrooms || "?"} bed · {s.property_type || ""}</div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${hasComps ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>
                  {hasComps ? "Comps ready" : "No comps"}
                </span>
              </div>
            </button>
          );
        })}
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        {!subject ? (
          <div className="text-slate-400 text-sm">Select a property.</div>
        ) : (
          <>
            <header className="mb-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-800">
                  {subject.price_qualifier ? `${subject.price_qualifier} ${subject.price}` : subject.price}
                </h1>
                <p className="text-sm text-slate-600 mt-1">{subject.address}</p>
                <p className="text-xs text-slate-500">
                  {subject.bedrooms || "?"} bed {subject.property_type || ""} → converting to {(parseInt(subject.bedrooms ?? "1") || 1) + 1}-bed
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRefreshComps(subject.property_id)}
                    disabled={isRefreshing(subject.property_id)}
                    title="Runs Playwright + Land Registry on the scraper server. Takes 30–90 seconds."
                    className={`px-3 py-2 text-sm rounded-lg font-medium transition ${
                      isRefreshing(subject.property_id)
                        ? "bg-slate-100 text-slate-400 cursor-wait"
                        : "bg-white border border-slate-300 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {isRefreshing(subject.property_id) ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        Fetching comps…
                      </span>
                    ) : compsReady ? "🔄 Refresh comps" : "🔄 Fetch comps"}
                  </button>
                  {isInPipeline ? (
                    <Link
                      to="/tinder/pipeline"
                      className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                    >Already in pipeline →</Link>
                  ) : compsReady ? (
                    <button
                      onClick={() => setPushing(subject)}
                      className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold shadow-sm"
                    >📞 Push to pipeline</button>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 text-sm bg-slate-200 text-slate-400 rounded-lg font-semibold cursor-not-allowed"
                      title="Run the comps fetcher first — pipeline needs comps for the offer math."
                    >Comps needed</button>
                  )}
                </div>
                {refreshMsg && (
                  <span className={`text-[11px] ${refreshMsg.startsWith("✓") ? "text-emerald-700" : "text-rose-600"}`}>
                    {refreshMsg}
                  </span>
                )}
                {suggestedOffer && !isInPipeline && compsReady && (
                  <p className="text-[11px] text-slate-500">
                    Suggested offer from GDV: {fmt(suggestedOffer)} (70%)
                  </p>
                )}
              </div>
            </header>

            <GDVCalculator
              subject={subject}
              targetComps={filterSaleTarget(subject.comps)}
              onGdvChange={setGdv}
            />

            <DealCalculator
              subject={subject}
              rentComps={filterRent(subject.comps)}
              gdv={gdv}
            />

            <section className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-slate-800 mb-3">Same-bed sold comps</h3>
                <CompTable comps={filterSaleSame(subject.comps)} kind="sale" emptyText="No same-bed sold comps." />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-3">Target-bed sold comps</h3>
                <CompTable comps={filterSaleTarget(subject.comps)} kind="sale" emptyText="No target-bed sold comps — find comps manually before offering." />
              </div>
            </section>

            <section className="mt-6">
              <h3 className="font-bold text-slate-800 mb-3">Rental comps</h3>
              <CompTable comps={filterRent(subject.comps)} kind="rent" emptyText="No rental comps." />
            </section>
          </>
        )}
      </main>

      {pushing && (
        <PushToPipelineModal
          listing={pushing}
          suggestedOffer={suggestedOffer ?? undefined}
          onClose={() => setPushing(null)}
          onConfirm={async (offer) => {
            await pushToPipeline(pushing.property_id, offer);
            await reloadPipeline();
          }}
        />
      )}
    </div>
  );
}
