// useStageFunnel — for the Report tab.
//
// Hugo 2026-05-20: "I want a per-pipeline funnel that counts every
// contact who EVER reached a stage, not just the ones sitting there
// right now."
//
// Without a stage-transition event log we derive counts from existing
// signals (outbound messages, CRM source, opt-out state). For stages
// whose names match known events we use the event count; for unknown
// stage names we fall back to "contacts currently in that stage".
//
// 2026-05-20 (v2): rewrote to be defensive — each source query is
// wrapped in try/catch + logs, the nested PostgREST embedding for
// "Closed" was replaced with two simple queries (some Supabase FK
// relationship names don't resolve and that left the page in a
// permanent loading spinner). Also caps query parallelism + chunk
// sizes so a 1000-contact pipeline doesn't fire 100+ concurrent reqs.
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

const BROCHURE_URL_MATCH = '%nfstay.com/brochure%';
const DAY2_MATCH = '%did you get a chance to look at the deal%';
const CHUNK = 300;

function classifyStage(name: string): StageFunnelRow['source'] | null {
  const n = name.toLowerCase().trim();
  if (/cold\s*sms/.test(n)) return 'cold_sms_sent';
  if (/brochure/.test(n)) return 'brochure_sent';
  if (/\bday\s*2\b/.test(n)) return 'day2_sent';
  if (/moved\s*crm|scheduled\s*call/.test(n)) return 'moved_crm';
  if (/closed/.test(n)) return 'closed';
  return null;
}

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchPipelineContactIds(pipelineId: string): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stageRows, error: stageErr } = await (supabase
    .from('sms_pipeline_stages' as never)
    .select('id')
    .eq('pipeline_id', pipelineId) as never);
  if (stageErr) {
    console.warn('[useStageFunnel] stage list failed', stageErr);
    return [];
  }
  const stageIds = ((stageRows as { id: string }[] | null) ?? []).map((r) => r.id);
  if (stageIds.length === 0) return [];

  const ids: string[] = [];
  const pageSize = 1000;
  for (let page = 0; page < 100; page++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('sms_contacts' as never)
      .select('id')
      .in('pipeline_stage_id', stageIds)
      .range(page * pageSize, page * pageSize + pageSize - 1) as never);
    if (error) {
      console.warn('[useStageFunnel] contacts page failed', error);
      break;
    }
    const rows = (data as { id: string }[] | null) ?? [];
    rows.forEach((r) => ids.push(r.id));
    if (rows.length < pageSize) break;
  }
  return ids;
}

async function fetchOutboundMatching(
  contactIds: string[],
  ilike: string,
  campaignOnly = false,
): Promise<Set<string>> {
  const matched = new Set<string>();
  if (contactIds.length === 0) return matched;
  for (const chunk of chunked(contactIds, CHUNK)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = (supabase
        .from('sms_messages' as never)
        .select('contact_id')
        .eq('direction', 'outbound')
        .in('contact_id', chunk) as never);
      if (campaignOnly) q = q.not('campaign_id', 'is', null);
      if (ilike) q = q.ilike('body', ilike);
      const { data, error } = await q;
      if (error) {
        console.warn('[useStageFunnel] outbound query failed', error);
        continue;
      }
      ((data as { contact_id: string }[] | null) ?? []).forEach((r) => matched.add(r.contact_id));
    } catch (e) {
      console.warn('[useStageFunnel] outbound query threw', e);
    }
  }
  return matched;
}

async function fetchMovedCrm(contactIds: string[]): Promise<Set<string>> {
  const matched = new Set<string>();
  if (contactIds.length === 0) return matched;
  // 1. /sms contact ids -> phone numbers
  const phoneToContact = new Map<string, string>();
  for (const chunk of chunked(contactIds, CHUNK)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from('sms_contacts' as never)
        .select('id, phone_number')
        .in('id', chunk) as never);
      if (error) {
        console.warn('[useStageFunnel] sms_contacts phone fetch failed', error);
        continue;
      }
      ((data as { id: string; phone_number: string }[] | null) ?? []).forEach((r) => {
        if (!r.phone_number) return;
        const trimmed = r.phone_number.trim();
        phoneToContact.set(trimmed, r.id);
        phoneToContact.set('+' + trimmed.replace(/^\+/, ''), r.id);
      });
    } catch (e) {
      console.warn('[useStageFunnel] sms_contacts phone fetch threw', e);
    }
  }
  // 2. wk_contacts where phone matches AND custom_fields.source LIKE 'sms_automation_%'
  const phones = Array.from(phoneToContact.keys());
  for (const chunk of chunked(phones, CHUNK)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from('wk_contacts' as never)
        .select('phone, custom_fields')
        .in('phone', chunk) as never);
      if (error) {
        console.warn('[useStageFunnel] wk_contacts query failed', error);
        continue;
      }
      ((data as { phone: string; custom_fields: Record<string, unknown> | null }[] | null) ?? []).forEach((w) => {
        const src = (w.custom_fields?.source as string | undefined) ?? '';
        if (src.startsWith('sms_automation_')) {
          const cid = phoneToContact.get(w.phone);
          if (cid) matched.add(cid);
        }
      });
    } catch (e) {
      console.warn('[useStageFunnel] wk_contacts query threw', e);
    }
  }
  return matched;
}

