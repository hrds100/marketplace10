import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsContact, SmsLabel, SmsPipelineStage } from '../types';

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

async function fetchPipelineContacts(): Promise<SmsContact[]> {
  const { data, error } = await (supabase
    .from('sms_contacts' as never)
    .select(`
      id, phone_number, display_name, notes, pipeline_stage_id,
      assigned_to, opted_out, batch_name, created_at, updated_at,
      sms_contact_labels (
        sms_labels!label_id ( id, name, colour, position )
      )
    `)
    .not('pipeline_stage_id', 'is', null)
    .order('updated_at', { ascending: false }) as never);

  if (error) throw error;
  return ((data as ContactRow[]) ?? []).map(mapRow);
}

async function fetchStages(): Promise<SmsPipelineStage[]> {
  const { data, error } = await (supabase
    .from('sms_pipeline_stages' as never)
    .select('id, name, colour, position')
    .order('position', { ascending: true }) as never);

  if (error) throw error;
  return ((data as { id: string; name: string; colour: string; position: number }[]) ?? []).map(
    (row) => ({ id: row.id, name: row.name, colour: row.colour, position: row.position })
  );
}

export function usePipeline() {
  const queryClient = useQueryClient();

  const contactsQuery = useQuery({
    queryKey: ['sms-pipeline-contacts'],
    queryFn: fetchPipelineContacts,
  });

  const stagesQuery = useQuery({
    queryKey: ['sms-pipeline-stages'],
    queryFn: fetchStages,
  });

  const moveMutation = useMutation({
    mutationFn: async ({ contactId, stageId }: { contactId: string; stageId: string }) => {
      const { error } = await (supabase
        .from('sms_contacts' as never)
        .update({ pipeline_stage_id: stageId } as never)
        .eq('id', contactId) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-pipeline-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to move contact');
    },
  });

  return {
    contacts: contactsQuery.data ?? [],
    stages: stagesQuery.data ?? [],
    isLoading: contactsQuery.isLoading || stagesQuery.isLoading,
    error: contactsQuery.error || stagesQuery.error,
    moveContact: moveMutation.mutateAsync,
  };
}
