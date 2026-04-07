import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateContactPayload {
  display_name?: string;
  notes?: string;
  pipeline_stage_id?: string | null;
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  async function updateContact(contactId: string, payload: UpdateContactPayload) {
    try {
      setIsUpdating(true);
      const { error } = await (supabase
        .from('sms_contacts' as never)
        .update(payload as never)
        .eq('id', contactId) as never);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update contact';
      toast.error(message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }

  return { updateContact, isUpdating };
}
