import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NodeLeadInfo {
  count: number;
  contacts: Array<{ name: string; phone: string }>;
}

export type FlowLeadCounts = Record<string, NodeLeadInfo>;

// Counts active leads at each node based on their CURRENT location
// (sms_automation_state.current_node_id), not the history of nodes they
// passed through. A contact who went Brochure → Wait → Stop is counted
// only at Stop, not at every node they touched.
async function fetchFlowLeadCounts(automationId: string | undefined): Promise<FlowLeadCounts> {
  if (!automationId) return {};

  try {
    // 1. Active or waiting states only — completed/suspended/paused leads
    //    are no longer "at" a node in any meaningful sense.
    const { data: states, error: stateErr } = await (supabase
      .from('sms_automation_state' as never)
      .select('current_node_id, conversation_id, status')
      .eq('automation_id', automationId)
      .in('status', ['active', 'waiting']) as never);

    if (stateErr || !states) return {};

    const stateRows = states as Array<{
      current_node_id: string;
      conversation_id: string;
      status: string;
    }>;
    if (stateRows.length === 0) return {};

    // 2. Resolve conversation → contact
    const conversationIds = [...new Set(stateRows.map((s) => s.conversation_id))];
    const { data: convs } = await (supabase
      .from('sms_conversations' as never)
      .select('id, contact_id')
      .in('id', conversationIds) as never);

    if (!convs) return {};
    const convToContact = new Map(
      (convs as Array<{ id: string; contact_id: string }>).map((c) => [c.id, c.contact_id])
    );

    // 3. Resolve contact → name + phone
    const contactIds = [...new Set([...convToContact.values()])];
    if (contactIds.length === 0) return {};

    const { data: contacts } = await (supabase
      .from('sms_contacts' as never)
      .select('id, display_name, phone_number')
      .in('id', contactIds) as never);

    if (!contacts) return {};
    const contactMap = new Map(
      (contacts as Array<{ id: string; display_name: string | null; phone_number: string }>)
        .map((c) => [c.id, c])
    );

    // 4. Aggregate by current_node_id
    const counts: FlowLeadCounts = {};
    for (const row of stateRows) {
      const contactId = convToContact.get(row.conversation_id);
      if (!contactId) continue;
      const contact = contactMap.get(contactId);
      if (!contact) continue;

      if (!counts[row.current_node_id]) {
        counts[row.current_node_id] = { count: 0, contacts: [] };
      }
      const entry = counts[row.current_node_id];
      // Dedupe (a contact only sits at one node at a time, but defensive).
      if (!entry.contacts.some((c) => c.phone === contact.phone_number)) {
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
