// useDialerCampaigns — loads real wk_dialer_campaigns plus their queue stats.
//
// The query joins wk_dialer_queue counts (pending/done/connected/voicemail)
// so the dialer left-rail and KPIs read live numbers without a second round-trip.
//
// Falls back to an empty array silently on RLS denial; the page renders
// "No campaigns yet" instead of crashing.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Campaign } from '../types';

interface WkCampaignRow {
  id: string;
  name: string;
  pipeline_id: string | null;
  parallel_lines: number;
  auto_advance_seconds: number;
  ai_coach_enabled: boolean;
  ai_coach_prompt_id: string | null;
  script_md: string | null;
  created_by: string | null;
  is_active: boolean;
}

interface QueueRollup {
  campaign_id: string;
  pending: number;
  done: number;
  connected: number;
  voicemail: number;
}

export function rowToCampaign(row: WkCampaignRow, queue: QueueRollup | undefined): Campaign {
  const pending = queue?.pending ?? 0;
  const done = queue?.done ?? 0;
  return {
    id: row.id,
    name: row.name,
    pipelineId: row.pipeline_id ?? '',
    ownerAgentId: row.created_by ?? '',
    totalLeads: pending + done,
    doneLeads: done,
    connectedLeads: queue?.connected ?? 0,
    voicemailLeads: queue?.voicemail ?? 0,
    mode: 'parallel',
    parallelLines: row.parallel_lines,
    aiCoachEnabled: row.ai_coach_enabled,
    aiCoachPromptId: row.ai_coach_prompt_id ?? undefined,
    scriptMd: row.script_md ?? undefined,
    autoAdvanceSeconds: row.auto_advance_seconds,
    // PR 60 (Hugo 2026-04-27): expose is_active to the Settings UI
    // so admin can pause/resume without deleting. The Campaign type
    // already has isActive: boolean (was missing from the mapper).
    isActive: row.is_active,
  };
}

export interface UseDialerCampaignsResult {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseDialerCampaignsOpts {
  /** PR 60 (Hugo 2026-04-27): when true, include `is_active=false`
   *  campaigns. Dialer page wants only running ones (default = false);
   *  Settings page wants ALL campaigns so admins can see what they
   *  just created — even though new campaigns start inactive so a
   *  fresh row doesn't immediately start dialing. */
  includeInactive?: boolean;
}

export function useDialerCampaigns(
  opts: UseDialerCampaignsOpts = {},
): UseDialerCampaignsResult {
  const { includeInactive = false } = opts;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seq, setSeq] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let campaignsQuery = (supabase.from('wk_dialer_campaigns' as any) as any)
        .select(
          'id, name, pipeline_id, parallel_lines, auto_advance_seconds, ai_coach_enabled, ai_coach_prompt_id, script_md, created_by, is_active'
        )
        .order('name', { ascending: true });
      if (!includeInactive) {
        campaignsQuery = campaignsQuery.eq('is_active', true);
      }
      const [campaignsRes, queueRes] = await Promise.all([
        campaignsQuery,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_dialer_queue' as any) as any).select('campaign_id, status'),
      ]);

      if (cancelled) return;

      if (campaignsRes.error) {
        setError(campaignsRes.error.message);
        setLoading(false);
        return;
      }

      const rollups = new Map<string, QueueRollup>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (queueRes.data ?? []) as Array<{ campaign_id: string; status: string }>) {
        const r = rollups.get(row.campaign_id) ?? {
          campaign_id: row.campaign_id,
          pending: 0,
          done: 0,
          connected: 0,
          voicemail: 0,
        };
        if (row.status === 'pending') r.pending += 1;
        else if (row.status === 'done') r.done += 1;
        else if (row.status === 'connected') r.connected += 1;
        else if (row.status === 'voicemail') r.voicemail += 1;
        rollups.set(row.campaign_id, r);
      }

      const mapped = (campaignsRes.data ?? []).map((row: WkCampaignRow) =>
        rowToCampaign(row, rollups.get(row.id))
      );
      setCampaigns(mapped);
      setLoading(false);
    }

    void load();

    // PR 54 (Hugo 2026-04-27): subscribe to wk_dialer_queue realtime
    // so Queue / Done / Connected / Voicemail counters refresh as
    // calls progress without the agent having to refresh the page.
    // Debounced via 500ms RAF so a burst of inserts (e.g. CSV upload)
    // doesn't trigger 50 refetches.
    let pending: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        if (!cancelled) void load();
      }, 500);
    };
    const queueChan = supabase
      .channel('dialer-campaigns-queue')
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_dialer_queue' },
        refresh
      )
      .subscribe();
    const campaignsChan = supabase
      .channel('dialer-campaigns-meta')
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_dialer_campaigns' },
        refresh
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (pending) clearTimeout(pending);
      try { void supabase.removeChannel(queueChan); } catch { /* ignore */ }
      try { void supabase.removeChannel(campaignsChan); } catch { /* ignore */ }
    };
  }, [seq, includeInactive]);

  return {
    campaigns,
    loading,
    error,
    refetch: () => setSeq((s) => s + 1),
  };
}
