import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SmsMessage } from '../types';

interface MessageRow {
  id: string;
  twilio_sid: string | null;
  from_number: string;
  to_number: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: SmsMessage['status'];
  media_urls: string[];
  number_id: string | null;
  contact_id: string | null;
  campaign_id: string | null;
  error_code: string | null;
  error_message: string | null;
  scheduled_at: string | null;
  channel: 'sms' | 'whatsapp';
  created_at: string;
}

function mapRow(row: MessageRow): SmsMessage {
  return {
    id: row.id,
    twilioSid: row.twilio_sid ?? '',
    fromNumber: row.from_number,
    toNumber: row.to_number,
    body: row.body,
    direction: row.direction,
    status: row.status,
    mediaUrls: row.media_urls ?? [],
    numberId: row.number_id ?? '',
    contactId: row.contact_id ?? '',
    campaignId: row.campaign_id,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    scheduledAt: row.scheduled_at,
    channel: row.channel ?? 'sms',
    createdAt: row.created_at,
  };
}

async function fetchMessages(contactId: string): Promise<SmsMessage[]> {
  const { data, error } = await (supabase
    .from('sms_messages' as never)
    .select(
      'id, twilio_sid, from_number, to_number, body, direction, status, media_urls, number_id, contact_id, campaign_id, error_code, error_message, scheduled_at, channel, created_at'
    )
    .eq('contact_id', contactId)
    .order('created_at', { ascending: true }) as never);

  if (error) throw error;
  return ((data as MessageRow[]) ?? []).map(mapRow);
}

export function useMessages(contactId: string | null) {
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: ['sms-messages', contactId],
    queryFn: () => fetchMessages(contactId!),
    enabled: !!contactId,
  });

  useEffect(() => {
    if (!contactId) return;

    const channel = supabase
      .channel(`sms-messages-${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sms_messages',
          filter: `contact_id=eq.${contactId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sms-messages', contactId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId, queryClient]);

  return {
    messages: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error,
  };
}
