import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useContactLabels() {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  async function addLabel(contactId: string, labelId: string) {
    try {
      setIsUpdating(true);
      const { error } = await (supabase
        .from('sms_contact_labels' as never)
        .insert({ contact_id: contactId, label_id: labelId } as never) as never);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add label';
      toast.error(message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }

  async function removeLabel(contactId: string, labelId: string) {
    try {
      setIsUpdating(true);
      const { error } = await (supabase
        .from('sms_contact_labels' as never)
        .delete()
        .eq('contact_id', contactId)
        .eq('label_id', labelId) as never);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove label';
      toast.error(message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }

  return { addLabel, removeLabel, isUpdating };
}
