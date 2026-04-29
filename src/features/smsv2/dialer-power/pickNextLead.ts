// pickNextLead — query wk_dialer_queue and return the first pending
// row whose contact is dialable (has a phone, not in the dialed Set).
//
// Cloned 1:1 from src/features/caller/pages/DialerPage.tsx —
// pickNextLead callback. Power-dialer mechanism.
//
// We deliberately bypass the wk_pick_next_lead RPC (which atomically
// claims a row by setting status='dialing'). The RPC was the source
// of "Next picks the same already-dialed row" bugs because of timing
// races between client anti-loop and server-side claim. Instead:
//   - SELECT pending rows, ordered.
//   - Loop in JS, skip rows whose contact_id is in `dialed`.
//   - Return the first dialable row.
// The contact only enters `dialed` when DIAL_START is dispatched;
// every subsequent pickNextLead call sees the up-to-date set.

import type { Lead } from './dialerReducer';

export interface PickNextLeadOpts {
  campaignId: string | null;
  agentId: string | null;
  isAdmin: boolean;
  dialed: ReadonlySet<string>;
}

interface QueueRowJoined {
  id: string;
  wk_contacts: {
    id: string;
    name: string | null;
    phone: string | null;
    pipeline_column_id: string | null;
  } | null;
}

// Minimal supabase client shape this function uses. Lets tests stub
// it without pulling the real client.
export interface SupabaseLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

export async function pickNextLead(
  supabase: SupabaseLike,
  opts: PickNextLeadOpts
): Promise<Lead | null> {
  if (!opts.campaignId) return null;

  const nowIso = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase.from('wk_dialer_queue' as any) as any)
    .select(
      'id, contact_id, agent_id, status, priority, attempts, scheduled_for, ' +
        'wk_contacts:contact_id ( id, name, phone, pipeline_column_id )'
    )
    .eq('campaign_id', opts.campaignId)
    .eq('status', 'pending')
    .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
    .order('priority', { ascending: false })
    .order('scheduled_for', { ascending: true, nullsFirst: true })
    .order('attempts', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(20);

  if (!opts.isAdmin && opts.agentId) {
    q = q.or(`agent_id.eq.${opts.agentId},agent_id.is.null`);
  }

  const { data, error } = await q;
  if (error || !data) return null;

  for (const r of data as QueueRowJoined[]) {
    const c = r.wk_contacts;
    if (!c) continue;
    if (!c.phone) continue;
    if (opts.dialed.has(c.id)) continue;
    return {
      id: c.id,
      name: c.name ?? c.phone,
      phone: c.phone,
      queueId: r.id,
      pipelineColumnId: c.pipeline_column_id,
    };
  }
  return null;
}
