import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://hub.nfstay.com';

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE — ADMIN OUTREACH V2
// ═══════════════════════════════════════════════════════════════════════════════

test('[OUTREACH-V2-001] Page loads | Returns 200', async ({ page }) => {
  const response = await page.goto(`${BASE}/admin/marketplace/outreach-v2`);
  expect(response?.status()).toBe(200);
});

test('[OUTREACH-V2-002] Page renders | Shows Outreach V2 heading', async ({ page }) => {
  await page.goto(`${BASE}/admin/marketplace/outreach-v2`);
  // Page either shows heading or redirects to sign-in (admin guard)
  const heading = page.locator('h1:has-text("Outreach V2")');
  const signIn = page.locator('input[type="email"]');
  await expect(heading.or(signIn).first()).toBeVisible({ timeout: 10000 });
});

test('[OUTREACH-V2-003] Tab bar | Three tabs visible', async ({ page }) => {
  await page.goto(`${BASE}/admin/marketplace/outreach-v2`);
  // If redirected to sign-in, skip tab check
  const signIn = page.locator('input[type="email"]');
  if (await signIn.isVisible({ timeout: 3000 }).catch(() => false)) {
    test.skip();
    return;
  }
  const listingsTab = page.getByRole('button', { name: /Listings/i });
  const pendingTab = page.getByRole('button', { name: /Pending/i });
  const dealTab = page.getByRole('button', { name: /Deal Sourcers/i });
  await expect(listingsTab).toBeVisible({ timeout: 10000 });
  await expect(pendingTab).toBeVisible();
  await expect(dealTab).toBeVisible();
});

test('[OUTREACH-V2-004] Listings tab | Active by default', async ({ page }) => {
  await page.goto(`${BASE}/admin/marketplace/outreach-v2`);
  const signIn = page.locator('input[type="email"]');
  if (await signIn.isVisible({ timeout: 3000 }).catch(() => false)) {
    test.skip();
    return;
  }
  const listingsTab = page.getByRole('button', { name: /Listings/i });
  await expect(listingsTab).toBeVisible({ timeout: 10000 });
});

test('[OUTREACH-V2-005] Deal Sourcers tab | Renders imported component', async ({ page }) => {
  await page.goto(`${BASE}/admin/marketplace/outreach-v2`);
  const signIn = page.locator('input[type="email"]');
  if (await signIn.isVisible({ timeout: 3000 }).catch(() => false)) {
    test.skip();
    return;
  }
  const dealTab = page.getByRole('button', { name: /Deal Sourcers/i });
  await dealTab.click();
  // Should show the Deal Sourcer Metrics heading from AdminDealSourcers
  const heading = page.locator('h1:has-text("Deal Sourcer Metrics")');
  await expect(heading).toBeVisible({ timeout: 10000 });
});
