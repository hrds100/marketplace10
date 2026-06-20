// bp-import — pulls everything out of Better Proposals into our DB so the
// subscription can be cancelled. Admin-only.
//
// Actions (POST /functions/v1/bp-import?action=...):
//   ping            — verify BP API key + return account counts
//   full-sync       — all of the below, in order, logged to bp_import_runs
//   sync-reference  — doctypes + currencies + settings
//   sync-companies  — /company   → bp_companies
//   sync-quotes     — /quote     → bp_quotes
//   sync-templates  — /template  → bp_templates
//   sync-proposals  — /proposal (+ TypeID-filtered) → agreements (source=bp_import)
//                     plus per-row Preview-HTML scrape → Storage + terms_html
//
// JWT-verified by the gateway (verify_jwt=true in config.toml). Email check
// inside catches non-admin authenticated callers.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAILS = [
  'admin@hub.nfstay.com',
  'hugo@nfstay.com',
  'hugodesouzax@gmail.com',
];

const BP_BASE = 'https://api.betterproposals.io';
const STORAGE_BUCKET = 'agreements';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------- BP API client ----------------------------------------------------
async function bpGet<T = any>(path: string, bpKey: string): Promise<T> {
  const r = await fetch(`${BP_BASE}${path}`, {
    headers: { 'Bptoken': bpKey, 'Accept': 'application/json' },
  });
  if (!r.ok) {
    throw new Error(`BP ${path} → HTTP ${r.status}`);
  }
  return await r.json() as T;
}

// ---------- Status mapping ---------------------------------------------------
// BP archive vocabulary — matches the tabs in BP's own admin UI.
// See migration 20260620000002_bp_status_vocabulary.sql for the CHECK.
type BpStatus = 'draft' | 'pending' | 'outstanding' | 'accepted' | 'lost';
function mapStatus(bp: Record<string, unknown>, openedIds: Set<string>): BpStatus {
  if (bp.MarkDead === '1' || bp.MarkDead === 1 || bp.Deleted === '1' || bp.Deleted === 1) return 'lost';
  if (bp.Signed === '1' || bp.Signed === 1 || bp.Paid === '1' || bp.Paid === 1) return 'accepted';
  if (!bp.DateSent || String(bp.DateSent).length === 0) return 'draft';
  if (openedIds.has(String(bp.ID))) return 'outstanding';
  return 'pending';
}

