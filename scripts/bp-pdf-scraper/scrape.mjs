#!/usr/bin/env node
/* eslint-disable no-console */
// bp-pdf-scraper — grabs the actual proposal PDF (not the admin dashboard).
//
// Flow for each view_id:
//   1. Open https://betterproposals.io/2/proposals/edit?id={view_id}
//   2. Click "Preview Document" button  →  opens the client-view URL
//      (proposal.<account>.com/cover.php?ProposalID=TOKEN&ContactID=TOKEN)
//   3. Derive the PDF URL by replacing /cover.php → /pdf-output.php and
//      appending &pdf-view=1
//   4. Fetch that PDF using the browser context's cookies
//
//   --login    Open BP, you log in once, session saved to state.json
//   --scrape   Iterate ids.json, save each PDF to ./pdfs/<view_id>.pdf
//   --upload   Push ./pdfs/* into Supabase Storage + upsert agreement rows
//
//   --force    Re-scrape even if a PDF for that id is already on disk
//   --debug    Headed browser + screenshots in ./debug/  (pairs with --scrape)
//   --limit=N  Only process first N ids — useful for "test 1 first"
//
// First-time setup:
//   cd scripts/bp-pdf-scraper
//   npm install
//   npx playwright install chromium
//   echo "SUPABASE_SERVICE_ROLE_KEY=..." > .env
//   node scrape.mjs --login

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env if present (simple parser — no extra deps)
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const STATE_PATH = join(__dirname, 'state.json');
const IDS_PATH = join(__dirname, 'ids.json');
const PDFS_DIR = join(__dirname, 'pdfs');
const DEBUG_DIR = join(__dirname, 'debug');
const MANIFEST_PATH = join(__dirname, 'pdfs', '_manifest.json');

