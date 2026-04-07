import type { Edge } from '@xyflow/react';

/**
 * Compact wrap-grid layout for a filtered subset of nodes.
 *
 * Algorithm:
 * 1. BFS from root nodes assigns a "rank" (depth) to each node.
 * 2. Nodes are sorted by rank, then placed in a snake/wrap grid
 *    with MAX_COLS columns and wrapping rows.
 * 3. This keeps the flow order readable while staying compact — no
 *    single-row 7000px-wide chains.
 */
const MAX_COLS = 5;
const COL_W = 280;
const ROW_H = 160;

export function computeLayoutPositions(
  nodeIds: string[],
  allEdges: Edge[],
): Record<string, { x: number; y: number }> {
  if (nodeIds.length === 0) return {};

  const idSet = new Set(nodeIds);
  const edges = allEdges.filter(e => idSet.has(e.source) && idSet.has(e.target));

  // Build in-edge map
  const inMap = new Map<string, Set<string>>(nodeIds.map(id => [id, new Set()]));
  for (const e of edges) inMap.get(e.target)?.add(e.source);

  // Iterative rank assignment: rank[n] = max(rank[parents]) + 1
  const rank = new Map<string, number>(nodeIds.map(id => [id, 0]));
  for (let iter = 0; iter < nodeIds.length + 2; iter++) {
    let changed = false;
    for (const id of nodeIds) {
      const parents = [...(inMap.get(id) ?? [])];
      if (parents.length === 0) continue;
      const maxParent = Math.max(...parents.map(p => rank.get(p) ?? 0));
      if (maxParent + 1 > (rank.get(id) ?? 0)) {
        rank.set(id, maxParent + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Sort nodes by rank (flow order), then by original nodeIds order as tiebreak
  const sorted = [...nodeIds].sort((a, b) => {
    const dr = (rank.get(a) ?? 0) - (rank.get(b) ?? 0);
    if (dr !== 0) return dr;
    return nodeIds.indexOf(a) - nodeIds.indexOf(b);
  });

  // Place in wrap-grid: row = Math.floor(i / MAX_COLS), col = i % MAX_COLS
  // Zigzag: odd rows go right-to-left so adjacent steps stay visually close
  const positions: Record<string, { x: number; y: number }> = {};
  sorted.forEach((id, i) => {
    const row = Math.floor(i / MAX_COLS);
    const colInRow = i % MAX_COLS;
    const col = row % 2 === 0 ? colInRow : MAX_COLS - 1 - colInRow;
    positions[id] = { x: col * COL_W, y: row * ROW_H };
  });

  return positions;
}

/**
 * Forward BFS from startId following edges.
 * Returns an ordered path of node IDs for journey/play mode.
 */
export function computePlayPath(
  startId: string,
  allEdges: Edge[],
  visibleNodeIds: Set<string> | null = null,
  maxSteps = 40,
): string[] {
  const path: string[] = [startId];
  const visited = new Set([startId]);

  for (let i = 0; i < maxSteps; i++) {
    const current = path[path.length - 1];
    const candidates = allEdges
      .filter(e => e.source === current)
      .filter(e => !visited.has(e.target))
      .filter(e => visibleNodeIds === null || visibleNodeIds.has(e.target));

    if (candidates.length === 0) break;
    const next = candidates[0].target;
    path.push(next);
    visited.add(next);
  }

  return path;
}
