import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ArchiveRow {
  id: string;
  source: 'native' | 'bp_import';
  bp_id: string | null;
  bp_type_id: number | null;
  bp_preview_url: string | null;
  bp_view_url: string | null;
  token: string | null;
  title: string;
  recipient_name: string | null;
  recipient_email: string | null;
  signer_name: string | null;
  signer_email: string | null;
  company_name: string | null;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'opened' | 'signed' | 'paid';
  date_sent: string | null;
  signed_at: string | null;
  created_at: string;
  imported_at: string | null;
}

export interface ArchiveDetail extends ArchiveRow {
  terms_html: string | null;
  description: string | null;
  subject_line: string | null;
  personal_message: string | null;
  bp_raw: unknown | null;
  html_storage_path: string | null;
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
  status: 'all' | 'draft' | 'sent' | 'opened' | 'signed' | 'paid';
  search: string;
}

const LIST_COLUMNS = `
  id, source, bp_id, bp_type_id, bp_preview_url, bp_view_url, token,
  title, recipient_name, recipient_email, signer_name, signer_email,
  company_name, amount, currency, status,
  date_sent, signed_at, created_at, imported_at
`;

const DETAIL_COLUMNS = `
  id, source, bp_id, bp_type_id, bp_preview_url, bp_view_url, token,
  title, recipient_name, recipient_email, signer_name, signer_email,
  company_name, amount, currency, status,
  date_sent, signed_at, created_at, imported_at,
  terms_html, description, subject_line, personal_message, bp_raw,
  html_storage_path
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
      .limit(500);

    if (filters.source !== 'all') q = q.eq('source', filters.source);
    if (filters.status !== 'all') q = q.eq('status', filters.status);
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
  const [counts, setCounts] = useState<{ total: number; bp: number; native: number; byStatus: Record<string, number> }>({
    total: 0,
    bp: 0,
    native: 0,
    byStatus: {},
  });

  const load = useCallback(async () => {
    const { count: total } = await (supabase.from('agreements' as any) as any)
      .select('id', { count: 'exact', head: true });
    const { count: bp } = await (supabase.from('agreements' as any) as any)
      .select('id', { count: 'exact', head: true }).eq('source', 'bp_import');
    const { count: native } = await (supabase.from('agreements' as any) as any)
      .select('id', { count: 'exact', head: true }).eq('source', 'native');

    const statuses = ['draft', 'sent', 'opened', 'signed', 'paid'] as const;
    const byStatus: Record<string, number> = {};
    for (const s of statuses) {
      const { count } = await (supabase.from('agreements' as any) as any)
        .select('id', { count: 'exact', head: true }).eq('status', s);
      byStatus[s] = count ?? 0;
    }

    setCounts({ total: total ?? 0, bp: bp ?? 0, native: native ?? 0, byStatus });
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { counts, reload: load };
}

export async function getSignedHtmlUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from('agreements').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
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
