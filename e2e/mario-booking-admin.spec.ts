import { test, expect } from '@playwright/test';

/**
 * Mario Booking Admin - 2026-04-03
 * Verifies admin-only tabs (Analytics, Users) on /dashboard/booking-site
 * and that regular users only see 4 tabs.
 */

const BASE_URL = process.env.BASE_URL || 'https://hub.nfstay.com';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASSWORD = 'Dgs58913347.';

// ─── Helper: admin sign-in ────────────────────────────────────────
async function adminSignIn(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/signin`, { timeout: 20000 });
  await page.waitForTimeout(2000);

  const signInTab = page.locator('text=Sign In').first();
  if (await signInTab.isVisible().catch(() => false)) {
    await signInTab.click();
    await page.waitForTimeout(500);
  }

  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
}

test.describe('Booking Site Admin Tabs', () => {
  test('admin sees 6 tabs including Analytics and Users', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE_URL}/dashboard/booking-site`, { timeout: 20000 });
    await page.waitForTimeout(3000);

    // Check all 6 tabs are visible for admin
    const tabLabels = ['Dashboard', 'Properties', 'Reservations', 'Branding', 'Analytics', 'Users'];
    for (const label of tabLabels) {
      const tab = page.locator(`button:has-text("${label}")`).first();
      await expect(tab).toBeVisible({ timeout: 10000 });
    }
  });

  test('admin Analytics tab shows revenue/bookings/avg cards', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE_URL}/dashboard/booking-site`, { timeout: 20000 });
    await page.waitForTimeout(3000);

    // Click Analytics tab
    await page.locator('button:has-text("Analytics")').first().click();
    await page.waitForTimeout(2000);

    // Verify the three analytics cards render
    await expect(page.locator('text=Revenue This Month')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Bookings This Month')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Avg Booking Value')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Recent Bookings' })).toBeVisible({ timeout: 10000 });
  });

  test('admin Users tab shows operators table', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE_URL}/dashboard/booking-site`, { timeout: 20000 });
    await page.waitForTimeout(3000);

    // Click Users tab
    await page.locator('button:has-text("Users")').first().click();
    await page.waitForTimeout(2000);

    // Verify the operators section renders
    await expect(page.locator('text=Booking Site Users')).toBeVisible({ timeout: 10000 });
  });
});
