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
const FORCE = has('--force');
const DEBUG = has('--debug');
const LIMIT = parseInt(valOf('--limit', '0'), 10) || 0;

if (!RUN_LOGIN && !RUN_SCRAPE && !RUN_UPLOAD) {
  console.log('Usage: node scrape.mjs --login | --scrape | --upload  [--force] [--debug] [--limit=N]');
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

  let ok = 0; let fail = 0; let skipped = 0;
  for (const t of tasks) {
    const out = join(PDFS_DIR, `${t.id}.pdf`);
    if (!FORCE && existsSync(out) && statSync(out).size > 1024) {
      skipped++;
      continue;
    }

    try {
      const pdf = await fetchOnePdf(ctx, t.id);
      if (!pdf || pdf.length < 1024) {
        fail++;
        process.stdout.write(`✗ ${t.id} (empty)\n`);
        continue;
      }
      writeFileSync(out, pdf);
      ok++;
      process.stdout.write(`✓ ${t.id} (${(pdf.length / 1024).toFixed(0)} KB)\n`);
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
  // /view?id=N is the Document Activity page that has the "Preview document"
  // button. /edit?id=N is the editor — different page, no preview button there.
  const viewUrl = `https://betterproposals.io/2/proposals/view?id=${viewId}`;

  try {
    await page.goto(viewUrl, { timeout: 45_000, waitUntil: 'domcontentloaded' });
    if (DEBUG) await page.screenshot({ path: join(DEBUG_DIR, `${viewId}-1-activity.png`), fullPage: true });

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
    return body;
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

  const files = readdirSync(PDFS_DIR).filter((f) => f.endsWith('.pdf'));
  console.log(`[upload] ${files.length} PDFs to push`);

  let uploaded = 0; let dbUpdated = 0; let errors = 0;
  for (const f of files) {
    const viewId = f.replace(/\.pdf$/, '');
    if (!/^\d+$/.test(viewId)) continue;
    const localPath = join(PDFS_DIR, f);
    const size = statSync(localPath).size;
    if (size < 1024) { console.log(`✗ ${viewId} skipped (size ${size})`); continue; }
    const bytes = readFileSync(localPath);

    const { data: existing } = await supabase
      .from('agreements')
      .select('id, bp_id')
      .eq('source', 'bp_import')
      .or(`bp_quote_id.eq.${viewId},bp_id.eq.q-${viewId}`)
      .limit(1)
      .maybeSingle();

    const targetBpId = existing?.bp_id ?? `q-${viewId}`;
    const storagePath = `bp-import/pdf/${targetBpId}.pdf`;

    const { error: upErr } = await supabase.storage
      .from('agreements')
      .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: true });
    if (upErr) { console.log(`✗ ${viewId} storage: ${upErr.message}`); errors++; continue; }
    uploaded++;

    const status = statusByVid.get(viewId) || 'accepted';
    const update = {
      source: 'bp_import',
      bp_id: targetBpId,
      bp_quote_id: viewId,
      pdf_storage_path: storagePath,
      status,
      imported_at: new Date().toISOString(),
      token: `bp-q-${viewId}`,
      type: 'investor',
    };
    if (!existing) {
      update.title = `Quote ${viewId}`;
      update.currency = 'GBP';
      update.amount = 0;
    }

    const { error: dbErr } = await supabase
      .from('agreements')
      .upsert(update, { onConflict: 'bp_id' });
    if (dbErr) { console.log(`✗ ${viewId} db: ${dbErr.message}`); errors++; continue; }
    dbUpdated++;
    process.stdout.write(`✓ ${viewId} → ${targetBpId} (${(size / 1024).toFixed(0)} KB)\n`);
  }
  console.log(`[upload] ${uploaded} files in Storage · ${dbUpdated} rows updated · ${errors} errors`);
}

(async () => {
  try {
    if (RUN_LOGIN) await phaseLogin();
    if (RUN_SCRAPE) await phaseScrape();
    if (RUN_UPLOAD) await phaseUpload();
  } catch (e) {
    console.error('FATAL:', e.message);
    process.exit(1);
  }
})();
