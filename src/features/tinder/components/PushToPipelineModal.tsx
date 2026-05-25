import { useState } from "react";
import { useDerivedOffer } from "../hooks/useDerivedOffer";
import { useIsBrrrrAdmin } from "../hooks/useIsBrrrrAdmin";
import { formatGBP } from "../lib/offer";
import type { BrrrrListing } from "../types";

type Props = {
  listing: BrrrrListing;
  /** Optional pre-fill (legacy — kept for callers that pre-compute). The
   *  derived offer is the source of truth; this only seeds the override
   *  input when admins want to deviate immediately. */
  suggestedOffer?: number;
  onClose: () => void;
  onConfirm: (offer_amount: string | null) => Promise<void>;
};

export function PushToPipelineModal({ listing, suggestedOffer, onClose, onConfirm }: Props) {
  const { isAdmin, loading: adminLoading } = useIsBrrrrAdmin();
  // Calculate the auto-offer so admins can see it before deciding to override.
  const { offer } = useDerivedOffer(listing.property_id, null);
  const [override, setOverride] = useState<string>(
    suggestedOffer ? String(suggestedOffer) : ""
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Non-admins always push with offer_amount=null — the formula takes over.
      // Admins can attach an override at push time, or leave it blank to let
      // the formula take over until they decide otherwise.
      const overrideToSend = isAdmin ? (override.trim() || null) : null;
      await onConfirm(overrideToSend);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-800">Push to calling pipeline</h2>
        <p className="text-sm text-slate-500 mt-1">{listing.address}</p>
        <p className="text-sm text-slate-500">Asking: {listing.price}</p>

        {/* Calculated offer — derived from comps + GDV */}
        <div className={`mt-4 rounded-lg border p-3 ${
          offer?.source === "calculated" ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"
        }`}>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            Auto offer (what the VA will quote)
          </div>
          <div className={`text-2xl font-bold ${offer?.source === "calculated" ? "text-emerald-800" : "text-amber-800"}`}>
            {offer?.amount != null ? formatGBP(offer.amount) : "—"}
          </div>
          <div className="text-xs text-slate-600 mt-1 leading-tight">{offer?.reason ?? ""}</div>
        </div>

        {/* Admin-only override */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">
            Override offer (£)
            {!adminLoading && !isAdmin && (
              <span className="ml-1.5 text-xs font-normal bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                admin only
              </span>
            )}
          </label>
          <input
            type="number"
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            placeholder={
              !adminLoading && !isAdmin
                ? "Hugo sets the override"
                : offer?.amount
                ? `Leave blank to use ${formatGBP(offer.amount)} (calculated)`
                : "e.g. 70000"
            }
            disabled={adminLoading || !isAdmin || busy}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-500 mt-1 leading-tight">
            {!adminLoading && !isAdmin
              ? "VAs use the auto offer above. Only Hugo can override (e.g. go higher to win a hot deal)."
              : "Leave blank to use the calculated offer. Fill in only if you want to deviate from the formula."}
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50"
          >
            {busy ? "Saving…" : "Push to pipeline"}
          </button>
        </div>
      </form>
    </div>
  );
}
