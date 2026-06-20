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
const RUN_REPORT = has('--report');
const RUN_ENRICH = has('--enrich');
const RUN_API_FIX = has('--api-fix');
const RUN_API_PROBE = valOf('--api-probe', null) !== null;
const FORCE = has('--force');
const DEBUG = has('--debug');
const LIMIT = parseInt(valOf('--limit', '0'), 10) || 0;
const STATUS_FILTER = valOf('--status', null);  // process only this bucket

if (!RUN_LOGIN && !RUN_SCRAPE && !RUN_UPLOAD && !RUN_PURGE && !RUN_REPORT && !RUN_ENRICH && !RUN_API_FIX && !RUN_API_PROBE) {
  console.log('Usage: node scrape.mjs --login | --scrape | --enrich | --upload | --api-fix | --api-probe=ID | --purge | --report  [--force] [--debug] [--limit=N] [--status=outstanding]');
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
    if (STATUS_FILTER && status !== STATUS_FILTER) continue;
    for (const id of list) tasks.push({ status, id: String(id) });
  }
  if (LIMIT > 0) tasks = tasks.slice(0, LIMIT);
  console.log(`[scrape] ${tasks.length} view_ids to process${DEBUG ? ' (DEBUG headed mode)' : ''}${FORCE ? ' (FORCE re-download)' : ''}`);

  const browser = await chromium.launch({ headless: !DEBUG, slowMo: DEBUG ? 250 : 0 });
  const ctx = await browser.newContext({ storageState: STATE_PATH, acceptDownloads: true });

  // Pre-flight: make sure the session still works before churning through
  // hundreds of IDs. Hit the dashboard — if BP redirects to /login, the
  // session expired and every iteration would fail the same way.
  {
    const p = await ctx.newPage();
    try {
      await p.goto('https://betterproposals.io/2/proposals/', { timeout: 30_000, waitUntil: 'domcontentloaded' });
      const u = p.url();
      if (/\/login|\/signin|\/auth/i.test(u)) {
        await browser.close();
        throw new Error(`Session expired — BP redirected to ${u}. Run \`node scrape.mjs --login\` to refresh.`);
      }
    } finally {
      await p.close().catch(() => {});
    }
  }

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
      // Filename: `<view_id>_<doc name>.pdf`. The id prefix guarantees
      // uniqueness even when two proposals share the same company name.
      const namepart = safeFilename(result.docName, t.id);
      const filename = `${t.id}_${namepart}.pdf`;
      const out = join(PDFS_DIR, filename);
      writeFileSync(out, result.pdf);
      manifest[t.id] = {
        filename,
        docName: result.docName ?? null,
        status: t.status,
        meta: result.meta ?? null,
      };
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

