/**
 * User portfolio: signed-in user must GET own inv_orders (PostgREST) without 403.
 * Pairs with e2e/admin-invest-orders-rls.spec.ts (admin sees all rows).
 *
 * Run (requires E2E_ADMIN_PASSWORD for live hub):
 *   E2E_ADMIN_PASSWORD=... npx playwright test e2e/invest-portfolio-orders-rls.spec.ts --config=e2e/hub-playwright.config.ts
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = 'https://hub.nfstay.com';
const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@hub.nfstay.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

async function getAuthTokens(
  email: string,
  password: string,
): Promise<{ access_token: string; refresh_token: string; user: unknown } | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.access_token) return data;
    return null;
  } catch {
    return null;
  }
}

async function injectAuth(page: Page, email: string, password: string) {
  const tokens = await getAuthTokens(email, password);
  if (!tokens) throw new Error(`Failed to authenticate ${email}`);

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
    [storageKey, sessionData],
  );
}

test.describe('Invest portfolio — my inv_orders readable (RLS)', () => {
  test.skip(
    !ADMIN_PASSWORD,
    'Set E2E_ADMIN_PASSWORD to run against https://hub.nfstay.com',
  );

  test('GET inv_orders (mine) returns 200 on portfolio for same session', async ({ page }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const invOrderStatuses: number[] = [];
    page.on('response', (res) => {
      const u = res.url();
      if (u.includes('/rest/v1/inv_orders') && res.request().method() === 'GET') {
        invOrderStatuses.push(res.status());
      }
    });

    await page.goto(`${BASE}/dashboard/invest/portfolio`, {
      waitUntil: 'networkidle',
      timeout: 45000,
    });

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(0);

    expect(invOrderStatuses.length).toBeGreaterThan(0);
    for (const s of invOrderStatuses) {
      expect(s).not.toBe(403);
      expect(s).not.toBe(401);
    }
    expect(invOrderStatuses.some((s) => s === 200)).toBe(true);
  });
});