async function fetchClosed(contactIds: string[]): Promise<Set<string>> {
  // Simple two-query approach (no PostgREST embedding):
  //   1. sms_conversations for contact ids -> conversation ids
  //   2. sms_automation_state for those conversations with terminal exit_reason
  const matched = new Set<string>();
  if (contactIds.length === 0) return matched;
  const convToContact = new Map<string, string>();
  for (const chunk of chunked(contactIds, CHUNK)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from('sms_conversations' as never)
        .select('id, contact_id')
        .in('contact_id', chunk) as never);
      if (error) {
        console.warn('[useStageFunnel] sms_conversations query failed', error);
        continue;
      }
      ((data as { id: string; contact_id: string }[] | null) ?? []).forEach((r) => {
        convToContact.set(r.id, r.contact_id);
      });
    } catch (e) {
      console.warn('[useStageFunnel] sms_conversations query threw', e);
    }
  }
  const convIds = Array.from(convToContact.keys());
  for (const chunk of chunked(convIds, CHUNK)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from('sms_automation_state' as never)
        .select('conversation_id, exit_reason')
        .in('conversation_id', chunk)
        .in('exit_reason', ['opted_out', 'stop_node']) as never);
      if (error) {
        console.warn('[useStageFunnel] sms_automation_state query failed', error);
        continue;
      }
      ((data as { conversation_id: string }[] | null) ?? []).forEach((r) => {
        const cid = convToContact.get(r.conversation_id);
        if (cid) matched.add(cid);
      });
    } catch (e) {
      console.warn('[useStageFunnel] sms_automation_state query threw', e);
    }
  }
  return matched;
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

async function fetchFunnel(
  pipeline: SmsPipeline | null,
  stages: SmsPipelineStage[],
): Promise<StageFunnelRow[]> {
  if (!pipeline) return [];
  console.log('[useStageFunnel] computing for', pipeline.name, 'stages', stages.length);

  const contactIds = await fetchPipelineContactIds(pipeline.id);
  console.log('[useStageFunnel] pipeline contacts', contactIds.length);

  // Which signal-derived sources do we actually need this pipeline?
  const needed = new Set<StageFunnelRow['source']>();
  for (const s of stages) {
    const c = classifyStage(s.name);
    if (c) needed.add(c);
  }

  // Run the heavy queries in parallel — most independent of each other.
  const [coldSet, brochureSet, day2Set, crmSet, closedSet] = await Promise.all([
    needed.has('cold_sms_sent') ? fetchOutboundMatching(contactIds, '', true) : Promise.resolve(new Set<string>()),
    needed.has('brochure_sent') ? fetchOutboundMatching(contactIds, BROCHURE_URL_MATCH, false) : Promise.resolve(new Set<string>()),
    needed.has('day2_sent') ? fetchOutboundMatching(contactIds, DAY2_MATCH, false) : Promise.resolve(new Set<string>()),
    needed.has('moved_crm') ? fetchMovedCrm(contactIds) : Promise.resolve(new Set<string>()),
    needed.has('closed') ? fetchClosed(contactIds) : Promise.resolve(new Set<string>()),
  ]);
  console.log('[useStageFunnel] sets',
    { cold: coldSet.size, brochure: brochureSet.size, day2: day2Set.size, crm: crmSet.size, closed: closedSet.size });

  const sourceToSet: Record<Exclude<StageFunnelRow['source'], 'current_position'>, Set<string>> = {
    cold_sms_sent: coldSet,
    brochure_sent: brochureSet,
    day2_sent: day2Set,
    moved_crm: crmSet,
    closed: closedSet,
  };

  const out: StageFunnelRow[] = [];
  for (const s of [...stages].sort((a, b) => a.position - b.position)) {
    const src = classifyStage(s.name);
    let count: number;
    let source: StageFunnelRow['source'];
    if (src) {
      count = sourceToSet[src].size;
      source = src;
    } else {
      count = await fetchStageCurrent(s.id);
      source = 'current_position';
    }
    out.push({
      stageId: s.id,
      stageName: s.name,
      position: s.position,
      colour: s.colour,
      count,
      source,
    });
  }
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
