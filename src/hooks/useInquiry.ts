import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Creates or finds a chat thread for the given property.
 * Idempotent: checks for existing thread before inserting.
 * Only operators/tenants may create inquiry threads.
 * Landlords (@nfstay.internal magic-link accounts) are blocked from creating inquiries.
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

    // Role guard: only landlords (magic-link @nfstay.internal accounts) are blocked
    const isLandlordAccount = !!user.email?.endsWith('@nfstay.internal');
    if (isLandlordAccount) {
      return;
    }

    let cancelled = false;

    const findOrCreate = async () => {
      setIsCreating(true);

      // First: look up who owns this property
      const { data: prop } = await supabase
        .from('properties')
        .select('submitted_by, name, city, contact_phone, contact_whatsapp, landlord_whatsapp')
        .eq('id', propertyId)
        .single();

      if (cancelled) return;

      const landlordId = (prop?.submitted_by as string) || null;

      // If the current user IS the landlord of this property,
      // find their existing landlord thread — never create a new operator thread.
      if (landlordId && landlordId === user.id) {
        try {
          const { data: landlordThread } = await supabase
            .from('chat_threads')
            .select('id')
            .eq('landlord_id', user.id)
            .eq('property_id', propertyId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (landlordThread && !cancelled) {
            setThreadId(landlordThread.id);
          }
        } catch {
          // No thread exists yet for this landlord — that's fine, nothing to show
        }
        if (!cancelled) setIsCreating(false);
        return;
      }

      try {
        // Check for existing operator thread
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
          // No auto-message — operator lands on the ChatEmptyState promo
          // screen ("You could earn £X/month") and writes their own first message.
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
