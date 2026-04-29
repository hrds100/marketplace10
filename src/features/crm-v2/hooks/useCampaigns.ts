// crm-v2 useCampaigns — agent's campaigns from wk_dialer_campaigns.
//
// Read-only. Realtime subscription is overkill (campaigns rarely
// change), so we just refetch on mount + when activeId reference
// changes. If the admin pauses a campaign live, the agent sees it on
// next page load — that's fine.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CampaignRow } from '../data/types';

export interface CampaignsState {
  campaigns: CampaignRow[];
  loading: boolean;
  error: string | null;
}

export function useCampaigns(opts: {
  agentId: string | null;
  isAdmin: boolean;
}): CampaignsState {
  const { agentId, isAdmin } = opts;
  const [state, setState] = useState<CampaignsState>({
    campaigns: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase.from('wk_dialer_campaigns' as any) as any)
        .select('id, name, is_active, parallel_lines, auto_advance_seconds')
        .order('created_at', { ascending: false });

      if (!isAdmin && agentId) {
        // Agents see campaigns they're a member of — wk_dialer_campaigns
        // has RLS that filters this for us.
        q = q.eq('owner_agent_id', agentId);
      }

      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        setState({ campaigns: [], loading: false, error: error.message });
        return;
      }
      setState({
        campaigns: (data ?? []) as CampaignRow[],
        loading: false,
        error: null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId, isAdmin]);

  return state;
}
