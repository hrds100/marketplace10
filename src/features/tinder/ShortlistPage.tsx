// Properties marked "potential" — table view with Push-to-Pipeline action.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useListings } from "./hooks/useListings";
import { usePipeline } from "./hooks/usePipeline";
import { useCompsCoverage } from "./hooks/useCompsCoverage";
import { PushToPipelineModal } from "./components/PushToPipelineModal";
import type { ListingWithFloorplans } from "./types";

export default function ShortlistPage() {
  const { listings, loading } = useListings();
  const { cards, pushToPipeline, reload } = usePipeline();
  const { hasComps, loading: compsLoading } = useCompsCoverage();
  const [pushing, setPushing] = useState<ListingWithFloorplans | null>(null);

  const shortlisted = useMemo(
    () => listings.filter((l) => l.review_status === "potential"),
    [listings]
  );
  const inPipeline = useMemo(() => {
    const s = new Set(cards.map((c) => c.property_id));
    return s;
  }, [cards]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Shortlist</h1>
          <p className="text-sm text-slate-500 mt-1">
            {shortlisted.length} potential propert{shortlisted.length === 1 ? "y" : "ies"} — swipe-right from the Tinder review
          </p>
        </div>
        <Link
          to="/tinder/pipeline"
          className="text-sm font-medium text-emerald-700 hover:underline"
        >View pipeline →</Link>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Address</th>
              <th className="text-left px-4 py-3">Price</th>
              <th className="text-left px-4 py-3">Beds</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Size</th>
              <th className="text-left px-4 py-3">Agent</th>
              <th className="text-left px-4 py-3">Comps</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            )}
            {!loading && shortlisted.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No shortlist yet — swipe right on properties in /tinder.</td></tr>
            )}
            {shortlisted.map((l) => {
              const price = l.price_qualifier ? `${l.price_qualifier} ${l.price}` : l.price || "";
              const size = l.floor_area_sqm ? `${l.floor_area_sqm} sqm` : l.floor_area_sqft ? `${l.floor_area_sqft} sqft` : "—";
              const inPipe = inPipeline.has(l.property_id);
              const compsReady = hasComps(l.property_id);
              return (
                <tr key={l.property_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-800 max-w-md">
                    <div className="truncate">{l.address}</div>
                    {l.listing_url && (
                      <a href={l.listing_url} target="_blank" rel="noreferrer"
                        className="text-xs text-emerald-700 hover:underline">Rightmove ↗</a>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{price}</td>
                  <td className="px-4 py-3">{l.bedrooms || "?"}</td>
                  <td className="px-4 py-3 text-slate-600">{l.property_type || ""}</td>
                  <td className="px-4 py-3 text-slate-600">{size}</td>
                  <td className="px-4 py-3">
                    {l.agent_phone ? (
                      <div className="flex flex-col">
                        <a href={`tel:${l.agent_phone.replace(/\s+/g, "")}`}
                          className="text-emerald-700 hover:underline font-mono">{l.agent_phone}</a>
                        {l.agent_name && <span className="text-xs text-slate-500">{l.agent_name}</span>}
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {compsLoading ? (
                      <span className="text-xs text-slate-400">…</span>
                    ) : compsReady ? (
                      <span className="text-[11px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">Comps ready</span>
                    ) : (
                      <Link to="/tinder/comps" className="text-[11px] bg-slate-100 text-slate-500 hover:bg-slate-200 px-1.5 py-0.5 rounded font-medium">Fetch comps →</Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inPipe ? (
                      <Link to="/tinder/pipeline" className="text-xs text-slate-500 hover:underline">In pipeline →</Link>
                    ) : compsReady ? (
                      <button
                        onClick={() => setPushing(l)}
                        className="px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium"
                      >Push to pipeline</button>
                    ) : (
                      <button
                        disabled
                        title="Fetch comps for this property before pushing to the pipeline — the offer amount needs GDV evidence."
                        className="px-3 py-1.5 text-xs bg-slate-200 text-slate-400 rounded-lg font-medium cursor-not-allowed"
                      >Comps needed</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pushing && (
        <PushToPipelineModal
          listing={pushing}
          onClose={() => setPushing(null)}
          onConfirm={async (offer) => {
            await pushToPipeline(pushing.property_id, offer);
            await reload();
          }}
        />
      )}
    </div>
  );
}
