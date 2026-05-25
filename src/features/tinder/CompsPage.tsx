// Comps + GDV per shortlisted property. Left list, right comps + calculator.

import { useMemo, useState } from "react";
import { useShortlistedWithComps } from "./hooks/useComps";
import { CompTable } from "./components/CompTable";
import { GDVCalculator } from "./components/GDVCalculator";
import { DealCalculator } from "./components/DealCalculator";
import { filterRent, filterSaleSame, filterSaleTarget } from "./lib/gdv";

export default function CompsPage() {
  const { subjects, loading } = useShortlistedWithComps();
  const [selectedPid, setSelectedPid] = useState<string | null>(null);
  const [gdv, setGdv] = useState(0);

  const subject = useMemo(
    () => subjects.find((s) => s.property_id === selectedPid) ?? subjects[0] ?? null,
    [subjects, selectedPid]
  );

  return (
    <div className="flex h-full bg-white">
      <aside className="w-[28%] min-w-[300px] border-r border-slate-200 overflow-y-auto">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Shortlist</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subjects.length} propert{subjects.length === 1 ? "y" : "ies"}</p>
        </div>
        {loading && <div className="p-4 text-sm text-slate-500">Loading…</div>}
        {!loading && subjects.length === 0 && (
          <div className="p-4 text-sm text-slate-400">No shortlisted properties. Mark some as Potential in /tinder.</div>
        )}
        {subjects.map((s) => {
          const price = s.price_qualifier ? `${s.price_qualifier} ${s.price}` : s.price;
          const hasComps = s.comps.length > 0;
          return (
            <button
              key={s.property_id}
              onClick={() => setSelectedPid(s.property_id)}
              className={`block w-full text-left p-3 border-b border-slate-100 ${subject?.property_id === s.property_id ? "bg-emerald-50 border-l-4 border-l-emerald-500" : "hover:bg-slate-50"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">{price}</div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{s.address}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.bedrooms || "?"} bed · {s.property_type || ""}</div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${hasComps ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>
                  {hasComps ? "Comps ready" : "No comps"}
                </span>
              </div>
            </button>
          );
        })}
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        {!subject ? (
          <div className="text-slate-400 text-sm">Select a property.</div>
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-slate-800">
                {subject.price_qualifier ? `${subject.price_qualifier} ${subject.price}` : subject.price}
              </h1>
              <p className="text-sm text-slate-600 mt-1">{subject.address}</p>
              <p className="text-xs text-slate-500">
                {subject.bedrooms || "?"} bed {subject.property_type || ""} → converting to {(parseInt(subject.bedrooms ?? "1") || 1) + 1}-bed
              </p>
            </header>

            <GDVCalculator
              subject={subject}
              targetComps={filterSaleTarget(subject.comps)}
              onGdvChange={setGdv}
            />

            <DealCalculator
              subject={subject}
              rentComps={filterRent(subject.comps)}
              gdv={gdv}
            />

            <section className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-slate-800 mb-3">Same-bed sold comps</h3>
                <CompTable comps={filterSaleSame(subject.comps)} kind="sale" emptyText="No same-bed sold comps." />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-3">Target-bed sold comps</h3>
                <CompTable comps={filterSaleTarget(subject.comps)} kind="sale" emptyText="No target-bed sold comps — find comps manually before offering." />
              </div>
            </section>

            <section className="mt-6">
              <h3 className="font-bold text-slate-800 mb-3">Rental comps</h3>
              <CompTable comps={filterRent(subject.comps)} kind="rent" emptyText="No rental comps." />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
