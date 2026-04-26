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

import { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { useAgentScript } from '../../hooks/useAgentScript';

interface Props {
  /** First name of the contact, used for {{first_name}} substitution. */
  contactFirstName: string;
  /** Agent first name, used for {{agent_first_name}} substitution. */
  agentFirstName: string;
}

export default function CallScriptPane({ contactFirstName, agentFirstName }: Props) {
  const { script, loading, error } = useAgentScript();

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
        <span className="text-[10px] text-[#9CA3AF]">{script.name}</span>
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
          <ScriptMarkdown body={rendered} />
        )}
      </div>
    </div>
  );
}

// Lightweight Markdown rendering — no external dep. Handles the subset
// the call-script seed uses: # / ## / ### headings, lists (- / *), bold
// (**), italic (*), inline code (`), blockquotes (>), and paragraphs.
// Anything fancier reads as plain text rather than crashing.
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
