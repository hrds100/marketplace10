// useStageFunnel — for the Report tab.
//
// Hugo 2026-05-20: "I want a per-pipeline funnel that counts every
// contact who EVER reached a stage, not just the ones sitting there
// right now. e.g. 4 cold-sms-sent, then 2 of them moved to brochure
// → report shows Cold SMS Sent: 4, Brochure Sent: 2."
//
// We don't have a stage-transition event log, so this derives counts
// from existing signals (outbound messages, CRM source, opt-out state).
// For stages whose names match known events we use the event count;
// for unknown stage names we fall back to "contacts currently in that
// stage" so the report still shows something useful for custom columns.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SmsPipeline, SmsPipelineStage } from '../types';

export interface StageFunnelRow {
  stageId: string;
  stageName: string;
  position: number;
  colour: string;
  count: number;
  /** How the count was derived — handy for tooltips / debugging. */
  source: 'cold_sms_sent' | 'brochure_sent' | 'day2_sent' | 'moved_crm' | 'closed' | 'current_position';
}

const BROCHURE_URL_MATCH = '%nfstay.com/brochure%';
const DAY2_MATCH = '%did you get a chance to look at the deal%';

function classifyStage(name: string): StageFunnelRow['source'] | null {
  const n = name.toLowerCase().trim();
  if (/cold\s*sms/.test(n)) return 'cold_sms_sent';
  if (/brochure/.test(n)) return 'brochure_sent';
  if (/\bday\s*2\b/.test(n)) return 'day2_sent';
  if (/moved\s*crm|scheduled\s*call|crm/.test(n)) return 'moved_crm';
  if (/closed/.test(n)) return 'closed';
  // 'New Leads' / 'Interested' / 'Not Interested' / custom => fall through
  return null;
}

async function fetchStageContactIds(stageId: string): Promise<Set<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase
    .from('sms_contacts' as never)
    .select('id')
    .eq('pipeline_stage_id', stageId) as never);
  return new Set(((data as { id: string }[] | null) ?? []).map((r) => r.id));
}

async function fetchAllPipelineContactIds(pipelineId: string): Promise<Set<string>> {
  // Get all stage ids for this pipeline, then all contacts whose
  // pipeline_stage_id is in that set.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stageRows } = await (supabase
    .from('sms_pipeline_stages' as never)
    .select('id')
    .eq('pipeline_id', pipelineId) as never);
  const stageIds = ((stageRows as { id: string }[] | null) ?? []).map((r) => r.id);
  if (stageIds.length === 0) return new Set();

  const ids = new Set<string>();
  const pageSize = 1000;
  for (let page = 0; page < 100; page++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase
      .from('sms_contacts' as never)
      .select('id')
      .in('pipeline_stage_id', stageIds)
      .range(page * pageSize, page * pageSize + pageSize - 1) as never);
    const rows = (data as { id: string }[] | null) ?? [];
    rows.forEach((r) => ids.add(r.id));
    if (rows.length < pageSize) break;
  }
  return ids;
}

