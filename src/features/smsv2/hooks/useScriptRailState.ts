// useScriptRailState — per-call stage tracking, localStorage-backed.
//
// Hugo 2026-04-30: dropped the auto-stage-advance idea. Stage state is
// now driven by agent click (Mark complete + Advance) and stored in
// localStorage keyed by callId. No DB writes — keeps the live-call hot
// path lean. Cleared when localStorage is cleared / browser closed.

import { useEffect, useState, useCallback } from 'react';

export const SCRIPT_STAGES = [
  { key: 'open',         label: 'Open',                hint: 'Confirm name + WhatsApp source + tempo check' },
  { key: 'qualify',      label: 'Qualify',             hint: 'Already running short-lets, or new to it?' },
  { key: 'permission',   label: 'Permission to pitch', hint: 'Earned only when caller has shown interest' },
  { key: 'pitch',        label: 'Pitch',               hint: 'JV model + flagship deal + entry minimum' },
  { key: 'returns',      label: 'Returns',             hint: 'Monthly cashflow + platform + exit' },
  { key: 'sms_close',    label: 'SMS close',           hint: 'Earned-close: only when warm + pitch landed' },
  { key: 'followup',     label: 'Follow-up lock',      hint: 'Tomorrow morning or afternoon?' },
] as const;

export type ScriptStageKey = (typeof SCRIPT_STAGES)[number]['key'];

interface ScriptRailState {
  currentIdx: number;
  completedIdxs: number[];
}

const DEFAULT_STATE: ScriptRailState = {
  currentIdx: 0,
  completedIdxs: [],
};

function storageKey(callId: string | null): string | null {
  if (!callId) return null;
  return `smsv2-script-rail:${callId}`;
}

function readState(callId: string | null): ScriptRailState {
  const k = storageKey(callId);
  if (!k) return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ScriptRailState>;
    return {
      currentIdx:
        typeof parsed.currentIdx === 'number' &&
        parsed.currentIdx >= 0 &&
        parsed.currentIdx < SCRIPT_STAGES.length
          ? parsed.currentIdx
          : 0,
      completedIdxs: Array.isArray(parsed.completedIdxs)
        ? parsed.completedIdxs.filter(
            (n): n is number =>
              typeof n === 'number' && n >= 0 && n < SCRIPT_STAGES.length
          )
        : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useScriptRailState(callId: string | null) {
  const [state, setState] = useState<ScriptRailState>(() => readState(callId));

  // Re-hydrate when callId changes (different call → different state).
  useEffect(() => {
    setState(readState(callId));
  }, [callId]);

  // Persist on every state change.
  useEffect(() => {
    const k = storageKey(callId);
    if (!k) return;
    try {
      window.localStorage.setItem(k, JSON.stringify(state));
    } catch {
      /* localStorage full or denied — ignore, in-memory state still works */
    }
  }, [callId, state]);

  const setCurrent = useCallback((idx: number) => {
    setState((s) => ({
      ...s,
      currentIdx: Math.max(0, Math.min(SCRIPT_STAGES.length - 1, idx)),
    }));
  }, []);

  const markComplete = useCallback((idx: number) => {
    setState((s) => ({
      ...s,
      completedIdxs: s.completedIdxs.includes(idx)
        ? s.completedIdxs
        : [...s.completedIdxs, idx],
    }));
  }, []);

  const advance = useCallback(() => {
    setState((s) => {
      const completed = s.completedIdxs.includes(s.currentIdx)
        ? s.completedIdxs
        : [...s.completedIdxs, s.currentIdx];
      const next = Math.min(SCRIPT_STAGES.length - 1, s.currentIdx + 1);
      return { currentIdx: next, completedIdxs: completed };
    });
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
    const k = storageKey(callId);
    if (k) {
      try {
        window.localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  }, [callId]);

  return {
    currentIdx: state.currentIdx,
    completedIdxs: state.completedIdxs,
    setCurrent,
    markComplete,
    advance,
    reset,
  };
}
