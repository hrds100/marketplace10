import type { ListingWithFloorplans } from "../types";

type Props = {
  listing: ListingWithFloorplans;
  selected: boolean;
  onClick: () => void;
};

function statusBadge(status: string | null) {
  if (status === "potential")
    return <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">Potential</span>;
  if (status === "skip")
    return <span className="text-xs px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 font-medium">Skipped</span>;
  return <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Unreviewed</span>;
}

export function PropertyCard({ listing, selected, onClick }: Props) {
  const price = listing.price_qualifier
    ? `${listing.price_qualifier} ${listing.price}`
    : listing.price || "No price";
  const sizeStr = listing.floor_area_sqm
    ? `${listing.floor_area_sqm} sqm`
    : listing.floor_area_sqft
    ? `${listing.floor_area_sqft} sqft`
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 border-b border-slate-100 text-sm transition ${
        selected ? "bg-emerald-50 border-l-4 border-l-emerald-500" : "hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-slate-800 truncate">{price}</div>
          <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{listing.address || "No address"}</div>
          <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1">
            <span>{listing.bedrooms || "?"} bed · {listing.property_type || "Unknown"}</span>
            {sizeStr && <span className="bg-emerald-50 text-emerald-700 px-1 rounded text-[10px]">{sizeStr}</span>}
            {listing.is_auction === "1" && (
              <span className="bg-amber-100 text-amber-800 px-1 rounded font-semibold text-[10px]">AUCTION</span>
            )}
            {listing.days_on_market && (
              <span className="bg-blue-50 text-blue-700 px-1 rounded text-[10px]">{listing.days_on_market}d</span>
            )}
          </div>
        </div>
        {statusBadge(listing.review_status)}
      </div>
    </button>
  );
}
