// PR 153 (Hugo 2026-04-29): peek the next lead in the queue without
// consuming it. HeroCard renders this; click "Dial" feeds startCall().
//
// Source of truth: useMyDialerQueue (server wk_dialer_queue, realtime
// sub). This hook is a tiny derivation layer — same data, narrower
// shape, just the head item.

import { useMyDialerQueue, type MyQueueLead } from './useMyDialerQueue';

export interface UseNextLeadResult {
  next: MyQueueLead | null;
  /** Same items as useMyDialerQueue. Exposed so HeroCard + the queue
   *  list can share one fetch without two subscriptions. */
  all: MyQueueLead[];
  loading: boolean;
  error: string | null;
}

/** Peek-only — never mutates the queue. Consume happens via startCall
 *  → wk-leads-next (server-atomic claim). */
export function useNextLead(
  campaignId: string | null,
  agentId: string | null,
  /** How many rows to fetch in total. Default 50 — generous so the
   *  full queue list also has data without a second fetch. */
  fetchLimit = 50
): UseNextLeadResult {
  const { items, loading, error } = useMyDialerQueue(
    campaignId,
    agentId,
    fetchLimit
  );
  return {
    next: items[0] ?? null,
    all: items,
    loading,
    error,
  };
}
