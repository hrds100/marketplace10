// Derived offer amount — what the VA quotes the agent on the call.
//
// Per Hugo's rule: the offer is a calculation, not a decision. The VA reads
// the number off the screen. Only Hugo overrides it when he wants to deviate
// from the formula (e.g. go higher to win a competitive deal, or lower for a
// dog of a property).
//
// Math (mirrors the GDV calculator on /tinder/comps):
//   1. £/sqft = average of target-bed sold comps with EPC floor area
//   2. GDV = £/sqft × subject property's floor area (sqft)
//   3. Offer = GDV × 0.70  ← opening offer (the number the VA floats first)
//      Max BMV is GDV × 0.75 — the ceiling Hugo will go to.
//
// If we can't compute (no sqft on the listing OR no target-bed comps with
// area data), we return { source: 'unavailable' } and the UI shows a hint
// asking Hugo to set an override manually.

import type { BrrrrComp, BrrrrListing } from "../types";
import { filterSaleTarget, parsePrice, sqmToSqft } from "./gdv";

export const OFFER_OPENING_PCT = 0.70;
export const OFFER_MAX_BMV_PCT = 0.75;

export type DerivedOffer =
  | {
      source: "override";
      amount: number;
      reason: "Hugo override";
    }
  | {
      source: "calculated";
      amount: number;
      reason: string;            // human-readable derivation
      gdv: number;
      ppsf: number;
      compsUsed: number;
      sqft: number;
    }
  | {
      source: "unavailable";
      amount: null;
      reason: string;
    };

export function calculateOffer(
  listing: BrrrrListing | null | undefined,
  comps: BrrrrComp[],
  override?: string | null,
): DerivedOffer {
  // Hugo's override always wins.
  if (override && override.trim()) {
    const n = parseInt(override.replace(/[^0-9]/g, ""));
    if (Number.isFinite(n) && n > 0) {
      return { source: "override", amount: n, reason: "Hugo override" };
    }
  }

  if (!listing) {
    return { source: "unavailable", amount: null, reason: "No listing data" };
  }

  // Subject property's sqft — prefer scraped value, fall back to converted sqm.
  //
  // Sanity floor: a real flat is at least ~100 sqft. The scraper occasionally
  // misreads a value (e.g. property 171839915 came through as "4 sqft" because
  // the regex picked up the digit '4' from another part of the page) which
  // would otherwise produce nonsense offers like £409. When sqft looks too
  // small, fall back to the more reliable sqm field × 10.764.
  const MIN_REASONABLE_SQFT = 100;
  let sqft = parseFloat(listing.floor_area_sqft ?? "");
  const sqm = parseFloat(listing.floor_area_sqm ?? "");

  if (!sqft || sqft <= 0 || sqft < MIN_REASONABLE_SQFT) {
    if (sqm && sqm > 0) sqft = Math.round(sqmToSqft(sqm));
  }

  if (!sqft || sqft < MIN_REASONABLE_SQFT) {
    return {
      source: "unavailable",
      amount: null,
      reason:
        sqft && sqft > 0
          ? `Floor area on the listing (${sqft} sqft) looks wrong — Hugo needs to set an override.`
          : "Subject property's floor area is unknown — Hugo needs to set an override.",
    };
  }

  // £/sqft from target-bed sold comps with EPC floor area
  const targetComps = filterSaleTarget(comps);
  const compsWithArea = targetComps.filter(
    (c) => parseFloat(c.floor_area_sqm ?? "") > 0,
  );
  if (compsWithArea.length === 0) {
    return {
      source: "unavailable",
      amount: null,
      reason:
        targetComps.length === 0
          ? "No target-bed sold comps yet — run /comps fetcher or set an override."
          : "Target-bed comps lack EPC floor area — Hugo needs to set an override.",
    };
  }

  const ppsfValues = compsWithArea.map((c) => {
    const compSqft = sqmToSqft(parseFloat(c.floor_area_sqm!));
    return compSqft > 0 ? parsePrice(c.price) / compSqft : 0;
  }).filter((v) => v > 0);
  if (ppsfValues.length === 0) {
    return { source: "unavailable", amount: null, reason: "Comp prices missing." };
  }

  const ppsf = Math.round(ppsfValues.reduce((a, b) => a + b, 0) / ppsfValues.length);
  const gdv = ppsf * sqft;
  const amount = Math.round(gdv * OFFER_OPENING_PCT);

  return {
    source: "calculated",
    amount,
    ppsf,
    gdv,
    sqft,
    compsUsed: compsWithArea.length,
    reason: `${Math.round(OFFER_OPENING_PCT * 100)}% of GDV (${compsWithArea.length} target-bed comp${compsWithArea.length === 1 ? "" : "s"} @ £${ppsf}/sqft × ${sqft} sqft = £${Math.round(gdv).toLocaleString()})`,
  };
}

export function formatGBP(n: number | null | undefined): string {
  if (n == null) return "—";
  return "£" + Math.round(n).toLocaleString();
}
