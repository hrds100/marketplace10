/**
 * E2E: SamCart prefill — human last_name, phone_number JSON (propertyId + recipient only), wallet in custom field.
 * Run: npx playwright test e2e/invest-wallet-checkout.spec.ts --config=e2e/playwright.config.ts --reporter=list
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:8080';
const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';
const TEST_EMAIL = 'playwright-test@nfstay.com';
const TEST_PASSWORD = 'TestPass123!';

/** Stub profile wallet so card checkout can open */
const MOCK_PROFILE_WALLET = '0x1111111111111111111111111111111111111111';

async function injectAuth(page: Page) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
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
  await page.evaluate(([key, data]) => { localStorage.setItem(key, data); }, [storageKey, sessionData]);
}

test.describe('Invest SamCart prefill', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/rest/v1/profiles**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const url = route.request().url();
      if (url.includes('select=wallet_address') || url.includes('select=%22wallet_address%22')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ wallet_address: MOCK_PROFILE_WALLET }),
        });
        return;
      }
      await route.continue();
    });
    await injectAuth(page);
  });

  test('SamCart URL: last_name is not wallet; phone JSON has recipient + propertyId only', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(page.url()).toContain('invest/marketplace');

    await expect(page.locator('text=Receiving wallet')).toHaveCount(0);

    await expect(page.locator('button:has-text("Credit / Debit Card")')).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder('500').fill('750');

    await page.getByTestId('invest-tsa-checkbox').evaluate((el) => (el as HTMLButtonElement).click());
    await expect(page.getByTestId('invest-tsa-checkbox')).toHaveAttribute('aria-checked', 'true');

    const secureBtn = page.locator('button:has-text("Secure Your Allocations")');
    await expect(secureBtn).toBeVisible({ timeout: 5000 });
    await expect(secureBtn).toBeEnabled({ timeout: 5000 });
    await secureBtn.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(page.getByRole('heading', { name: 'Complete Payment' })).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId('samcart-contribution-banner')).toContainText('$750.00');

    const iframe = page.locator('iframe[title="SamCart Checkout"]');
    await expect(iframe).toBeVisible({ timeout: 15000 });

    const iframeSrc = await iframe.getAttribute('src');
    expect(iframeSrc).toBeTruthy();
    const url = new URL(iframeSrc!);
    const params = url.searchParams;

    const lastName = decodeURIComponent(params.get('last_name') || '');
    expect(lastName).not.toMatch(/^0x[a-fA-F0-9]{40}$/);

    const phoneDecoded = decodeURIComponent(params.get('phone_number') || '');
    const parsed = JSON.parse(phoneDecoded) as {
      propertyId: number;
      recipient: string;
      investAmountUsd?: number;
      agentWallet?: string;
    };
    expect(parsed.recipient).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(parsed.recipient.toLowerCase()).toBe(MOCK_PROFILE_WALLET.toLowerCase());
    expect(parsed.propertyId).toBeGreaterThan(0);
    expect(parsed.investAmountUsd).toBe(750);
    expect(parsed.agentWallet).toBeUndefined();

    const customWallet = decodeURIComponent(params.get('custom_0zdAJJKy') || '');
    expect(customWallet).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(params.get('email')).toBeTruthy();
    expect(params.get('amount')).toBeNull();
  });
});
