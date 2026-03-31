import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://hub.nfstay.com';

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE — ADMIN OUTREACH
// ═══════════════════════════════════════════════════════════════════════════════

test('[OUTREACH-001] Page loads | Returns 200', async ({ page }) => {
  const response = await page.goto(`${BASE}/admin/marketplace/outreach`);
  expect(response?.status()).toBe(200);
});

test('[OUTREACH-002] Page renders | Shows Outreach heading or sign-in', async ({ page }) => {
  await page.goto(`${BASE}/admin/marketplace/outreach`);
  const heading = page.locator('h1:has-text("Outreach")');
  const signIn = page.locator('input[type="email"]');
  await expect(heading.or(signIn).first()).toBeVisible({ timeout: 10000 });
});

test('[OUTREACH-003] Tab bar | Three tabs visible', async ({ page }) => {
  await page.goto(`${BASE}/admin/marketplace/outreach`);
  const signIn = page.locator('input[type="email"]');
  if (await signIn.isVisible({ timeout: 3000 }).catch(() => false)) {
    test.skip();
    return;
  }
  await expect(page.getByRole('button', { name: /First-Contact/i })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: /Pending/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Metrics/i })).toBeVisible();
});

test('[OUTREACH-004] Metrics tab | Renders lister table', async ({ page }) => {
  await page.goto(`${BASE}/admin/marketplace/outreach`);
  const signIn = page.locator('input[type="email"]');
  if (await signIn.isVisible({ timeout: 3000 }).catch(() => false)) {
    test.skip();
    return;
  }
  const metricsTab = page.getByRole('button', { name: /Metrics/i });
  await metricsTab.click();
  // Should show the All filter button or empty state
  const allButton = page.getByRole('button', { name: /All/i });
  const emptyState = page.locator('text=No listers found');
  await expect(allButton.or(emptyState).first()).toBeVisible({ timeout: 10000 });
});
