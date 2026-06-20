import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Status vocabulary: BP archive uses draft/pending/outstanding/accepted/lost.
// Legacy native flow uses draft/sent/opened/signed/paid. UI filter buckets
// each BP label to include the equivalent native status so both flows show
// up together — see STATUS_BUCKETS below.
export type AgreementStatus =
  | 'draft' | 'sent' | 'opened' | 'signed' | 'paid'      // native
  | 'pending' | 'outstanding' | 'accepted' | 'lost';     // BP

export type BpStatus = 'draft' | 'pending' | 'outstanding' | 'accepted' | 'lost';

export const STATUS_BUCKETS: Record<BpStatus, AgreementStatus[]> = {
  draft:       ['draft'],
  pending:     ['pending', 'sent'],
  outstanding: ['outstanding', 'opened'],
  accepted:    ['accepted', 'signed', 'paid'],
  lost:        ['lost'],
};

export interface ArchiveRow {
  id: string;
  source: 'native' | 'bp_import';
  bp_id: string | null;
  bp_type_id: number | null;
  bp_type_name: string | null;
  bp_preview_url: string | null;
  bp_view_url: string | null;
  token: string | null;
  title: string;
  description: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  signer_name: string | null;
  signer_email: string | null;
  company_name: string | null;
  amount: number;
  currency: string;
  status: AgreementStatus;
  date_sent: string | null;
  signed_at: string | null;
  created_at: string;
  imported_at: string | null;
  bp_date_created: string | null;
  bp_date_edited: string | null;
  bp_raw: unknown | null;
}

export interface ArchiveDetail extends ArchiveRow {
  terms_html: string | null;
  description: string | null;
  subject_line: string | null;
  personal_message: string | null;
  bp_raw: unknown | null;
  html_storage_path: string | null;
  pdf_storage_path: string | null;
}

export interface BpImportRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  action: string;
  status: 'running' | 'completed' | 'failed';
  proposals_pulled: number;
  proposals_inserted: number;
  templates_pulled: number;
  companies_pulled: number;
  quotes_pulled: number;
  preview_fetches: number;
  preview_failures: number;
  errors: unknown[];
}

export interface ArchiveFilters {
  source: 'all' | 'native' | 'bp_import';
  bpTypeId: number | null;
  status: BpStatus;
  search: string;
}

const LIST_COLUMNS = `
  id, source, bp_id, bp_type_id, bp_type_name, bp_preview_url, bp_view_url, token,
  title, description, recipient_name, recipient_email, signer_name, signer_email,
  company_name, amount, currency, status,
  date_sent, signed_at, created_at, imported_at,
  bp_date_created, bp_date_edited, bp_raw
`;

const DETAIL_COLUMNS = `
  id, source, bp_id, bp_type_id, bp_preview_url, bp_view_url, token,
  title, recipient_name, recipient_email, signer_name, signer_email,
  company_name, amount, currency, status,
  date_sent, signed_at, created_at, imported_at,
  bp_date_created, bp_date_edited,
  terms_html, description, subject_line, personal_message, bp_raw,
  html_storage_path, pdf_storage_path
`;

export function useArchiveList(filters: ArchiveFilters) {
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    let q: any = (supabase.from('agreements' as any) as any)
      .select(LIST_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(500)
      .eq('source', 'bp_import'); // /agreements is BP-only — native rows live in their own admin

    const bucket = STATUS_BUCKETS[filters.status];
    if (bucket) q = q.in('status', bucket);
    if (filters.bpTypeId !== null) q = q.eq('bp_type_id', filters.bpTypeId);

    const term = filters.search.trim();
    if (term.length > 0) {
      const t = term.replace(/[%_]/g, (m) => `\\${m}`);
      q = q.or(
        [
          `title.ilike.%${t}%`,
          `recipient_name.ilike.%${t}%`,
          `signer_name.ilike.%${t}%`,
          `company_name.ilike.%${t}%`,
          `recipient_email.ilike.%${t}%`,
          `signer_email.ilike.%${t}%`,
          `description.ilike.%${t}%`,
          `bp_id.ilike.%${t}%`,
          `token.ilike.%${t}%`,
        ].join(','),
      );
    }

    const { data, error: err } = await q;
    if (err) setError(err.message);
    setRows((data ?? []) as ArchiveRow[]);
    setLoading(false);
  }, [filters.source, filters.status, filters.bpTypeId, filters.search]);

  useEffect(() => { void load(); }, [load]);

  return { rows, loading, error, reload: load };
}

export function useArchiveDetail(id: string | null) {
  const [row, setRow] = useState<ArchiveDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) { setRow(null); return; }
    setLoading(true);
    void (async () => {
      const { data } = await (supabase.from('agreements' as any) as any)
        .select(DETAIL_COLUMNS)
        .eq('id', id)
        .maybeSingle();
      setRow((data as ArchiveDetail) ?? null);
      setLoading(false);
    })();
  }, [id]);

  return { row, loading };
}

export function useLastImportRun() {
  const [run, setRun] = useState<BpImportRun | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from('bp_import_runs' as any) as any)
      .select('id, started_at, finished_at, action, status, proposals_pulled, proposals_inserted, templates_pulled, companies_pulled, quotes_pulled, preview_fetches, preview_failures, errors')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setRun((data as BpImportRun) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { run, loading, reload: load };
}

