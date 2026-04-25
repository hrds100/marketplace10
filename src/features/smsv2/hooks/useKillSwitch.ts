// STUB — Phase 0 mock kill-switch state.
// Phase 1: backed by wk_killswitches table + realtime channel.
import { useState } from 'react';

export interface KillSwitchState {
  allDialers: boolean;
  aiCoach: boolean;
  outbound: boolean;
}

let _state: KillSwitchState = {
  allDialers: false,
  aiCoach: false,
  outbound: false,
};

const listeners = new Set<(s: KillSwitchState) => void>();

function set(next: Partial<KillSwitchState>) {
  _state = { ..._state, ...next };
  listeners.forEach((l) => l(_state));
}

export function useKillSwitch() {
  const [s, setS] = useState(_state);

  // subscribe
  useStableSubscribe(setS);

  return {
    ...s,
    toggle: (k: keyof KillSwitchState) => set({ [k]: !_state[k] } as Partial<KillSwitchState>),
  };
}

function useStableSubscribe(cb: (s: KillSwitchState) => void) {
  // tiny inline subscriber
  if (typeof window !== 'undefined') {
    if (!(cb as unknown as { __sub?: boolean }).__sub) {
      (cb as unknown as { __sub?: boolean }).__sub = true;
      listeners.add(cb);
    }
  }
}