// Pull docName / subtitle / docType / activityLog / dates / amount / etc from
// the BP Activity page (assumes page is already navigated to /view?id=N).
// Pure in-browser scrape — does not touch the network.
async function scrapeActivityPageMeta(page) {
  return await page.evaluate(() => {
    const stripPrefix = (s) => (s || '').replace(/^\s*Document\s+for\s+/i, '').trim();
    const text = (sel) => { const el = document.querySelector(sel); return el ? (el.textContent || '').trim() : null; };
    const findByLabel = (labelRegex) => {
      const labels = document.querySelectorAll('label, dt, .label, [class*="label" i], strong, b, span');
      for (const l of labels) {
        if (labelRegex.test(l.textContent || '')) {
          const next = l.nextElementSibling;
          if (next?.textContent?.trim()) return next.textContent.trim();
          const parent = l.parentElement;
          const sibText = (parent?.textContent || '').replace(l.textContent || '', '').trim();
          if (sibText) return sibText;
        }
      }
      return null;
    };
    const findEmail = () => {
      const m = (document.body.innerText || '').match(/[\w.+\-]+@[\w\-]+\.[\w.\-]+/);
      return m ? m[0] : null;
    };
    const findMoney = () => {
      const m = (document.body.innerText || '').match(/([£$€])\s?([0-9][0-9,]*(?:\.\d{2})?)/);
      return m ? `${m[1]}${m[2]}` : null;
    };
    const findDate = (labelRegex) => {
      const v = findByLabel(labelRegex);
      if (!v) return null;
      return v.replace(/(\d+)(st|nd|rd|th)/g, '$1').trim();
    };

    const h1 = document.querySelector('h1');
    const rawDocName = stripPrefix(h1?.textContent || document.title);
    // Reject BP error pages — they hijack the H1 and would become the row title.
    const isErrorPage = /^(403\b|404\b|500\b|access\s+denied|forbidden|not\s+found|page\s+not\s+found|page\s+unavailable|login|sign\s*in|unauthori[sz]ed|server\s+error)/i.test(rawDocName);
    const docName = isErrorPage ? null : rawDocName;

    const subtitle = (() => {
      if (!h1 || isErrorPage) return null;
      let n = h1.nextElementSibling;
      while (n) {
        const t = (n.textContent || '').trim();
        if (t && t.length < 400 && !/preview document|edit document|send document|options/i.test(t)) return t;
        n = n.nextElementSibling;
      }
      return null;
    })();

    const docType = (() => {
      const known = /^(Proposals?|Agreements?|Contracts?|Brochures?|Quotes?|Sign\s*offs?|Job\s*Offers?|Statements?\s*of\s*Work)$/i;
      const el = [...document.querySelectorAll('span, div, button, a, strong, em')]
        .find((e) => known.test((e.textContent || '').trim()));
      return el ? el.textContent.trim() : null;
    })();

    const activityLog = (() => {
      // BP's actual activity row phrases (from /view DOM):
      //   "Sent by You"
      //   "Email opened by <name>"
      //   "Read by <name> for HH:MM:SS on <device>"
      //   "Accepted and Signed by <name>"
      //   "Document Created"
      //   "PDF downloaded …" / "Document downloaded …"
      const dateRe = /(\d{1,2}\s*(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}(?:\s+at\s+[\d:]+)?)/i;
      const actionPhraseRe = /(Email\s+opened|Document\s+opened|Accepted\s+and\s+Signed|Sent\s+by|Opened\s+by|Read\s+by|Signed\s+by|Resent\s+by|Viewed\s+by|Forwarded\s+by|Downloaded|PDF\s+downloaded|Document\s+downloaded|Marked\s+\w+|Document\s+Created|Created)/i;

      // Find the Document Activity panel — smallest container whose text
      // contains the heading AND is < 8KB (rules out body/main).
      const all = [...document.querySelectorAll('div, section, aside, article')];
      const candidates = all.filter((e) => /document\s+activity/i.test(e.textContent || '') && e.textContent.length < 8000);
      const panel = candidates.reduce((sm, e) => (!sm || (e.textContent || '').length < (sm.textContent || '').length) ? e : sm, null);
      if (!panel) return [];

      const items = [];
      const seen = new Set();
      const push = (action, date) => {
        const niceAction = action.replace(/\s+/g, ' ').trim();
        const niceDate = date ? date.replace(/(\d+)(st|nd|rd|th)/g, '$1').replace(/\s+/g, ' ').trim() : null;
        const k = `${niceAction.toLowerCase()}|${niceDate || ''}`;
        if (seen.has(k)) return;
        seen.add(k);
        items.push({ action: niceAction, date: niceDate });
      };

      // Walk panel descendants. For each element, look for an action phrase.
      // We want the CLOSEST element holding the phrase + date (so we don't
      // gulp too much surrounding content).
      const rows = [...panel.querySelectorAll('div, li, p, span')];
      for (const row of rows) {
        const txt = (row.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt || txt.length > 600) continue;
        const am = txt.match(actionPhraseRe);
        if (!am) continue;
        const dm = txt.match(dateRe);
        // Action = phrase + optional "by <name>" tail, capped at 80 chars
        const startIdx = am.index;
        const endIdx = dm ? dm.index : Math.min(startIdx + 80, txt.length);
        const actionPart = txt.slice(startIdx, endIdx).trim().replace(/\bon$/i, '').trim();
        if (!actionPart) continue;
        push(actionPart, dm ? dm[1] : null);
      }

      return items.slice(0, 50);
    })();

    return {
      docName: docName || null,
      subtitle: subtitle || null,
      docType: docType || null,
      activityLog,
      dateCreated: findDate(/created|date created/i),
      dateSent: findDate(/sent|date sent/i),
      dateSigned: findDate(/signed|accepted|date signed/i),
      recipientEmail: findEmail(),
      recipient: findByLabel(/recipient|to|prospect|client/i),
      sender: findByLabel(/from|sender|owner|author/i),
      amount: findMoney(),
      status: findByLabel(/status|state/i),
    };
  }).catch(() => ({ docName: null, subtitle: null, docType: null, activityLog: [] }));
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

    const meta = await scrapeActivityPageMeta(page);
    if (DEBUG) console.log(`  [debug] ${viewId} meta = ${JSON.stringify(meta)}`);
    const docName = meta.docName;

    /* OLD INLINE EXTRACTION — replaced by scrapeActivityPageMeta() helper.
       Kept commented for the diff:
    const meta = await page.evaluate(() => {
      const stripPrefix = (s) => (s || '').replace(/^\s*Document\s+for\s+/i, '').trim();
      const text = (sel) => {
        const el = document.querySelector(sel);
        return el ? (el.textContent || '').trim() : null;
      };
      const findByLabel = (labelRegex) => {
        const labels = document.querySelectorAll('label, dt, .label, [class*="label" i], strong, b, span');
        for (const l of labels) {
          if (labelRegex.test(l.textContent || '')) {
            const next = l.nextElementSibling;
            if (next?.textContent?.trim()) return next.textContent.trim();
            const parent = l.parentElement;
            const sibText = (parent?.textContent || '').replace(l.textContent || '', '').trim();
            if (sibText) return sibText;
          }
        }
        return null;
      };
      const findEmail = () => {
        const m = (document.body.innerText || '').match(/[\w.+\-]+@[\w\-]+\.[\w.\-]+/);
        return m ? m[0] : null;
      };
      const findMoney = () => {
        const m = (document.body.innerText || '').match(/([£$€])\s?([0-9][0-9,]*(?:\.\d{2})?)/);
        return m ? `${m[1]}${m[2]}` : null;
      };
      const findDate = (labelRegex) => {
        const v = findByLabel(labelRegex);
        if (!v) return null;
        // Strip ordinals and trim
        return v.replace(/(\d+)(st|nd|rd|th)/g, '$1').trim();
      };

      const h1 = document.querySelector('h1');
      const docName = stripPrefix(h1?.textContent || document.title);

      // Subtitle / description — usually the line right after the H1.
      // BP shows "Duplicated from X - Duplicated from Y" or similar.
      const subtitle = (() => {
        if (!h1) return null;
        let n = h1.nextElementSibling;
        while (n) {
          const t = (n.textContent || '').trim();
          if (t && t.length < 400 && !/preview document|edit document|send document|options/i.test(t)) return t;
          n = n.nextElementSibling;
        }
        return null;
      })();

      // Document type — BP shows a pill/badge somewhere near the title.
      // Look for any element whose text matches one of the known types.
      const docType = (() => {
        const known = /^(Proposals?|Agreements?|Contracts?|Brochures?|Quotes?|Sign\s*offs?|Job\s*Offers?|Statements?\s*of\s*Work)$/i;
        const el = [...document.querySelectorAll('span, div, button, a, strong, em')]
          .find((e) => known.test((e.textContent || '').trim()));
        return el ? el.textContent.trim() : null;
      })();

      // Activity log entries — each row in BP's "Document Activity" list
      // has a title (action) + a relative or absolute date.
      const activityLog = (() => {
        const items = [];
        // Pick the section that contains "Document Activity" text and walk
        // its child rows.
        const allEls = [...document.querySelectorAll('div, section, ul, ol')];
        const activitySection = allEls.find((e) => /document activity/i.test(e.textContent || '')) ;
        if (!activitySection) return [];
        // Heuristic: rows are flex/grid children with a title + a sibling timestamp.
        const rows = [...activitySection.querySelectorAll('li, [class*="activity" i] > *, [class*="row" i]')];
        for (const row of rows) {
          const txt = (row.textContent || '').replace(/\s+/g, ' ').trim();
          if (!txt || txt.length > 300) continue;
          // Try to split into action + date
          // BP typically shows: "PDF downloaded from the preview\n20th June 2026 at 13:29"
          const m = txt.match(/^(.+?)\s+(\d{1,2}\s*(st|nd|rd|th)?\s+\w+\s+\d{4}(?:\s+at\s+[\d:]+)?)\s*$/i);
          if (m) {
            items.push({ action: m[1].trim(), date: m[2].replace(/(\d+)(st|nd|rd|th)/g, '$1').trim() });
          } else if (/^[A-Z]/.test(txt) && txt.length < 200) {
            items.push({ action: txt, date: null });
          }
        }
        // Dedupe by exact match
        const seen = new Set();
        return items.filter((it) => {
          const k = `${it.action}|${it.date}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }).slice(0, 50);
      })();

      return {
        docName: docName || null,
        subtitle: subtitle || null,
        docType: docType || null,
        activityLog,
        dateCreated: findDate(/created|date created/i),
        dateSent: findDate(/sent|date sent/i),
        dateSigned: findDate(/signed|accepted|date signed/i),
        recipientEmail: findEmail(),
        recipient: findByLabel(/recipient|to|prospect|client/i),
        sender: findByLabel(/from|sender|owner|author/i),
        amount: findMoney(),
        status: findByLabel(/status|state/i),
      };
    }).catch(() => ({ docName: null }));
    END OLD INLINE */

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
    // BP preview URLs come in three known shapes:
    //   1. proposal.<account>.com/cover.php?ProposalID=...&ContactID=...
    //   2. proposal.<account>.com/index.php?ProposalID=...
    //   3. betterproposals.io/proposal/index?ProposalID=...    (no .php)
    // The PDF endpoint pattern differs per host — we try multiple
    // candidates and accept whichever returns application/pdf.
    if (!/ProposalID=/i.test(previewUrl)) {
      throw new Error(`Preview URL has no ProposalID: ${previewUrl}`);
    }

    const cleanUrl = previewUrl.replace(/&debug=yes/g, '');
    const appendPdfView = (u) => u + (u.includes('?') ? '&' : '?') + 'pdf-view=1';
    const pdfCandidates = [
      cleanUrl.replace(/\/(cover|index)\.php/, '/pdf-output.php'),                  // white-label .php hosts
      cleanUrl.replace(/\/proposal\/index(?=[?#]|$)/, '/proposal/pdf'),             // betterproposals.io path-style
      cleanUrl.replace(/\/proposal\/index(?=[?#]|$)/, '/proposal/pdf-output'),      // alt path-style
      cleanUrl.replace(/\/(cover|index)\.php/, '/pdf.php'),                         // some templates use pdf.php
    ]
      .filter((u, i, arr) => u && u !== cleanUrl && arr.indexOf(u) === i)           // unique + actually changed
      .map(appendPdfView);

    if (DEBUG) console.log(`  [debug] ${viewId} pdf candidates:\n    ${pdfCandidates.join('\n    ')}`);

    let body = null;
    let lastErr = null;
    for (const pdfUrl of pdfCandidates) {
      try {
        const resp = await ctx.request.get(pdfUrl, {
          timeout: 60_000,
          headers: { 'User-Agent': 'NFSTAY-bp-scraper/1.0' },
        });
        if (!resp.ok()) { lastErr = `HTTP ${resp.status()} on ${pdfUrl}`; continue; }
        const ct = resp.headers()['content-type'] || '';
        const buf = await resp.body();
        if (!ct.includes('pdf')) { lastErr = `CT=${ct} on ${pdfUrl}`; continue; }
        if (buf.length < 1024 || buf[0] !== 0x25 || buf[1] !== 0x50 || buf[2] !== 0x44 || buf[3] !== 0x46) {
          lastErr = `not PDF magic on ${pdfUrl}`;
          continue;
        }
        body = buf;
        if (DEBUG) console.log(`  [debug] ${viewId} got PDF from ${pdfUrl}`);
        break;
      } catch (e) {
        lastErr = `${e.message} on ${pdfUrl}`;
      }
    }

    // URL-derivation fallback didn't work — click a Download button on the page.
    if (!body) {
      const dlPromise = previewPage.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
      const dlSelectors = [
        'a:has-text("Download PDF")',
        'button:has-text("Download PDF")',
        'a:has-text("Download")',
        'button:has-text("Download")',
        '[aria-label*="download" i]',
      ];
      let clicked = false;
      for (const sel of dlSelectors) {
        const el = await previewPage.$(sel);
        if (el) {
          await el.scrollIntoViewIfNeeded().catch(() => {});
          await el.click({ timeout: 10_000 }).catch(() => {});
          clicked = true;
          break;
        }
      }
      if (clicked) {
        const dl = await dlPromise;
        if (dl) {
          const tmpPath = join(PDFS_DIR, `.${viewId}.download.pdf`);
          await dl.saveAs(tmpPath);
          try { body = readFileSync(tmpPath); } catch {}
          try { unlinkSync(tmpPath); } catch {}
        }
      }
    }

    if (!body || body.length < 1024) {
      throw new Error(`No PDF (last error: ${lastErr || 'unknown'})`);
    }

    if (!DEBUG) {
      await previewPage.close().catch(() => {});
      await page.close().catch(() => {});
    }
    return { pdf: body, docName, meta };
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
    if (STATUS_FILTER && status !== STATUS_FILTER) continue;
    for (const id of list) statusByVid.set(String(id), status);
  }

  // Manifest maps view_id → { filename, docName, status, meta }. Build tasks
  // from BOTH manifest entries (have docName + meta) and stray files on disk
  // (no manifest entry — we extract the view_id from filename).
  const manifest = loadManifest();
  const filesOnDisk = existsSync(PDFS_DIR)
    ? new Set(readdirSync(PDFS_DIR).filter((f) => f.endsWith('.pdf')))
    : new Set();

  const tasks = [];
  for (const [vid, entry] of Object.entries(manifest)) {
    if (STATUS_FILTER && entry?.status && entry.status !== STATUS_FILTER) continue;
    const filename = entry?.filename || null;
    const hasFile = filename && filesOnDisk.has(filename);
    tasks.push({
      viewId: vid,
      filename: hasFile ? filename : null,   // null = no local PDF, metadata-only push
      docName: entry?.docName ?? null,
      meta: entry?.meta || null,
    });
    if (hasFile) filesOnDisk.delete(filename);
  }
  for (const f of filesOnDisk) {
    // accepts "<id>_<name>.pdf" OR plain "<id>.pdf"
    const m = f.match(/^(\d+)(?:_.*)?\.pdf$/);
    if (!m) continue;
    if (STATUS_FILTER && statusByVid.get(m[1]) !== STATUS_FILTER) continue;
    tasks.push({ viewId: m[1], filename: f, docName: null, meta: null });
  }
  const withFile = tasks.filter((t) => t.filename).length;
  const metaOnly = tasks.length - withFile;
  console.log(`[upload] ${tasks.length} rows · ${withFile} with PDF · ${metaOnly} metadata-only`);

  let uploaded = 0; let dbUpdated = 0; let errors = 0; let skippedAlready = 0;
  for (const t of tasks) {
    let storagePath = null;
    let pdfSize = null;
    if (t.filename) {
      const localPath = join(PDFS_DIR, t.filename);
      pdfSize = statSync(localPath).size;
      if (pdfSize < 1024) { console.log(`✗ ${t.viewId} skipped (size ${pdfSize})`); continue; }

      const { data: existing0 } = await supabase
        .from('agreements')
        .select('id, bp_id, pdf_storage_path')
        .eq('source', 'bp_import')
        .or(`bp_quote_id.eq.${t.viewId},bp_id.eq.q-${t.viewId}`)
        .limit(1)
        .maybeSingle();
      const tmpBpId = existing0?.bp_id ?? `q-${t.viewId}`;

      // If Supabase already has a PDF for this row, skip the re-upload unless
      // --force is set. We still let the metadata update run below.
      if (!FORCE && existing0?.pdf_storage_path) {
        storagePath = existing0.pdf_storage_path;  // keep existing path on the row
        skippedAlready++;
      } else {
        const bytes = readFileSync(localPath);
        storagePath = `bp-import/pdf/${tmpBpId}.pdf`;
        const { error: upErr } = await supabase.storage
          .from('agreements')
          .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: true });
        if (upErr) { console.log(`✗ ${t.viewId} storage: ${upErr.message}`); errors++; continue; }
        uploaded++;
      }
    }

    const { data: existing } = await supabase
      .from('agreements')
      .select('id, bp_id, title, pdf_storage_path')
      .eq('source', 'bp_import')
      .or(`bp_quote_id.eq.${t.viewId},bp_id.eq.q-${t.viewId}`)
      .limit(1)
      .maybeSingle();

    const targetBpId = existing?.bp_id ?? `q-${t.viewId}`;

    const status = statusByVid.get(t.viewId) || 'accepted';
    const meta = t.meta || {};
    const parseLooseDate = (s) => {
      if (!s) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };
    const parseMoney = (s) => {
      if (!s) return null;
      const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
      return Number.isFinite(n) ? n : null;
    };
    const inferCurrency = (s) => {
      if (!s) return null;
      if (/£/.test(s)) return 'GBP';
      if (/\$/.test(s)) return 'USD';
      if (/€/.test(s)) return 'EUR';
      return null;
    };

    const update = {
      source: 'bp_import',
      bp_id: targetBpId,
      bp_quote_id: t.viewId,
      status,
      imported_at: new Date().toISOString(),
      token: `bp-q-${t.viewId}`,
      type: 'investor',
    };
    // Only set pdf_storage_path when we just uploaded a file. For metadata-only
    // pushes, preserve whatever's already on the row (don't blank out an
    // existing PDF reference).
    if (storagePath) update.pdf_storage_path = storagePath;
    // Title — doc name if we scraped one, else generic
    if (t.docName) update.title = t.docName;
    else if (!existing) update.title = `Quote ${t.viewId}`;

    // Metadata harvested from the BP Activity page
    const dateCreated = parseLooseDate(meta.dateCreated);
    const dateSent = parseLooseDate(meta.dateSent);
    const dateSigned = parseLooseDate(meta.dateSigned);
    if (dateCreated) update.bp_date_created = dateCreated;
    if (dateSent) update.date_sent = dateSent;
    if (dateSigned) update.signed_at = dateSigned;
    if (meta.recipientEmail) update.recipient_email = meta.recipientEmail;
    if (meta.recipient) update.recipient_name = meta.recipient;
    if (meta.sender) update.signer_name = meta.sender;
    const amt = parseMoney(meta.amount);
    if (amt !== null) update.amount = amt;
    const cur = inferCurrency(meta.amount);
    if (cur) update.currency = cur;

    // Subtitle ("Duplicated from..." line) → description column
    if (meta.subtitle) update.description = meta.subtitle;

    // Document type → bp_type_name + bp_type_id
    if (meta.docType) {
      update.bp_type_name = meta.docType;
      const typeMap = {
        proposal: 1, proposals: 1,
        quote: 2, quotes: 2,
        brochure: 3, brochures: 3,
        'statement of work': 4, 'statements of work': 4,
        contract: 5, contracts: 5,
        'sign off': 6, 'sign offs': 6, signoff: 6, signoffs: 6,
        'job offer': 7, 'job offers': 7,
        agreement: 7200, agreements: 7200,
      };
      const k = meta.docType.toLowerCase().replace(/\s+/g, ' ').trim();
      if (typeMap[k]) update.bp_type_id = typeMap[k];
    }

    // Activity log → store in bp_raw under activityLog (jsonb)
    if (meta.activityLog && meta.activityLog.length > 0) {
      const raw = (typeof update.bp_raw === 'object' && update.bp_raw !== null) ? update.bp_raw : {};
      update.bp_raw = { ...raw, _scraper: 'bp-pdf-scraper', activityLog: meta.activityLog };
    }

    // Defaults for brand-new rows that didn't get any of the above
    if (!existing) {
      if (update.currency == null) update.currency = 'GBP';
      if (update.amount == null) update.amount = 0;
    }

    const { error: dbErr } = await supabase
      .from('agreements')
      .upsert(update, { onConflict: 'bp_id' });
    if (dbErr) { console.log(`✗ ${t.viewId} db: ${dbErr.message}`); errors++; continue; }
    dbUpdated++;
    const label = t.docName ? `"${t.docName.slice(0, 40)}"` : t.viewId;
    const sizeLabel = pdfSize !== null ? `${(pdfSize / 1024).toFixed(0)} KB` : 'meta';
    process.stdout.write(`✓ ${t.viewId} → ${label} (${sizeLabel})\n`);
  }
  console.log(`[upload] ${uploaded} files in Storage · ${skippedAlready} already-in-storage skipped · ${dbUpdated} rows updated · ${errors} errors`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ENRICH — visit each view_id and refresh the manifest's meta (subtitle,
// doc type, activity log, etc.) WITHOUT downloading the PDF. Useful after
// upgrading the scraper to extract more fields — re-run --enrich, then
// --upload, no need to re-download 128 PDFs.
// ─────────────────────────────────────────────────────────────────────────────
async function phaseEnrich() {
  if (!existsSync(STATE_PATH)) throw new Error('Run --login first (no state.json)');
  if (!existsSync(IDS_PATH)) throw new Error(`Missing ${IDS_PATH}`);
  mkdirSync(PDFS_DIR, { recursive: true });
  if (DEBUG) mkdirSync(DEBUG_DIR, { recursive: true });

  const ids = JSON.parse(readFileSync(IDS_PATH, 'utf8'));
  let tasks = [];
  for (const [status, list] of Object.entries(ids)) {
    if (status.startsWith('_') || !Array.isArray(list)) continue;
    if (STATUS_FILTER && status !== STATUS_FILTER) continue;
    for (const id of list) tasks.push({ status, id: String(id) });
  }
  if (LIMIT > 0) tasks = tasks.slice(0, LIMIT);
  console.log(`[enrich] ${tasks.length} view_ids to refresh meta on${DEBUG ? ' (DEBUG)' : ''}`);

  const browser = await chromium.launch({ headless: !DEBUG, slowMo: DEBUG ? 100 : 0 });
  const ctx = await browser.newContext({ storageState: STATE_PATH });

  const manifest = loadManifest();
  let ok = 0; let fail = 0;
  for (const t of tasks) {
    try {
      const page = await ctx.newPage();
      const viewUrl = `https://betterproposals.io/2/proposals/view?id=${t.id}`;
      await page.goto(viewUrl, { timeout: 45_000, waitUntil: 'networkidle' });
      // Wait for the activity panel to appear — up to 6s. Fail-soft if not found.
      await page.waitForFunction(
        () => /document\s+activity/i.test(document.body.innerText || ''),
        { timeout: 6_000 },
      ).catch(() => {});
      if (DEBUG) {
        const html = await page.content();
        writeFileSync(join(DEBUG_DIR, `enrich-${t.id}.html`), html);
        await page.screenshot({ path: join(DEBUG_DIR, `enrich-${t.id}.png`), fullPage: true }).catch(() => {});
      }
      // BP redirects /2/proposals/view?id=N → /2/<doctype>/view?id=N for non-
      // proposal records (agreements, contracts, brochures, etc). Read the
      // doctype off the final URL — that's far more reliable than scraping
      // the DOM for a "Proposals" pill that may not exist.
      const finalUrl = page.url();
      const urlMatch = finalUrl.match(/\/2\/([a-z-]+)\/view/i);
      const urlSegment = urlMatch ? urlMatch[1].toLowerCase() : null;
      const docTypeFromUrl = urlSegment === 'proposals'   ? 'Proposals'
        : urlSegment === 'agreements'  ? 'Agreement'
        : urlSegment === 'contracts'   ? 'Contracts'
        : urlSegment === 'brochures'   ? 'Brochures'
        : urlSegment === 'quotes'      ? 'Quotes'
        : urlSegment === 'signoffs' || urlSegment === 'sign-offs' ? 'Sign Offs'
        : urlSegment === 'joboffers' || urlSegment === 'job-offers' ? 'Job Offers'
        : null;
      const meta = await scrapeActivityPageMeta(page);
      if (docTypeFromUrl) meta.docType = docTypeFromUrl;
      const existing = manifest[t.id] || {};
      manifest[t.id] = { ...existing, status: t.status, docName: meta.docName ?? existing.docName ?? null, meta };
      saveManifest(manifest);
      ok++;
      process.stdout.write(`✓ ${t.id} meta refreshed (docType=${meta.docType || '—'}, ${meta.activityLog?.length || 0} activity items)\n`);
      if (!DEBUG) await page.close().catch(() => {});
    } catch (e) {
      fail++;
      process.stdout.write(`✗ ${t.id}: ${e.message}\n`);
    }
  }
  console.log(`[enrich] done: ${ok} ok, ${fail} failed`);
  // Always close the browser at end. Debug HTML+PNG are already saved to disk;
  // leaving Chromium open just hangs the terminal.
  await browser.close().catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT — show which ids from ids.json don't have a matching PDF/manifest
// entry. Useful after a partial scrape to see what still needs retrying.
// ─────────────────────────────────────────────────────────────────────────────
async function phaseReport() {
  if (!existsSync(IDS_PATH)) throw new Error(`Missing ${IDS_PATH}`);
  const ids = JSON.parse(readFileSync(IDS_PATH, 'utf8'));
  const manifest = loadManifest();
  const filesOnDisk = existsSync(PDFS_DIR)
    ? readdirSync(PDFS_DIR).filter((f) => f.endsWith('.pdf'))
    : [];

  // A view_id counts as "done" if we have a manifest entry whose filename
  // exists on disk, OR if there's a numeric file `<id>.pdf` / `<id>_*.pdf`.
  const fileViewIds = new Set();
  for (const f of filesOnDisk) {
    const m = f.match(/^(\d+)(?:_.*)?\.pdf$/);
    if (m) fileViewIds.add(m[1]);
  }
  const isDone = (vid) => {
    const m = manifest[vid];
    if (m?.filename && filesOnDisk.includes(m.filename)) return true;
    return fileViewIds.has(vid);
  };

  let totalExpected = 0;
  let totalDone = 0;
  const failedByStatus = {};
  for (const [status, list] of Object.entries(ids)) {
    if (status.startsWith('_') || !Array.isArray(list)) continue;
    if (STATUS_FILTER && status !== STATUS_FILTER) continue;
    const missing = list.filter((id) => !isDone(String(id)));
    totalExpected += list.length;
    totalDone += list.length - missing.length;
    if (missing.length > 0) failedByStatus[status] = missing;
    console.log(`[report] ${status.padEnd(12)} ${list.length - missing.length}/${list.length} done${missing.length ? `  →  ${missing.length} missing` : ''}`);
  }
  console.log(`[report] TOTAL ${totalDone}/${totalExpected} done`);

  const totalMissing = totalExpected - totalDone;
  if (totalMissing === 0) {
    console.log('[report] all ids accounted for.');
    return;
  }

  console.log(`\n[report] missing ids:`);
  for (const [status, list] of Object.entries(failedByStatus)) {
    console.log(`\n--- ${status} (${list.length}) ---`);
    console.log(list.join('\n'));
  }

  const reportPath = join(PDFS_DIR, '_failed.json');
  mkdirSync(PDFS_DIR, { recursive: true });
  writeFileSync(reportPath, JSON.stringify(failedByStatus, null, 2));
  console.log(`\n[report] written to ${reportPath} — you can paste from here into ids.json or feed to --scrape`);
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

// ─────────────────────────────────────────────────────────────────────────────
// API FIX — pull clean metadata for every existing DB row directly from BP's
// REST API. Screen-scraping admin pages misses dates, company, all recipients,
// and doctype because BP's DOM is heavy and inconsistent. The API returns
// structured data: DateSent, DateAccepted, CompanyName, Contacts[] (all emails),
// TypeID, etc. This phase updates DB rows in place WITHOUT touching:
//   - pdf_storage_path (PDFs are already in Storage)
//   - status           (set by ids.json bucket)
//   - title fallback   (only overrides if API has SubjectLine or CompanyName)
//
// Required env: BP_API_KEY (paste in scripts/bp-pdf-scraper/.env)
// ─────────────────────────────────────────────────────────────────────────────
async function phaseApiFix() {
  const BP_API_KEY = process.env.BP_API_KEY;
  if (!BP_API_KEY) throw new Error('BP_API_KEY missing. Add to scripts/bp-pdf-scraper/.env');
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const bpGet = async (path) => {
    const url = `https://api.betterproposals.io${path}`;
    const r = await fetch(url, { headers: { Bptoken: BP_API_KEY, Accept: 'application/json' } });
    if (r.status === 401 || r.status === 403) {
      throw new Error(`BP API ${r.status} on ${path} — bad/expired BP_API_KEY`);
    }
    if (r.status === 404) return { _404: true };
    if (!r.ok) return { _err: r.status };
    return r.json();
  };

  const bpDate = (s) => {
    if (!s) return null;
    // BP returns "YYYY-MM-DD HH:MM:SS" — convert to ISO assuming UTC.
    const t = String(s).trim();
    if (!t || t === '0000-00-00 00:00:00' || t === '0000-00-00') return null;
    const iso = t.includes('T') ? t : t.replace(' ', 'T') + 'Z';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };
  const bpNum = (n) => { const x = parseFloat(n); return Number.isFinite(x) ? x : null; };

  // Fetch every BP-imported row's bp_quote_id (the BP view ID we scraped from).
  const { data: rows, error: selErr } = await supabase
    .from('agreements')
    .select('id, bp_id, bp_quote_id, title, pdf_storage_path, bp_raw')
    .eq('source', 'bp_import');
  if (selErr) throw new Error(`Supabase select failed: ${selErr.message}`);
  if (!rows || rows.length === 0) {
    console.log('[api-fix] no bp_import rows in DB. Nothing to do.');
    return;
  }

  const limited = LIMIT > 0 ? rows.slice(0, LIMIT) : rows;
  console.log(`[api-fix] ${limited.length} rows to refresh from BP API`);

  let ok = 0, proposalHits = 0, quoteHits = 0, miss = 0, errs = 0;
  for (let i = 0; i < limited.length; i++) {
    const row = limited[i];
    const vid = row.bp_quote_id;
    if (!vid) { miss++; continue; }
    try {
      // /proposal/{id} first — full metadata
      let kind = 'proposal';
      let res = await bpGet(`/proposal/${vid}`);
      if (res?._404 || res?._err) {
        // Fallback: /quote/{id} — works for older / deleted-proposal records
        kind = 'quote';
        res = await bpGet(`/quote/${vid}`);
      }
      if (res?._404 || res?._err) { miss++; process.stdout.write(`✗ ${vid} not in BP\n`); continue; }

      const p = res?.data || res;  // BP wraps in {data: ...}
      const update = { imported_at: new Date().toISOString() };

      if (kind === 'proposal') {
        proposalHits++;
        // Title — only overwrite if API has SubjectLine or CompanyName.
        // Don't clobber our "Proposal #X" fallbacks unless we have something real.
        const apiTitle = p.SubjectLine || p.CompanyName;
        if (apiTitle) update.title = apiTitle;

        // ALL recipient emails — join with comma; recipient_name = first contact's full name
        const contacts = Array.isArray(p.Contacts) ? p.Contacts : [];
        const emails = contacts.map((c) => c?.Email).filter((e) => e && /@/.test(e));
        if (emails.length > 0) update.recipient_email = [...new Set(emails)].join(', ');
        if (contacts.length > 0) {
          const c0 = contacts[0];
          const fullName = `${c0.FirstName ?? ''} ${c0.Surname ?? ''}`.trim();
          if (fullName) update.recipient_name = fullName;
        }

        // Signer info
        if (p.SignedEmail) update.signer_email = p.SignedEmail;
        const sName = p.SignedName || `${p.SignedFirstName ?? ''} ${p.SignedSurname ?? ''}`.trim();
        if (sName) update.signer_name = sName;

        // Dates
        const dateSent = bpDate(p.DateSent);
        if (dateSent) update.date_sent = dateSent;
        const dateCreated = bpDate(p.DateCreated);
        if (dateCreated) update.bp_date_created = dateCreated;
        const dateEdited = bpDate(p.DateEdited);
        if (dateEdited) update.bp_date_edited = dateEdited;
        const signedAt = (() => {
          if (p.SignedDate && p.SignedTime) return bpDate(`${p.SignedDate} ${p.SignedTime}`);
          if (p.SignedDate) return bpDate(`${p.SignedDate} 00:00:00`);
          return null;
        })();
        if (signedAt) update.signed_at = signedAt;

        // Money
        const amt = bpNum(p.Amount);
        if (amt !== null) update.amount = amt;
        if (p.CurrencyCode) update.currency = p.CurrencyCode;

        // Company / subtitle
        if (p.CompanyName) update.company_name = p.CompanyName;
        if (p.SubjectLine) update.subject_line = p.SubjectLine;
        if (p.Description) update.description = p.Description;
        if (p.PersonalMessage) update.personal_message = p.PersonalMessage;

        // Doc type
        if (p.TypeID !== null && p.TypeID !== undefined) {
          const tid = Number(p.TypeID);
          if (Number.isFinite(tid)) {
            update.bp_type_id = tid;
            const typeNames = { 1: 'Proposals', 3: 'Brochures', 5: 'Contracts', 6: 'Sign Offs', 7: 'Job Offers', 7200: 'Agreement' };
            if (typeNames[tid]) update.bp_type_name = typeNames[tid];
          }
        }
        if (p.BrandID) update.bp_brand_id = String(p.BrandID);
        if (p.CompanyID) update.bp_company_id = String(p.CompanyID);

        // Preserve scraper activityLog inside bp_raw, merge API payload on top.
        const prevRaw = (typeof row.bp_raw === 'object' && row.bp_raw !== null) ? row.bp_raw : {};
        const activityLog = Array.isArray(prevRaw.activityLog) ? prevRaw.activityLog : undefined;
        update.bp_raw = activityLog ? { ...p, activityLog, _scraper: prevRaw._scraper } : p;
      } else {
        // Quote-only fallback — BP no longer has the full proposal, just the quote stub
        quoteHits++;
        const dateCreated = bpDate(p.DateCreated);
        if (dateCreated) {
          update.bp_date_created = dateCreated;
          update.date_sent = update.date_sent || dateCreated;  // best guess
        }
        const dateAccepted = bpDate(p.DateAccepted);
        const dateCompleted = bpDate(p.DateCompleted);
        if (dateAccepted || dateCompleted) update.signed_at = dateAccepted ?? dateCompleted;
        const amt = bpNum(p.QuoteAmount ?? p.QuoteTotal);
        if (amt !== null) update.amount = amt;
        if (p.CompanyID) {
          update.bp_company_id = String(p.CompanyID);
          // Fetch company name
          try {
            const cRes = await bpGet(`/company/${p.CompanyID}`);
            const c = cRes?.data || cRes;
            if (c?.CompanyName) {
              update.company_name = c.CompanyName;
              if (!update.title || /^Proposal #/.test(row.title)) update.title = c.CompanyName;
            }
          } catch { /* ignore */ }
        }
      }

      const { error: upErr } = await supabase
        .from('agreements')
        .update(update)
        .eq('id', row.id);
      if (upErr) { errs++; console.log(`✗ ${vid} db: ${upErr.message}`); continue; }
      ok++;
      if ((i + 1) % 25 === 0) process.stdout.write(`  ${i + 1}/${limited.length} done (${proposalHits} prop · ${quoteHits} quote · ${miss} miss · ${errs} err)\n`);
      // small delay to be nice to BP API
      await new Promise((r) => setTimeout(r, 80));
    } catch (e) {
      errs++;
      console.log(`✗ ${vid} ${e.message}`);
    }
  }
  console.log(`[api-fix] done: ${ok} updated · ${proposalHits} via /proposal · ${quoteHits} via /quote · ${miss} not in BP · ${errs} errors`);
}

// Probe BP API for a single ID — prints every field returned by /proposal/{id}
// and /quote/{id} so we can see what's actually available.
//   node scrape.mjs --api-probe=2589230
async function phaseApiProbe() {
  const BP_API_KEY = process.env.BP_API_KEY;
  if (!BP_API_KEY) throw new Error('BP_API_KEY missing. Add to scripts/bp-pdf-scraper/.env');
  const id = valOf('--api-probe', null);
  if (!id) throw new Error('Usage: --api-probe=ID');
  const tryEndpoint = async (path) => {
    const url = `https://api.betterproposals.io${path}`;
    const r = await fetch(url, { headers: { Bptoken: BP_API_KEY, Accept: 'application/json' } });
    const body = await r.text();
    console.log(`\n=== ${path} → HTTP ${r.status} ===`);
    if (body.length < 4000) {
      console.log(body);
    } else {
      try {
        const j = JSON.parse(body);
        console.log('keys:', Object.keys(j?.data ?? j).join(', '));
        console.log('sample:', JSON.stringify(j?.data ?? j, null, 2).slice(0, 3500));
      } catch {
        console.log(body.slice(0, 1500));
      }
    }
  };
  await tryEndpoint(`/proposal/${id}`);
  await tryEndpoint(`/quote/${id}`);
}

(async () => {
  try {
    if (RUN_REPORT) await phaseReport();
    if (RUN_PURGE) await phasePurge();
    if (RUN_LOGIN) await phaseLogin();
    if (RUN_SCRAPE) await phaseScrape();
    if (RUN_ENRICH) await phaseEnrich();
    if (RUN_UPLOAD) await phaseUpload();
    if (RUN_API_FIX) await phaseApiFix();
    if (RUN_API_PROBE) await phaseApiProbe();
  } catch (e) {
    console.error('FATAL:', e.message);
    process.exit(1);
  }
})();
