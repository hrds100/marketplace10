import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SmsContact, SmsLabel } from '../types';

interface ContactRow {
  id: string;
  phone_number: string;
  display_name: string | null;
  company_name: string | null;
  notes: string;
  pipeline_stage_id: string | null;
  assigned_to: string | null;
  opted_out: boolean;
  batch_name: string | null;
  response_status: string | null;
  created_at: string;
  updated_at: string;
  sms_contact_labels: {
    sms_labels: {
      id: string;
      name: string;
      colour: string;
      position: number;
    };
  }[];
}

function mapRow(row: ContactRow): SmsContact {
  const labels: SmsLabel[] = (row.sms_contact_labels ?? []).map((cl) => cl.sms_labels);
  return {
    id: row.id,
    phoneNumber: row.phone_number,
    displayName: row.display_name,
    companyName: row.company_name,
    labels,
    pipelineStageId: row.pipeline_stage_id,
    notes: row.notes ?? '',
    assignedTo: row.assigned_to,
    optedOut: row.opted_out,
    batchName: row.batch_name,
    responseStatus: (row.response_status as SmsContact['responseStatus']) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// PostgREST defaults to capping responses at 1000 rows regardless of .limit().
// Page through with .range() so the contacts list, search, and groups dropdown
// see every row, not just the most recent 1000.
async function fetchContacts(): Promise<SmsContact[]> {
  const pageSize = 1000;
  const all: ContactRow[] = [];
  let from = 0;

  // Hard ceiling to avoid an accidental infinite loop if the API misbehaves.
  // Revisit if the contact base ever climbs past 100k.
  const maxPages = 100;

  for (let page = 0; page < maxPages; page++) {
    const { data, error } = await (supabase
      .from('sms_contacts' as never)
      .select(`
        id, phone_number, display_name, company_name, notes, pipeline_stage_id,
        assigned_to, opted_out, batch_name, response_status, created_at, updated_at,
        sms_contact_labels (
          sms_labels!label_id ( id, name, colour, position )
        )
      `)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1) as never);

    if (error) throw error;
    const rows = (data as ContactRow[]) ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return all.map(mapRow);
}

export function useContacts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sms-contacts'],
    queryFn: fetchContacts,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      phone_number: string;
      display_name?: string;
      company_name?: string | null;
      notes?: string;
      pipeline_stage_id?: string | null;
      labelIds?: string[];
    }) => {
      const { labelIds, ...contactData } = payload;
      const { data, error } = await (supabase
        .from('sms_contacts' as never)
        .insert(contactData as never)
        .select('id')
        .single() as never);

      if (error) throw error;
      const newId = (data as { id: string }).id;

      if (labelIds && labelIds.length > 0) {
        const rows = labelIds.map((labelId) => ({ contact_id: newId, label_id: labelId }));
        const { error: labelError } = await (supabase
          .from('sms_contact_labels' as never)
          .insert(rows as never) as never);
        if (labelError) throw labelError;
      }

      return newId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create contact');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      phone_number?: string;
      display_name?: string | null;
      company_name?: string | null;
      notes?: string;
      pipeline_stage_id?: string | null;
      labelIds?: string[];
    }) => {
      const { id, labelIds, ...contactData } = payload;
      const { error } = await (supabase
        .from('sms_contacts' as never)
        .update(contactData as never)
        .eq('id', id) as never);

      if (error) throw error;

      if (labelIds !== undefined) {
        // Delete existing labels, then re-insert
        await (supabase
          .from('sms_contact_labels' as never)
          .delete()
          .eq('contact_id', id) as never);

        if (labelIds.length > 0) {
          const rows = labelIds.map((labelId) => ({ contact_id: id, label_id: labelId }));
          const { error: labelError } = await (supabase
            .from('sms_contact_labels' as never)
            .insert(rows as never) as never);
          if (labelError) throw labelError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update contact');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await (supabase
        .from('sms_contacts' as never)
        .delete()
        .eq('id', contactId) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contact');
    },
  });

  const bulkCreateMutation = useMutation({
    // Dedupes input by phone_number, then upserts with ignoreDuplicates so
    // any phones already in sms_contacts (or repeated in the CSV) are
    // silently skipped instead of failing the whole batch.
    mutationFn: async (rows: { phone_number: string; display_name?: string; company_name?: string | null; batch_name?: string; pipeline_stage_id?: string | null }[]) => {
      // 1. Strip empty phones + dedupe within the input (keep first
      //    occurrence so the user's first row wins on conflicting display
      //    names / batch names).
      const seen = new Set<string>();
      const cleanRows = rows.reduce<typeof rows>((acc, row) => {
        const phone = row.phone_number?.trim();
        if (!phone) return acc;
        if (seen.has(phone)) return acc;
        seen.add(phone);
        acc.push({ ...row, phone_number: phone });
        return acc;
      }, []);

      if (cleanRows.length === 0) {
        return { requested: rows.length, inserted: 0, skipped: rows.length };
      }

      // 2. Upsert — Postgres skips rows whose phone already exists.
      const { data, error } = await (supabase
        .from('sms_contacts' as never)
        .upsert(cleanRows as never, { onConflict: 'phone_number', ignoreDuplicates: true })
        .select('id') as never);

      if (error) {
        // Supabase errors are plain objects, not Error instances — extract
        // .message manually so the toast shows the real reason.
        const msg = (error as { message?: string }).message
          || (typeof error === 'string' ? error : 'Insert failed');
        throw new Error(msg);
      }

      const inserted = (data as { id: string }[] | null)?.length ?? 0;
      return {
        requested: rows.length,
        inserted,
        skipped: rows.length - inserted,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sms-batch-groups'] });
      if (result.skipped > 0) {
        toast.success(
          `${result.inserted} imported, ${result.skipped} skipped (already in contacts or duplicate in file)`
        );
      } else {
        toast.success(`${result.inserted} contact${result.inserted !== 1 ? 's' : ''} imported`);
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to import contacts');
    },
  });

  const bulkUpdateStageMutation = useMutation({
    mutationFn: async ({ contactIds, stageId }: { contactIds: string[]; stageId: string | null }) => {
      const { error } = await (supabase
        .from('sms_contacts' as never)
        .update({ pipeline_stage_id: stageId } as never)
        .in('id', contactIds) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sms-pipeline-contacts'] });
      toast.success('Stage updated');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update stage');
    },
  });

  const bulkAddLabelMutation = useMutation({
    mutationFn: async ({ contactIds, labelId }: { contactIds: string[]; labelId: string }) => {
      // Insert label for each contact (ignore duplicates)
      const rows = contactIds.map((contactId) => ({ contact_id: contactId, label_id: labelId }));
      const { error } = await (supabase
        .from('sms_contact_labels' as never)
        .upsert(rows as never, { onConflict: 'contact_id,label_id', ignoreDuplicates: true }) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
      toast.success('Label added');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add label');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (contactIds: string[]) => {
      const { error } = await (supabase
        .from('sms_contacts' as never)
        .delete()
        .in('id', contactIds) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
      toast.success('Contacts deleted');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contacts');
    },
  });

  const pushToCampaignMutation = useMutation({
    mutationFn: async ({ contactIds, campaignId }: { contactIds: string[]; campaignId: string }) => {
      // Get existing recipients to avoid duplicates
      const { data: existing } = await (supabase
        .from('sms_campaign_recipients' as never)
        .select('contact_id')
        .eq('campaign_id', campaignId) as never);

      const existingSet = new Set(((existing as { contact_id: string }[]) ?? []).map((r) => r.contact_id));
      const newContactIds = contactIds.filter((id) => !existingSet.has(id));

      if (newContactIds.length === 0) {
        toast.info('All selected contacts are already in this campaign');
        return;
      }

      const rows = newContactIds.map((contactId) => ({
        campaign_id: campaignId,
        contact_id: contactId,
        status: 'pending',
      }));

      const { error } = await (supabase
        .from('sms_campaign_recipients' as never)
        .insert(rows as never) as never);
      if (error) throw error;

      // Update total_recipients count
      const { data: countData } = await (supabase
        .from('sms_campaign_recipients' as never)
        .select('id')
        .eq('campaign_id', campaignId) as never);

      await (supabase
        .from('sms_campaigns' as never)
        .update({ total_recipients: (countData as unknown[])?.length ?? 0 } as never)
        .eq('id', campaignId) as never);

      toast.success(`${newContactIds.length} contact${newContactIds.length !== 1 ? 's' : ''} added to campaign`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to push to campaign');
    },
  });

  const batchGroupsQuery = useQuery({
    queryKey: ['sms-batch-groups'],
    queryFn: async (): Promise<{ batchName: string; count: number }[]> => {
      // Paginate in 1000-row chunks to bypass Supabase's default cap.
      const counts = new Map<string, number>();
      const PAGE_SIZE = 1000;
      let from = 0;
      // Hard cap of 50k rows to prevent runaway loops.
      const MAX_ROWS = 50_000;

      while (from < MAX_ROWS) {
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await (supabase
          .from('sms_contacts' as never)
          .select('batch_name')
          .not('batch_name', 'is', null)
          .range(from, to) as never);

        if (error) throw error;
        const rows = (data as { batch_name: string }[]) ?? [];
        for (const row of rows) {
          if (row.batch_name) {
            counts.set(row.batch_name, (counts.get(row.batch_name) || 0) + 1);
          }
        }
        if (rows.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      return Array.from(counts.entries()).map(([batchName, count]) => ({ batchName, count }));
    },
  });

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createContact: createMutation.mutateAsync,
    updateContact: updateMutation.mutateAsync,
    deleteContact: deleteMutation.mutateAsync,
    bulkCreateContacts: bulkCreateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    bulkUpdateStage: bulkUpdateStageMutation.mutateAsync,
    bulkAddLabel: bulkAddLabelMutation.mutateAsync,
    bulkDelete: bulkDeleteMutation.mutateAsync,
    pushToCampaign: pushToCampaignMutation.mutateAsync,
    batchGroups: batchGroupsQuery.data ?? [],
    isBatchGroupsLoading: batchGroupsQuery.isLoading,
  };
}
