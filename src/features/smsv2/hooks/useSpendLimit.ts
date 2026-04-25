// STUB — Phase 0 mock. Phase 1 calls wk-spend-check edge function.
import { CURRENT_AGENT } from '../data/mockAgents';

export function useSpendLimit() {
  return {
    spendPence: CURRENT_AGENT.spendPence,
    limitPence: CURRENT_AGENT.limitPence,
    isAdmin: !!CURRENT_AGENT.isAdmin,
    isLimitReached:
      !CURRENT_AGENT.isAdmin && CURRENT_AGENT.spendPence >= CURRENT_AGENT.limitPence,
    percentUsed: Math.min(100, (CURRENT_AGENT.spendPence / CURRENT_AGENT.limitPence) * 100),
  };
}
