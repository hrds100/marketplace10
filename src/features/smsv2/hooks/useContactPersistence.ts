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
  /**
   * Replace the full tag set for a contact. Wipes wk_contact_tags rows
   * for the contact, then inserts the new list. Skipped for mock IDs.
   */
  replaceTags: (contactId: string, tags: string[]) => Promise<boolean>;
  /** Insert a new contact. Returns the new row's id on success, null on fail. */
  createContact: (input: {
    name: string;
    phone: string;
    email?: string;
    pipelineColumnId?: string | null;
    ownerAgentId?: string | null;
    customFields?: Record<string, string>;
  }) => Promise<string | null>;
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

  const replaceTags = useCallback(async (contactId: string, tags: string[]) => {
    if (!isRealContactId(contactId)) return true;
    // Wipe + insert. Cheap because tag count is always small (<10 typical).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: delErr } = await (supabase.from('wk_contact_tags' as any) as any)
      .delete()
      .eq('contact_id', contactId);
    if (delErr) {
      console.warn('[contact-persist] replaceTags delete failed:', delErr.message);
      return false;
    }
    if (tags.length === 0) return true;
    const rows = tags.map((tag) => ({ contact_id: contactId, tag }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insErr } = await (supabase.from('wk_contact_tags' as any) as any).insert(rows);
    if (insErr) {
      console.warn('[contact-persist] replaceTags insert failed:', insErr.message);
      return false;
    }
    return true;
  }, []);

  const createContact = useCallback<ContactPersistAPI['createContact']>(async (input) => {
    // Owner must be a real UUID (FK to profiles.id). Reject mock IDs like
    // "a-hugo" from MOCK_AGENTS — they crash the INSERT with a uuid type error.
    let owner: string | null = null;
    if (input.ownerAgentId && isRealContactId(input.ownerAgentId)) {
      owner = input.ownerAgentId;
    } else {
      const { data } = await supabase.auth.getUser();
      owner = data.user?.id ?? null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('wk_contacts' as any) as any)
      .insert({
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        owner_agent_id: owner,
        pipeline_column_id: input.pipelineColumnId ?? null,
        custom_fields: input.customFields ?? {},
        is_hot: false,
      })
      .select('id')
      .single();
    if (error) {
      console.warn('[contact-persist] createContact failed:', error.message);
      return null;
    }
    return (data as { id: string } | null)?.id ?? null;
  }, []);

  return { moveToColumn, patchContact, replaceTags, createContact };
}
