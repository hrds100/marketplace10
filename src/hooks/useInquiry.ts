import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Creates or finds a chat thread for the given property.
 * Idempotent: checks for existing thread before inserting.
 * Returns { threadId, isCreating }.
 */
export function useInquiry(propertyId: string | null) {
  const { user } = useAuth();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!propertyId || !user?.id) {
      setThreadId(null);
      return;
    }

    let cancelled = false;

    const findOrCreate = async () => {
      setIsCreating(true);
      try {
        // Check for existing thread
        const { data: existing } = await supabase
          .from('chat_threads')
          .select('id')
          .eq('operator_id', user.id)
          .eq('property_id', propertyId)
          .limit(1)
          .single();

        if (existing && !cancelled) {
          setThreadId(existing.id);
          setIsCreating(false);
          return;
        }
      } catch {
        // No existing thread — proceed to create
      }

      try {
        // Get property's contact info for landlord_id + notification fields
        const { data: prop } = await supabase
          .from('properties')
          .select('submitted_by, name, city, contact_phone, contact_whatsapp, landlord_whatsapp')
          .eq('id', propertyId)
          .single();

        if (cancelled) return;

        const landlordId = (prop?.submitted_by as string) || null;

        const { data: created, error } = await supabase
          .from('chat_threads')
          .insert({
            operator_id: user.id,
            property_id: propertyId,
            landlord_id: landlordId,
            status: 'active',
            terms_accepted: false,
          })
          .select('id')
          .single();

        if (error) {
          console.warn('useInquiry: thread insert failed (likely duplicate):', error.message);
          // Race condition — thread was created concurrently, fetch it
          const { data: retry } = await supabase
            .from('chat_threads')
            .select('id')
            .eq('operator_id', user.id)
            .eq('property_id', propertyId)
            .limit(1)
            .single();
          if (retry && !cancelled) setThreadId(retry.id);
        } else if (created && !cancelled) {
          setThreadId(created.id);
          // Auto-send first inquiry message so landlord sees it immediately
          const introBody = "Hi, is this property still available? I'm very interested.";
          const maskedBody = introBody; // No PII in auto-message, no masking needed
          await supabase.from('chat_messages').insert({
            thread_id: created.id,
            sender_id: user.id,
            body: introBody,
            body_receiver: null,
            is_masked: false,
            mask_type: null,
            message_type: 'text',
          });
          // Fire n8n webhook to notify landlord via WhatsApp
          const recipientPhone = (prop?.contact_phone || prop?.contact_whatsapp || prop?.landlord_whatsapp || '') as string;
          const propertyTitle = (prop?.name || '') as string;
          const propertyCity = (prop?.city || '') as string;
          const n8nBase = (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886554.hstgr.cloud').replace(/\/$/, '');
          fetch(`${n8nBase}/webhook/inbox-new-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              thread_id: created.id,
              property_title: propertyTitle,
              property_city: propertyCity,
              sender_name: user.user_metadata?.name || 'Interested Tenant',
              sender_role: 'operator',
              is_masked: false,
              mask_type: null,
              landlord_id: landlordId,
              operator_id: user.id,
              recipient_phone: recipientPhone,
              recipient_name: '',
              property_label: propertyCity || propertyTitle,
            }),
          }).catch(() => {}); // fire-and-forget
        }
      } catch (err) {
        console.error('useInquiry error:', err);
      } finally {
        if (!cancelled) setIsCreating(false);
      }
    };

    findOrCreate();
    return () => { cancelled = true; };
  }, [propertyId, user?.id]);

  return { threadId, isCreating };
}
