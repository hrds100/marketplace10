#!/usr/bin/env node
/* eslint-disable no-console */
// bp-pdf-scraper — three-phase tool to grab BP PDFs past the 223-record API cap.
//
//   node scrape.mjs --login    Open BP, you log in once, session saved to state.json
//   node scrape.mjs --scrape   Iterate ids.json, download each PDF to ./pdfs/<view_id>.pdf
//   node scrape.mjs --upload   Push ./pdfs/* into Supabase Storage + upsert agreement rows
//
//   node scrape.mjs --login --scrape --upload    (do it all in one go)
//
// First-time setup:
//   cd scripts/bp-pdf-scraper
//   npm install
//   npx playwright install chromium
//   cp .env.example .env   # fill SUPABASE_* + (optional) BP_LOGIN_URL
//   node scrape.mjs --login

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
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
const BP_LOGIN_URL = process.env.BP_LOGIN_URL || 'https://betterproposals.io/login';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = new Set(process.argv.slice(2));
const RUN_LOGIN = args.has('--login');
const RUN_SCRAPE = args.has('--scrape');
const RUN_UPLOAD = args.has('--upload');

if (!RUN_LOGIN && !RUN_SCRAPE && !RUN_UPLOAD) {
  console.log('Usage:  node scrape.mjs --login | --scrape | --upload  (combinable)');
  process.exit(0);
}

// -----------------------------------------------------------------------------
// Phase 1: LOGIN — open BP in a real browser, you log in once, save state.json
// -----------------------------------------------------------------------------
async function phaseLogin() {
  console.log('[login] opening BP login page in a visible browser...');
  console.log('[login] log in normally. Once you see the BP dashboard, come back here and press Enter.');
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BP_LOGIN_URL);

  // Wait for Enter from stdin
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

// -----------------------------------------------------------------------------
// Phase 2: SCRAPE — iterate ids.json, save each PDF to ./pdfs/<view_id>.pdf
// -----------------------------------------------------------------------------
async function phaseScrape() {
  if (!existsSync(STATE_PATH)) throw new Error('Run --login first (no state.json)');
  if (!existsSync(IDS_PATH)) throw new Error(`Missing ${IDS_PATH}`);
  mkdirSync(PDFS_DIR, { recursive: true });

  const ids = JSON.parse(readFileSync(IDS_PATH, 'utf8'));
  const tasks = [];
  for (const [status, list] of Object.entries(ids)) {
    if (status.startsWith('_') || !Array.isArray(list)) continue;
    for (const id of list) tasks.push({ status, id: String(id) });
  }
  console.log(`[scrape] ${tasks.length} view_ids to download`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: STATE_PATH,
    acceptDownloads: true,
  });

  let ok = 0, fail = 0, skipped = 0;
  for (const t of tasks) {
    const out = join(PDFS_DIR, `${t.id}.pdf`);
    if (existsSync(out) && statSync(out).size > 1024) {
      skipped++;
      continue;
    }
    try {
      const page = await ctx.newPage();
      // 1. try /2/proposals/edit?id=N — has a "Download PDF" action in the toolbar
      await page.goto(`https://betterproposals.io/2/proposals/edit?id=${t.id}`, { timeout: 30_000, waitUntil: 'domcontentloaded' });

      // Look for a Download / PDF link
      let pdfBuffer = null;

      // Strategy A: search the page for any anchor / button that triggers a PDF download
      const downloadPromise = page.waitForEvent('download', { timeout: 5_000 }).catch(() => null);
      const triggered = await page.evaluate(() => {
        const cand = [...document.querySelectorAll('a,button')].find((el) => /download.*pdf|pdf.*download|export.*pdf/i.test((el.textContent || '') + ' ' + (el.getAttribute('href') || '')));
        if (cand) { cand.click(); return true; }
        return false;
      });
      if (triggered) {
        const dl = await downloadPromise;
        if (dl) { pdfBuffer = await dl.createReadStream().then(streamToBuffer); }
      }

      // Strategy B: render the page itself to PDF (Playwright built-in)
      if (!pdfBuffer) {
        // Navigate to the recipient-view page if present
        try {
          await page.goto(`https://betterproposals.io/2/proposals/view?id=${t.id}`, { timeout: 30_000, waitUntil: 'networkidle' });
        } catch { /* fall through */ }
        await page.emulateMedia({ media: 'print' });
        pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
      }

      if (pdfBuffer && pdfBuffer.length > 1024) {
        writeFileSync(out, pdfBuffer);
        ok++;
        process.stdout.write(`✓ ${t.id} (${(pdfBuffer.length / 1024).toFixed(0)} KB)\n`);
      } else {
        fail++;
        process.stdout.write(`✗ ${t.id} (empty)\n`);
      }
      await page.close();
    } catch (e) {
      fail++;
      process.stdout.write(`✗ ${t.id}: ${e.message}\n`);
    }
  }
  console.log(`[scrape] done: ${ok} ok, ${skipped} skipped (already on disk), ${fail} failed`);
  await browser.close();
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// -----------------------------------------------------------------------------
// Phase 3: UPLOAD — push ./pdfs/* to Supabase Storage + upsert agreement rows
// -----------------------------------------------------------------------------
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

  let uploaded = 0, dbUpdated = 0, errors = 0;
  for (const f of files) {
    const viewId = f.replace(/\.pdf$/, '');
    if (!/^\d+$/.test(viewId)) continue;
    const localPath = join(PDFS_DIR, f);
    const size = statSync(localPath).size;
    if (size < 1024) { console.log(`✗ ${viewId} skipped (size ${size})`); continue; }
    const bytes = readFileSync(localPath);

    // Two row identifiers: one for proposal-bp_id matches (if exists), one for quote-based
    // First try to find existing row by QuoteID
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
    if (upErr) {
      console.log(`✗ ${viewId} storage: ${upErr.message}`);
      errors++;
      continue;
    }
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
    if (dbErr) {
      console.log(`✗ ${viewId} db: ${dbErr.message}`);
      errors++;
      continue;
    }
    dbUpdated++;
    process.stdout.write(`✓ ${viewId} → ${targetBpId} (${(size / 1024).toFixed(0)} KB)\n`);
  }
  console.log(`[upload] ${uploaded} files in Storage · ${dbUpdated} rows updated · ${errors} errors`);
}

// -----------------------------------------------------------------------------

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
