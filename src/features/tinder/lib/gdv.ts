// Pure math ported from scraper/static/comps_app.js.
// GDV = Gross Development Value — the projected value AFTER converting
// to one extra bed. Drives the offer range (70%-75% of GDV).

import type { BrrrrComp } from "../types";

export const MAX_COMP_DISTANCE_M = 200;

export const isNearby = (c: BrrrrComp): boolean => {
  const label = c.distance_label || "";
  if (/Same building|Same road/i.test(label)) return true;
  const parsed = parseInt(c.distance_m ?? "");
  const dist = Number.isFinite(parsed) ? parsed : 999_999;
  return dist <= MAX_COMP_DISTANCE_M;
};

export const parsePrice = (v: string | null | undefined): number =>
  parseInt((v ?? "").replace(/[^0-9]/g, "")) || 0;

export const sqmToSqft = (sqm: number) => sqm * 10.764;

export const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

// Match the legacy "sale" type as a fallback (older comps before sale_target was introduced).
export const filterSaleSame = (comps: BrrrrComp[]) =>
  comps.filter(c => (c.comp_type === "sale_same" || c.comp_type === "sale_same_bed") && isNearby(c));

export const filterSaleTarget = (comps: BrrrrComp[]) =>
  comps.filter(c => (c.comp_type === "sale_target" || c.comp_type === "sale_target_bed") && isNearby(c));

export const filterRent = (comps: BrrrrComp[]) => comps.filter(c => c.comp_type === "rent");

export type GdvInput = {
  sqft: number;
  manualPpsf?: number;
  comps: BrrrrComp[];      // sale_target comps near the subject
};

export type GdvResult = {
  ppsf: number;
  gdv: number;
  compsWithArea: BrrrrComp[];
  averagePrice: number;
  source: "comps_with_area" | "manual" | "comps_average" | "none";
};

export function computeGdv({ sqft, manualPpsf, comps }: GdvInput): GdvResult {
  const compsWithArea = comps.filter(c => parseFloat(c.floor_area_sqm ?? "") > 0);
  const prices = comps.map(c => parsePrice(c.price)).filter(v => v > 0);
  const averagePrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

  let compPpsf = 0;
  let source: GdvResult["source"] = "none";

  if (compsWithArea.length > 0) {
    const ppsfValues = compsWithArea.map(c => {
      const pr = parsePrice(c.price);
      const sqftEach = sqmToSqft(parseFloat(c.floor_area_sqm ?? "0"));
      return sqftEach > 0 ? pr / sqftEach : 0;
    }).filter(v => v > 0);
    compPpsf = ppsfValues.length
      ? Math.round(ppsfValues.reduce((a, b) => a + b, 0) / ppsfValues.length)
      : 0;
    source = "comps_with_area";
  } else if (prices.length > 0 && sqft > 0) {
    compPpsf = Math.round(averagePrice / sqft);
    source = "comps_average";
  }

  let ppsf = manualPpsf && manualPpsf > 0 ? manualPpsf : compPpsf;
  if (ppsf > 0 && manualPpsf && manualPpsf > 0) source = "manual";

  const gdv = ppsf * sqft;
  return { ppsf, gdv, compsWithArea, averagePrice, source };
}

// Deal calculator constants (BRRRR rules from the business plan).
export const DEAL_CONSTANTS = {
  SOLICITOR: 3200,
  SURVEYS: 1350,
  SDLT_RATE: 0.05,
  BRIDGE_RATE: 0.01,
  ARR_FEE_RATE: 0.02,
  BTL_RATE: 0.055,
  INSURANCE: 50,
  MV_CAP: 160_000,
  PURCHASE_CEILING: 120_000,
  CASH_BUDGET: 25_000,
};

export type DealInput = {
  marketValue: number;   // = GDV when comps are good
  refurb: number;
  rentPcm: number;
  termMonths: number;
};