export function useArchiveCounts() {
  const [counts, setCounts] = useState<{ total: number; bp: number; native: number; byStatus: Record<BpStatus, number> }>({
    total: 0,
    bp: 0,
    native: 0,
    byStatus: { draft: 0, pending: 0, outstanding: 0, accepted: 0, lost: 0 },
  });

  const load = useCallback(async () => {
    // /agreements is BP-only — count BP-imported rows only, never natives.
    const { count: bp } = await (supabase.from('agreements' as any) as any)
      .select('id', { count: 'exact', head: true }).eq('source', 'bp_import');

    const byStatus: Record<BpStatus, number> = { draft: 0, pending: 0, outstanding: 0, accepted: 0, lost: 0 };
    for (const bucket of Object.keys(STATUS_BUCKETS) as BpStatus[]) {
      const { count } = await (supabase.from('agreements' as any) as any)
        .select('id', { count: 'exact', head: true })
        .eq('source', 'bp_import')
        .in('status', STATUS_BUCKETS[bucket]);
      byStatus[bucket] = count ?? 0;
    }

    setCounts({ total: bp ?? 0, bp: bp ?? 0, native: 0, byStatus });
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { counts, reload: load };
}

export interface BpTemplateRow {
  bp_id: string;
  template_name: string | null;
  description: string | null;
  type_id: number | null;
  brand_id: string | null;
  is_default: boolean | null;
  is_deleted: boolean | null;
  date_created: string | null;
  date_edited: string | null;
  raw: any;
}

export interface TemplateFilters {
  search: string;
  typeId: number | null;
  folder: 'all' | 'mine' | 'marketplace';
}

export function useTemplatesList(filters: TemplateFilters) {
  const [rows, setRows] = useState<BpTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q: any = (supabase.from('bp_templates' as any) as any)
      .select('bp_id, template_name, description, type_id, brand_id, is_default, is_deleted, date_created, date_edited, raw')
      .order('date_edited', { ascending: false })
      .limit(500);

    if (filters.typeId !== null) q = q.eq('type_id', filters.typeId);
    if (filters.folder === 'mine') q = q.or('from_marketplace.is.null,from_marketplace.eq.0');
    if (filters.folder === 'marketplace') q = q.not('from_marketplace', 'is', null).neq('from_marketplace', '0');

    const term = filters.search.trim();
    if (term.length > 0) {
      q = q.ilike('template_name', `%${term}%`);
    }

    const { data } = await q;
    setRows((data ?? []) as BpTemplateRow[]);
    setLoading(false);
  }, [filters.typeId, filters.folder, filters.search]);

  useEffect(() => { void load(); }, [load]);

  return { rows, loading, reload: load };
}

export function useTemplateCounts() {
  const [counts, setCounts] = useState({ templates: 0, covers: 0, contentLibrary: 0 });

  const load = useCallback(async () => {
    const { count: templates } = await (supabase.from('bp_templates' as any) as any)
      .select('bp_id', { count: 'exact', head: true });
    // Covers + Content Library are BP-only concepts we don't have endpoints for yet —
    // counts come from bp_doctypes when those endpoints become available.
    setCounts({ templates: templates ?? 0, covers: 0, contentLibrary: 0 });
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { counts, reload: load };
}

export function useDoctypes() {
  const [types, setTypes] = useState<Array<{ id: number; name: string; colour: string | null }>>([]);

  const load = useCallback(async () => {
    const { data } = await (supabase.from('bp_doctypes' as any) as any)
      .select('bp_id, type_name, type_colour')
      .order('bp_id', { ascending: true });
    setTypes((data ?? []).map((d: any) => ({ id: d.bp_id, name: d.type_name, colour: d.type_colour })));
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { types, reload: load };
}

export async function getSignedHtmlUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from('agreements').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function getSignedPdfUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from('agreements').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function triggerImportByIds(ids: string[], fetchHtml = true) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const url = `${supabaseUrl}/functions/v1/bp-import?action=import-by-ids&fetchHtml=${fetchHtml ? '1' : '0'}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids }),
  });
  const body = (await r.json().catch(() => ({}))) as {
    ok?: boolean;
    run_id?: string;
    totals?: { pulled: number; inserted: number; notFound: number; pdfFetched: number; pdfFailed: number; metadataOnly?: number; errors: string[] };
    error?: string;
  };
  if (!r.ok) throw new Error(body.error ?? `import-by-ids HTTP ${r.status}`);
  return body;
}

export async function triggerBpImport(
  action: 'ping' | 'full-sync' | 'sync-proposals' | 'sync-templates' | 'sync-companies' | 'sync-quotes' | 'sync-reference',
  fetchHtml = true,
) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const url = `${supabaseUrl}/functions/v1/bp-import?action=${encodeURIComponent(action)}&fetchHtml=${fetchHtml ? '1' : '0'}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': anonKey,
      'Content-Type': 'application/json',
    },
  });
  const body = (await r.json().catch(() => ({}))) as {
    ok?: boolean;
    run_id?: string;
    bp_account_proposal_count?: number;
    totals?: unknown;
    error?: string;
  };
  if (!r.ok) throw new Error(body.error ?? `bp-import HTTP ${r.status}`);
  return body;
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export const BP_TYPE_LABELS: Record<number, string> = {
  1: 'Proposal',
  2: 'Quote',
  3: 'Brochure',
  4: 'Statement of Work',
  5: 'Contract',
  6: 'Sign off',
  7: 'Job Offer',
  7200: 'Agreement',
};

export function useDebouncedValue<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return useMemo(() => debounced, [debounced]);
}
