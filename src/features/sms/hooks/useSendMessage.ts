import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendMessageArgs {
  to: string;
  body: string;
  contactId: string;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);

  async function sendMessage({ to, body, contactId }: SendMessageArgs) {
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('sms-send', {
        body: { to, body, contact_id: contactId },
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['sms-messages', contactId] });
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      toast.error(message);
      throw err;
    } finally {
      setIsSending(false);
    }
  }

  return { sendMessage, isSending };
}
