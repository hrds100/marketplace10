// GDV calculator — the money math. Ported from comps_app.js.
// Drives the offer banner (70%–75% of GDV).

import { useEffect, useMemo, useState } from "react";
import { computeGdv, sqmToSqft, fmt, parsePrice } from "../lib/gdv";
import type { BrrrrComp, BrrrrListing } from "../types";

type Props = {
  subject: BrrrrListing;
  targetComps: BrrrrComp[];
  onGdvChange?: (gdv: number) => void;
};

export function GDVCalculator({ subject, targetComps, onGdvChange }: Props) {
  // Seed property size from listing → fallback to same-bed comp average.
  const seedSqft = useMemo(() => {
    if (subject.floor_area_sqft && parseFloat(subject.floor_area_sqft) > 0) {
      return parseInt(subject.floor_area_sqft);
    }
    if (subject.floor_area_sqm && parseFloat(subject.floor_area_sqm) > 0) {
      return Math.round(sqmToSqft(parseFloat(subject.floor_area_sqm)));
    }
    return 600;
  }, [subject]);

  const [sqft, setSqft] = useState(seedSqft);
  const [manualPpsf, setManualPpsf] = useState<string>("");

  useEffect(() => { setSqft(seedSqft); }, [seedSqft]);

  const result = useMemo(
    () => computeGdv({
      sqft,
      manualPpsf: parseFloat(manualPpsf) || undefined,
      comps: targetComps,
    }),
    [sqft, manualPpsf, targetComps]
  );

  useEffect(() => { onGdvChange?.(result.gdv); }, [result.gdv, onGdvChange]);

  const askingPrice = parsePrice(subject.price);
  const uplift = askingPrice > 0 && result.gdv > 0
    ? Math.round(((result.gdv - askingPrice) / askingPrice) * 100)
    : 0;

  const noCompData = targetComps.length === 0;
  const opening = Math.round(result.gdv * 0.70);
  const maxOffer = Math.round(result.gdv * 0.75);

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-bold text-slate-800 mb-1">GDV calculator</h3>
      <p className="text-xs text-slate-500 mb-4">Projected value after converting to {(parseInt(subject.bedrooms ?? "1") || 1) + 1}-bed. Uses target-bed sold comps within 200 m.</p>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs text-slate-600 font-medium">Property size (sqft)</span>
          <input
            type="number"
            value={sqft}
            onChange={(e) => setSqft(parseInt(e.target.value) || 0)}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
          <input
            type="range"
            min={300}
            max={1200}
            value={Math.min(1200, Math.max(300, sqft))}
            onChange={(e) => setSqft(parseInt(e.target.value))}
            className="w-full mt-2"
          />
          <span className="text-xs text-slate-500">{Math.round(sqft / 10.764)} sqm</span>
        </label>

        <label className="block">
          <span className="text-xs text-slate-600 font-medium">£ per sqft (override)</span>
          <input
            type="number"
            value={manualPpsf}
            onChange={(e) => setManualPpsf(e.target.value)}
            placeholder={result.ppsf ? String(result.ppsf) : "—"}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
          <div className="text-xs text-slate-500 mt-2">Comp avg: {result.ppsf ? `£${result.ppsf}` : "—"}</div>
        </label>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">£/sqft used</div>
          <div className="text-xl font-bold text-slate-800">{result.ppsf > 0 ? `£${result.ppsf}` : "—"}</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-emerald-700">GDV</div>
          <div className="text-xl font-bold text-emerald-700">{result.gdv > 0 ? fmt(result.gdv) : "—"}</div>
        </div>
        <div className={`rounded-lg p-3 ${uplift >= 35 ? "bg-emerald-50 text-emerald-700" : uplift >= 25 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
          <div className="text-[10px] uppercase tracking-wide opacity-70">Uplift vs asking</div>
          <div className="text-xl font-bold">{uplift > 0 ? `${uplift}%` : "—"}</div>
        </div>
      </div>

      {result.gdv > 0 && (
        <div className={`mt-4 rounded-lg p-4 text-center border-2 ${noCompData ? "border-amber-500 bg-amber-50" : "border-emerald-500 bg-emerald-50"}`}>
          <div className={`text-xl font-bold ${noCompData ? "text-amber-800" : "text-emerald-800"}`}>
            Offer between {fmt(opening)} and {fmt(maxOffer)} maximum
          </div>
          <div className={`text-sm mt-1 ${noCompData ? "text-amber-700" : "text-emerald-700"}`}>
            {noCompData
              ? `WARNING: based on manual £${result.ppsf || 0}/sqft — no target-bed comps. Don't rely on this.`
              : `Based on GDV of ${fmt(result.gdv)}. Start at 70%, max at 75% (25% BMV).`}
          </div>
        </div>
      )}

      {targetComps.length > 0 && (
        <div className="mt-4 bg-slate-50 rounded-lg p-3">
          <div className="text-xs font-medium text-slate-600 mb-2">Target-bed sold comps used:</div>
          <ul className="space-y-1 text-xs">
            {targetComps.map((c) => {
              const pr = parsePrice(c.price);
              const sqm = parseFloat(c.floor_area_sqm ?? "");
              const compSqft = Number.isFinite(sqm) && sqm > 0 ? Math.round(sqmToSqft(sqm)) : 0;
              const compPpsf = compSqft > 0 ? Math.round(pr / compSqft) : (sqft > 0 ? Math.round(pr / sqft) : 0);
              return (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="text-slate-600 truncate">{(c.address ?? "").slice(0, 50)}</span>
                  <span className="font-medium">{c.price} {compPpsf > 0 && <span className="text-slate-400">(£{compPpsf}/sqft)</span>}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
