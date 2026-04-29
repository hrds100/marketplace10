// crm-v2 TerminologyPane — glossary cards from wk_terminologies.
//
// Read-only. Admin-managed in /crm/settings → Terminology.
// Realtime via wk_terminologies broadcast (admin edits propagate
// to live calls instantly).

import { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Term {
  id: string;
  term: string;
  short_gist: string | null;
  definition_md: string;
  sort_order: number;
}

export default function TerminologyPane() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_terminologies' as any) as any)
        .select('id, term, short_gist, definition_md, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('term', { ascending: true });
      if (cancelled) return;
      setTerms((data ?? []) as Term[]);
      setLoading(false);
    };
    void load();

    // Realtime — admin edits land instantly during an agent's call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase as any)
      .channel('crmv2-terms')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wk_terminologies' },
        () => {
          if (!cancelled) void load();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        void (supabase as any).removeChannel(ch);
      } catch {
        /* ignore */
      }
    };
  }, []);

  const q = query.trim().toLowerCase();
  const visible = q
    ? terms.filter(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          (t.short_gist ?? '').toLowerCase().includes(q) ||
          t.definition_md.toLowerCase().includes(q)
      )
    : terms;

  return (
    <div className="flex flex-col h-full bg-white" data-testid="incall-terminology-pane">
      <div className="px-4 py-2.5 border-b border-[#E5E7EB] flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5 text-[#1E9A80]" />
        <span className="text-[12px] font-semibold text-[#1A1A1A]">Terminology</span>
        <span className="ml-auto text-[10px] text-[#9CA3AF] tabular-nums">
          {terms.length}
        </span>
      </div>

      <div className="px-3 py-2 border-b border-[#E5E7EB]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9CA3AF]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terms…"
            className="w-full pl-7 pr-2 py-1 text-[11px] bg-[#F3F3EE]/50 border border-[#E5E7EB] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {loading && (
          <div className="text-[11px] text-[#9CA3AF] italic px-1">
            Loading terms…
          </div>
        )}
        {!loading && visible.length === 0 && (
          <div className="text-[11px] text-[#9CA3AF] italic px-1">
            {q ? 'No terms match.' : 'No terminology added yet.'}
          </div>
        )}
        {visible.map((t) => {
          const open = openId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setOpenId(open ? null : t.id)}
              className={cn(
                'w-full text-left p-2 rounded-[8px] border transition-colors',
                open
                  ? 'border-[#1E9A80] bg-[#ECFDF5]'
                  : 'border-[#E5E7EB] bg-white hover:bg-[#F3F3EE]'
              )}
            >
              <div className="text-[12px] font-semibold text-[#1A1A1A]">
                {t.term}
              </div>
              {t.short_gist && (
                <div className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">
                  {t.short_gist}
                </div>
              )}
              {open && (
                <div className="mt-1.5 text-[11px] text-[#1A1A1A] leading-relaxed whitespace-pre-wrap border-t border-[#1E9A80]/30 pt-1.5">
                  {t.definition_md}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
