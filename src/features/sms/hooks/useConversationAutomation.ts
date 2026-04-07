import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsAutomationState, SmsAutomationStateStatus } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface AutomationStateRow {
  id: string;
  conversation_id: string;
  automation_id: string;
  current_node_id: string;
  step_number: number;
  status: SmsAutomationStateStatus;
  last_message_at: string | null;
  started_at: string;
  completed_at: string | null;
  exit_reason: string | null;
  created_at: string;
}

function mapStateRow(row: AutomationStateRow): SmsAutomationState {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    automationId: row.automation_id,
    currentNodeId: row.current_node_id,
    stepNumber: row.step_number,
    status: row.status,
    lastMessageAt: row.last_message_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    exitReason: row.exit_reason,
    createdAt: row.created_at,
  };
}

export function useConversationAutomation(conversationId: string | null) {
  const queryClient = useQueryClient();

  // Fetch automation state for this conversation
  const stateQuery = useQuery({
    queryKey: ['sms-automation-state', conversationId],
    queryFn: async (): Promise<SmsAutomationState | null> => {
      if (!conversationId) return null;

      const { data, error } = await (supabase
        .from('sms_automation_state' as never)
        .select('id, conversation_id, automation_id, current_node_id, step_number, status, last_message_at, started_at, completed_at, exit_reason, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as never);

      if (error) throw error;
      if (!data) return null;
      return mapStateRow(data as AutomationStateRow);
    },
    enabled: !!conversationId,
  });

  // Toggle automation on/off for a conversation
  const toggleMutation = useMutation({
    mutationFn: async (payload: {
      conversationId: string;
      automationId: string | null;
      enabled: boolean;
      flowJson?: Record<string, unknown> | null;
    }) => {
      const { conversationId: convId, automationId, enabled, flowJson } = payload;

      // Update conversation
      const { error: convErr } = await (supabase
        .from('sms_conversations' as never)
        .update({
          automation_id: automationId,
          automation_enabled: enabled,
        } as never)
        .eq('id', convId) as never);

      if (convErr) throw convErr;

      if (enabled && automationId && flowJson) {
        // Find start node
        const nodes = (flowJson as { nodes?: Array<{ id: string; data: { isStart?: boolean } }> }).nodes ?? [];
        const startNode = nodes.find((n) => n.data.isStart === true);
        const startNodeId = startNode?.id ?? nodes[0]?.id ?? 'unknown';

        // Upsert automation state (create or reset)
        const { error: stateErr } = await (supabase
          .from('sms_automation_state' as never)
          .upsert({
            conversation_id: convId,
            automation_id: automationId,
            current_node_id: startNodeId,
            step_number: 0,
            status: 'active',
            started_at: new Date().toISOString(),
            completed_at: null,
            exit_reason: null,
            last_message_at: null,
            context_data: {},
          } as never, { onConflict: 'conversation_id,automation_id' }) as never);

        if (stateErr) throw stateErr;
      } else if (!enabled) {
        // Pause the state
        const { error: stateErr } = await (supabase
          .from('sms_automation_state' as never)
          .update({ status: 'paused' } as never)
          .eq('conversation_id', convId) as never);

        if (stateErr) throw stateErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['sms-automation-state', conversationId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle automation');
    },
  });

  // Resume a paused/suspended automation
  const resumeMutation = useMutation({
    mutationFn: async (stateId: string) => {
      const { error } = await (supabase
        .from('sms_automation_state' as never)
        .update({ status: 'active' } as never)
        .eq('id', stateId) as never);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-automation-state', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
      toast.success('Automation resumed');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to resume automation');
    },
  });

  // Trigger automation immediately (for when toggling ON with existing unanswered message)
  const triggerNowMutation = useMutation({
    mutationFn: async (payload: {
      conversationId: string;
      contactId: string;
      fromNumber: string;
      toNumber: string;
    }) => {
      // Get the latest inbound message
      const { data: latestMsg } = await (supabase
        .from('sms_messages' as never)
        .select('id, body')
        .eq('contact_id', payload.contactId)
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as never);

      if (!latestMsg) return;

      const msg = latestMsg as { id: string; body: string };

      // Call sms-automation-run directly
      const { data: { session } } = await supabase.auth.getSession();
      const automationUrl = `${SUPABASE_URL}/functions/v1/sms-automation-run`;

      await fetch(automationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          message_id: msg.id,
          conversation_id: payload.conversationId,
          contact_id: payload.contactId,
          from_number: payload.fromNumber,
          to_number: payload.toNumber,
          body: msg.body,
        }),
      });
    },
    onError: (err) => {
      console.error('Failed to trigger automation:', err);
    },
  });

  return {
    automationState: stateQuery.data ?? null,
    isLoadingState: stateQuery.isLoading,
    toggleAutomation: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
    resumeAutomation: resumeMutation.mutateAsync,
    isResuming: resumeMutation.isPending,
    triggerNow: triggerNowMutation.mutateAsync,
  };
}
