// ScriptRail — col 3 of the LiveCallScreen.
//
// Hugo 2026-04-30: stateful script rail, agent-driven (no AI auto-
// advance, no DB writes). The agent clicks "Mark complete + advance"
// on the active stage to move forward. Completed stages grey out;
// future stages stay muted; the active stage is bright + halo.
//
// Below the rail we still render the agent's full call script (from
// useAgentScript) as a Markdown block — the rail is the navigation,
// the script body is the content.

import { useMemo } from 'react';
import { CheckCircle2, Circle, ChevronRight, RotateCcw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentScript } from '../../hooks/useAgentScript';
import {
  useScriptRailState,
  SCRIPT_STAGES,
} from '../../hooks/useScriptRailState';

interface Props {
  callId: string | null;
  contactFirstName: string;
  agentFirstName: string;
}

export default function ScriptRail({
  callId,
  contactFirstName,
  agentFirstName,
}: Props) {
  const { script, loading, error } = useAgentScript();
  const { currentIdx, completedIdxs, setCurrent, advance, reset } =
    useScriptRailState(callId);

  const rendered = useMemo(() => {
    const body = (script.body_md || '').trim();
    if (!body) return '';
    return body
      .replace(/\{\{\s*first_name\s*\}\}/gi, contactFirstName)
      .replace(/\{\{\s*agent_first_name\s*\}\}/gi, agentFirstName);
  }, [script.body_md, contactFirstName, agentFirstName]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[#1E9A80]" />
          <span className="text-[12px] font-semibold text-[#1A1A1A]">
            Script — {script.name}
          </span>
          {script.source === 'own' && (
            <span className="text-[9px] bg-[#ECFDF5] text-[#1E9A80] px-1.5 py-0.5 rounded font-semibold">
              YOURS
            </span>
          )}
        </div>
        {callId && (completedIdxs.length > 0 || currentIdx > 0) && (
          <button
            onClick={reset}
            className="text-[10px] text-[#9CA3AF] hover:text-[#1A1A1A] inline-flex items-center gap-0.5"
            title="Reset stage progress for this call"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {/* Stage rail */}
      <div className="px-3 py-2.5 border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="space-y-1">
          {SCRIPT_STAGES.map((stage, idx) => {
            const isCompleted = completedIdxs.includes(idx);
            const isCurrent = idx === currentIdx;
            return (
              <button
                key={stage.key}
                onClick={() => setCurrent(idx)}
                disabled={!callId}
                className={cn(
                  'w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
                  isCurrent
                    ? 'bg-[#1E9A80]/10 border border-[#1E9A80]/40 shadow-[0_2px_8px_rgba(30,154,128,0.15)]'
                    : isCompleted
                      ? 'opacity-50 hover:opacity-80'
                      : 'opacity-65 hover:opacity-100',
                  !callId && 'cursor-not-allowed opacity-40'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2
                    className="w-3.5 h-3.5 text-[#1E9A80] flex-shrink-0 mt-0.5"
                    strokeWidth={2.4}
                  />
                ) : isCurrent ? (
                  <ChevronRight
                    className="w-3.5 h-3.5 text-[#1E9A80] flex-shrink-0 mt-0.5"
                    strokeWidth={2.4}
                  />
                ) : (
                  <Circle
                    className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0 mt-0.5"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      'text-[11px] font-semibold',
                      isCompleted
                        ? 'text-[#6B7280] line-through'
                        : isCurrent
                          ? 'text-[#1A1A1A]'
                          : 'text-[#525252]'
                    )}
                  >
                    {stage.label}
                  </div>
                  {isCurrent && (
                    <div className="text-[10px] text-[#6B7280] mt-0.5 leading-snug">
                      {stage.hint}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {callId && currentIdx < SCRIPT_STAGES.length - 1 && (
          <button
            onClick={advance}
            className="mt-2 w-full bg-[#1E9A80] text-white text-[11px] font-semibold py-1.5 rounded-[8px] hover:bg-[#1E9A80]/90 inline-flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark "{SCRIPT_STAGES[currentIdx].label}" complete · advance
          </button>
        )}
        {callId && currentIdx === SCRIPT_STAGES.length - 1 && (
          <div className="mt-2 text-[10px] text-[#6B7280] text-center italic">
            Final stage. Click Reset above to start over for this call.
          </div>
        )}
      </div>

      {/* Script body (the actual readable content) */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && (
          <div className="text-[12px] text-[#9CA3AF]">Loading script…</div>
        )}
        {error && <div className="text-[11px] text-[#EF4444]">⚠ {error}</div>}
        {!loading && !rendered && !error && (
          <div className="text-[12px] text-[#9CA3AF] leading-snug">
            No script yet. Open Settings → AI coach → "My script" to add one.
          </div>
        )}
        {!loading && rendered && <ScriptMarkdown body={rendered} />}
      </div>
    </div>
  );
}

// Lightweight Markdown renderer (same subset as the previous
// CallScriptPane — no external dep). Handles #/##/### headings, lists,
// **bold**, *italic*, `code`, blockquotes, hr.
function ScriptMarkdown({ body }: { body: string }) {
  const blocks = parseBlocks(body);
  return (
    <div className="space-y-3 text-[13px] leading-relaxed text-[#1A1A1A]">
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}

interface Heading { type: 'h'; level: 1 | 2 | 3; text: string; }
interface Paragraph { type: 'p'; text: string; }
interface List { type: 'ul'; items: string[]; }
interface Quote { type: 'q'; text: string; }
interface HRule { type: 'hr'; }
type Block = Heading | Paragraph | List | Quote | HRule;

function parseBlocks(body: string): Block[] {
  const lines = body.split(/\r?\n/);
  const blocks: Block[] = [];
  let buf: string[] = [];
  let listBuf: string[] = [];

  const flushPara = () => {
    if (buf.length) {
      blocks.push({ type: 'p', text: buf.join(' ') });
      buf = [];
    }
  };
  const flushList = () => {
    if (listBuf.length) {
      blocks.push({ type: 'ul', items: listBuf });
      listBuf = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    if (line.trim() === '---') {
      flushPara();
      flushList();
      blocks.push({ type: 'hr' });
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      blocks.push({ type: 'h', level: h[1].length as 1 | 2 | 3, text: h[2] });
      continue;
    }
    const li = /^\s*[-*]\s+(.*)$/.exec(line);
    if (li) {
      flushPara();
      listBuf.push(li[1]);
      continue;
    }
    const q = /^>\s+(.*)$/.exec(line);
    if (q) {
      flushPara();
      flushList();
      blocks.push({ type: 'q', text: q[1] });
      continue;
    }
    flushList();
    buf.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

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
          <li key={j}>{renderInline(it)}</li>
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
