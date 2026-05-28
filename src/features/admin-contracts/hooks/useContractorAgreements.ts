import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContractorAgreement {
  id: string;
  token: string;
  recipient_name: string | null;
  recipient_email: string | null;
  status: string;
  title: string;
  sender_name: string | null;
  sender_signature_png: string | null;
  signer_name: string | null;
  signature_png: string | null;
  signed_at: string | null;
  terms_html: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  title: string;
  terms_html: string | null;
  sender_signature_png: string | null;
  sender_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useContractorAgreements() {
  const [agreements, setAgreements] = useState<ContractorAgreement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgreements = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agreements')
        .select('id, token, recipient_name, recipient_email, status, title, sender_name, sender_signature_png, signer_name, signature_png, signed_at, terms_html, template_id, created_at, updated_at')
        .eq('type', 'contractor')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAgreements((data as ContractorAgreement[]) || []);
    } catch (err) {
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgreements(); }, [fetchAgreements]);

  const sendContract = useCallback(async (params: {
    recipientName: string;
    recipientEmail: string;
    templateId: string;
    title: string;
    termsHtml: string;
    senderName: string;
    senderSignaturePng: string;
  }) => {
    try {
      const slug = params.recipientName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const token = `${slug}-${Date.now().toString(36)}`;

      const { error } = await supabase.from('agreements').insert({
        token,
        type: 'contractor',
        recipient_name: params.recipientName,
        recipient_email: params.recipientEmail,
        template_id: params.templateId,
        title: params.title,
        terms_html: params.termsHtml,
        sender_name: params.senderName,
        sender_signature_png: params.senderSignaturePng,
        amount: 0,
        currency: 'GBP',
        status: 'sent',
      });
      if (error) throw error;

      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'contractor-agreement-sent',
            data: {
              recipientEmail: params.recipientEmail,
              recipientName: params.recipientName,
              title: params.title,
              senderName: params.senderName,
              token,
            },
          },
        });
      } catch {
        toast.error('Contract created but email failed to send');
      }

      toast.success('Contract sent');
      await fetchAgreements();
      return token;
    } catch (err) {
      toast.error('Failed to send contract');
      return null;
    }
  }, [fetchAgreements]);

  return { agreements, loading, refetch: fetchAgreements, sendContract };
}

export function useContractTemplates() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agreement_templates')
        .select('id, name, title, terms_html, sender_signature_png, sender_name, created_at, updated_at')
        .eq('type', 'contractor')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTemplates((data as ContractTemplate[]) || []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const saveTemplate = useCallback(async (template: Partial<ContractTemplate> & { id?: string }) => {
    try {
      if (template.id) {
        const { error } = await supabase
          .from('agreement_templates')
          .update({
            name: template.name,
            title: template.title,
            terms_html: template.terms_html,
            sender_signature_png: template.sender_signature_png,
            sender_name: template.sender_name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', template.id);
        if (error) throw error;
        toast.success('Template updated');
      } else {
        const { error } = await supabase.from('agreement_templates').insert({
          name: template.name || 'Untitled',
          title: template.title || 'Contractor Agreement',
          terms_html: template.terms_html || '',
          sender_signature_png: template.sender_signature_png || null,
          sender_name: template.sender_name || 'Hugo Souza',
          type: 'contractor',
          is_global: true,
        });
        if (error) throw error;
        toast.success('Template created');
      }
      await fetchTemplates();
    } catch {
      toast.error('Failed to save template');
    }
  }, [fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('agreement_templates').delete().eq('id', id);
      if (error) throw error;
      toast.success('Template deleted');
      await fetchTemplates();
    } catch {
      toast.error('Failed to delete template');
    }
  }, [fetchTemplates]);

  return { templates, loading, refetch: fetchTemplates, saveTemplate, deleteTemplate };
}
