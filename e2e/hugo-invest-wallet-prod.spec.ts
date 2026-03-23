/**
 * Production check: hugodesouzax@gmail.com sees real wallet on Invest Marketplace (no mocks).
 *
 * Requires:
 *   export HUGO_E2E_PASSWORD='your Supabase email password'
 *
 * Run:
 *   HUGO_E2E_PASSWORD=... npx playwright test e2e/hugo-invest-wallet-prod.spec.ts --config=e2e/hub-playwright.config.ts
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = 'https://hub.nfstay.com';
const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';

const HUGO_EMAIL = 'hugodesouzax@gmail.com';

async function injectSession(page: Page, email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const tokens = await res.json();
  if (!tokens.access_token) {
    throw new Error(`Auth failed: ${JSON.stringify(tokens)}`);
  }
  const storageKey = 'sb-asazddtvjvmckouxcmmo-auth-token';
  const sessionData = JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: tokens.user,
  });
  await page.goto(BASE, { waitUntil: 'commit' });
  await page.evaluate(
    ([key, data]) => {
      localStorage.setItem(key, data);
    },
    [storageKey, sessionData]
  );
}

test.describe('Production — Hugo wallet on Invest Marketplace', () => {
  test('Receiving wallet shows a valid 0x address (real profile, no stub)', async ({ page }) => {
    const password = process.env.HUGO_E2E_PASSWORD;
    test.skip(!password, 'Set HUGO_E2E_PASSWORD to run this test against hub.nfstay.com');

    await injectSession(page, HUGO_EMAIL, password!);

    await page.goto(`${BASE}/dashboard/invest/marketplace`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    expect(page.url()).toContain('invest/marketplace');

    const walletEl = page.getByTestId('invest-receiving-wallet');
    await expect(walletEl).toBeVisible({ timeout: 35000 });

    const text = ((await walletEl.textContent()) ?? '').trim();
    expect(text).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(text.toLowerCase()).not.toBe('0x0000000000000000000000000000000000000000');
  });
});
