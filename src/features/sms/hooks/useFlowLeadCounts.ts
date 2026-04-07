import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NodeLeadInfo {
  count: number;
  contacts: Array<{ name: string; phone: string }>;
}

export type FlowLeadCounts = Record<string, NodeLeadInfo>;

async function fetchFlowLeadCounts(automationId: string | undefined): Promise<FlowLeadCounts> {
  if (!automationId) return {};

  // Get step runs grouped by node_id for this automation
  const { data: stepRuns, error: stepError } = await (supabase
    .from('sms_automation_step_runs' as never)
    .select('node_id, contact_id, sms_contacts!inner(display_name, phone_number)')
    .eq('automation_id', automationId) as never);

  if (stepError || !stepRuns) return {};

  const counts: FlowLeadCounts = {};

  for (const row of stepRuns as Array<{
    node_id: string;
    contact_id: string;
    sms_contacts: { display_name: string | null; phone_number: string };
  }>) {
    if (!counts[row.node_id]) {
      counts[row.node_id] = { count: 0, contacts: [] };
    }

    const entry = counts[row.node_id];
    // Deduplicate by phone
    const alreadyAdded = entry.contacts.some(
      (c) => c.phone === row.sms_contacts.phone_number
    );
    if (!alreadyAdded) {
      entry.count += 1;
      entry.contacts.push({
        name: row.sms_contacts.display_name || 'Unknown',
        phone: row.sms_contacts.phone_number,
      });
    }
  }

  return counts;
}

export function useFlowLeadCounts(automationId: string | undefined) {
  const query = useQuery({
    queryKey: ['sms-flow-lead-counts', automationId],
    queryFn: () => fetchFlowLeadCounts(automationId),
    enabled: !!automationId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return {
    leadCounts: query.data ?? {},
    isLoading: query.isLoading,
  };
}
