import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches distinct contact counts per automation_id from sms_automation_step_runs.
 * Returns a map of automation_id -> unique contact count.
 */
async function fetchAutomationLeadCounts(): Promise<Record<string, number>> {
  const { data, error } = await (supabase
    .from('sms_automation_step_runs' as never)
    .select('automation_id, contact_id') as never);

  if (error || !data) return {};

  const rows = data as Array<{ automation_id: string; contact_id: string }>;
  const byAutomation: Record<string, Set<string>> = {};

  for (const row of rows) {
    if (!byAutomation[row.automation_id]) {
      byAutomation[row.automation_id] = new Set();
    }
    byAutomation[row.automation_id].add(row.contact_id);
  }

  const result: Record<string, number> = {};
  for (const [automationId, contacts] of Object.entries(byAutomation)) {
    result[automationId] = contacts.size;
  }
  return result;
}

export function useAutomationLeadCounts() {
  const query = useQuery({
    queryKey: ['sms-automation-lead-counts'],
    queryFn: fetchAutomationLeadCounts,
    refetchInterval: 30000,
  });

  return {
    leadCountMap: query.data ?? {},
    isLoading: query.isLoading,
  };
}
