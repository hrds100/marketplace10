// useHydrateContacts — pumps real wk_contacts (+ wk_contact_tags) into the
// SmsV2Store on mount and keeps it fresh via Supabase realtime.
//
// Ships as a side-effect-only hook so the existing store-driven UI keeps
// working unchanged. Pages and components keep reading from useSmsV2().

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSmsV2 } from '../store/SmsV2Store';
import type { Contact } from '../types';

interface WkContactRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  owner_agent_id: string | null;
  pipeline_column_id: string | null;
  deal_value_pence: number | null;
  is_hot: boolean;
  custom_fields: Record<string, string> | null;
  last_contact_at: string | null;
  created_at: string;
}

interface WkContactTagRow {
  contact_id: string;
  tag: string;
}

export function rowToContact(row: WkContactRow, tags: string[]): Contact {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    ownerAgentId: row.owner_agent_id ?? undefined,
    pipelineColumnId: row.pipeline_column_id ?? undefined,
    tags,
    isHot: row.is_hot,
    dealValuePence: row.deal_value_pence ?? undefined,
    customFields: (row.custom_fields ?? {}) as Record<string, string>,
    createdAt: row.created_at,
    lastContactAt: row.last_contact_at ?? undefined,
  };
}

export function useHydrateContacts(): void {
  const { setContacts, upsertContact, removeContact } = useSmsV2();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // wk_contacts + wk_contact_tags joined client-side. Service-role bypass
      // is not needed: RLS lets agents see their own + admins see everything.
      //
      // 2026-05-16: previously `.limit(10000)` was used, but PostgREST caps
      // single responses at the project's `db.max_rows` (defaults around
      // 1k–2k), so contacts past that ceiling were silently dropped. Now we
      // page through wk_contacts with `.range()` until the page comes back
      // short of PAGE_SIZE. wk_contact_tags is fetched in parallel and
      // grouped client-side.
      const PAGE_SIZE = 1000;
      const HARD_CAP_PAGES = 200; // 200k contacts safety net
      const contactRows: WkContactRow[] = [];

      const tagsPromise =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_contact_tags' as any) as any).select('contact_id, tag');

      for (let page = 0; page < HARD_CAP_PAGES; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('wk_contacts' as any) as any)
          .select(
            'id, name, phone, email, owner_agent_id, pipeline_column_id, deal_value_pence, is_hot, custom_fields, last_contact_at, created_at'
          )
          .order('created_at', { ascending: false })
          .range(from, to);

        if (cancelled) return;

        if (error) {
          console.error('[useHydrateContacts] contacts load failed at page', page, error);
          break;
        }

        const rows = (data ?? []) as WkContactRow[];
        contactRows.push(...rows);
        if (rows.length < PAGE_SIZE) break;
      }

      const tagsRes = await tagsPromise;
      if (cancelled) return;

      const tagsByContact = new Map<string, string[]>();
      for (const row of (tagsRes.data ?? []) as WkContactTagRow[]) {
        const list = tagsByContact.get(row.contact_id) ?? [];
        list.push(row.tag);
        tagsByContact.set(row.contact_id, list);
      }

      const real = contactRows.map((row) =>
        rowToContact(row, tagsByContact.get(row.id) ?? [])
      );

      console.log(`[useHydrateContacts] loaded ${real.length} contacts`);

      // Atomic replace — never append-on-top of seed/realtime state, so the
      // store always reflects exactly what the DB returned.
      setContacts(real);
    }

    void load();

    // Realtime: any insert/update/delete on wk_contacts re-syncs that row.
    const channel = supabase
      .channel('smsv2-wk-contacts')
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_contacts' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.eventType === 'DELETE' && payload.old?.id) {
            removeContact(payload.old.id as string);
            return;
          }
          const row = payload.new as WkContactRow | undefined;
          if (!row) return;
          upsertContact(rowToContact(row, []));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [setContacts, upsertContact, removeContact]);
}
