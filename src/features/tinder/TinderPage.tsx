// Daily property review screen. Left list, right floor plan viewer.
// Skip / Potential (← / →) saves to brrrr_reviews then auto-advances.

import { useEffect, useMemo, useState } from "react";
import { useListings } from "./hooks/useListings";
import { FloorPlanViewer } from "./components/FloorPlanViewer";
import { PropertyCard } from "./components/PropertyCard";
import type { ListingWithFloorplans, ReviewStatus } from "./types";

type Tab = "unreviewed" | "potential" | "skip";

export default function TinderPage() {
  const { listings, loading, error, saveReview } = useListings();
  const [tab, setTab] = useState<Tab>("unreviewed");
  const [selectedPid, setSelectedPid] = useState<string | null>(null);

  const filtered = useMemo(() => listings.filter((l) => {
    if (tab === "unreviewed") return l.review_status === null;
    return l.review_status === tab;
  }), [listings, tab]);

  const counts = useMemo(() => ({
    unreviewed: listings.filter((l) => l.review_status === null).length,
    potential:  listings.filter((l) => l.review_status === "potential").length,
    skip:       listings.filter((l) => l.review_status === "skip").length,
  }), [listings]);

  // Always have something selected when the filtered list is non-empty.
  useEffect(() => {
    if (filtered.length === 0) { setSelectedPid(null); return; }
    if (selectedPid && filtered.some((l) => l.property_id === selectedPid)) return;
    setSelectedPid(filtered[0].property_id);
  }, [filtered, selectedPid]);

  const selected = useMemo(
    () => listings.find((l) => l.property_id === selectedPid) ?? null,
    [listings, selectedPid]
  );

  async function decide(status: ReviewStatus) {
    if (!selected) return;
    await saveReview(selected.property_id, status);
    // Auto-advance: pick the next un-reviewed property in the current filtered list.
    const next = filtered.find((l) => l.property_id !== selected.property_id && l.review_status === null);
    setSelectedPid(next ? next.property_id : null);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); decide("skip"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); decide("potential"); }
      else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const idx = filtered.findIndex((l) => l.property_id === selectedPid);
        const step = e.key === "ArrowUp" ? -1 : 1;
        const next = filtered[idx + step];
        if (next) setSelectedPid(next.property_id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex h-full bg-white">
      {/* Left list */}
      <aside className="w-[30%] min-w-[320px] flex flex-col border-r border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex">
            {([
              ["unreviewed", "Unreviewed", counts.unreviewed],
              ["potential",  "Potential",  counts.potential],
              ["skip",       "Skipped",    counts.skip],
            ] as const).map(([id, label, n]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition ${
                  tab === id
                    ? "bg-white text-slate-800 border-b-2 border-emerald-500"
                    : "bg-slate-50 text-slate-500 hover:text-slate-700"
                }`}
              >{label} ({n})</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-6 text-sm text-slate-500">Loading…</div>}
          {error && <div className="p-6 text-sm text-rose-600">Error: {error}</div>}
          {!loading && filtered.length === 0 && (
            <div className="p-6 text-sm text-slate-400">Nothing in this tab.</div>
          )}
          {filtered.map((l) => (
            <PropertyCard
              key={l.property_id}
              listing={l}
              selected={selectedPid === l.property_id}
              onClick={() => setSelectedPid(l.property_id)}
            />
          ))}
        </div>
      </aside>

      {/* Right detail */}
      <main className="flex-1 flex flex-col">
        {selected ? <Detail listing={selected} onDecide={decide} /> : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Pick a property from the list.
          </div>
        )}
      </main>
    </div>
  );
}

function Detail({ listing, onDecide }: { listing: ListingWithFloorplans; onDecide: (s: ReviewStatus) => void }) {
  const price = listing.price_qualifier
    ? `${listing.price_qualifier} ${listing.price}`
    : listing.price || "No price";
  const size = listing.floor_area_sqm
    ? `${listing.floor_area_sqm} sqm (${listing.floor_area_sqft || Math.round(parseFloat(listing.floor_area_sqm) * 10.764)} sqft)`
    : listing.floor_area_sqft
    ? `${listing.floor_area_sqft} sqft`
    : null;

  return (
    <>
      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-baseline gap-4 flex-wrap">
          <div className="text-2xl font-bold text-slate-800">{price}</div>
          <div className="text-sm text-slate-600">{listing.address || ""}</div>
          <div className="text-xs text-slate-500">{listing.bedrooms || "?"} bed · {listing.property_type || ""}</div>
          {size && <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{size}</span>}
          {listing.is_auction === "1" && (
            <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">AUCTION</span>
          )}
          {listing.days_on_market && (
            <span className="text-xs text-slate-500">{listing.days_on_market} days on market</span>
          )}
          {listing.listing_url && (
            <a href={listing.listing_url} target="_blank" rel="noreferrer"
              className="ml-auto text-sm text-emerald-700 hover:underline">View on Rightmove ↗</a>
          )}
        </div>
        {(listing.agent_name || listing.agent_phone) && (
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
            {listing.agent_name && <span className="font-medium">{listing.agent_name}</span>}
            {listing.agent_phone && (
              <a href={`tel:${listing.agent_phone.replace(/\s+/g, "")}`}
                className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono">
                ☎ {listing.agent_phone}
              </a>
            )}
            {listing.agent_branch_url && (
              <a href={listing.agent_branch_url} target="_blank" rel="noreferrer"
                className="text-slate-500 hover:underline">branch ↗</a>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0">
        <FloorPlanViewer floorplans={listing.floorplans} />
      </div>

      <footer className="px-6 py-4 border-t border-slate-200 bg-white flex gap-3">
        <button
          onClick={() => onDecide("skip")}
          className="flex-1 px-4 py-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold transition"
        >Skip <span className="text-xs ml-1 opacity-70">← arrow</span></button>
        <button
          onClick={() => onDecide("potential")}
          className="flex-1 px-4 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition"
        >Potential <span className="text-xs ml-1 opacity-90">arrow →</span></button>
      </footer>
    </>
  );
}
