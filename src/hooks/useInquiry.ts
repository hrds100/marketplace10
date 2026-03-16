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
        // Get property's contact info for landlord_id lookup
        const { data: prop } = await supabase
          .from('properties')
          .select('submitted_by')
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
          console.error('Failed to create thread:', error.message);
          // Might have been created concurrently — try fetching again
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
