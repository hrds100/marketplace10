// Derived offer amount — what the VA quotes the agent on the call.
//
// Per Hugo's rule: the offer is a calculation, not a decision. The VA reads
// the number off the screen. Only Hugo overrides it when he wants to deviate
// from the formula (e.g. go higher to win a competitive deal, or lower for a
// dog of a property).
//
// Math (preferred — mirrors the GDV calculator on /tinder/comps):
//   1. £/sqft = average of target-bed sold comps with EPC floor area
//   2. GDV = £/sqft × subject property's floor area (sqft)
//   3. Offer = GDV × 0.70  ← opening offer (the number the VA floats first)
//      Max BMV is GDV × 0.75 — the ceiling Hugo will go to.
//
// Fallback (when subject sqft is missing — Hugo 2026-05-27):
//   Rightmove only sometimes exposes EPC floor area, so ~70% of BRRRR pushes
//   land in Supabase without a usable sqft. Rather than show "can't
//   calculate" on those cards we approximate using:
//     Offer ≈ avg(target_comp_sale_prices) × 0.70
//   This treats the comps' average sale price as a proxy for GDV. It's less
//   precise than the £/sqft route (it can't differentiate a small 3-bed
//   from a big one), but it's a real number Hugo can react to. The UI
//   tags this with source='approximate' so it's obvious which figures are
//   from the precise formula vs the rough one.

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
      source: "approximate";
      amount: number;
      reason: string;            // human-readable derivation
      gdv: number;               // = average target-comp price
      compsUsed: number;
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

  const subjectSqftMissing = !sqft || sqft < MIN_REASONABLE_SQFT;
  const subjectSqftLooksWrong = sqft && sqft > 0 && sqft < MIN_REASONABLE_SQFT;

  // £/sqft from target-bed sold comps with EPC floor area
  const targetComps = filterSaleTarget(comps);
  const compsWithArea = targetComps.filter(
    (c) => parseFloat(c.floor_area_sqm ?? "") > 0,
  );

  // FALLBACK: no usable subject sqft. We can still float an approximate
  // offer using the average target-comp sale price × 70%. Used when
  // Rightmove didn't expose EPC floor area for the subject (~70% of pushes).
  if (subjectSqftMissing) {
    const compPrices = targetComps.map((c) => parsePrice(c.price)).filter((v) => v > 0);
    if (compPrices.length === 0) {
      return {
        source: "unavailable",
        amount: null,
        reason: subjectSqftLooksWrong
          ? `Floor area looks wrong (${sqft} sqft) AND no target-bed sold comps — set an override.`
          : targetComps.length === 0
            ? "No subject floor area AND no target-bed sold comps — set an override."
            : "No subject floor area AND target-bed comps have no prices — set an override.",
      };
    }
    const avgGdv = Math.round(compPrices.reduce((a, b) => a + b, 0) / compPrices.length);
    const amount = Math.round(avgGdv * OFFER_OPENING_PCT);
    return {
      source: "approximate",
      amount,
      gdv: avgGdv,
      compsUsed: compPrices.length,
      reason: `${Math.round(OFFER_OPENING_PCT * 100)}% of average target-bed comp price (${compPrices.length} comp${compPrices.length === 1 ? "" : "s"} avg £${avgGdv.toLocaleString()}). No subject sqft on listing — set an override if you know it.`,
    };
  }

  if (compsWithArea.length === 0) {
    // Subject has sqft but comps don't have EPC area. Same approximate
    // route: avg comp price × 70% gives Hugo a workable number.
    const compPrices = targetComps.map((c) => parsePrice(c.price)).filter((v) => v > 0);
    if (compPrices.length === 0) {
      return {
        source: "unavailable",
        amount: null,
        reason:
          targetComps.length === 0
            ? "No target-bed sold comps yet — run /comps fetcher or set an override."
            : "Target-bed comps have no prices — set an override.",
      };
    }
    const avgGdv = Math.round(compPrices.reduce((a, b) => a + b, 0) / compPrices.length);
    const amount = Math.round(avgGdv * OFFER_OPENING_PCT);
    return {
      source: "approximate",
      amount,
      gdv: avgGdv,
      compsUsed: compPrices.length,
      reason: `${Math.round(OFFER_OPENING_PCT * 100)}% of average target-bed comp price (${compPrices.length} comp${compPrices.length === 1 ? "" : "s"} avg £${avgGdv.toLocaleString()}). Comps lack EPC floor area so we can't run the £/sqft route.`,
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
