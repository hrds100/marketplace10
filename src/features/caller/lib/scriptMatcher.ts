// Caller — script matcher. Token-set Jaccard linker between transcript
// chunks and parsed script blocks. Copied verbatim from
// src/features/smsv2/lib/scriptMatcher.ts (Hugo PR 5).

import type { Block } from './scriptParser';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'to', 'of', 'in', 'on', 'for', 'at', 'by', 'with', 'from', 'into',
  'about', 'as', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you',
  'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
  'his', 'their', 'our', 'do', 'does', 'did', 'doing', 'have', 'has', 'had',
  'having', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might',
  'must', 'so', 'if', 'then', 'than', 'just', 'um', 'uh', 'er', 'ah', 'oh',
  'yeah', 'yep', 'no', 'ok', 'okay', 'right',
]);

export function tokenize(text: string): string[] {
  if (!text) return [];
  const cleaned = text
    .toLowerCase()
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/[*_`>#-]/g, ' ')
    .replace(/'/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ');
  return cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

export function blockText(block: Block): string {
  switch (block.type) {
    case 'h':
    case 'p':
    case 'q':
      return block.text;
    case 'hr':
      return '';
    case 'ul':
      return block.items
        .map((it) =>
          it.kind === 'if' ? `${it.condition ?? ''} ${it.text}` : it.text
        )
        .join(' ');
  }
}

export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const unionSize = setA.size + setB.size - intersection;
  if (unionSize === 0) return 0;
  return intersection / unionSize;
}

interface MatchOpts {
  threshold?: number;
  minTokens?: number;
}

interface MatchResult {
  matchedIdx: number | null;
  score: number;
}

export function matchChunkToBlock(
  chunkText: string,
  blocks: Block[],
  fromIdx: number,
  opts: MatchOpts = {}
): MatchResult {
  const threshold = opts.threshold ?? 0.45;
  const minTokens = opts.minTokens ?? 6;
  const chunkTokens = tokenize(chunkText);
  if (chunkTokens.length < minTokens) {
    return { matchedIdx: null, score: 0 };
  }
  let bestIdx: number | null = null;
  let bestScore = 0;
  for (let i = Math.max(0, fromIdx); i < blocks.length; i++) {
    const blockTokens = tokenize(blockText(blocks[i]));
    if (blockTokens.length === 0) continue;
    const score = jaccard(chunkTokens, blockTokens);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  if (bestScore >= threshold) {
    return { matchedIdx: bestIdx, score: bestScore };
  }
  return { matchedIdx: null, score: bestScore };
}