async function fetchCountForSource(
  source: StageFunnelRow['source'],
  pipelineContactIds: Set<string>,
): Promise<Set<string>> {
  const matched = new Set<string>();
  if (pipelineContactIds.size === 0) return matched;
  const ids = Array.from(pipelineContactIds);

  // Chunk to keep .in() URLs reasonable. PostgREST tolerates ~1000 ids per call.
  const CHUNK = 500;
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));

  if (source === 'cold_sms_sent') {
    // Any outbound sms_message tied to a campaign for a contact in this pipeline.
    for (const chunk of chunks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase
        .from('sms_messages' as never)
        .select('contact_id')
        .eq('direction', 'outbound')
        .not('campaign_id', 'is', null)
        .in('contact_id', chunk) as never);
      ((data as { contact_id: string }[] | null) ?? []).forEach((r) => matched.add(r.contact_id));
    }
  } else if (source === 'brochure_sent') {
    for (const chunk of chunks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase
        .from('sms_messages' as never)
        .select('contact_id')
        .eq('direction', 'outbound')
        .ilike('body', BROCHURE_URL_MATCH)
        .in('contact_id', chunk) as never);
      ((data as { contact_id: string }[] | null) ?? []).forEach((r) => matched.add(r.contact_id));
    }
  } else if (source === 'day2_sent') {
    for (const chunk of chunks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase
        .from('sms_messages' as never)
        .select('contact_id')
        .eq('direction', 'outbound')
        .ilike('body', DAY2_MATCH)
        .in('contact_id', chunk) as never);
      ((data as { contact_id: string }[] | null) ?? []).forEach((r) => matched.add(r.contact_id));
    }
  } else if (source === 'moved_crm') {
    // Contacts whose wk_contact has source LIKE 'sms_automation_%'. Phone-match
    // because /sms and /crm use different contact rows.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: phones } = await (supabase
      .from('sms_contacts' as never)
      .select('id, phone_number')
      .in('id', ids) as never);
    const phoneToContact = new Map<string, string>();
    ((phones as { id: string; phone_number: string }[] | null) ?? []).forEach((r) => {
      phoneToContact.set(r.phone_number, r.id);
      phoneToContact.set('+' + r.phone_number.replace(/^\+/, ''), r.id);
    });
    const phoneList = Array.from(new Set(phoneToContact.keys()));
    for (let i = 0; i < phoneList.length; i += CHUNK) {
      const chunk = phoneList.slice(i, i + CHUNK);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: wks } = await (supabase
        .from('wk_contacts' as never)
        .select('phone, custom_fields')
        .in('phone', chunk) as never);
      ((wks as { phone: string; custom_fields: Record<string, unknown> }[] | null) ?? []).forEach((w) => {
        const src = (w.custom_fields?.source as string | undefined) ?? '';
        if (src.startsWith('sms_automation_')) {
          const cid = phoneToContact.get(w.phone);
          if (cid) matched.add(cid);
        }
      });
    }
  } else if (source === 'closed') {
    // Contacts with an automation state showing exit_reason in
    // ('opted_out', 'stop_node') OR currently sitting in the Closed stage.
    for (const chunk of chunks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase
        .from('sms_conversations' as never)
        .select('contact_id, sms_automation_state!conversation_id(exit_reason)')
        .in('contact_id', chunk) as never);
      ((data as Array<{ contact_id: string; sms_automation_state: Array<{ exit_reason: string | null }> }> | null) ?? []).forEach((r) => {
        const reasons = (r.sms_automation_state ?? []).map((s) => s.exit_reason);
        if (reasons.some((x) => x === 'opted_out' || x === 'stop_node')) {
          matched.add(r.contact_id);
        }
      });
    }
  }
  return matched;
}

async function fetchFunnel(
  pipeline: SmsPipeline | null,
  stages: SmsPipelineStage[],
): Promise<StageFunnelRow[]> {
  if (!pipeline) return [];
  const pipelineContactIds = await fetchAllPipelineContactIds(pipeline.id);

  // Pre-compute event sets per source so multiple stages with the same
  // signal share one round trip.
  const seenSources = new Set<StageFunnelRow['source']>();
  for (const s of stages) {
    const src = classifyStage(s.name);
    if (src) seenSources.add(src);
  }
  const sourceMatches = new Map<StageFunnelRow['source'], Set<string>>();
  for (const src of seenSources) {
    sourceMatches.set(src, await fetchCountForSource(src, pipelineContactIds));
  }

  const out: StageFunnelRow[] = [];
  for (const s of [...stages].sort((a, b) => a.position - b.position)) {
    const src = classifyStage(s.name);
    let count: number;
    let source: StageFunnelRow['source'];
    if (src) {
      count = (sourceMatches.get(src) ?? new Set()).size;
      source = src;
    } else {
      // Unknown stage name (e.g. "Interested", "Not Interested", custom).
      // Fall back to contacts currently in that exact stage.
      const ids = await fetchStageContactIds(s.id);
      count = ids.size;
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
  });
  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