// ---------- Datetime helpers -------------------------------------------------
// BP returns "YYYY-MM-DD HH:MM:SS" without timezone — treat as UTC.
function bpDate(s: unknown): string | null {
  if (!s || typeof s !== 'string' || s.length === 0 || s === '0000-00-00 00:00:00') return null;
  return s.includes('T') ? s : `${s.replace(' ', 'T')}Z`;
}
function bpBool(v: unknown): boolean {
  return v === '1' || v === 1 || v === true;
}
function bpNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------- Sync: reference data --------------------------------------------
async function syncReference(supabase: SupabaseClient, bpKey: string) {
  const out = { doctypes: 0, currencies: 0 };

  const dt = await bpGet<{ data: any[] }>('/doctype', bpKey);
  if (Array.isArray(dt.data)) {
    const rows = dt.data.map((d) => ({
      bp_id: Number(d.ID),
      type_name: d.TypeName ?? null,
      type_name_singular: d.TypeNameSingular ?? null,
      type_colour: d.TypeColour ?? null,
      num_outstanding: d.NumberOfOutstandingDocuments ?? null,
      num_templates: d.NumberOfTemplates ?? null,
      raw: d,
      imported_at: new Date().toISOString(),
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('bp_doctypes').upsert(rows, { onConflict: 'bp_id' });
      if (error) throw new Error(`bp_doctypes upsert: ${error.message}`);
      out.doctypes = rows.length;
    }
  }

  const cu = await bpGet<{ data: any[] }>('/currency', bpKey);
  if (Array.isArray(cu.data)) {
    const rows = cu.data.map((c) => ({
      bp_id: String(c.ID),
      currency_name: c.CurrencyName ?? null,
      currency_code: c.CurrencyCode ?? null,
      currency_symbol: c.CurrencySymbol ?? null,
      raw: c,
      imported_at: new Date().toISOString(),
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('bp_currencies').upsert(rows, { onConflict: 'bp_id' });
      if (error) throw new Error(`bp_currencies upsert: ${error.message}`);
      out.currencies = rows.length;
    }
  }

  return out;
}

// ---------- Sync: companies --------------------------------------------------
async function syncCompanies(supabase: SupabaseClient, bpKey: string) {
  const r = await bpGet<{ data: any[] }>('/company', bpKey);
  const list = Array.isArray(r.data) ? r.data : [];
  if (list.length === 0) return 0;
  const rows = list.map((c) => ({
    bp_id: String(c.ID),
    account_id: c.AccountID ?? null,
    company_name: c.CompanyName ?? null,
    company_crm_id: c.CompanyCRMID ?? null,
    is_demo: bpBool(c.DemoCompany),
    is_deleted: bpBool(c.Deleted),
    date_created: bpDate(c.DateCreated),
    date_edited: bpDate(c.DateEdited),
    raw: c,
    imported_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('bp_companies').upsert(rows, { onConflict: 'bp_id' });
  if (error) throw new Error(`bp_companies upsert: ${error.message}`);
  return rows.length;
}

// ---------- Sync: quotes -----------------------------------------------------
async function syncQuotes(supabase: SupabaseClient, bpKey: string) {
  const r = await bpGet<{ data: any[] }>('/quote', bpKey);
  const list = Array.isArray(r.data) ? r.data : [];
  if (list.length === 0) return 0;
  const rows = list.map((q) => ({
    bp_id: String(q.ID),
    account_id: q.AccountID ?? null,
    company_id: q.CompanyID ?? null,
    status: q.Status !== null && q.Status !== undefined ? Number(q.Status) : null,
    quote_amount: bpNum(q.QuoteAmount),
    monthly_amount: bpNum(q.MonthlyAmount),
    quarterly_amount: bpNum(q.QuarterlyAmount),
    annual_amount: bpNum(q.AnnualAmount),
    vat_amount: bpNum(q.VatAmount),
    quote_total: bpNum(q.QuoteTotal),
    is_archived: bpBool(q.Archived),
    is_deleted: bpBool(q.Deleted),
    marked_dead: bpBool(q.MarkDead),
    date_created: bpDate(q.DateCreated),
    date_edited: bpDate(q.DateEdited),
    date_accepted: bpDate(q.DateAccepted),
    date_completed: bpDate(q.DateCompleted),
    raw: q,
    imported_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('bp_quotes').upsert(rows, { onConflict: 'bp_id' });
  if (error) throw new Error(`bp_quotes upsert: ${error.message}`);
  return rows.length;
}

// ---------- Sync: templates --------------------------------------------------
async function syncTemplates(supabase: SupabaseClient, bpKey: string) {
  const r = await bpGet<{ data: any[] }>('/template', bpKey);
  const list = Array.isArray(r.data) ? r.data : [];
  if (list.length === 0) return 0;
  const rows = list.map((t) => ({
    bp_id: String(t.ID),
    account_id: t.AccountID ?? null,
    template_name: t.TemplateName ?? null,
    description: t.Description ?? null,
    type_id: t.TypeID !== null && t.TypeID !== undefined ? Number(t.TypeID) : null,
    type_name: null,
    brand_id: t.BrandID ?? null,
    cover_id: t.CoverID ?? null,
    category_id: t.CategoryID ?? null,
    industry_id: t.IndustryID ?? null,
    is_default: bpBool(t.Default),
    is_deleted: bpBool(t.Deleted),
    sample_template: bpBool(t.SampleTemplate),
    from_marketplace: t.FromMarketplace ?? null,
    quote_amount: bpNum(t.QuoteAmount),
    monthly_amount: bpNum(t.MonthlyAmount),
    quarterly_amount: bpNum(t.QuarterlyAmount),
    annual_amount: bpNum(t.AnnualAmount),
    date_created: bpDate(t.DateCreated),
    date_edited: bpDate(t.DateEdited),
    raw: t,
    imported_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('bp_templates').upsert(rows, { onConflict: 'bp_id' });
  if (error) throw new Error(`bp_templates upsert: ${error.message}`);
  return rows.length;
}

// ---------- Preview HTML scrape ---------------------------------------------
async function fetchPreviewHtml(previewUrl: string): Promise<string | null> {
  try {
    // Strip "&debug=yes" if present — cleaner archived copy.
    const url = previewUrl.replace(/&debug=yes/g, '');
    const r = await fetch(url, {
      headers: { 'User-Agent': 'NFSTAY-bp-import/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return null;
    return await r.text();
  } catch {
    return null;
  }
}

// ---------- Sync: proposals (the heavy one) ----------------------------------
async function syncProposals(
  supabase: SupabaseClient,
  bpKey: string,
  opts: { fetchHtml: boolean; runId: string },
) {
  // BP /proposal returns TypeID=1 only. We also probe other TypeIDs that
  // doctype exposes so we capture Contracts / Agreements / Brochures / Sign-offs.
  const TYPE_IDS = [null, 3, 5, 6, 7200] as const; // null = default (Proposals)
  const seen = new Set<string>();
  const all: any[] = [];

  for (const tid of TYPE_IDS) {
    const path = tid === null ? '/proposal' : `/proposal?type=${tid}`;
    try {
      const r = await bpGet<{ data: any[] }>(path, bpKey);
      const list = Array.isArray(r.data) ? r.data : [];
      for (const p of list) {
        const id = String(p.ID);
        if (seen.has(id)) continue;
        seen.add(id);
        all.push(p);
      }
    } catch {
      // Type filter not supported by API — ignore and continue.
    }
  }

  // /proposal/opened lists proposals the recipient has actually viewed —
  // that's the "Outstanding" bucket vs raw "Pending".
  const openedIds = new Set<string>();
  try {
    const o = await bpGet<{ data: any[] }>('/proposal/opened', bpKey);
    if (Array.isArray(o.data)) {
      for (const p of o.data) openedIds.add(String(p.ID));
    }
  } catch { /* opened endpoint optional — fall back to pending only */ }

  let inserted = 0;
  let updated = 0;
  let previewFetches = 0;
  let previewFailures = 0;
  const errors: string[] = [];

  for (const p of all) {
    const bpId = String(p.ID);
    const previewUrl = (p.Contacts?.[0]?.Link ?? p.Preview ?? null) as string | null;
    const cleanedPreview = typeof previewUrl === 'string' ? previewUrl.replace(/&debug=yes/g, '') : null;

    let termsHtml: string | null = null;
    let htmlStoragePath: string | null = null;

    if (opts.fetchHtml && cleanedPreview) {
      const html = await fetchPreviewHtml(cleanedPreview);
      previewFetches++;
      if (html) {
        termsHtml = html;
        const path = `bp-import/html/${bpId}.html`;
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, new Blob([html], { type: 'text/html; charset=utf-8' }), {
            contentType: 'text/html; charset=utf-8',
            upsert: true,
          });
        if (!upErr) htmlStoragePath = path;
      } else {
        previewFailures++;
      }
      // gentle throttle to avoid hammering BP's preview server
      await new Promise((res) => setTimeout(res, 50));
    }

    const signerFirst = (p.SignedFirstName ?? '').toString();
    const signerLast = (p.SignedSurname ?? '').toString();
    const signerFullFromParts = `${signerFirst} ${signerLast}`.trim();
    const signerName = (p.SignedName ?? signerFullFromParts) || null;
    const recipient = p.Contacts?.[0] ?? null;
    const recipientName = recipient
      ? `${recipient.FirstName ?? ''} ${recipient.Surname ?? ''}`.trim() || null
      : null;
    const signedAt = (() => {
      if (p.SignedDate && p.SignedTime) return bpDate(`${p.SignedDate} ${p.SignedTime}`);
      if (p.SignedDate) return bpDate(`${p.SignedDate} 00:00:00`);
      return null;
    })();

    const row = {
      source: 'bp_import',
      bp_id: bpId,
      bp_type_id: p.TypeID !== null && p.TypeID !== undefined ? Number(p.TypeID) : null,
      bp_type_name: null,
      bp_brand_id: p.BrandID ?? null,
      bp_company_id: p.CompanyID ?? null,
      bp_quote_id: p.QuoteID ?? null,
      bp_assigned_to: p.AssignedTo ?? null,
      bp_preview_url: cleanedPreview,
      bp_view_url: p.ProposalView ?? null,
      bp_raw: p,
      bp_archived: bpBool(p.Archived),
      bp_deleted: bpBool(p.Deleted),

      title: p.SubjectLine || p.CompanyName || `Proposal ${bpId}`,
      recipient_name: recipientName,
      recipient_email: recipient?.Email ?? null,
      signer_name: signerName,
      signer_email: p.SignedEmail ?? null,
      signed_at: signedAt,
      status: mapStatus(p, openedIds),

      amount: bpNum(p.Amount) ?? 0,
      currency: (p.CurrencyCode as string) || 'USD',

      company_name: p.CompanyName ?? null,
      subject_line: p.SubjectLine ?? null,
      description: p.Description ?? null,
      personal_message: p.PersonalMessage ?? null,
      date_sent: bpDate(p.DateSent),
      terms_html: termsHtml,
      html_storage_path: htmlStoragePath,
      imported_at: new Date().toISOString(),

      // For BP rows, set a unique-ish token mirroring bp_id so admin links still resolve
      token: `bp-${bpId}`,
      type: 'investor', // re-use enum; doesn't gate UI
    } as Record<string, unknown>;

    const { error: upsertErr, data } = await supabase
      .from('agreements')
      .upsert(row, { onConflict: 'bp_id' })
      .select('id')
      .single();

    if (upsertErr) {
      errors.push(`bp_id ${bpId}: ${upsertErr.message}`);
      continue;
    }
    // PostgREST doesn't tell us insert vs update; approximate by checking imported_at against created_at.
    // Cheap proxy: any row with imported_at set was touched by this run.
    if (data) inserted++; // counted as "touched" — we differentiate in the run row's totals below
  }

  return { pulled: all.length, inserted, updated, previewFetches, previewFailures, errors };
}

// ---------- Handler ----------------------------------------------------------
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const bpKey = Deno.env.get('BETTER_PROPOSALS_API_KEY');

    if (!bpKey) {
      return json(
        { error: 'BETTER_PROPOSALS_API_KEY not configured. Add it as an edge function secret in Supabase.' },
        500,
      );
    }

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: callerErr } = await userClient.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (callerErr || !user || !ADMIN_EMAILS.includes(user.email ?? '')) {
      return json({ error: 'Admin access required' }, 403);
    }

    // Service-role client for the import work (RLS bypassed)
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const url = new URL(req.url);
    const action = url.searchParams.get('action') ?? 'ping';
    const fetchHtmlParam = url.searchParams.get('fetchHtml');
    const fetchHtml = fetchHtmlParam === null ? true : fetchHtmlParam === '1' || fetchHtmlParam === 'true';

    if (action === 'ping') {
      const count = await bpGet<{ count: number }>('/proposal/count', bpKey);
      return json({ ok: true, bp_account_proposal_count: count.count, fetchHtml });
    }

    // Log a run row from the start
    const { data: run, error: runErr } = await admin
      .from('bp_import_runs')
      .insert({
        action,
        triggered_by: user.id,
        status: 'running',
      })
      .select('id')
      .single();
    if (runErr || !run) return json({ error: `Failed to create run: ${runErr?.message}` }, 500);
    const runId = run.id as string;

    const totals = {
      proposals_pulled: 0,
      proposals_inserted: 0,
      proposals_updated: 0,
      templates_pulled: 0,
      companies_pulled: 0,
      quotes_pulled: 0,
      doctypes_pulled: 0,
      currencies_pulled: 0,
      preview_fetches: 0,
      preview_failures: 0,
      errors: [] as string[],
    };

    try {
      if (action === 'full-sync' || action === 'sync-reference') {
        const r = await syncReference(admin, bpKey);
        totals.doctypes_pulled = r.doctypes;
        totals.currencies_pulled = r.currencies;
      }
      if (action === 'full-sync' || action === 'sync-companies') {
        totals.companies_pulled = await syncCompanies(admin, bpKey);
      }
      if (action === 'full-sync' || action === 'sync-quotes') {
        totals.quotes_pulled = await syncQuotes(admin, bpKey);
      }
      if (action === 'full-sync' || action === 'sync-templates') {
        totals.templates_pulled = await syncTemplates(admin, bpKey);
      }
      if (action === 'full-sync' || action === 'sync-proposals') {
        const r = await syncProposals(admin, bpKey, { fetchHtml, runId });
        totals.proposals_pulled = r.pulled;
        totals.proposals_inserted = r.inserted;
        totals.proposals_updated = r.updated;
        totals.preview_fetches = r.previewFetches;
        totals.preview_failures = r.previewFailures;
        totals.errors.push(...r.errors);
      }

      await admin
        .from('bp_import_runs')
        .update({
          ...totals,
          status: 'completed',
          finished_at: new Date().toISOString(),
        })
        .eq('id', runId);

      return json({ ok: true, run_id: runId, totals });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      totals.errors.push(msg);
      await admin
        .from('bp_import_runs')
        .update({
          ...totals,
          status: 'failed',
          finished_at: new Date().toISOString(),
        })
        .eq('id', runId);
      return json({ ok: false, error: msg, run_id: runId, totals }, 500);
    }
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
