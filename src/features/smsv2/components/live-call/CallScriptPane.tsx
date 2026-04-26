// CallScriptPane — col 3 of the LiveCallScreen.
//
// Hugo 2026-04-30: each agent has their OWN editable script. Resolution
// priority (via useAgentScript):
//   1. Agent's own row (wk_call_scripts WHERE owner_agent_id = auth.uid())
//   2. Default row (wk_call_scripts WHERE is_default = true)
//   3. Empty state
// Each agent edits via /smsv2/settings → AI coach → "My script".
//
// The script is the *map* the agent follows — the AI coach pane (col 2)
// writes the literal next sentence to read.
//
// Hugo 2026-04-30 (PR A): each rendered block is clickable. Click toggles
// "read" → the block dims to opacity 0.5 with line-through so the agent
// can visually track where they are mid-call. Read state persists in
// localStorage keyed by callId so a refresh keeps progress; cleared per
// call (different callId → different key).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentScript } from '../../hooks/useAgentScript';
import { parseBlocks, type Block } from '../../lib/scriptParser';

interface Props {
  /** Active call id — used to scope read-tracking state in localStorage. */
  callId: string | null;
  /** First name of the contact, used for {{first_name}} substitution. */
  contactFirstName: string;
  /** Agent first name, used for {{agent_first_name}} substitution. */
  agentFirstName: string;
}

function readStorageKey(callId: string | null): string | null {
  if (!callId) return null;
  return `smsv2-script-read:${callId}`;
}

function loadReadSet(callId: string | null): Set<number> {
  const k = readStorageKey(callId);
  if (!k) return new Set();
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((n): n is number => typeof n === 'number'));
  } catch {
    return new Set();
  }
}

export default function CallScriptPane({
  callId,
  contactFirstName,
  agentFirstName,
}: Props) {
  const { script, loading, error } = useAgentScript();
  const [readIdxs, setReadIdxs] = useState<Set<number>>(() =>
    loadReadSet(callId)
  );

  // Re-hydrate when callId changes (different call → different state).
  useEffect(() => {
    setReadIdxs(loadReadSet(callId));
  }, [callId]);

  // Persist on every change.
  useEffect(() => {
    const k = readStorageKey(callId);
    if (!k) return;
    try {
      window.localStorage.setItem(k, JSON.stringify(Array.from(readIdxs)));
    } catch {
      /* localStorage full or denied — ignore, in-memory state still works */
    }
  }, [callId, readIdxs]);

  const toggleRead = useCallback((idx: number) => {
    setReadIdxs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setReadIdxs(new Set());
    const k = readStorageKey(callId);
    if (k) {
      try {
        window.localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  }, [callId]);

  const rendered = useMemo(() => {
    const body = (script.body_md || '').trim();
    if (!body) return '';
    return body
      .replace(/\{\{\s*first_name\s*\}\}/gi, contactFirstName)
      .replace(/\{\{\s*agent_first_name\s*\}\}/gi, agentFirstName);
  }, [script.body_md, contactFirstName, agentFirstName]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-2.5 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[#1E9A80]" />
          <span className="text-[12px] font-semibold text-[#1A1A1A]">
            Call script
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#9CA3AF]">{script.name}</span>
          {callId && readIdxs.size > 0 && (
            <button
              onClick={reset}
              className="text-[10px] text-[#9CA3AF] hover:text-[#1A1A1A] inline-flex items-center gap-0.5"
              title="Reset read progress for this call"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && (
          <div className="text-[12px] text-[#9CA3AF]">Loading script…</div>
        )}
        {error && (
          <div className="text-[11px] text-[#EF4444]">⚠ {error}</div>
        )}
        {!loading && !rendered && !error && (
          <div className="text-[12px] text-[#9CA3AF] leading-snug">
            No default script yet. Open Settings → AI coach → "Default call
            script" to add one.
          </div>
        )}
        {!loading && rendered && (
          <ScriptMarkdown
            body={rendered}
            readIdxs={readIdxs}
            onToggle={toggleRead}
          />
        )}
      </div>
    </div>
  );
}

// Lightweight Markdown rendering — no external dep. Handles the subset
// the call-script seed uses: # / ## / ### headings, lists (- / *), bold
// (**), italic (*), inline code (`), blockquotes (>), and paragraphs.
// Anything fancier reads as plain text rather than crashing.
function ScriptMarkdown({
  body,
  readIdxs,
  onToggle,
}: {
  body: string;
  readIdxs: Set<number>;
  onToggle: (idx: number) => void;
}) {
  const blocks = parseBlocks(body);
  return (
    <div className="space-y-3 text-[13px] leading-relaxed text-[#1A1A1A]">
      {blocks.map((b, i) => (
        <ClickableBlock
          key={i}
          isRead={readIdxs.has(i)}
          onClick={() => onToggle(i)}
        >
          {renderBlock(b, i)}
        </ClickableBlock>
      ))}
    </div>
  );
}

function ClickableBlock({
  isRead,
  onClick,
  children,
}: {
  isRead: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'cursor-pointer rounded -mx-1 px-1 transition-opacity hover:bg-[#F9FAFB]',
        isRead && 'opacity-50 line-through'
      )}
    >
      {children}
    </div>
  );
}

// Block parser + types live in src/features/smsv2/lib/scriptParser.ts so
// vitest can exercise them without dragging React + Supabase imports
// into the test environment. Renderer below consumes the parsed blocks.

function renderBlock(b: Block, i: number) {
  if (b.type === 'h') {
    const cls =
      b.level === 1
        ? 'text-[16px] font-bold text-[#1A1A1A] mt-2 mb-1'
        : b.level === 2
          ? 'text-[14px] font-bold text-[#1A1A1A] mt-2 mb-0.5'
          : 'text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] mt-1.5 mb-0.5';
    return (
      <div key={i} className={cls}>
        {renderInline(b.text)}
      </div>
    );
  }
  if (b.type === 'p') {
    return (
      <p key={i} className="text-[13px] text-[#1A1A1A] leading-relaxed">
        {renderInline(b.text)}
      </p>
    );
  }
  if (b.type === 'ul') {
    return (
      <ul key={i} className="list-disc pl-4 space-y-1 text-[13px] text-[#1A1A1A]">
        {b.items.map((it, j) => (
          <li key={j}>
            {it.kind === 'if' ? (
              <span className="inline-flex items-baseline gap-1.5 flex-wrap">
                <span
                  className="inline-block bg-[#FEF3C7] text-[#B45309] text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                >
                  if {it.condition}
                </span>
                <span>{renderInline(it.text)}</span>
              </span>
            ) : (
              renderInline(it.text)
            )}
          </li>
        ))}
      </ul>
    );
  }
  if (b.type === 'q') {
    return (
      <blockquote
        key={i}
        className="border-l-2 border-[#1E9A80] pl-3 py-0.5 text-[12px] italic text-[#6B7280]"
      >
        {renderInline(b.text)}
      </blockquote>
    );
  }
  return <hr key={i} className="border-[#E5E7EB] my-2" />;
}

// Inline: **bold**, *italic*, `code`. Keep it simple — call-script content
// is admin-controlled, no need to defend against XSS beyond text rendering.
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
          className="bg-[#F3F3EE] text-[12px] px-1 rounded font-mono"
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