// Replace any character Windows / NTFS can't have in a filename, collapse
// whitespace, trim, fall back to the view_id if the result is empty.
function safeFilename(name, fallback) {
  if (!name) return fallback;
  const cleaned = String(name)
    .replace(/[\\/:*?"<>|]+/g, '-')  // Windows-illegal chars only — keep spaces + hyphens
    .replace(/\s+/g, ' ')                          // collapse whitespace
    .replace(/\.+$/, '')                           // no trailing dots
    .trim();
  return cleaned.length === 0 ? fallback : cleaned.slice(0, 180); // cap length
}

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return {};
  try { return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')); } catch { return {}; }
}
function saveManifest(m) {
  mkdirSync(PDFS_DIR, { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2));
}
const BP_LOGIN_URL = process.env.BP_LOGIN_URL || 'https://betterproposals.io/login';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valOf = (f, dflt) => {
  const x = args.find((a) => a.startsWith(`${f}=`));
  return x ? x.slice(f.length + 1) : dflt;
};
const RUN_LOGIN = has('--login');
const RUN_SCRAPE = has('--scrape');
const RUN_UPLOAD = has('--upload');
const RUN_PURGE = has('--purge');
const FORCE = has('--force');
const DEBUG = has('--debug');
const LIMIT = parseInt(valOf('--limit', '0'), 10) || 0;

if (!RUN_LOGIN && !RUN_SCRAPE && !RUN_UPLOAD && !RUN_PURGE) {
  console.log('Usage: node scrape.mjs --login | --scrape | --upload | --purge  [--force] [--debug] [--limit=N]');
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
async function phaseLogin() {
  console.log('[login] opening BP login in a visible browser...');
  console.log('[login] log in. When you see the BP dashboard, come back here and press Enter.');
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BP_LOGIN_URL);

  process.stdin.setRawMode?.(true);
  process.stdin.resume();
  await new Promise((res) => process.stdin.once('data', () => res()));
  process.stdin.setRawMode?.(false);
  process.stdin.pause();

  const state = await ctx.storageState();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  console.log(`[login] saved session to ${STATE_PATH}`);
  await browser.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRAPE
// ─────────────────────────────────────────────────────────────────────────────
async function phaseScrape() {
  if (!existsSync(STATE_PATH)) throw new Error('Run --login first (no state.json)');
  if (!existsSync(IDS_PATH)) throw new Error(`Missing ${IDS_PATH}`);
  mkdirSync(PDFS_DIR, { recursive: true });
  if (DEBUG) mkdirSync(DEBUG_DIR, { recursive: true });

  const ids = JSON.parse(readFileSync(IDS_PATH, 'utf8'));
  let tasks = [];
  for (const [status, list] of Object.entries(ids)) {
    if (status.startsWith('_') || !Array.isArray(list)) continue;
    for (const id of list) tasks.push({ status, id: String(id) });
  }
  if (LIMIT > 0) tasks = tasks.slice(0, LIMIT);
  console.log(`[scrape] ${tasks.length} view_ids to process${DEBUG ? ' (DEBUG headed mode)' : ''}${FORCE ? ' (FORCE re-download)' : ''}`);

  const browser = await chromium.launch({ headless: !DEBUG, slowMo: DEBUG ? 250 : 0 });
  const ctx = await browser.newContext({ storageState: STATE_PATH, acceptDownloads: true });

  const manifest = loadManifest();

  let ok = 0; let fail = 0; let skipped = 0;
  for (const t of tasks) {
    // If we already have a file recorded in the manifest for this id, skip.
    const prev = manifest[t.id];
    if (!FORCE && prev?.filename) {
      const prevPath = join(PDFS_DIR, prev.filename);
      if (existsSync(prevPath) && statSync(prevPath).size > 1024) {
        skipped++;
        continue;
      }
    }

    try {
      const result = await fetchOnePdf(ctx, t.id);
      if (!result?.pdf || result.pdf.length < 1024) {
        fail++;
        process.stdout.write(`✗ ${t.id} (empty)\n`);
        continue;
      }
      const filename = `${safeFilename(result.docName, t.id)}.pdf`;
      const out = join(PDFS_DIR, filename);
      writeFileSync(out, result.pdf);
      manifest[t.id] = { filename, docName: result.docName ?? null, status: t.status };
      saveManifest(manifest);
      ok++;
      process.stdout.write(`✓ ${t.id} → "${filename}" (${(result.pdf.length / 1024).toFixed(0)} KB)\n`);
    } catch (e) {
      fail++;
      process.stdout.write(`✗ ${t.id}: ${e.message}\n`);
    }
  }
  console.log(`[scrape] done: ${ok} ok, ${skipped} skipped, ${fail} failed`);
  if (DEBUG) {
    console.log('[scrape] --debug: browser left open. Press Enter here to close it.');
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    await new Promise((res) => process.stdin.once('data', () => res()));
    process.stdin.setRawMode?.(false);
    process.stdin.pause();
  }
  await browser.close();
}

// Click flow for ONE view_id:
//   1. Open /2/proposals/edit?id=<vid>
//   2. Click "Preview Document"  → opens the client-view URL in a new tab
//   3. Replace /cover.php → /pdf-output.php, append &pdf-view=1
//   4. Fetch the PDF using the browser context (which carries session)
async function fetchOnePdf(ctx, viewId) {
  const page = await ctx.newPage();
  const viewUrl = `https://betterproposals.io/2/proposals/view?id=${viewId}`;

  try {
    await page.goto(viewUrl, { timeout: 45_000, waitUntil: 'domcontentloaded' });
    if (DEBUG) await page.screenshot({ path: join(DEBUG_DIR, `${viewId}-1-activity.png`), fullPage: true });

    // Extract the document name. BP shows "Document for {NAME}" at the top of
    // the Activity page. Try a few selectors, then strip the "Document for "
    // prefix. Fall back to the page title.
    const docName = await page.evaluate(() => {
      const stripPrefix = (s) => (s || '').replace(/^\s*Document\s+for\s+/i, '').trim();
      const h1 = document.querySelector('h1');
      if (h1?.textContent) {
        const t = stripPrefix(h1.textContent);
        if (t) return t;
      }
      const heading = document.querySelector('[class*="title" i], [class*="header" i] h1, [class*="header" i] h2');
      if (heading?.textContent) {
        const t = stripPrefix(heading.textContent);
        if (t) return t;
      }
      const title = document.title || '';
      return stripPrefix(title) || null;
    }).catch(() => null);
    if (DEBUG) console.log(`  [debug] ${viewId} docName = ${JSON.stringify(docName)}`);

    // Find Preview Document button. BP uses different markup in different
    // sections — try a few resilient selectors in order.
    const previewPagePromise = ctx.waitForEvent('page', { timeout: 20_000 }).catch(() => null);

    const selectors = [
      'text=/preview document/i',
      'a:has-text("Preview Document")',
      'button:has-text("Preview Document")',
      '[aria-label*="preview" i]',
      'a:has-text("Preview")',
      'button:has-text("Preview")',
    ];

    let clicked = false;
    for (const sel of selectors) {
      const el = await page.$(sel);
      if (el) {
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await el.click({ timeout: 10_000 }).catch(() => {});
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      throw new Error('Could not find Preview Document button');
    }

    // Preview opens in a new tab — wait for it.
    let previewPage = await previewPagePromise;

    // If no new tab was opened, the click may have navigated the current tab.
    if (!previewPage) {
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
      if (page.url() !== viewUrl) previewPage = page;
    }
    if (!previewPage) throw new Error('Preview Document did not open');

    // Give the preview page a moment to settle (BP often does a redirect).
    await previewPage.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
    await previewPage.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    if (DEBUG) await previewPage.screenshot({ path: join(DEBUG_DIR, `${viewId}-2-preview.png`), fullPage: true });

    // Some proposals open at a cover page (cover.php) with a "Start Reading
    // Proposal" button — click it to advance to the real proposal content
    // (index.php). Others open straight to the content; do nothing.
    if (/\/cover\.php/.test(previewPage.url())) {
      const startBtnSelectors = [
        'text=/start reading proposal/i',
        'a:has-text("Start Reading Proposal")',
        'button:has-text("Start Reading Proposal")',
        'a:has-text("Start Reading")',
        'button:has-text("Start Reading")',
      ];
      for (const sel of startBtnSelectors) {
        const el = await previewPage.$(sel);
        if (el) {
          await el.scrollIntoViewIfNeeded().catch(() => {});
          await Promise.all([
            previewPage.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {}),
            el.click({ timeout: 10_000 }).catch(() => {}),
          ]);
          break;
        }
      }
      if (DEBUG) await previewPage.screenshot({ path: join(DEBUG_DIR, `${viewId}-3-after-start.png`), fullPage: true });
    }

    const previewUrl = previewPage.url();
    // BP previews land on either /cover.php or /index.php depending on the
    // account/template. Both work for /pdf-output.php derivation.
    if (!/\/(cover|index)\.php/.test(previewUrl)) {
      throw new Error(`Preview URL doesn't match expected pattern: ${previewUrl}`);
    }

    const pdfUrl = previewUrl
      .replace(/&debug=yes/g, '')          // pdf-output.php doesn't like debug=yes
      .replace(/\/(cover|index)\.php/, '/pdf-output.php')
      + (previewUrl.includes('?') ? '&' : '?') + 'pdf-view=1';
    if (DEBUG) console.log(`  [debug] ${viewId} pdf url = ${pdfUrl}`);

    // Fetch the PDF via the browser context — cookies are carried automatically.
    const resp = await ctx.request.get(pdfUrl, {
      timeout: 60_000,
      headers: { 'User-Agent': 'NFSTAY-bp-scraper/1.0' },
    });
    if (!resp.ok()) throw new Error(`PDF fetch HTTP ${resp.status()}`);
    const ct = resp.headers()['content-type'] || '';
    const body = await resp.body();
    if (!ct.includes('pdf') || body.length < 1024) {
      throw new Error(`Bad PDF response (CT=${ct}, ${body.length} bytes)`);
    }
    if (body[0] !== 0x25 || body[1] !== 0x50 || body[2] !== 0x44 || body[3] !== 0x46) {
      throw new Error('Response not PDF (no %PDF magic)');
    }

    if (!DEBUG) {
      await previewPage.close().catch(() => {});
      await page.close().catch(() => {});
    }
    return { pdf: body, docName };
  } catch (e) {
    if (DEBUG) {
      try { await page.screenshot({ path: join(DEBUG_DIR, `${viewId}-FAIL.png`), fullPage: true }); } catch {}
    } else {
      await page.close().catch(() => {});
    }
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────────────────────────────────────────
async function phaseUpload() {
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing from .env');
  if (!existsSync(IDS_PATH)) throw new Error(`Missing ${IDS_PATH}`);
  if (!existsSync(PDFS_DIR)) throw new Error('No pdfs/ folder — run --scrape first');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ids = JSON.parse(readFileSync(IDS_PATH, 'utf8'));
  const statusByVid = new Map();
  for (const [status, list] of Object.entries(ids)) {
    if (status.startsWith('_') || !Array.isArray(list)) continue;
    for (const id of list) statusByVid.set(String(id), status);
  }

  // Manifest maps view_id → { filename, docName, status }. With manifest we
  // can look up each PDF by view_id; without it we fall back to assuming
  // <view_id>.pdf filenames.
  const manifest = loadManifest();
  const filesOnDisk = new Set(readdirSync(PDFS_DIR).filter((f) => f.endsWith('.pdf')));

  // Build the work list: prefer manifest entries (they have docName too),
  // fall back to numeric-named files for any leftover.
  const tasks = [];
  for (const [vid, entry] of Object.entries(manifest)) {
    if (entry?.filename && filesOnDisk.has(entry.filename)) {
      tasks.push({ viewId: vid, filename: entry.filename, docName: entry.docName });
      filesOnDisk.delete(entry.filename);
    }
  }
  for (const f of filesOnDisk) {
    const m = f.match(/^(\d+)\.pdf$/);
    if (m) tasks.push({ viewId: m[1], filename: f, docName: null });
  }
  console.log(`[upload] ${tasks.length} PDFs to push`);

  let uploaded = 0; let dbUpdated = 0; let errors = 0;
  for (const t of tasks) {
    const localPath = join(PDFS_DIR, t.filename);
    const size = statSync(localPath).size;
    if (size < 1024) { console.log(`✗ ${t.viewId} skipped (size ${size})`); continue; }
    const bytes = readFileSync(localPath);

    const { data: existing } = await supabase
      .from('agreements')
      .select('id, bp_id, title')
      .eq('source', 'bp_import')
      .or(`bp_quote_id.eq.${t.viewId},bp_id.eq.q-${t.viewId}`)
      .limit(1)
      .maybeSingle();

    const targetBpId = existing?.bp_id ?? `q-${t.viewId}`;
    const storagePath = `bp-import/pdf/${targetBpId}.pdf`;

    const { error: upErr } = await supabase.storage
      .from('agreements')
      .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: true });
    if (upErr) { console.log(`✗ ${t.viewId} storage: ${upErr.message}`); errors++; continue; }
    uploaded++;

    const status = statusByVid.get(t.viewId) || 'accepted';
    const update = {
      source: 'bp_import',
      bp_id: targetBpId,
      bp_quote_id: t.viewId,
      pdf_storage_path: storagePath,
      status,
      imported_at: new Date().toISOString(),
      token: `bp-q-${t.viewId}`,
      type: 'investor',
    };
    // Set the title to the doc name when we have one — both for new rows
    // and to replace generic auto-titles like "Quote 12345" on existing.
    if (t.docName) {
      update.title = t.docName;
    } else if (!existing) {
      update.title = `Quote ${t.viewId}`;
    }
    if (!existing) {
      update.currency = 'GBP';
      update.amount = 0;
    }

    const { error: dbErr } = await supabase
      .from('agreements')
      .upsert(update, { onConflict: 'bp_id' });
    if (dbErr) { console.log(`✗ ${t.viewId} db: ${dbErr.message}`); errors++; continue; }
    dbUpdated++;
    const label = t.docName ? `"${t.docName.slice(0, 40)}"` : t.viewId;
    process.stdout.write(`✓ ${t.viewId} → ${label} (${(size / 1024).toFixed(0)} KB)\n`);
  }
  console.log(`[upload] ${uploaded} files in Storage · ${dbUpdated} rows updated · ${errors} errors`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PURGE — wipe every BP-imported agreement row + every Storage file under
// agreements/bp-import/. Leaves native rows + reference tables untouched.
// ─────────────────────────────────────────────────────────────────────────────
async function phasePurge() {
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing from .env');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Rows
  const { count: before } = await supabase
    .from('agreements')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'bp_import');
  console.log(`[purge] ${before ?? 0} bp_import rows in agreements`);
  if (before && before > 0) {
    const { error } = await supabase.from('agreements').delete().eq('source', 'bp_import');
    if (error) throw new Error(`agreements delete: ${error.message}`);
    console.log(`[purge] deleted ${before} agreement rows`);
  }

  // 2. Storage — recursively list everything under bp-import/ and delete in batches
  const prefixes = ['bp-import/pdf', 'bp-import/html', 'bp-import'];
  let totalDeleted = 0;
  for (const prefix of prefixes) {
    let offset = 0;
    while (true) {
      const { data: list, error: listErr } = await supabase.storage
        .from('agreements')
        .list(prefix, { limit: 100, offset });
      if (listErr) { console.warn(`[purge] list ${prefix}: ${listErr.message}`); break; }
      if (!list || list.length === 0) break;

      const paths = list
        .filter((o) => o && o.name && !o.name.endsWith('/'))
        .map((o) => `${prefix}/${o.name}`);
      if (paths.length === 0) break;

      const { error: delErr } = await supabase.storage.from('agreements').remove(paths);
      if (delErr) { console.warn(`[purge] remove batch: ${delErr.message}`); break; }
      totalDeleted += paths.length;
      process.stdout.write(`[purge] removed ${paths.length} files from ${prefix} (total ${totalDeleted})\n`);
      if (list.length < 100) break;
    }
  }
  console.log(`[purge] done — ${totalDeleted} storage objects removed`);
}

(async () => {
  try {
    if (RUN_PURGE) await phasePurge();
    if (RUN_LOGIN) await phaseLogin();
    if (RUN_SCRAPE) await phaseScrape();
    if (RUN_UPLOAD) await phaseUpload();
  } catch (e) {
    console.error('FATAL:', e.message);
    process.exit(1);
  }
})();
