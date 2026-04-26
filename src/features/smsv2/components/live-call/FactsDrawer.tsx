// FactsDrawer — col 4 of the LiveCallScreen.
//
// Hugo 2026-04-30: replaces TerminologyPane (the older glossary view).
// Surfaces the structured deal facts from wk_coach_facts as click-to-
// expand cards grouped by category, so when the caller asks something
// the rep can tap-and-read instead of relying on the AI coach to
// surface it. The model still reads the same KB in its system message
// — this is the human-readable view of the same data.

import { useMemo, useState } from 'react';
import { Brain, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCoachFacts, type CoachFact } from '../../hooks/useCoachFacts';

const CATEGORY_ORDER: CoachFact['category'][] = [
  'deal',
  'returns',
  'compliance',
  'logistics',
  'objection',
];

const CATEGORY_LABEL: Record<CoachFact['category'], string> = {
  deal: 'Deal',
  returns: 'Returns',
  compliance: 'Compliance',
  logistics: 'Logistics',
  objection: 'Objections',
};

const CATEGORY_COLOUR: Record<CoachFact['category'], string> = {
  deal: '#1E9A80',
  returns: '#3B82F6',
  compliance: '#F59E0B',
  logistics: '#8B5CF6',
  objection: '#EF4444',
};

export default function FactsDrawer() {
  const { items, loading, error } = useCoachFacts({ activeOnly: true });
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.value.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [items, filter]);

  const grouped = useMemo(() => {
    const map = new Map<CoachFact['category'], CoachFact[]>();
    for (const f of filtered) {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    }
    return map;
  }, [filtered]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-2.5 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-[#1E9A80]" />
          <span className="text-[12px] font-semibold text-[#1A1A1A]">
            Deal facts
          </span>
        </div>
        <span className="text-[10px] text-[#9CA3AF]">
          {loading ? '…' : `${items.length}`}
        </span>
      </div>

      <div className="px-3 py-2 border-b border-[#E5E7EB]">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            className="w-full pl-7 pr-2 py-1.5 text-[12px] border border-[#E5E5E5] rounded-[10px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 focus:border-[#1E9A80]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {error && (
          <div className="text-[11px] text-[#EF4444] px-1">⚠ {error}</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-[12px] text-[#9CA3AF] text-center px-4 py-6 leading-snug">
            {items.length === 0
              ? 'No facts yet. Add some in Settings → Knowledge base.'
              : `No matches for "${filter}".`}
          </div>
        )}
        {CATEGORY_ORDER.map((cat) => {
          const facts = grouped.get(cat);
          if (!facts || facts.length === 0) return null;
          return (
            <div key={cat}>
              <div
                className="text-[10px] font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1"
                style={{ color: CATEGORY_COLOUR[cat] }}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ background: CATEGORY_COLOUR[cat] }}
                />
                {CATEGORY_LABEL[cat]}
                <span className="text-[#9CA3AF] font-normal ml-0.5">
                  · {facts.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {facts.map((f) => (
                  <FactCard key={f.id} fact={f} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FactCard({ fact }: { fact: CoachFact }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        'border rounded-lg transition-colors',
        open
          ? 'border-[#1E9A80]/40 bg-[#ECFDF5]/30'
          : 'border-[#E5E7EB] hover:border-[#1E9A80]/30'
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-3 py-2 flex items-start gap-2"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-[#1E9A80] flex-shrink-0 mt-0.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-[#1A1A1A]">{fact.label}</div>
          {!open && (
            <div className="text-[11px] text-[#6B7280] mt-0.5 leading-snug line-clamp-1">
              {fact.value}
            </div>
          )}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0.5 border-t border-[#E5E7EB] mt-1">
          <div className="text-[12px] text-[#1A1A1A] mt-2 leading-relaxed">
            {fact.value}
          </div>
          {fact.keywords.length > 0 && (
            <div className="mt-2 text-[10px] text-[#9CA3AF]">
              <span className="uppercase tracking-wide font-semibold">Triggers: </span>
              {fact.keywords.join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
