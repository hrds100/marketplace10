// Derived offer amount — what the VA quotes the agent on the call.
//
// Per Hugo's rule: the offer is a calculation, not a decision. The VA reads
// the number off the screen. Only Hugo overrides it when he wants to deviate
// from the formula (e.g. go higher to win a competitive deal, or lower for a
// dog of a property).
//
// Math (preferred — same formula the scraper's /comps page uses):
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
import { filterSaleSame, filterSaleTarget, parsePrice, sqmToSqft } from "./gdv";

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

  const subjectSqftUsable = sqft && sqft >= MIN_REASONABLE_SQFT;

  // ── Tier 1: strict £/sqft route ────────────────────────────────────
  // Needs subject sqft AND target-bed comps with EPC floor area.
  const targetComps = filterSaleTarget(comps);
  const targetCompsWithArea = targetComps.filter(
    (c) => parseFloat(c.floor_area_sqm ?? "") > 0,
  );
  if (subjectSqftUsable && targetCompsWithArea.length > 0) {
    const ppsfValues = targetCompsWithArea.map((c) => {
      const compSqft = sqmToSqft(parseFloat(c.floor_area_sqm!));
      return compSqft > 0 ? parsePrice(c.price) / compSqft : 0;
    }).filter((v) => v > 0);
    if (ppsfValues.length > 0) {
      const ppsf = Math.round(ppsfValues.reduce((a, b) => a + b, 0) / ppsfValues.length);
      const gdv = ppsf * sqft;
      return {
        source: "calculated",
        amount: Math.round(gdv * OFFER_OPENING_PCT),
        ppsf,
        gdv,
        sqft,
        compsUsed: targetCompsWithArea.length,
        reason: `${Math.round(OFFER_OPENING_PCT * 100)}% of GDV (${targetCompsWithArea.length} target-bed comp${targetCompsWithArea.length === 1 ? "" : "s"} @ £${ppsf}/sqft × ${sqft} sqft = £${Math.round(gdv).toLocaleString()})`,
      };
    }
  }

  // ── Tier 2: target-bed avg price route ─────────────────────────────
  // Used when subject sqft is missing OR target comps lack EPC area.
  // Still uses target-bed (the BRRRR conversion target), so it accounts
  // for the bed-uplift uplift — just lower precision than £/sqft.
  const targetCompPrices = targetComps.map((c) => parsePrice(c.price)).filter((v) => v > 0);
  if (targetCompPrices.length > 0) {
    const avgGdv = Math.round(targetCompPrices.reduce((a, b) => a + b, 0) / targetCompPrices.length);
    const reason = !subjectSqftUsable
      ? `${Math.round(OFFER_OPENING_PCT * 100)}% of average target-bed comp price (${targetCompPrices.length} comp${targetCompPrices.length === 1 ? "" : "s"} avg £${avgGdv.toLocaleString()}). No subject sqft on listing — set an override if you know it.`
      : `${Math.round(OFFER_OPENING_PCT * 100)}% of average target-bed comp price (${targetCompPrices.length} comp${targetCompPrices.length === 1 ? "" : "s"} avg £${avgGdv.toLocaleString()}). Comps lack EPC floor area so we can't run the £/sqft route.`;
    return {
      source: "approximate",
      amount: Math.round(avgGdv * OFFER_OPENING_PCT),
      gdv: avgGdv,
      compsUsed: targetCompPrices.length,
      reason,
    };
  }

  // ── Tier 3: same-bed avg price route (most conservative) ───────────
  // Used when there are no target-bed (one-up) comps at all. Falls back
  // to same-bed sold comps. The bed-uplift uplift isn't priced in here,
  // so the resulting offer is more conservative — Hugo can still react
  // to a real number rather than seeing "can't calculate".
  const sameCompPrices = filterSaleSame(comps).map((c) => parsePrice(c.price)).filter((v) => v > 0);
  if (sameCompPrices.length > 0) {
    const avgGdv = Math.round(sameCompPrices.reduce((a, b) => a + b, 0) / sameCompPrices.length);
    return {
      source: "approximate",
      amount: Math.round(avgGdv * OFFER_OPENING_PCT),
      gdv: avgGdv,
      compsUsed: sameCompPrices.length,
      reason: `${Math.round(OFFER_OPENING_PCT * 100)}% of average same-bed comp price (${sameCompPrices.length} comp${sameCompPrices.length === 1 ? "" : "s"} avg £${avgGdv.toLocaleString()}). No target-bed sold comps yet — this is conservative (doesn't price in the +1 bed conversion).`,
    };
  }

  // ── No usable comps ────────────────────────────────────────────────
  return {
    source: "unavailable",
    amount: null,
    reason: "No sold comps found for this property (Land Registry + Rightmove came back empty for the target and same bedrooms). Set an override on this card with the price you want to offer.",
  };
}

export function formatGBP(n: number | null | undefined): string {
  if (n == null) return "—";
  return "£" + Math.round(n).toLocaleString();
}
