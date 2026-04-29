// crm-v2 useCampaigns — agent's campaigns + pending lead counts.
//
// PR B.1 fix (Hugo 2026-04-29): the original PR B version used
//   .eq('owner_agent_id', agentId)
// which:
//   - referenced the wrong column (real column is `created_by`),
//   - missed campaigns where the agent is a MEMBER (wk_campaign_agents)
//     rather than the creator,
// so non-admin agents saw an empty dropdown even when they had leads
// to dial.
//
// New logic mirrors the smsv2 hook:
//   - Admins → all campaigns.
//   - Non-admin → resolve allowed campaign IDs from wk_campaign_agents
//     first, then SELECT * IN those IDs.
// Returned shape adds `pendingLeads` so the dropdown can show
// "Hugo · 104 left".

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignWithCounts {
  id: string;
  name: string;
  isActive: boolean;
  parallelLines: number;
  autoAdvanceSeconds: number | null;
  createdBy: string | null;
  pendingLeads: number;
  doneLeads: number;
}

interface CampaignRow {
  id: string;
  name: string;
  is_active: boolean;
  parallel_lines: number;
  auto_advance_seconds: number | null;
  created_by: string | null;
  created_at: string;
}

export interface CampaignsState {
  campaigns: CampaignWithCounts[];
  loading: boolean;
  error: string | null;
}

export function useCampaigns(opts: {
  agentId: string | null;
  isAdmin: boolean;
  /** Default false — match the smsv2 dialer behaviour of hiding
   *  campaigns the admin has paused. Settings UI passes true. */
  includeInactive?: boolean;
}): CampaignsState {
  const { agentId, isAdmin, includeInactive = false } = opts;
  const [state, setState] = useState<CampaignsState>({
    campaigns: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // 1. For non-admins, resolve allowed campaign IDs via membership.
      let allowedIds: string[] | null = null;
      if (!isAdmin && agentId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assignments } = await (
          supabase.from('wk_campaign_agents' as any) as any
        )
          .select('campaign_id')
          .eq('agent_id', agentId);
        allowedIds = ((assignments ?? []) as { campaign_id: string }[]).map(
          (r) => r.campaign_id
        );
        if (allowedIds.length === 0) {
          if (!cancelled) {
            setState({ campaigns: [], loading: false, error: null });
          }
          return;
        }
      }

      // 2. Fetch the campaigns + queue rollup in parallel.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let campaignsQuery = (supabase.from('wk_dialer_campaigns' as any) as any)
        .select(
          'id, name, is_active, parallel_lines, auto_advance_seconds, created_by, created_at'
        )
        .order('name', { ascending: true });
      if (!includeInactive) {
        campaignsQuery = campaignsQuery.eq('is_active', true);
      }
      if (allowedIds) {
        campaignsQuery = campaignsQuery.in('id', allowedIds);
      }

      const [campaignsRes, queueRes] = await Promise.all([
        campaignsQuery,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_dialer_queue' as any) as any).select(
          'campaign_id, status'
        ),
      ]);

      if (cancelled) return;

      if (campaignsRes.error) {
        setState({
          campaigns: [],
          loading: false,
          error: campaignsRes.error.message,
        });
        return;
      }

      // Rollup: count pending vs everything-else per campaign.
      const counts = new Map<string, { pending: number; done: number }>();
      for (const row of (queueRes.data ?? []) as Array<{
        campaign_id: string;
        status: string;
      }>) {
        const c = counts.get(row.campaign_id) ?? { pending: 0, done: 0 };
        if (row.status === 'pending' || row.status === 'dialing') {
          c.pending += 1;
        } else {
          c.done += 1;
        }
        counts.set(row.campaign_id, c);
      }

      const mapped: CampaignWithCounts[] = (
        (campaignsRes.data ?? []) as CampaignRow[]
      ).map((r) => {
        const c = counts.get(r.id) ?? { pending: 0, done: 0 };
        return {
          id: r.id,
          name: r.name,
          isActive: r.is_active,
          parallelLines: r.parallel_lines,
          autoAdvanceSeconds: r.auto_advance_seconds,
          createdBy: r.created_by,
          pendingLeads: c.pending,
          doneLeads: c.done,
        };
      });

      setState({ campaigns: mapped, loading: false, error: null });
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId, isAdmin, includeInactive]);

  return state;
}
