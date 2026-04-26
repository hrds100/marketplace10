// TerminologyPane — col 4 of the LiveCallScreen.
//
// Click-to-expand glossary cards. Reads wk_terminologies (active rows
// only) via useTerminologies(). Realtime — admin edits in
// /smsv2/settings → Glossary appear here without reload.
//
// Each card shows: term + (optional) one-line gist. Click to expand the
// full Markdown definition. Stays compact when collapsed so the agent
// can scan the list mid-call.

import { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTerminologies, type Terminology } from '../../hooks/useTerminologies';

export default function TerminologyPane() {
  const { items, loading, error } = useTerminologies({ activeOnly: true });
  const [filter, setFilter] = useState('');
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        (t.short_gist ?? '').toLowerCase().includes(q) ||
        t.definition_md.toLowerCase().includes(q)
    );
  }, [items, filter]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-2.5 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-[#1E9A80]" />
          <span className="text-[12px] font-semibold text-[#1A1A1A]">
            Glossary
          </span>
        </div>
        <span className="text-[10px] text-[#9CA3AF]">
          {loading ? '…' : `${items.length} terms`}
        </span>
      </div>

      <div className="px-4 py-2 border-b border-[#E5E7EB]">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter…"
          className="w-full px-2.5 py-1.5 text-[12px] border border-[#E5E5E5] rounded-[10px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 focus:border-[#1E9A80]"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {error && (
          <div className="text-[11px] text-[#EF4444] px-1">⚠ {error}</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-[12px] text-[#9CA3AF] text-center px-4 py-6 leading-snug">
            {items.length === 0
              ? 'No glossary terms yet. Add some in Settings → Glossary.'
              : `No matches for "${filter}".`}
          </div>
        )}
        {filtered.map((t) => (
          <TermCard key={t.id} term={t} />
        ))}
      </div>
    </div>
  );
}

function TermCard({ term }: { term: Terminology }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        'border rounded-lg transition-colors',
        open ? 'border-[#1E9A80]/40 bg-[#ECFDF5]/30' : 'border-[#E5E7EB] hover:border-[#1E9A80]/30'
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
          <div className="text-[13px] font-semibold text-[#1A1A1A]">
            {term.term}
          </div>
          {term.short_gist && (
            <div className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">
              {term.short_gist}
            </div>
          )}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0.5 border-t border-[#E5E7EB] mt-1">
          <DefinitionMarkdown body={term.definition_md} />
        </div>
      )}
    </div>
  );
}

// Minimal Markdown renderer, same subset as CallScriptPane (bold, italic,
// inline code, paragraphs, lists). Glossary content is admin-controlled.
function DefinitionMarkdown({ body }: { body: string }) {
  const lines = body.split(/\r?\n/);
  const blocks: { kind: 'p' | 'li'; text: string }[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      blocks.push({ kind: 'p', text: para.join(' ') });
      para = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const li = /^\s*[-*]\s+(.*)$/.exec(line);
    if (li) {
      flush();
      blocks.push({ kind: 'li', text: li[1] });
    } else {
      para.push(line);
    }
  }
  flush();

  return (
    <div className="text-[13px] text-[#1A1A1A] leading-relaxed space-y-1.5 mt-2">
      {blocks.map((b, i) =>
        b.kind === 'li' ? (
          <li key={i} className="ml-4 list-disc text-[12px]">
            {renderInline(b.text)}
          </li>
        ) : (
          <p key={i} className="text-[12px] leading-relaxed">
            {renderInline(b.text)}
          </p>
        )
      )}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('`')) {
      parts.push(
        <code
          key={key++}
          className="bg-[#F3F3EE] text-[11px] px-1 rounded font-mono"
        >
          {tok.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
