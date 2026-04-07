import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsTemplate } from '../types';

interface TemplateRow {
  id: string;
  name: string;
  body: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: TemplateRow): SmsTemplate {
  return {
    id: row.id,
    name: row.name,
    body: row.body,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchTemplates(): Promise<SmsTemplate[]> {
  const { data, error } = await (supabase
    .from('sms_templates' as never)
    .select('id, name, body, category, created_at, updated_at')
    .order('created_at', { ascending: false }) as never);

  if (error) throw error;
  return ((data as TemplateRow[]) ?? []).map(mapRow);
}

export function useTemplates() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sms-templates'],
    queryFn: fetchTemplates,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; body: string; category: string | null }) => {
      const { error } = await (supabase
        .from('sms_templates' as never)
        .insert(payload as never) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; body: string; category: string | null }) => {
      const { id, ...data } = payload;
      const { error } = await (supabase
        .from('sms_templates' as never)
        .update(data as never)
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await (supabase
        .from('sms_templates' as never)
        .delete()
        .eq('id', templateId) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template');
    },
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
  };
}
