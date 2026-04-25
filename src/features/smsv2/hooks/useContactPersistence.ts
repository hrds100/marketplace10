// useContactPersistence — write-through helpers for wk_contacts mutations.
//
// The SmsV2Store reducer is purely local. Pages need to optimistically
// update the store AND persist to wk_contacts. This module owns that
// second half. It deliberately does not couple to the store — pages
// dispatch to the store first, then call these to persist.
//
// Mock contact IDs (anything that doesn't look like a UUID, e.g.
// `contact-1` from MOCK_CONTACTS) are no-ops so dev/Storybook keeps
// working without a Supabase round-trip.

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isRealContactId(id: string): boolean {
  return UUID_RE.test(id);
}

export interface ContactPersistAPI {
  /** Move a contact to a pipeline column. Returns true on success. */
  moveToColumn: (contactId: string, columnId: string) => Promise<boolean>;
  /** Patch arbitrary fields. Skipped if the id is not a real UUID. */
  patchContact: (
    contactId: string,
    patch: Partial<{
      name: string;
      phone: string;
      email: string | null;
      pipeline_column_id: string | null;
      owner_agent_id: string | null;
      deal_value_pence: number | null;
      is_hot: boolean;
      custom_fields: Record<string, string>;
      last_contact_at: string;
    }>
  ) => Promise<boolean>;
}

export function useContactPersistence(): ContactPersistAPI {
  const moveToColumn = useCallback(async (contactId: string, columnId: string) => {
    if (!isRealContactId(contactId)) return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('wk_contacts' as any) as any)
      .update({ pipeline_column_id: columnId, last_contact_at: new Date().toISOString() })
      .eq('id', contactId);
    if (error) {
      console.warn('[contact-persist] moveToColumn failed:', error.message);
      return false;
    }
    return true;
  }, []);

  const patchContact = useCallback<ContactPersistAPI['patchContact']>(
    async (contactId, patch) => {
      if (!isRealContactId(contactId)) return true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('wk_contacts' as any) as any)
        .update(patch)
        .eq('id', contactId);
      if (error) {
        console.warn('[contact-persist] patchContact failed:', error.message);
        return false;
      }
      return true;
    },
    []
  );

  return { moveToColumn, patchContact };
}
