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
// Matches BP's own UI: sent-but-not-actioned all show as Outstanding,
// regardless of whether the recipient has opened it. Pending stays in the
// schema as a future bucket but isn't populated today (BP's Pending tab is
// empty for our account; the differentiation just confused the data).
function mapStatus(bp: Record<string, unknown>, _openedIds: Set<string>): BpStatus {
  if (bp.MarkDead === '1' || bp.MarkDead === 1 || bp.Deleted === '1' || bp.Deleted === 1) return 'lost';
  if (bp.Signed === '1' || bp.Signed === 1 || bp.Paid === '1' || bp.Paid === 1) return 'accepted';
  if (!bp.DateSent || String(bp.DateSent).length === 0) return 'draft';
  return 'outstanding';
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

// ---------- PDF download ----------------------------------------------------
// BP serves the rendered PDF at /pdf-output.php with the same ProposalID +
// ContactID tokens as /cover.php, plus &pdf-view=1. For signed proposals the
// PDF includes the signer name + signature image. No auth needed — tokens
// are the gating mechanism.
function derivePdfUrl(contactLink: string): string {
  const cleaned = contactLink.replace(/&debug=yes/g, '');
  const sep = cleaned.includes('?') ? '&' : '?';
  return cleaned.replace(/\/cover\.php/, '/pdf-output.php') + `${sep}pdf-view=1`;
}

async function fetchPdf(contactLink: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(derivePdfUrl(contactLink), {
      headers: { 'User-Agent': 'NFSTAY-bp-import/1.0' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('pdf')) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    // Sanity: PDFs start with "%PDF"
    if (buf.length < 4 || buf[0] !== 0x25 || buf[1] !== 0x50 || buf[2] !== 0x44 || buf[3] !== 0x46) return null;
    return buf;
  } catch {
    return null;
  }
}

// Simple worker-pool: caps concurrent PDF fetches so we fit in the 150 s
// edge function budget without hammering BP's preview server.
async function pool<T>(items: T[], concurrency: number, worker: (item: T, idx: number) => Promise<void>): Promise<void> {
  let i = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try { await worker(items[idx], idx); } catch { /* swallow — caller tracks per-row errors */ }
    }
  });
  await Promise.all(runners);
}

// ---------- Sync: proposals (the heavy one) ----------------------------------
async function syncProposals(
  supabase: SupabaseClient,
  bpKey: string,
  opts: { fetchHtml: boolean; runId: string },
) {
  // BP API pagination quirks (probed empirically):
  //  - Bare /proposal/sent  → 10 records (one page, can't paginate)
  //  - /proposal/sent/?page=N&per_page=10&type=N → DOES paginate (trailing slash matters!)
  //  - /proposal?per_page=500 → hard-capped at 223
  // So: iterate every status-scoped endpoint × every TypeID × every page until
  // a short page is returned. This is the only way to get past the 223 cap.
  const seen = new Set<string>();
  const all: any[] = [];

  const ingest = (list: any[]) => {
    if (!Array.isArray(list)) return;
    for (const p of list) {
      const id = String(p.ID);
      if (seen.has(id)) continue;
      seen.add(id);
      all.push(p);
    }
  };

  const STATUS_PATHS = ['/proposal/sent', '/proposal/signed', '/proposal/opened', '/proposal/new', '/proposal/paid'];
  // TypeID 0 = type filter omitted (catches anything BP doesn't tag with a TypeID).
  // Then known doctype IDs: 1 Proposal, 3 Brochure, 5 Contract, 6 Sign off, 7200 Agreement.
  const TYPE_IDS = [1, 3, 5, 6, 7200];

  for (const path of STATUS_PATHS) {
    for (const tid of TYPE_IDS) {
      for (let page = 1; page <= 50; page++) {
        try {
          const r = await bpGet<{ data: any[] }>(`${path}/?page=${page}&per_page=20&type=${tid}`, bpKey);
          const list = Array.isArray(r.data) ? r.data : [];
          if (list.length === 0) break;
          ingest(list);
          if (list.length < 20) break;  // short page = last page
        } catch { break; }
      }
    }
  }

  // Belt-and-braces: also pull the bulk /proposal listing (gets latest 223
  // regardless of status/type — catches anything the status loops missed).
  try {
    const r = await bpGet<{ data: any[] }>('/proposal?per_page=500', bpKey);
    ingest(r.data);
  } catch { /* optional */ }

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
  let pdfFetched = 0;
  let pdfFailed = 0;
  const errors: string[] = [];

  // Pick the best contact link: prefer one whose email matches SignedEmail
  // (true recipient); else last contact (usually the recipient, not the sender);
  // else first; else null.
  const pickContactLink = (p: any): string | null => {
    const contacts = Array.isArray(p.Contacts) ? p.Contacts : [];
    if (contacts.length === 0) return null;
    if (p.SignedEmail) {
      const match = contacts.find((c: any) => c.Email && String(c.Email).toLowerCase() === String(p.SignedEmail).toLowerCase());
      if (match?.Link) return match.Link;
    }
    return contacts[contacts.length - 1]?.Link ?? contacts[0]?.Link ?? null;
  };

  await pool(all, 6, async (p) => {
    const bpId = String(p.ID);
    const contactLink = pickContactLink(p);
    const cleanedPreview = typeof contactLink === 'string' ? contactLink.replace(/&debug=yes/g, '') : null;

    let pdfStoragePath: string | null = null;

    if (opts.fetchHtml && cleanedPreview) {  // fetchHtml flag now means "fetch the binary doc"
      const pdf = await fetchPdf(cleanedPreview);
      if (pdf) {
        const path = `bp-import/pdf/${bpId}.pdf`;
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, pdf, {
            contentType: 'application/pdf',
            upsert: true,
          });
        if (!upErr) {
          pdfStoragePath = path;
          pdfFetched++;
        } else {
          errors.push(`bp_id ${bpId} storage: ${upErr.message}`);
          pdfFailed++;
        }
      } else {
        pdfFailed++;
      }
    }

    const signerFirst = (p.SignedFirstName ?? '').toString();
    const signerLast = (p.SignedSurname ?? '').toString();
    const signerFullFromParts = `${signerFirst} ${signerLast}`.trim();
    const signerName = (p.SignedName ?? signerFullFromParts) || null;
    const recipient = p.Contacts?.[Math.max(0, (p.Contacts?.length ?? 1) - 1)] ?? null;
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
      bp_date_created: bpDate(p.DateCreated),
      bp_date_edited: bpDate(p.DateEdited),
      pdf_storage_path: pdfStoragePath,
      imported_at: new Date().toISOString(),

      token: `bp-${bpId}`,
      type: 'investor',
    } as Record<string, unknown>;

    const { error: upsertErr, data } = await supabase
      .from('agreements')
      .upsert(row, { onConflict: 'bp_id' })
      .select('id')
      .single();

    if (upsertErr) {
      errors.push(`bp_id ${bpId}: ${upsertErr.message}`);
      return;
    }
    if (data) inserted++;
  });

  return { pulled: all.length, inserted, updated: 0, previewFetches: pdfFetched, previewFailures: pdfFailed, errors };
}

