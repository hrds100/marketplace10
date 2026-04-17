/**
 * Wimbledon investor-demo page — e2e tests.
 *
 * Run against local dev:
 *   npm run dev   # port 8080
 *   BASE_URL=http://localhost:8080 npx playwright test e2e/wimbledon-demo.spec.ts
 *
 * Run against prod:
 *   npx playwright test e2e/wimbledon-demo.spec.ts  (uses playwright.config.ts baseURL)
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Wimbledon demo page', () => {
  test('renders at /wimbledon with Britannia Point heading', async ({ page }) => {
    const res = await page.goto(`${BASE}/wimbledon`, { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: /Britannia Point/i }).first()).toBeVisible();
  });

  test('progress bar reflects ~34.6% funded', async ({ page }) => {
    await page.goto(`${BASE}/wimbledon`, { waitUntil: 'domcontentloaded' });
    const progress = page.getByTestId('wimbledon-progress');
    await expect(progress).toBeVisible();
    const raw = await progress.getAttribute('aria-valuenow');
    expect(raw).not.toBeNull();
    const pct = Number(raw);
    // tolerate 34–35% per spec (34.6% is the exact calc)
    expect(pct).toBeGreaterThanOrEqual(34);
    expect(pct).toBeLessThanOrEqual(35);
  });

  test('default slider value ($500) produces Y5 ≈ $3,389', async ({ page }) => {
    await page.goto(`${BASE}/wimbledon`, { waitUntil: 'domcontentloaded' });
    // default calc amount is 500, so Y5 = 500 + 500*1.156*5 = 3390 (rounded)
    const total = page.getByTestId('wimbledon-total-return');
    await expect(total).toContainText('$500');
    // y5 text contains $3,390 (or $3,389 allowed per spec)
    await expect(total).toContainText(/\$3,3(89|90)/);
    const y5 = page.getByTestId('wimbledon-year5-value');
    await expect(y5).toContainText(/\$3,3(89|90)/);
  });

  test('changing calculator amount to $1000 updates Y5 value > $6,500', async ({ page }) => {
    await page.goto(`${BASE}/wimbledon`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('wimbledon-calc-preset-1000').click();
    const y5 = page.getByTestId('wimbledon-year5-value');
    // Y5 for $1000 = 1000 + 1000*1.156*5 = 6780
    await expect(y5).toContainText(/\$6,7\d\d/);
    const text = (await y5.textContent()) || '';
    const match = text.match(/\$([\d,]+)/);
    expect(match).not.toBeNull();
    const value = Number((match?.[1] ?? '0').replace(/,/g, ''));
    expect(value).toBeGreaterThan(6500);
  });

  test('Secure Your Allocations opens SamCart iframe with amount=500', async ({ page }) => {
    await page.goto(`${BASE}/wimbledon`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('wimbledon-secure-cta').click();
    const iframe = page.getByTestId('wimbledon-samcart-iframe');
    await expect(iframe).toBeVisible();
    const src = await iframe.getAttribute('src');
    expect(src).not.toBeNull();
    expect(src!).toContain('https://stay.samcart.com/products/1/');
    expect(src!).toContain('amount=500');
    expect(src!).toContain('property=britannia-point-wimbledon');
  });

  test('no horizontal scroll at 375x812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/wimbledon`, { waitUntil: 'domcontentloaded' });
    // allow layout to settle
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
  });

  test('Copy Link toggles to "Copied" on click', async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await page.goto(`${BASE}/wimbledon`, { waitUntil: 'domcontentloaded' });
    const btn = page.getByTestId('wimbledon-copy-link');
    await expect(btn).toContainText(/Copy Link/);
    await btn.click();
    await expect(btn).toContainText(/Copied/);
  });

  test('captures desktop + mobile screenshots', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/wimbledon`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: 'test-results/wimbledon-desktop.png',
      fullPage: false,
    });

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/wimbledon`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: 'test-results/wimbledon-mobile.png',
      fullPage: false,
    });
  });
});
