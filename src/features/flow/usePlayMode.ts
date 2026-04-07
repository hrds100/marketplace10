import { useState, useCallback, useEffect, useRef } from 'react';
import type { Edge } from '@xyflow/react';
import { computePlayPath } from './lib/layout';

export type PlaySpeed = 'slow' | 'normal' | 'fast';
const SPEED_MS: Record<PlaySpeed, number> = { slow: 2800, normal: 1400, fast: 600 };

export interface PlayModeState {
  active: boolean;
  path: string[];
  index: number;
  playing: boolean;
  speed: PlaySpeed;
  activeNodeId: string | null;
  visitedIds: Set<string>;
  /** IDs of path edges already traversed */
  activeEdgeIds: Set<string>;
}

export interface PlayModeActions {
  startFrom: (nodeId: string, visibleIds?: Set<string>) => void;
  play: () => void;
  pause: () => void;
  stepNext: () => void;
  stepPrev: () => void;
  stop: () => void;
  setSpeed: (s: PlaySpeed) => void;
}

export function usePlayMode(allEdges: Edge[]): PlayModeState & PlayModeActions {
  const [path, setPath] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaySpeed>('normal');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  // Auto-advance
  useEffect(() => {
    if (!playing) { clearTimer(); return; }
    timerRef.current = setTimeout(() => {
      setIndex(i => {
        const next = i + 1;
        if (next >= path.length) { setPlaying(false); return i; }
        return next;
      });
    }, SPEED_MS[speed]);
    return clearTimer;
  }, [playing, index, speed, path.length]);

  const startFrom = useCallback((nodeId: string, visibleIds?: Set<string>) => {
    clearTimer();
    const p = computePlayPath(nodeId, allEdges, visibleIds ?? null);
    setPath(p);
    setIndex(0);
    setPlaying(false);
  }, [allEdges]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);

  const stepNext = useCallback(() => {
    clearTimer();
    setPlaying(false);
    setIndex(i => Math.min(i + 1, path.length - 1));
  }, [path.length]);

  const stepPrev = useCallback(() => {
    clearTimer();
    setPlaying(false);
    setIndex(i => Math.max(i - 1, 0));
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    setPlaying(false);
    setPath([]);
    setIndex(0);
  }, []);

  // Derive state
  const active = path.length > 0;
  const activeNodeId = active ? (path[index] ?? null) : null;
  const visitedIds = new Set(path.slice(0, index + 1));

  // Active edges: all edges on the traversed segment of the path
  const activeEdgeIds = new Set<string>();
  for (let i = 0; i < index; i++) {
    const src = path[i];
    const tgt = path[i + 1];
    const edge = allEdges.find(e => e.source === src && e.target === tgt);
    if (edge) activeEdgeIds.add(edge.id);
  }
  // Also highlight the current leading edge (src→next)
  if (index < path.length - 1) {
    const edge = allEdges.find(e => e.source === path[index] && e.target === path[index + 1]);
    if (edge) activeEdgeIds.add(edge.id);
  }

  return {
    active,
    path,
    index,
    playing,
    speed,
    activeNodeId,
    visitedIds,
    activeEdgeIds,
    startFrom,
    play,
    pause,
    stepNext,
    stepPrev,
    stop,
    setSpeed,
  };
}
