// Caller — script parser. Markdown subset for the agent's call script.
// Copied verbatim from src/features/smsv2/lib/scriptParser.ts (Hugo
// PR 3, 2026-04-26). Pure logic, unit-testable. See
// docs/caller/DECISIONS.md (D2 — reuse the backend).

export interface Heading {
  type: 'h';
  level: 1 | 2 | 3;
  text: string;
}
export interface Paragraph {
  type: 'p';
  text: string;
}
export interface ListItem {
  kind: 'plain' | 'if';
  condition?: string;
  text: string;
}
export interface List {
  type: 'ul';
  items: ListItem[];
}
export interface Quote {
  type: 'q';
  text: string;
}
export interface HRule {
  type: 'hr';
}
export type Block = Heading | Paragraph | List | Quote | HRule;

export const IF_BRANCH_RE = /^If\s+([^:]+):\s*(.*)$/i;

export function parseBlocks(body: string): Block[] {
  const lines = body.split(/\r?\n/);
  const blocks: Block[] = [];
  let buf: string[] = [];
  let listBuf: ListItem[] = [];

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
      const inner = li[1];
      const ifMatch = IF_BRANCH_RE.exec(inner.trim());
      if (ifMatch) {
        listBuf.push({
          kind: 'if',
          condition: ifMatch[1].trim(),
          text: ifMatch[2].trim(),
        });
      } else {
        listBuf.push({ kind: 'plain', text: inner });
      }
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
