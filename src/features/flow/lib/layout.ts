import type { Edge } from '@xyflow/react';

/**
 * Computes compact LTR layered positions for a subset of nodes.
 * Uses iterative rank assignment (max parent rank + 1) so each node
 * sits in the column after all its visible parents.
 */
export function computeLayoutPositions(
  nodeIds: string[],
  allEdges: Edge[],
  opts = { colWidth: 300, rowHeight: 160, maxPerCol: 6 },
): Record<string, { x: number; y: number }> {
  const { colWidth, rowHeight, maxPerCol } = opts;
  const idSet = new Set(nodeIds);

  // Only edges between visible nodes
  const edges = allEdges.filter(e => idSet.has(e.source) && idSet.has(e.target));

  // Build adjacency
  const inMap = new Map<string, Set<string>>(nodeIds.map(id => [id, new Set()]));
  for (const e of edges) inMap.get(e.target)?.add(e.source);

  // Iterative rank: rank[n] = max(rank[parents]) + 1
  const rank = new Map<string, number>(nodeIds.map(id => [id, 0]));
  for (let iter = 0; iter < nodeIds.length + 2; iter++) {
    let changed = false;
    for (const id of nodeIds) {
      const parents = [...(inMap.get(id) ?? [])];
      if (parents.length === 0) continue;
      const maxParentRank = Math.max(...parents.map(p => rank.get(p) ?? 0));
      const desired = maxParentRank + 1;
      if (desired > (rank.get(id) ?? 0)) {
        rank.set(id, desired);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Group by rank column
  const byRank = new Map<number, string[]>();
  for (const [id, r] of rank) {
    if (!byRank.has(r)) byRank.set(r, []);
    byRank.get(r)!.push(id);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  let colOffset = 0;

  // Process columns in rank order
  const sortedRanks = [...byRank.keys()].sort((a, b) => a - b);
  for (const r of sortedRanks) {
    const ids = byRank.get(r)!;

    // Split into sub-columns if too tall
    const subCols = Math.ceil(ids.length / maxPerCol);
    for (let sc = 0; sc < subCols; sc++) {
      const chunk = ids.slice(sc * maxPerCol, (sc + 1) * maxPerCol);
      const totalH = (chunk.length - 1) * rowHeight;
      chunk.forEach((id, i) => {
        positions[id] = {
          x: (colOffset + sc) * colWidth,
          y: i * rowHeight - totalH / 2,
        };
      });
    }
    colOffset += subCols;
  }

  return positions;
}

/**
 * Follows edges forward from startId via BFS.
 * Returns ordered list of node IDs (the "play path").
 * Stops at cycles or after maxSteps.
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

    // Prefer edges that aren't "system" utility loops
    const next = candidates[0].target;
    path.push(next);
    visited.add(next);
  }

  return path;
}
