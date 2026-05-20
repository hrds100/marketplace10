// useStageFunnel — for the Report tab.
//
// Hugo 2026-05-20: "I want a per-pipeline funnel that counts every
// contact who EVER reached a stage, not just the ones sitting there
// right now."
//
// 2026-05-20 (v3): switched to a single Postgres RPC
// (`sms_stage_funnel_counts`) that does all five source counts
// server-side in ~700ms. Previous client-side chunking burned 50+
// round trips on the Real Estate pipeline (~5-10s). The RPC returns
// one row per known source — we then merge with stage list and add
// 'current_position' counts for any stage whose name doesn't classify.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SmsPipeline, SmsPipelineStage } from '../types';

export interface StageFunnelRow {
  stageId: string;
  stageName: string;
  position: number;
  colour: string;
  count: number;
  source: 'cold_sms_sent' | 'brochure_sent' | 'day2_sent' | 'moved_crm' | 'closed' | 'current_position';
}

type KnownSource = Exclude<StageFunnelRow['source'], 'current_position'>;

function classifyStage(name: string): KnownSource | null {
  const n = name.toLowerCase().trim();
  if (/cold\s*sms/.test(n)) return 'cold_sms_sent';
  if (/brochure/.test(n)) return 'brochure_sent';
  if (/\bday\s*2\b/.test(n)) return 'day2_sent';
  if (/moved\s*crm|scheduled\s*call/.test(n)) return 'moved_crm';
  if (/closed/.test(n)) return 'closed';
  return null;
}

async function fetchStageCurrent(stageId: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase
    .from('sms_contacts' as never)
    .select('id', { count: 'exact', head: true })
    .eq('pipeline_stage_id', stageId) as never);
  if (error) {
    console.warn('[useStageFunnel] stage current-count failed', error);
    return 0;
  }
  return count ?? 0;
}

async function fetchSourceCounts(pipelineId: string): Promise<Map<KnownSource, number>> {
  const map = new Map<KnownSource, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc('sms_stage_funnel_counts' as never, {
    p_pipeline_id: pipelineId,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any);
  if (error) {
    console.warn('[useStageFunnel] RPC sms_stage_funnel_counts failed', error);
    return map;
  }
  ((data as { source: string; contact_count: number | string }[] | null) ?? []).forEach((r) => {
    map.set(r.source as KnownSource, Number(r.contact_count));
  });
  return map;
}

async function fetchFunnel(
  pipeline: SmsPipeline | null,
  stages: SmsPipelineStage[],
): Promise<StageFunnelRow[]> {
  if (!pipeline) return [];
  console.log('[useStageFunnel] computing for', pipeline.name, 'stages', stages.length);
  const t0 = performance.now();

  // 1. Server-side: counts for all five known sources in one round trip.
  const sourceCounts = await fetchSourceCounts(pipeline.id);
  console.log('[useStageFunnel] rpc ms', Math.round(performance.now() - t0), 'sources', Object.fromEntries(sourceCounts));

  // 2. For unclassified stages, count contacts currently in that stage.
  //    Run them in parallel — each is a cheap HEAD count query.
  const sortedStages = [...stages].sort((a, b) => a.position - b.position);
  const fallbackCounts = await Promise.all(
    sortedStages.map(async (s) => {
      const src = classifyStage(s.name);
      return src ? null : await fetchStageCurrent(s.id);
    }),
  );

  const out: StageFunnelRow[] = sortedStages.map((s, i) => {
    const src = classifyStage(s.name);
    if (src) {
      return {
        stageId: s.id,
        stageName: s.name,
        position: s.position,
        colour: s.colour,
        count: sourceCounts.get(src) ?? 0,
        source: src,
      };
    }
    return {
      stageId: s.id,
      stageName: s.name,
      position: s.position,
      colour: s.colour,
      count: fallbackCounts[i] ?? 0,
      source: 'current_position',
    };
  });

  console.log('[useStageFunnel] total ms', Math.round(performance.now() - t0));
  return out;
}

export function useStageFunnel(pipeline: SmsPipeline | null, stages: SmsPipelineStage[]) {
  const query = useQuery({
    queryKey: ['sms-stage-funnel', pipeline?.id ?? null, stages.map((s) => s.id).join(',')],
    queryFn: () => fetchFunnel(pipeline, stages),
    enabled: !!pipeline && stages.length > 0,
    staleTime: 30_000,
    retry: 1,
  });
  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
