import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: Array<{
    type: string;
    text?: string;
    format?: string;
    buttons?: unknown[];
  }>;
}

export function useWhatsappTemplates() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wa-templates', {
        body: { action: 'list' },
      });

      if (error) throw error;
      setTemplates(data?.templates ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load WhatsApp templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTemplate = useCallback(
    async (payload: {
      name: string;
      category: string;
      language: string;
      components: unknown[];
    }) => {
      try {
        const { data, error } = await supabase.functions.invoke('wa-templates', {
          body: { action: 'create', ...payload },
        });

        if (error) throw error;

        if (data?.error) {
          toast.error(data.meta_error || data.error);
          return;
        }

        toast.success('Template submitted for approval');
        await fetchTemplates();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create template');
      }
    },
    [fetchTemplates]
  );

  const deleteTemplate = useCallback(
    async (name: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('wa-templates', {
          body: { action: 'delete', name },
        });

        if (error) throw error;

        if (data?.error) {
          toast.error(data.meta_error || data.error);
          return;
        }

        toast.success('Template deleted');
        await fetchTemplates();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete template');
      }
    },
    [fetchTemplates]
  );

  return { templates, isLoading, fetchTemplates, createTemplate, deleteTemplate };
}
