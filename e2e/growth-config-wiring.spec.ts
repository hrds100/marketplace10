/**
 * Growth config wiring — proves that admin config writes in growth_config
 * actually reach live visitors on https://nfstay.com/.
 *
 * The test writes directly to the growth_config table via the Supabase
 * Management API (service role). This mirrors what the admin UI POST to
 * growth-config edge function does, but skips the admin session so the
 * test has no auth dependency. RLS allows service_role writes.
 *
 * Required env:
 *   GROWTH_TEST_SERVICE_KEY  — Supabase service_role JWT for project asazddtvjvmckouxcmmo
 *
 * The test ALWAYS restores ab_weights=[50,50] and social_proof_enabled=true
 * in afterAll, including on failure, so the site never stays skewed.
 */
import { test, expect, request, type APIRequestContext } from '@playwright/test';

const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const REST_URL = `${SUPABASE_URL}/rest/v1/growth_config?id=eq.1`;

// Default base URL points at a local `vite preview` of dist/landing/
// because this test exercises the landing router + social-proof.js
// which change in this PR and are not yet deployed to nfstay.com.
// Once the PR is merged and Vercel rebuilds, set
//   GROWTH_TEST_BASE_URL=https://nfstay.com/
// to run the same test against live.
const LANDING_URL =
  (process.env.GROWTH_TEST_BASE_URL || 'http://localhost:4173/landing/').replace(
    /\/?$/,
    '/'
  );

const SERVICE_KEY = process.env.GROWTH_TEST_SERVICE_KEY || '';

async function patchConfig(
  api: APIRequestContext,
  patch: Record<string, unknown>
): Promise<void> {
  const res = await api.patch(REST_URL, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    data: patch,
  });
  if (!res.ok()) {
    throw new Error(`PATCH failed ${res.status()}: ${await res.text()}`);
  }
  const body = await res.json();
  if (!Array.isArray(body) || body.length !== 1) {
    throw new Error(`Unexpected PATCH response: ${JSON.stringify(body)}`);
  }
}

// Give Supabase edge caching (Cache-Control max-age=30) time to expire.
// The landing router hits the edge function directly, so after a PATCH
// we wait longer than the cache to guarantee a fresh read.
async function waitForCache(): Promise<void> {
  await new Promise((r) => setTimeout(r, 32_000));
}

test.describe('growth-config wiring (live nfstay.com)', () => {
  test.skip(!SERVICE_KEY, 'GROWTH_TEST_SERVICE_KEY env var not set');

  let api: APIRequestContext;

  test.beforeAll(async () => {
    api = await request.newContext();
  });

  test.afterAll(async () => {
    // Always restore safe defaults
    try {
      await patchConfig(api, {
        ab_enabled: true,
        ab_weights: [50, 50],
        social_proof_enabled: true,
        social_proof_interval_seconds: 30,
      });
    } catch (err) {
      console.error('afterAll restore failed:', err);
    }
    await api.dispose();
  });

  // The router sets cookie `nfs_ab` = 'a' | 'b'. That's the most reliable
  // signal because variant-a.html shares its <title> with the router shell.
  async function readAssignedVariant(
    browser: import('@playwright/test').Browser
  ): Promise<string> {
    const ctx = await browser.newContext();
    try {
      const page = await ctx.newPage();
      await page.goto(LANDING_URL, { waitUntil: 'domcontentloaded' });
      // Wait until the router has run and set the cookie.
      await page.waitForFunction(() => /(?:^|;\s*)nfs_ab=/.test(document.cookie), {
        timeout: 15_000,
      });
      const cookies = await ctx.cookies();
      const match = cookies.find((c) => c.name === 'nfs_ab');
      return match?.value || '';
    } finally {
      await ctx.close();
    }
  }

  test('force variant A — 5 fresh visitors all get cookie a', async ({ browser }) => {
    test.setTimeout(180_000);
    await patchConfig(api, { ab_weights: [100, 0], ab_enabled: true });
    await waitForCache();

    for (let i = 0; i < 5; i++) {
      const variant = await readAssignedVariant(browser);
      expect(variant, `visitor ${i} variant`).toBe('a');
    }
  });

  test('force variant B — 5 fresh visitors all get cookie b', async ({ browser }) => {
    test.setTimeout(180_000);
    await patchConfig(api, { ab_weights: [0, 100], ab_enabled: true });
    await waitForCache();

    for (let i = 0; i < 5; i++) {
      const variant = await readAssignedVariant(browser);
      expect(variant, `visitor ${i} variant`).toBe('b');
    }
  });

  test('social proof off — no toast within 10s', async ({ browser }) => {
    test.setTimeout(120_000);
    await patchConfig(api, { social_proof_enabled: false });
    await waitForCache();

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(LANDING_URL, { waitUntil: 'domcontentloaded' });
    // Wait 10 seconds, assert no toast element exists
    await page.waitForTimeout(10_000);
    const toastCount = await page.locator('#nfs-social-proof .nfs-sp-toast').count();
    expect(toastCount).toBe(0);
    await ctx.close();
  });

  test('social proof on @ 15s — toast appears within 20s', async ({ browser }) => {
    test.setTimeout(180_000);
    await patchConfig(api, {
      social_proof_enabled: true,
      social_proof_interval_seconds: 15,
    });
    await waitForCache();

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(LANDING_URL, { waitUntil: 'domcontentloaded' });
    // First toast fires ~5s after init; give it up to 20s total.
    await page.waitForSelector('#nfs-social-proof .nfs-sp-toast', { timeout: 20_000 });
    const toastCount = await page.locator('#nfs-social-proof .nfs-sp-toast').count();
    expect(toastCount).toBeGreaterThan(0);
    await ctx.close();
  });
});
