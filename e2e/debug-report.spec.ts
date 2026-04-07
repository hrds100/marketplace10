/**
 * Super Debug Report activation test.
 *
 * Requires the app to be running with VITE_DEBUG_REPORT_ENABLED=true.
 * Run against local dev: BASE_URL=http://localhost:8080 npx playwright test e2e/debug-report.spec.ts
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Super Debug Report', () => {
  test('typing nfsdebug reveals the debug button', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Button should NOT be visible before activation
    const btn = page.getByTestId('debug-report-button');
    await expect(btn).not.toBeVisible();

    // Type the activation sequence on the page body (not inside an input)
    await page.keyboard.type('nfsdebug');
    await page.waitForTimeout(500);

    // Button should now be visible
    await expect(btn).toBeVisible();
  });

  test('debug button persists across navigation via sessionStorage', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Activate
    await page.keyboard.type('nfsdebug');
    await page.waitForTimeout(500);
    await expect(page.getByTestId('debug-report-button')).toBeVisible();

    // Navigate to another page
    await page.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Button should still be visible (sessionStorage persists)
    await expect(page.getByTestId('debug-report-button')).toBeVisible();
  });

  test('typing inside an input does NOT activate debug', async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Focus on the email input and type the sequence inside it
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.click();
      await emailInput.type('nfsdebug');
      await page.waitForTimeout(500);

      // Button should NOT appear (sequence was typed inside an input)
      await expect(page.getByTestId('debug-report-button')).not.toBeVisible();
    }
  });
});
