import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsContact, SmsLabel } from '../types';

interface ContactRow {
  id: string;
  phone_number: string;
  display_name: string | null;
  notes: string;
  pipeline_stage_id: string | null;
  assigned_to: string | null;
  opted_out: boolean;
  batch_name: string | null;
  created_at: string;
  updated_at: string;
  sms_contact_labels: {
    sms_labels: {
      id: string;
      name: string;
      colour: string;
      position: number;
    };
  }[];
}

function mapRow(row: ContactRow): SmsContact {
  const labels: SmsLabel[] = (row.sms_contact_labels ?? []).map((cl) => cl.sms_labels);
  return {
    id: row.id,
    phoneNumber: row.phone_number,
    displayName: row.display_name,
    labels,
    pipelineStageId: row.pipeline_stage_id,
    notes: row.notes ?? '',
    assignedTo: row.assigned_to,
    optedOut: row.opted_out,
    batchName: row.batch_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchContacts(): Promise<SmsContact[]> {
  const { data, error } = await (supabase
    .from('sms_contacts' as never)
    .select(`
      id, phone_number, display_name, notes, pipeline_stage_id,
      assigned_to, opted_out, batch_name, created_at, updated_at,
      sms_contact_labels (
        sms_labels!label_id ( id, name, colour, position )
      )
    `)
    .order('created_at', { ascending: false }) as never);

  if (error) throw error;
  return ((data as ContactRow[]) ?? []).map(mapRow);
}

export function useContacts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sms-contacts'],
    queryFn: fetchContacts,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      phone_number: string;
      display_name?: string;
      notes?: string;
      pipeline_stage_id?: string | null;
      labelIds?: string[];
    }) => {
      const { labelIds, ...contactData } = payload;
      const { data, error } = await (supabase
        .from('sms_contacts' as never)
        .insert(contactData as never)
        .select('id')
        .single() as never);

      if (error) throw error;
      const newId = (data as { id: string }).id;

      if (labelIds && labelIds.length > 0) {
        const rows = labelIds.map((labelId) => ({ contact_id: newId, label_id: labelId }));
        const { error: labelError } = await (supabase
          .from('sms_contact_labels' as never)
          .insert(rows as never) as never);
        if (labelError) throw labelError;
      }

      return newId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create contact');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      phone_number?: string;
      display_name?: string | null;
      notes?: string;
      pipeline_stage_id?: string | null;
      labelIds?: string[];
    }) => {
      const { id, labelIds, ...contactData } = payload;
      const { error } = await (supabase
        .from('sms_contacts' as never)
        .update(contactData as never)
        .eq('id', id) as never);

      if (error) throw error;

      if (labelIds !== undefined) {
        // Delete existing labels, then re-insert
        await (supabase
          .from('sms_contact_labels' as never)
          .delete()
          .eq('contact_id', id) as never);

        if (labelIds.length > 0) {
          const rows = labelIds.map((labelId) => ({ contact_id: id, label_id: labelId }));
          const { error: labelError } = await (supabase
            .from('sms_contact_labels' as never)
            .insert(rows as never) as never);
          if (labelError) throw labelError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update contact');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await (supabase
        .from('sms_contacts' as never)
        .delete()
        .eq('id', contactId) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contact');
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (rows: { phone_number: string; display_name?: string; batch_name?: string }[]) => {
      const { error } = await (supabase
        .from('sms_contacts' as never)
        .insert(rows as never) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sms-batch-groups'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to import contacts');
    },
  });

  const batchGroupsQuery = useQuery({
    queryKey: ['sms-batch-groups'],
    queryFn: async (): Promise<{ batchName: string; count: number }[]> => {
      const { data, error } = await (supabase
        .from('sms_contacts' as never)
        .select('batch_name')
        .not('batch_name', 'is', null) as never);

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of (data as { batch_name: string }[]) ?? []) {
        if (row.batch_name) {
          counts.set(row.batch_name, (counts.get(row.batch_name) || 0) + 1);
        }
      }
      return Array.from(counts.entries()).map(([batchName, count]) => ({ batchName, count }));
    },
  });

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createContact: createMutation.mutateAsync,
    updateContact: updateMutation.mutateAsync,
    deleteContact: deleteMutation.mutateAsync,
    bulkCreateContacts: bulkCreateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    batchGroups: batchGroupsQuery.data ?? [],
    isBatchGroupsLoading: batchGroupsQuery.isLoading,
  };
}
