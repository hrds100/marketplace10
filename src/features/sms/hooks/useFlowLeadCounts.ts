import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NodeLeadInfo {
  count: number;
  contacts: Array<{ name: string; phone: string }>;
}

export type FlowLeadCounts = Record<string, NodeLeadInfo>;

async function fetchFlowLeadCounts(automationId: string | undefined): Promise<FlowLeadCounts> {
  if (!automationId) return {};

  try {
    // Step 1: Get all runs for this automation with their conversation → contact
    const { data: runs, error: runError } = await (supabase
      .from('sms_automation_runs' as never)
      .select('id, conversation_id')
      .eq('automation_id', automationId) as never);

    if (runError || !runs || (runs as unknown[]).length === 0) return {};

    const runRows = runs as Array<{ id: string; conversation_id: string }>;
    const runIds = runRows.map((r) => r.id);
    const conversationIds = [...new Set(runRows.map((r) => r.conversation_id))];

    // Step 2: Get step runs for these run IDs
    const { data: steps, error: stepError } = await (supabase
      .from('sms_automation_step_runs' as never)
      .select('node_id, run_id')
      .in('run_id', runIds) as never);

    if (stepError || !steps) return {};

    // Step 3: Get contacts for the conversations
    const { data: convs, error: convError } = await (supabase
      .from('sms_conversations' as never)
      .select('id, contact_id')
      .in('id', conversationIds) as never);

    if (convError || !convs) return {};

    const convRows = convs as Array<{ id: string; contact_id: string }>;
    const contactIds = [...new Set(convRows.map((c) => c.contact_id))];

    const { data: contacts, error: contactError } = await (supabase
      .from('sms_contacts' as never)
      .select('id, display_name, phone_number')
      .in('id', contactIds) as never);

    if (contactError || !contacts) return {};

    // Build lookup maps
    const contactMap = new Map(
      (contacts as Array<{ id: string; display_name: string | null; phone_number: string }>)
        .map((c) => [c.id, c])
    );
    const convToContact = new Map(convRows.map((c) => [c.id, c.contact_id]));
    const runToConv = new Map(runRows.map((r) => [r.id, r.conversation_id]));

    // Build per-node counts
    const counts: FlowLeadCounts = {};
    const stepRows = steps as Array<{ node_id: string; run_id: string }>;

    for (const step of stepRows) {
      const convId = runToConv.get(step.run_id);
      if (!convId) continue;
      const contactId = convToContact.get(convId);
      if (!contactId) continue;
      const contact = contactMap.get(contactId);
      if (!contact) continue;

      if (!counts[step.node_id]) {
        counts[step.node_id] = { count: 0, contacts: [] };
      }

      const entry = counts[step.node_id];
      const alreadyAdded = entry.contacts.some((c) => c.phone === contact.phone_number);
      if (!alreadyAdded) {
        entry.count += 1;
        entry.contacts.push({
          name: contact.display_name || 'Unknown',
          phone: contact.phone_number,
        });
      }
    }

    return counts;
  } catch {
    return {};
  }
}

export function useFlowLeadCounts(automationId: string | undefined) {
  const query = useQuery({
    queryKey: ['sms-flow-lead-counts', automationId],
    queryFn: () => fetchFlowLeadCounts(automationId),
    enabled: !!automationId,
    refetchInterval: 30000,
  });

  return {
    leadCounts: query.data ?? {},
    isLoading: query.isLoading,
  };
}
