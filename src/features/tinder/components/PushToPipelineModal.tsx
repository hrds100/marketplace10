import { useState } from "react";
import { useIsBrrrrAdmin } from "../hooks/useIsBrrrrAdmin";
import type { BrrrrListing } from "../types";

type Props = {
  listing: BrrrrListing;
  onClose: () => void;
  onConfirm: (offer_amount: string | null) => Promise<void>;
};

export function PushToPipelineModal({ listing, onClose, onConfirm }: Props) {
  const [offer, setOffer] = useState("");
  const [busy, setBusy] = useState(false);
  // RLS lets only brrrr_admins set the offer_amount. Mirror that in the UI so
  // VAs see a disabled field with explanation instead of a cryptic error.
  const { isAdmin, loading: adminLoading } = useIsBrrrrAdmin();

  const askingPrice = parseInt((listing.price ?? "").replace(/[^0-9]/g, "")) || 0;
  const suggestedOpening = askingPrice ? Math.round(askingPrice * 0.70) : null;
  const suggestedMax = askingPrice ? Math.round(askingPrice * 0.75) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Non-admins must push with offer = null; the DB will reject otherwise.
      const offerToSend = isAdmin ? (offer.trim() || null) : null;
      await onConfirm(offerToSend);
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

        <label className="block mt-5 text-sm font-medium text-slate-700">
          Offer amount (£) — what the VA should float
          {!adminLoading && !isAdmin && (
            <span className="ml-1.5 text-xs font-normal bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
              admin only
            </span>
          )}
        </label>
        <input
          type="number"
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          placeholder={
            !adminLoading && !isAdmin
              ? "Hugo will set this"
              : suggestedOpening ? String(suggestedOpening) : "e.g. 70000"
          }
          disabled={adminLoading || !isAdmin || busy}
          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
        />
        {!adminLoading && !isAdmin ? (
          <p className="text-xs text-amber-700 mt-1">
            Only Hugo can set offer amounts. You can still push this to the pipeline —
            Hugo will set the offer before the VA calls.
          </p>
        ) : suggestedOpening && suggestedMax ? (
          <p className="text-xs text-slate-500 mt-1">
            Suggested range: £{suggestedOpening.toLocaleString()} – £{suggestedMax.toLocaleString()} (70–75% of asking)
          </p>
        ) : null}

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
