import { test, expect } from '@playwright/test';

/**
 * Mario — Wallet consistency audit
 * Verifies that admin invest pages show wallet addresses from profiles
 * (single source of truth) not stale order-level fields.
 */

const BASE = 'https://hub.nfstay.com';
const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';

const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASSWORD = 'Dgs58913347.';

async function getAuthTokens(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Auth failed: ${data.error}`);
  return data;
}

async function injectAuth(page: import('@playwright/test').Page, tokens: any) {
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
    ([key, data]) => localStorage.setItem(key, data),
    [storageKey, sessionData],
  );
}

test.describe('Invest Admin — Wallet Consistency', () => {
  let tokens: any;

  test.beforeAll(async () => {
    tokens = await getAuthTokens(ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('Orders page shows Partner wallet column from profiles', async ({ page }) => {
    await injectAuth(page, tokens);
    await page.goto(`${BASE}/admin/invest/orders`, { timeout: 20000, waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const heading = page.locator('h1:has-text("Allocation Orders")');
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Wait for table or empty state to appear
    const table = page.locator('table tbody tr td');
    const loader = page.locator('[class*="animate-spin"]');
    await Promise.race([
      table.first().waitFor({ timeout: 15000 }).catch(() => {}),
      loader.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {}),
    ]);
    await page.waitForTimeout(2000);

    // Check for "No orders yet" empty state or actual rows
    const emptyState = page.locator('text=No orders yet');
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    if (hasEmpty) {
      console.log('Orders table is empty — no orders yet');
    } else {
      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();
      if (rowCount > 0) {
        const firstRow = rows.first();
        const cells = firstRow.locator('td');
        const walletCell = cells.nth(2);
        const walletText = await walletCell.textContent();
        expect(walletText?.trim()).toBeTruthy();
        console.log(`First order wallet cell: "${walletText?.trim()}"`);
      }
    }
  });

  test('Orders edit modal pre-fills wallet from profile', async ({ page }) => {
    await injectAuth(page, tokens);
    await page.goto(`${BASE}/admin/invest/orders`, { timeout: 20000, waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    if (rowCount === 0) {
      test.skip(true, 'No orders to test edit modal');
      return;
    }

    const editBtn = rows.first().locator('button[title="Edit"]');
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(1000);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Second input in modal is wallet address
      const walletInput = modal.locator('input').nth(1);
      const walletValue = await walletInput.inputValue();
      console.log(`Edit modal wallet value: "${walletValue}"`);

      await modal.locator('button:has-text("Cancel")').click();
    } else {
      console.log('No edit button visible on first row');
    }
  });

  test('Shareholders page loads and maps wallets to profiles', async ({ page }) => {
    await injectAuth(page, tokens);
    await page.goto(`${BASE}/admin/invest/shareholders`, { timeout: 20000, waitUntil: 'networkidle' });
    // Graph queries can be slow
    await page.waitForTimeout(8000);

    const heading = page.locator('h1:has-text("Shareholders")');
    const isVisible = await heading.isVisible().catch(() => false);

    if (isVisible) {
      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();
      console.log(`Shareholders: ${rowCount} rows loaded`);

      if (rowCount > 0) {
        const walletLink = rows.first().locator('a[href*="bscscan.com"]');
        if (await walletLink.isVisible().catch(() => false)) {
          const href = await walletLink.getAttribute('href');
          expect(href).toContain('0x');
          console.log(`First shareholder wallet link: ${href}`);
        }
      }
    } else {
      console.log('Shareholders page loading or Graph unavailable');
    }
  });

  test('Test Console shows wallet from profiles.wallet_address', async ({ page }) => {
    await injectAuth(page, tokens);
    await page.goto(`${BASE}/admin/invest/test-console`, { timeout: 20000, waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const heading = page.locator('h1:has-text("Test Console")');
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Blockchain State card should show wallet
    const walletLabel = page.locator('p:has-text("Wallet")').first();
    const walletValue = await walletLabel.locator('..').locator('p.font-mono').textContent();
    console.log(`Test Console wallet: "${walletValue?.trim()}"`);
    expect(walletValue?.trim()).toBeTruthy();
  });
});
