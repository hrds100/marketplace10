// PR 140 (Hugo 2026-04-28): smoke tests for the new dialer rebuild —
// PreCallRoom + InCallRoom + CallStateBadge.
//
// Read-only against production hub.nfstay.com. We can't fire a real
// Twilio call here (that would touch live PSTN + Twilio billing), so
// we assert the new shells render with the expected test ids and that
// the dialer page loads cleanly. End-to-end ringing/connected coverage
// requires the Twilio test account integration which lives outside
// this file.

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://hub.nfstay.com';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASS = 'Dgs58913347.';

async function adminSignIn(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const signInTab = page.locator('text=Sign In').first();
  if (await signInTab.isVisible().catch(() => false)) await signInTab.click();
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL('**/dashboard/**', { timeout: 20000 });
}

test.describe('PR 140 — dialer rebuild smoke', () => {
  test.setTimeout(120_000);

  test('PreCallRoom renders at /crm/dialer with the new shell', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/crm/dialer`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // The new shell is identifiable by its top-level test id.
    await expect(page.locator('[data-testid="precall-room"]')).toBeVisible({
      timeout: 10_000,
    });

    // Header copy reflects the new power-dialer language.
    await expect(page.locator('h1', { hasText: /My dialer/i })).toBeVisible();
    await expect(
      page.locator('text=One lead at a time · agent-controlled pacing')
    ).toBeVisible();

    // Either a NextLeadCard, an empty-state, or a loading-state must
    // be on screen — never a blank panel.
    const card = page.locator(
      '[data-testid="next-lead-card"], [data-testid="next-lead-card-empty"], [data-testid="next-lead-card-loading"]'
    );
    await expect(card.first()).toBeVisible({ timeout: 10_000 });
  });

  test('Admin controls collapsed by default (admin role)', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/crm/dialer`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // The legacy chrome (Start / Pause / Stop campaign) is no longer
    // primary — it lives behind an "Admin controls" toggle.
    const adminToggle = page.locator('button', { hasText: /Admin controls/i });
    if (await adminToggle.isVisible().catch(() => false)) {
      await expect(
        page.locator('button', { hasText: /Start campaign/i })
      ).not.toBeVisible();

      // Expand and confirm the controls render.
      await adminToggle.click();
      await page.waitForTimeout(300);
      await expect(
        page.locator('button', { hasText: /Start campaign/i })
      ).toBeVisible();
    }
  });

  test('Recent Calls panel still renders inside the new shell', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/crm/dialer`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // The RecentCallsPanel was preserved — assert its presence by
    // looking for the well-known heading.
    const recent = page.locator('text=/Recent calls/i').first();
    await expect(recent).toBeVisible({ timeout: 10_000 });
  });
});
