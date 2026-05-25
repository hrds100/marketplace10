import type { BrrrrComp } from "../types";
import { median, parsePrice, sqmToSqft } from "../lib/gdv";

type Props = {
  comps: BrrrrComp[];
  kind: "sale" | "rent";
  emptyText?: string;
};

function sourceBadge(source: string | null) {
  if (source === "Land Registry") return <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">Land Registry</span>;
  if (source === "Zoopla")        return <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">Zoopla Verified</span>;
  return <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">Rightmove</span>;
}

export function CompTable({ comps, kind, emptyText }: Props) {
  if (comps.length === 0) {
    return <div className="text-sm text-slate-400 italic py-2">{emptyText ?? "No comps."}</div>;
  }

  const groupMedian = kind === "sale" ? median(comps.map((c) => parsePrice(c.price)).filter(v => v > 0)) : 0;

  return (
    <div className="space-y-2">
      {comps.map((c) => {
        const priceNum = parsePrice(c.price);
        const isBmv = kind === "sale" && groupMedian > 0 && priceNum > 0 && priceNum < groupMedian * 0.75;
        const sqm = parseFloat(c.floor_area_sqm ?? "");
        const sqft = Number.isFinite(sqm) && sqm > 0 ? Math.round(sqmToSqft(sqm)) : null;
        return (
          <div key={c.id} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-800">{c.price || "N/A"}</div>
              <div className="text-xs text-slate-500 truncate">{c.address || "No address"}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {c.bedrooms || "?"} bed · {c.property_type || ""}
                {c.date_info ? ` · ${c.date_info}` : ""}
                {sqft && ` · ${sqft} sqft`}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {c.distance_label && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">{c.distance_label}</span>
              )}
              {isBmv && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-medium">Probably sold BMV</span>
              )}
              {sourceBadge(c.source)}
              {c.url && (
                <a href={c.url} target="_blank" rel="noreferrer"
                  className={`text-xs underline ${kind === "sale" ? "text-blue-600" : "text-purple-600"}`}>
                  {c.url.includes("zoopla") ? "Zoopla ↗" : "Rightmove ↗"}
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
