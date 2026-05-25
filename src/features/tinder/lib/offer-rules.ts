// Auto-stage logic — see TAJU-BUILD-BRIEF.md Phase 2 (PipelinePage).
// After a VA saves the questionnaire, suggest where the deal should go next.

import type { PipelineStage } from "../types";

export type AnswerMap = Record<string, string | null | undefined>;

export type Suggestion = {
  stage: PipelineStage;
  reason: string;
};

const toNum = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const isYes = (v: unknown) =>
  typeof v === "string" && /^(yes|y|true|1)$/i.test(v.trim());

const isNo = (v: unknown) =>
  typeof v === "string" && /^(no|n|false|0)$/i.test(v.trim());

export function suggestStage(a: AnswerMap): Suggestion {
  // Hard "no longer in play" — agent confirmed it's gone.
  if (isNo(a.still_available)) {
    return { stage: "dead", reason: "Agent says it's no longer available." };
  }

  // Deal breakers from VA-Call-Guide-BRRRR.md.
  if (typeof a.kitchen_layout === "string" && /open/i.test(a.kitchen_layout)) {
    return { stage: "dead", reason: "Open-plan kitchen — can't extract a separate room." };
  }
  if (isNo(a.kitchen_window)) {
    return { stage: "dead", reason: "Kitchen has no window — fails layout test." };
  }

  const lease = toNum(a.lease_years);
  if (lease != null && lease < 80) {
    return { stage: "dead", reason: `Lease only ${lease} yrs — needs to be 80+ for mortgageability.` };
  }

  const sc = toNum(a.service_charge);
  if (sc != null && sc > 2000) {
    return { stage: "dead", reason: `Service charge £${sc.toLocaleString()} — over the £2k ceiling.` };
  }

  if (typeof a.any_issues === "string" && /\b(damp|subsid|cladding|fire|structural|leak)\b/i.test(a.any_issues)) {
    return { stage: "dead", reason: "Building issues flagged in 'any_issues' — verify before pursuing." };
  }

  // Healthy answers — branch on whether an offer was floated.
  if (isYes(a.offer_floated)) {
    return { stage: "offer_made", reason: "Offer floated to agent — waiting for vendor response." };
  }

  return { stage: "called_waiting", reason: "Good answers — needs Hugo to set an offer amount." };
}
