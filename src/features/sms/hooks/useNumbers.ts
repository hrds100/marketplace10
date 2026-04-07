import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsPhoneNumber } from '../types';

interface NumberRow {
  id: string;
  twilio_sid: string;
  phone_number: string;
  label: string;
  is_default: boolean;
  webhook_url: string;
  message_count: number;
  created_at: string;
}

function mapRow(row: NumberRow): SmsPhoneNumber {
  return {
    id: row.id,
    twilioSid: row.twilio_sid,
    phoneNumber: row.phone_number,
    label: row.label,
    isDefault: row.is_default,
    webhookUrl: row.webhook_url ?? '',
    messageCount: row.message_count ?? 0,
    createdAt: row.created_at,
  };
}

async function fetchNumbers(): Promise<SmsPhoneNumber[]> {
  const { data, error } = await (supabase
    .from('sms_numbers' as never)
    .select('id, twilio_sid, phone_number, label, is_default, webhook_url, message_count, created_at')
    .order('created_at', { ascending: true }) as never);

  if (error) throw error;
  return ((data as NumberRow[]) ?? []).map(mapRow);
}

export function useNumbers() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sms-numbers'],
    queryFn: fetchNumbers,
  });

  const addMutation = useMutation({
    mutationFn: async (payload: { phone_number: string; twilio_sid: string; label: string; is_default?: boolean }) => {
      const { error } = await (supabase
        .from('sms_numbers' as never)
        .insert(payload as never) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-numbers'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add number');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; label?: string; phone_number?: string }) => {
      const { id, ...data } = payload;
      const { error } = await (supabase
        .from('sms_numbers' as never)
        .update(data as never)
        .eq('id', id) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-numbers'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update number');
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (numberId: string) => {
      const { error } = await (supabase
        .from('sms_numbers' as never)
        .delete()
        .eq('id', numberId) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-numbers'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to remove number');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (numberId: string) => {
      // Set all to false first
      const { error: clearError } = await (supabase
        .from('sms_numbers' as never)
        .update({ is_default: false } as never)
        .eq('is_default', true) as never);
      if (clearError) throw clearError;

      // Set the target to true
      const { error } = await (supabase
        .from('sms_numbers' as never)
        .update({ is_default: true } as never)
        .eq('id', numberId) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-numbers'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to set default number');
    },
  });

  return {
    numbers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addNumber: addMutation.mutateAsync,
    updateNumber: updateMutation.mutateAsync,
    removeNumber: removeMutation.mutateAsync,
    setDefault: setDefaultMutation.mutateAsync,
  };
}