// ---------- Sync: by explicit ID list -----------------------------------------
// BP's REST API caps the proposal listing at ~223 records and 404s
// /proposal/{id} for older / deleted ones — BUT /quote/{id} keeps working
// for those old records. The IDs in BP's web UI (`/proposals/view?id=N`)
// are actually QuoteIDs, not Proposal record IDs. So this action:
//   1. Tries /proposal/{id} first (works for current 223)
//   2. If 404, treats the id as a QuoteID and fetches /quote/{id}
//   3. Tries to look up the matching Proposal record via /proposal/{id}
//      using the actual Proposal ID derived from /proposal listing's
//      QuoteID → ProposalID map (built once at start)
//   4. If still no Proposal record, inserts a metadata-only row
//      (no PDF — BP no longer has the proposal record)
async function syncByIds(
  supabase: SupabaseClient,
  bpKey: string,
  ids: string[],
  opts: { fetchHtml: boolean },
) {
  const cleanIds = Array.from(new Set(
    ids.map((x) => String(x).trim()).filter((x) => /^\d+$/.test(x))
  ));

  // Build QuoteID → Proposal record map from the bulk listing once
  // (covers any id where the proposal record still exists in the API).
  const quoteIdToProposal = new Map<string, any>();
  try {
    const r = await bpGet<{ data: any[] }>('/proposal?per_page=500', bpKey);
    if (Array.isArray(r.data)) {
      for (const p of r.data) {
        if (p.QuoteID) quoteIdToProposal.set(String(p.QuoteID), p);
      }
    }
  } catch { /* best-effort */ }

  let inserted = 0;
  let pdfFetched = 0;
  let pdfFailed = 0;
  let notFound = 0;
  let metadataOnly = 0;
  const errors: string[] = [];

  const companyCache = new Map<string, string | null>();
  const getCompanyName = async (cid: string | null): Promise<string | null> => {
    if (!cid) return null;
    if (companyCache.has(cid)) return companyCache.get(cid) ?? null;
    try {
      const r = await bpGet<{ data: any }>(`/company/${cid}`, bpKey);
      const name = r.data?.CompanyName ?? null;
      companyCache.set(cid, name);
      return name;
    } catch { companyCache.set(cid, null); return null; }
  };

  await pool(cleanIds, 4, async (rawId) => {
    // Step 1: try /proposal/{rawId}
    let p: any = null;
    try {
      const r = await bpGet<{ data: any }>(`/proposal/${rawId}`, bpKey);
      if (r.data && r.data.ID) p = r.data;
    } catch { /* fall through */ }

    // Step 2: treat rawId as QuoteID, look up matching proposal in our map
    if (!p && quoteIdToProposal.has(rawId)) {
      const candidate = quoteIdToProposal.get(rawId);
      try {
        const r = await bpGet<{ data: any }>(`/proposal/${candidate.ID}`, bpKey);
        if (r.data && r.data.ID) p = r.data;
      } catch { /* fall through */ }
    }

    // Step 3a: found a proposal record — normal import with PDF
    if (p) {
      const r = await processProposal(supabase, p, new Set<string>(), opts.fetchHtml, errors);
      if (r.inserted) inserted++;
      if (r.pdfFetched) pdfFetched++;
      if (r.pdfFailed) pdfFailed++;
      return;
    }

    // Step 3b: fall back to /quote/{rawId} for metadata-only row
    let q: any = null;
    try {
      const r = await bpGet<{ data: any }>(`/quote/${rawId}`, bpKey);
      if (r.data && r.data.ID) q = r.data;
    } catch { /* fall through */ }

    if (!q) {
      notFound++;
      errors.push(`bp_id ${rawId}: no proposal or quote found`);
      return;
    }

    const companyName = await getCompanyName(q.CompanyID ? String(q.CompanyID) : null);
    const acceptedAt = bpDate(q.DateAccepted);
    const completedAt = bpDate(q.DateCompleted);
    const isAccepted = !!acceptedAt || q.Status === '1' || q.Status === 1;
    const isLost = bpBool(q.MarkDead) || bpBool(q.Deleted);

    const row = {
      source: 'bp_import',
      bp_id: `q-${rawId}`,
      bp_quote_id: String(q.ID),
      bp_company_id: q.CompanyID ?? null,
      bp_raw: { _metadata_only: true, _source: 'quote', quote: q, hint: 'Proposal record deleted in BP — only quote metadata available' },
      bp_archived: bpBool(q.Archived),
      bp_deleted: bpBool(q.Deleted),
      title: companyName ? `${companyName} (archived)` : `Quote ${rawId}`,
      company_name: companyName,
      amount: bpNum(q.QuoteTotal) ?? bpNum(q.QuoteAmount) ?? 0,
      currency: 'GBP',
      status: isLost ? 'lost' : (isAccepted ? 'accepted' : 'outstanding'),
      date_sent: bpDate(q.DateCreated),
      signed_at: acceptedAt ?? completedAt,
      bp_date_created: bpDate(q.DateCreated),
      bp_date_edited: bpDate(q.DateEdited),
      pdf_storage_path: null,
      imported_at: new Date().toISOString(),
      token: `bp-q-${rawId}`,
      type: 'investor',
    } as Record<string, unknown>;

    const { error: upsertErr, data } = await supabase
      .from('agreements')
      .upsert(row, { onConflict: 'bp_id' })
      .select('id')
      .single();

    if (upsertErr) {
      errors.push(`bp_id ${rawId} (quote): ${upsertErr.message}`);
      return;
    }
    if (data) {
      inserted++;
      metadataOnly++;
    }
  });

  return { pulled: cleanIds.length, inserted, notFound, pdfFetched, pdfFailed, metadataOnly, errors };
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

    // import-by-ids: accepts {"ids":["123","456",...]} in body
    if (action === 'import-by-ids') {
      const body = await req.json().catch(() => null);
      const ids = Array.isArray(body?.ids) ? body.ids : null;
      if (!ids || ids.length === 0) {
        return json({ error: 'Body must be {"ids":["bp_id",...]} with at least one id' }, 400);
      }
      const { data: run, error: runErr } = await admin
        .from('bp_import_runs')
        .insert({ action, triggered_by: user.id, status: 'running' })
        .select('id').single();
      if (runErr || !run) return json({ error: `Failed to create run: ${runErr?.message}` }, 500);
      const runId = run.id as string;
      try {
        const r = await syncByIds(admin, bpKey, ids, { fetchHtml });
        await admin.from('bp_import_runs').update({
          proposals_pulled: r.pulled, proposals_inserted: r.inserted,
          preview_fetches: r.pdfFetched, preview_failures: r.pdfFailed,
          errors: r.errors,
          status: 'completed', finished_at: new Date().toISOString(),
        }).eq('id', runId);
        return json({ ok: true, run_id: runId, totals: r });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await admin.from('bp_import_runs').update({
          status: 'failed', errors: [msg], finished_at: new Date().toISOString(),
        }).eq('id', runId);
        return json({ ok: false, error: msg, run_id: runId }, 500);
      }
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