export type RefiScenario = {
  label: string;
  upliftPct: number;
  arv: number;
  newMortgage: number;
  payoff: number;
  cashBack: number;
  resultVsInvestor: number;
};

export type DealResult = {
  purchase: number;
  bridge: number;
  arrFee: number;
  interest: number;
  netLoan: number;
  gap: number;
  sdlt: number;
  totalCash: number;
  scenarios: RefiScenario[];
  bestMortgage: number;
  monthly: {
    rent: number;
    mortgage: number;
    insurance: number;
    profit: number;
    investorShare: number;   // 40% of profit
    partner1Share: number;   // 30%
    partner2Share: number;   // 30%
  };
  verdict:
    | { kind: "walk_mv"; text: string }
    | { kind: "walk_purchase"; text: string }
    | { kind: "needs_jv"; text: string }
    | { kind: "ok"; text: string };
};

export function computeDeal({ marketValue, refurb, rentPcm, termMonths }: DealInput): DealResult {
  const C = DEAL_CONSTANTS;
  const purchase = marketValue * 0.75;
  const bridge = marketValue * 0.75;
  const arrFee = bridge * C.ARR_FEE_RATE;
  const interest = bridge * C.BRIDGE_RATE * termMonths;
  const netLoan = bridge - arrFee - interest;
  const gap = purchase - netLoan;
  const sdlt = purchase * C.SDLT_RATE;
  const totalCash = gap + sdlt + C.SOLICITOR + C.SURVEYS;

  const upliftScenarios: { label: string; pct: number }[] = [
    { label: "Best case (40% uplift)",  pct: 0.40 },
    { label: "Good case (35% uplift)",  pct: 0.35 },
    { label: "Okay case (30% uplift)",  pct: 0.30 },
    { label: "Worst case (25% uplift)", pct: 0.25 },
  ];

  let bestMortgage = 0;
  const scenarios = upliftScenarios.map((s, i): RefiScenario => {
    const arv = marketValue * (1 + s.pct);
    const newMortgage = arv * 0.75;
    const payoff = bridge + refurb;
    const cashBack = newMortgage - payoff;
    if (i === 0) bestMortgage = newMortgage;
    return {
      label: s.label,
      upliftPct: s.pct,
      arv,
      newMortgage,
      payoff,
      cashBack,
      resultVsInvestor: cashBack - totalCash,
    };
  });

  const moMortgage = (bestMortgage * C.BTL_RATE) / 12;
  const moProfit = rentPcm - moMortgage - C.INSURANCE;

  let verdict: DealResult["verdict"];
  if (marketValue > C.MV_CAP) {
    verdict = { kind: "walk_mv", text: `Above £${C.MV_CAP.toLocaleString()} market value cap — walk away` };
  } else if (purchase > C.PURCHASE_CEILING) {
    verdict = { kind: "walk_purchase", text: `Purchase price above £${C.PURCHASE_CEILING.toLocaleString()} hard ceiling — walk away` };
  } else if (totalCash > C.CASH_BUDGET) {
    verdict = { kind: "needs_jv", text: `Cash needed exceeds £${C.CASH_BUDGET.toLocaleString()} budget — needs JV from day 1` };
  } else {
    verdict = { kind: "ok", text: `Deal fits within £${C.CASH_BUDGET.toLocaleString()} budget` };
  }

  return {
    purchase, bridge, arrFee, interest, netLoan, gap, sdlt, totalCash, scenarios, bestMortgage,
    monthly: {
      rent: rentPcm,
      mortgage: moMortgage,
      insurance: C.INSURANCE,
      profit: moProfit,
      investorShare: moProfit * 0.4,
      partner1Share: moProfit * 0.3,
      partner2Share: moProfit * 0.3,
    },
    verdict,
  };
}

export const fmt = (n: number) =>
  (n < 0 ? "-£" : "£") + Math.abs(Math.round(n)).toLocaleString();
