import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches distinct conversation counts per automation from sms_automation_runs.
 * Returns a map of automation_id -> unique conversation count.
 */
async function fetchAutomationLeadCounts(): Promise<Record<string, number>> {
  try {
    const { data, error } = await (supabase
      .from('sms_automation_runs' as never)
      .select('automation_id, conversation_id') as never);

    if (error || !data) return {};

    const rows = data as Array<{ automation_id: string; conversation_id: string }>;
    const byAutomation: Record<string, Set<string>> = {};

    for (const row of rows) {
      if (!byAutomation[row.automation_id]) {
        byAutomation[row.automation_id] = new Set();
      }
      byAutomation[row.automation_id].add(row.conversation_id);
    }

    const result: Record<string, number> = {};
    for (const [automationId, conversations] of Object.entries(byAutomation)) {
      result[automationId] = conversations.size;
    }
    return result;
  } catch {
    return {};
  }
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
