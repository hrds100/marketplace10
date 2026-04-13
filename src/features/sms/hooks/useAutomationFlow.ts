import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Node, Edge } from '@xyflow/react';
import type { SmsNodeData, SmsEdgeData } from '../types';

interface FlowRow {
  id: string;
  name: string;
  flow_json: {
    nodes?: Node<SmsNodeData>[];
    edges?: Edge<SmsEdgeData>[];
    globalPrompt?: string;
    globalModel?: string;
    globalTemperature?: number;
    maxRepliesPerLead?: number;
  } | null;
  is_active: boolean;
  trigger_type: 'new_message' | 'keyword' | 'time_based';
  trigger_config: Record<string, unknown>;
}

export interface FlowData {
  id: string;
  name: string;
  nodes: Node<SmsNodeData>[];
  edges: Edge<SmsEdgeData>[];
  globalPrompt: string;
  globalModel: string;
  globalTemperature: number;
  maxRepliesPerLead: number;
  isActive: boolean;
  triggerType: 'new_message' | 'keyword' | 'time_based';
  triggerConfig: Record<string, unknown>;
}

async function fetchFlow(id: string): Promise<FlowData> {
  const { data, error } = await (supabase
    .from('sms_automations' as never)
    .select('id, name, flow_json, is_active, trigger_type, trigger_config')
    .eq('id', id)
    .single() as never);

  if (error) throw error;
  const row = data as FlowRow;
  const flowJson = row.flow_json ?? {};
  return {
    id: row.id,
    name: row.name,
    nodes: flowJson.nodes ?? [],
    edges: flowJson.edges ?? [],
    globalPrompt: flowJson.globalPrompt ?? 'You are a helpful property assistant for NFStay. Be professional and concise.',
    globalModel: flowJson.globalModel ?? 'gpt-5.4-mini',
    globalTemperature: flowJson.globalTemperature ?? 0.7,
    maxRepliesPerLead: flowJson.maxRepliesPerLead ?? 10,
    isActive: row.is_active,
    triggerType: row.trigger_type,
    triggerConfig: row.trigger_config ?? {},
  };
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutomationFlow(id: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sms-automation-flow', id],
    queryFn: () => fetchFlow(id!),
    enabled: !!id && id !== 'new',
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      nodes?: Node<SmsNodeData>[];
      edges?: Edge<SmsEdgeData>[];
      globalPrompt?: string;
      globalModel?: string;
      globalTemperature?: number;
      maxRepliesPerLead?: number;
      is_active?: boolean;
    }) => {
      const { id: automationId, name, nodes, edges, globalPrompt, globalModel, globalTemperature, maxRepliesPerLead, is_active } = payload;

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) updates.name = name;
      if (is_active !== undefined) updates.is_active = is_active;

      if (nodes !== undefined || edges !== undefined || globalPrompt !== undefined || globalModel !== undefined || globalTemperature !== undefined || maxRepliesPerLead !== undefined) {
        const currentFlow = query.data;
        updates.flow_json = {
          nodes: nodes ?? currentFlow?.nodes ?? [],
          edges: edges ?? currentFlow?.edges ?? [],
          globalPrompt: globalPrompt ?? currentFlow?.globalPrompt ?? '',
          globalModel: globalModel ?? currentFlow?.globalModel ?? 'gpt-5.4-mini',
          globalTemperature: globalTemperature ?? currentFlow?.globalTemperature ?? 0.7,
          maxRepliesPerLead: maxRepliesPerLead ?? currentFlow?.maxRepliesPerLead ?? 10,
        };
      }

      const { error } = await (supabase
        .from('sms_automations' as never)
        .update(updates as never)
        .eq('id', automationId) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-automation-flow', id] });
      queryClient.invalidateQueries({ queryKey: ['sms-automations'] });
    },
  });

  return {
    flow: query.data,
    isLoading: query.isLoading,
    error: query.error,
    saveFlow: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
}
