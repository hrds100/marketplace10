// crm-v2 useNextLead — peek the head of the queue.
// Pure derivation from useDialerQueue; no extra fetch.

import { useDialerQueue, type QueueLead } from './useDialerQueue';

export interface NextLeadState {
  next: QueueLead | null;
  second: QueueLead | null;
  /** Full ordered queue. Exposed so a component that needs both head
   *  and the rest doesn't have to call useDialerQueue twice. */
  all: QueueLead[];
  loading: boolean;
  error: string | null;
}

export function useNextLead(opts: {
  campaignId: string | null;
  agentId: string | null;
}): NextLeadState {
  const { rows, loading, error } = useDialerQueue({
    campaignId: opts.campaignId,
    agentId: opts.agentId,
  });
  return {
    next: rows[0] ?? null,
    second: rows[1] ?? null,
    all: rows,
    loading,
    error,
  };
}
