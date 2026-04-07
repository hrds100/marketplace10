import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SmsConversation, SmsContact, SmsLabel } from '../types';

interface ConversationRow {
  id: string;
  contact_id: string;
  number_id: string;
  last_message_at: string | null;
  last_message_preview: string;
  unread_count: number;
  is_archived: boolean;
  is_locked_by: string | null;
  locked_at: string | null;
  automation_id: string | null;
  automation_enabled: boolean;
  created_at: string;
  sms_contacts: {
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
  };
  sms_automations: {
    name: string;
  } | null;
}

function mapRow(row: ConversationRow): SmsConversation {
  const c = row.sms_contacts;
  const labels: SmsLabel[] = (c.sms_contact_labels ?? []).map((cl) => cl.sms_labels);

  const contact: SmsContact = {
    id: c.id,
    phoneNumber: c.phone_number,
    displayName: c.display_name,
    labels,
    pipelineStageId: c.pipeline_stage_id,
    notes: c.notes ?? '',
    assignedTo: c.assigned_to,
    optedOut: c.opted_out,
    batchName: c.batch_name,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };

  return {
    id: row.id,
    contactId: row.contact_id,
    contact,
    numberId: row.number_id,
    lastMessageAt: row.last_message_at ?? row.created_at,
    lastMessagePreview: row.last_message_preview ?? '',
    unreadCount: row.unread_count,
    isArchived: row.is_archived,
    isLockedBy: row.is_locked_by,
    lockedAt: row.locked_at,
    automationId: row.automation_id,
    automationEnabled: row.automation_enabled ?? false,
    automationName: row.sms_automations?.name ?? null,
    createdAt: row.created_at,
  };
}

async function fetchConversations(): Promise<SmsConversation[]> {
  const { data, error } = await (supabase
    .from('sms_conversations' as never)
    .select(`
      id, contact_id, number_id, last_message_at, last_message_preview,
      unread_count, is_archived, is_locked_by, locked_at,
      automation_id, automation_enabled, created_at,
      sms_contacts!contact_id (
        id, phone_number, display_name, notes, pipeline_stage_id,
        assigned_to, opted_out, batch_name, created_at, updated_at,
        sms_contact_labels (
          sms_labels!label_id ( id, name, colour, position )
        )
      ),
      sms_automations!automation_id ( name )
    `)
    .order('last_message_at', { ascending: false }) as never);

  if (error) throw error;
  return ((data as ConversationRow[]) ?? []).map(mapRow);
}

export function useConversations() {
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: ['sms-conversations'],
    queryFn: fetchConversations,
  });

  useEffect(() => {
    const channel = supabase
      .channel('sms-conversations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sms_conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    conversations: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error,
  };
}
