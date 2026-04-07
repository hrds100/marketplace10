import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMarkRead() {
  const queryClient = useQueryClient();

  async function markRead(conversationId: string) {
    try {
      const { error } = await (supabase
        .from('sms_conversations' as never)
        .update({ unread_count: 0 } as never)
        .eq('id', conversationId) as never);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    } catch (err) {
      console.error('Failed to mark conversation as read:', err);
    }
  }

  return { markRead };
}
