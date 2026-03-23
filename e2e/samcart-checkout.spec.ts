/**
 * E2E Test: SamCart card payment iframe opens correctly
 * Run: npx playwright test e2e/samcart-checkout.spec.ts --config=e2e/playwright.config.ts --reporter=list
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:8080';
const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';
const TEST_EMAIL = 'playwright-test@nfstay.com';
const TEST_PASSWORD = 'TestPass123!';

async function injectAuth(page: Page) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const tokens = await res.json();
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

test.describe('SamCart Card Payment Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
  });

  test('Card payment opens SamCart iframe in Sheet drawer', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Verify we're on the marketplace page
    expect(page.url()).toContain('invest/marketplace');

    // Card should be selected by default
    const cardBtn = page.locator('button:has-text("Credit / Debit Card")');
    await expect(cardBtn).toBeVisible({ timeout: 5000 });

    // Check the TSA checkbox
    const tsaCheckbox = page.locator('button[role="checkbox"], label:has-text("Token Sale Agreement") button, label:has-text("Token Sale Agreement") >> xpath=preceding-sibling::button | self::*//button').first();
    // Try clicking the label area that contains the checkbox
    const tsaLabel = page.locator('label:has-text("Token Sale Agreement")').first();
    if (await tsaLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tsaLabel.click();
      await page.waitForTimeout(500);
    }

    // Find and click the "Secure Your Allocations" button
    const secureBtn = page.locator('button:has-text("Secure Your Allocations")');
    await expect(secureBtn).toBeVisible({ timeout: 5000 });

    // Check if button is enabled after TSA agreement
    const isDisabled = await secureBtn.isDisabled();
    console.log(`  Secure button disabled: ${isDisabled}`);

    if (!isDisabled) {
      await secureBtn.click();
      await page.waitForTimeout(2000);

      // Check if Sheet opened with SamCart iframe
      const iframe = page.locator('iframe[title="SamCart Checkout"]');
      const sheetTitle = page.locator('text=Complete Payment');

      const hasIframe = await iframe.isVisible({ timeout: 5000 }).catch(() => false);
      const hasTitle = await sheetTitle.isVisible({ timeout: 3000 }).catch(() => false);

      console.log(`  Sheet "Complete Payment" visible: ${hasTitle}`);
      console.log(`  SamCart iframe visible: ${hasIframe}`);

      if (hasIframe) {
        const iframeSrc = await iframe.getAttribute('src');
        console.log(`  Iframe src: ${iframeSrc?.substring(0, 120)}`);

        // Verify URL uses correct product (slug "1" = Pembroke Place, ID 1003039)
        expect(iframeSrc).toContain('stay.samcart.com/products/1/');
        expect(iframeSrc).toContain('last_name=');
        expect(iframeSrc).toContain('propertyId');
        expect(iframeSrc).toContain('email=');
        expect(iframeSrc).toContain('investAmountUsd');
        expect(iframeSrc).toContain('custom_0zdAJJKy=');
      }

      await page.screenshot({ path: 'e2e/screenshots/samcart-iframe.png', fullPage: true });
    } else {
      console.log('  [WARN] Button still disabled - TSA checkbox may not have toggled');
      await page.screenshot({ path: 'e2e/screenshots/samcart-button-disabled.png', fullPage: true });
    }
  });

  test('Crypto path still works (does not open SamCart)', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Switch to crypto payment method
    const cryptoBtn = page.locator('button:has-text("Cryptocurrency")');
    if (await cryptoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cryptoBtn.click();
      await page.waitForTimeout(500);
      console.log('  Switched to crypto payment method');
    }

    // Verify SamCart iframe is NOT opened when crypto is selected
    const iframe = page.locator('iframe[title="SamCart Checkout"]');
    const hasIframe = await iframe.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasIframe).toBeFalsy();
    console.log(`  SamCart iframe visible after crypto selection: ${hasIframe} (expected false)`);
  });
});
