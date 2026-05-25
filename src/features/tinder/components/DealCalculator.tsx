// BRRRR deal calculator — purchase + bridge + sdlt → refi scenarios → cashflow.
// Math lives in lib/gdv.ts (computeDeal). This component is the UI.

import { useEffect, useMemo, useState } from "react";
import { computeDeal, DEAL_CONSTANTS, fmt, parsePrice } from "../lib/gdv";
import type { BrrrrComp, BrrrrListing } from "../types";

type Props = {
  subject: BrrrrListing;
  rentComps: BrrrrComp[];
  gdv: number;             // from GDVCalculator
};

const SLIDER_RANGES = {
  marketValue: { min: 50_000, max: 200_000 },
  refurb:      { min: 0,      max: 30_000  },
  rent:        { min: 500,    max: 1_500   },
  term:        { min: 3,      max: 12      },
};

export function DealCalculator({ subject, rentComps, gdv }: Props) {
  // Seed market value with GDV if we have one, else asking price.
  const seedMv = gdv > 0 ? Math.round(gdv) : parsePrice(subject.price) || 100_000;
  // Average rental comp as the seed rent.
  const seedRent = useMemo(() => {
    const prices = rentComps.map((c) => parsePrice(c.price)).filter((v) => v > 0);
    if (prices.length === 0) return 900;
    return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  }, [rentComps]);

  const [marketValue, setMarketValue] = useState(seedMv);
  const [refurb, setRefurb] = useState(10_000);
  const [rentPcm, setRentPcm] = useState(seedRent);
  const [termMonths, setTermMonths] = useState(6);

  // Keep market value in sync with the live GDV from the calculator above.
  useEffect(() => {
    if (gdv > 0) setMarketValue(Math.round(gdv));
  }, [gdv]);
  useEffect(() => { setRentPcm(seedRent); }, [seedRent]);

  const result = useMemo(
    () => computeDeal({ marketValue, refurb, rentPcm, termMonths }),
    [marketValue, refurb, rentPcm, termMonths]
  );

  const verdictColor =
    result.verdict.kind === "ok"        ? "bg-emerald-100 text-emerald-700" :
    result.verdict.kind === "needs_jv"  ? "bg-amber-100 text-amber-700" :
                                          "bg-rose-100 text-rose-700";

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 mt-6">
      <h3 className="font-bold text-slate-800 mb-1">Deal calculator</h3>
      <p className="text-xs text-slate-500 mb-4">
        BRRRR math: 75% LTV bridge → refurb → refinance at 75% of ARV. Hard ceilings:
        £{DEAL_CONSTANTS.MV_CAP.toLocaleString()} MV, £{DEAL_CONSTANTS.PURCHASE_CEILING.toLocaleString()} purchase,
        £{DEAL_CONSTANTS.CASH_BUDGET.toLocaleString()} cash budget.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <SliderInput
          label="Market value (£)"
          value={marketValue}
          setValue={setMarketValue}
          min={SLIDER_RANGES.marketValue.min}
          max={SLIDER_RANGES.marketValue.max}
        />
        <SliderInput
          label="Refurb budget (£)"
          value={refurb}
          setValue={setRefurb}
          min={SLIDER_RANGES.refurb.min}
          max={SLIDER_RANGES.refurb.max}
          step={500}
        />
        <SliderInput
          label="Rent pcm (£)"
          value={rentPcm}
          setValue={setRentPcm}
          min={SLIDER_RANGES.rent.min}
          max={SLIDER_RANGES.rent.max}
        />
        <SliderInput
          label="Bridge term (months)"
          value={termMonths}
          setValue={(v) => setTermMonths(Math.round(v))}
          min={SLIDER_RANGES.term.min}
          max={SLIDER_RANGES.term.max}
          step={1}
        />
      </div>

      <div className={`rounded-lg p-4 text-center font-bold text-lg mb-5 ${verdictColor}`}>
        {result.verdict.text}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash-in breakdown */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Cash needed to acquire</h4>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <Row label="Purchase price (75% of MV)"            value={fmt(result.purchase)} />
              <Row label="Bridge loan (75% of MV)"               value={fmt(result.bridge)} />
              <Row label={`Arrangement fee (${(DEAL_CONSTANTS.ARR_FEE_RATE * 100).toFixed(0)}%)`} value={"-" + fmt(result.arrFee)} />
              <Row label={`Interest (${termMonths} × ${(DEAL_CONSTANTS.BRIDGE_RATE * 100).toFixed(2)}%)`} value={"-" + fmt(result.interest)} />
              <Row label="Net loan received"                     value={fmt(result.netLoan)} bold />
              <Row label="Cash gap (purchase - net loan)"        value={fmt(result.gap)} bold />
              <Row label={`SDLT (${(DEAL_CONSTANTS.SDLT_RATE * 100).toFixed(0)}%)`}                   value={fmt(result.sdlt)} />
              <Row label="Solicitor + surveys"                   value={fmt(DEAL_CONSTANTS.SOLICITOR + DEAL_CONSTANTS.SURVEYS)} />
              <Row label="Total cash needed"                     value={fmt(result.totalCash)} highlight />
            </tbody>
          </table>
        </div>

        {/* Monthly cashflow */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Monthly cashflow after refi</h4>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <Row label="Rent"                                  value={fmt(result.monthly.rent)} />
              <Row label={`BTL mortgage (${(DEAL_CONSTANTS.BTL_RATE * 100).toFixed(1)}%)`}     value={"-" + fmt(result.monthly.mortgage)} />
              <Row label="Insurance"                             value={"-" + fmt(result.monthly.insurance)} />
              <Row label="Monthly profit"                        value={fmt(result.monthly.profit)} bold />
              <Row label="Hugo's share (40%)"                    value={fmt(result.monthly.investorShare)} />
              <Row label="Partner 1 (30%)"                       value={fmt(result.monthly.partner1Share)} />
              <Row label="Partner 2 (30%)"                       value={fmt(result.monthly.partner2Share)} />
            </tbody>
          </table>
        </div>
      </div>

      {/* Refi scenarios */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Refinance scenarios (75% LTV)</h4>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs">
            <tr>
              <th className="text-left px-3 py-2">Scenario</th>
              <th className="text-right px-3 py-2">ARV</th>
              <th className="text-right px-3 py-2">New mortgage</th>
              <th className="text-right px-3 py-2">Payoff bridge + refurb</th>
              <th className="text-right px-3 py-2">Cash back</th>
              <th className="text-right px-3 py-2">vs investor cash</th>
            </tr>
          </thead>
          <tbody>
            {result.scenarios.map((s) => {
              const tone = s.upliftPct >= 0.40 ? "bg-emerald-50" :
                           s.upliftPct >= 0.35 ? "bg-emerald-50/50" :
                           s.upliftPct >= 0.30 ? "bg-amber-50" : "bg-rose-50";
              const resultTone = s.resultVsInvestor >= 0 ? "text-emerald-700 font-bold" : "text-rose-600 font-bold";
              const resultText = s.resultVsInvestor >= 0 ? "+" + fmt(s.resultVsInvestor) : fmt(s.resultVsInvestor);
              return (
                <tr key={s.label} className={`${tone} border-b border-slate-100`}>
                  <td className="px-3 py-2 font-medium text-slate-700">{s.label}</td>
                  <td className="px-3 py-2 text-right">{fmt(s.arv)}</td>
                  <td className="px-3 py-2 text-right">{fmt(s.newMortgage)}</td>
                  <td className="px-3 py-2 text-right text-rose-600">{fmt(-s.payoff)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmt(s.cashBack)}</td>
                  <td className={`px-3 py-2 text-right ${resultTone}`}>{resultText}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SliderInput({
  label, value, setValue, min, max, step = 100,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-600 font-medium">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        className="w-full mt-2"
      />
    </label>
  );
}

function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <tr className={highlight ? "bg-emerald-50" : ""}>
      <td className={`py-1.5 ${highlight ? "font-bold text-emerald-800" : "text-slate-600"}`}>{label}</td>
      <td className={`py-1.5 text-right ${bold || highlight ? "font-bold" : ""} ${highlight ? "text-emerald-800" : "text-slate-800"}`}>{value}</td>
    </tr>
  );
}
