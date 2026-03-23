/**
 * Production: Invest marketplace has no on-page wallet banner; SamCart URL uses human last_name.
 *
 *   export HUGO_E2E_PASSWORD='your Supabase email password'
 *   npx playwright test e2e/hugo-invest-wallet-prod.spec.ts --config=e2e/hub-playwright.config.ts
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

test.describe('Production — Hugo invest + SamCart', () => {
  test('No receiving-wallet banner; checkout URL has human last_name + clean phone JSON', async ({ page }) => {
    const password = process.env.HUGO_E2E_PASSWORD;
    test.skip(!password, 'Set HUGO_E2E_PASSWORD to run this test against hub.nfstay.com');

    await injectSession(page, HUGO_EMAIL, password!);

    await page.goto(`${BASE}/dashboard/invest/marketplace`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    expect(page.url()).toContain('invest/marketplace');
    await expect(page.locator('text=Receiving wallet')).toHaveCount(0);

    await expect(page.getByText('See how much you can earn')).toBeVisible({ timeout: 10000 });
    const sliderWrap = page.getByTestId('invest-earn-slider');
    await expect(sliderWrap).toBeVisible();
    const min = Number(await sliderWrap.getAttribute('data-slider-min'));
    const max = Number(await sliderWrap.getAttribute('data-slider-max'));
    const box = await sliderWrap.boundingBox();
    if (box && max > min) {
      const pct = 0.85;
      await page.mouse.click(box.x + box.width * pct, box.y + box.height / 2);
    }
    await page.getByTestId('invest-tsa-checkbox').evaluate((el) => (el as HTMLButtonElement).click());
    const secureBtn = page.locator('button:has-text("Secure Your Allocations")');
    await expect(secureBtn).toBeEnabled({ timeout: 15000 });
    await secureBtn.evaluate((el) => (el as HTMLButtonElement).click());

    await expect(page.getByRole('heading', { name: 'Complete Payment' })).toBeVisible({ timeout: 15000 });
    const iframe = page.locator('iframe[title="SamCart Checkout"]');
    await expect(iframe).toBeVisible({ timeout: 20000 });

    const iframeSrc = await iframe.getAttribute('src');
    expect(iframeSrc).toBeTruthy();
    const u = new URL(iframeSrc!);
    const lastName = decodeURIComponent(u.searchParams.get('last_name') || '');
    expect(lastName).not.toMatch(/^0x[a-fA-F0-9]{40}$/);

    const phoneDecoded = decodeURIComponent(u.searchParams.get('phone_number') || '');
    const parsed = JSON.parse(phoneDecoded) as { propertyId: number; recipient: string; agentWallet?: string };
    expect(parsed.recipient).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(parsed.propertyId).toBeGreaterThan(0);
    expect(parsed.agentWallet).toBeUndefined();
  });
});
