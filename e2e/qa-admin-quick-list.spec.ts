import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

const SAMPLE_TEXT = `AMAZING RENT 2 SA DEAL
Location: Battersea SW11
Property: 1 Bed Flat
Monthly Rent: £2,300 PCM
Projected Nightly Rate: £170
Deposit: £2,300
Self-Managed Monthly Profit: £1,070
Fully Furnished
WhatsApp: +447788427524 - Abu`;

test.describe('Admin Quick List', () => {
  test('parses listing text and populates form fields', async ({ page }) => {
    await page.goto(`${BASE}/admin/marketplace/quick-list`);
    await page.waitForTimeout(2000);

    // Check page loaded (may redirect to signin if not admin)
    const body = await page.textContent('body');
    if (body?.includes('Welcome back') || body?.includes('Sign in')) {
      test.skip(true, 'Not logged in as admin - skipping');
      return;
    }

    // Paste sample text
    const textarea = page.locator('[data-feature="ADMIN__QUICK_LIST_INPUT"]');
    await textarea.fill(SAMPLE_TEXT);

    // Click Parse
    const parseBtn = page.locator('[data-feature="ADMIN__QUICK_LIST_PARSE"]');
    await parseBtn.click();

    // Wait for parsing + AI description generation (can take up to 20s)
    await page.waitForTimeout(20000);

    // Check preview panel appeared
    const preview = page.locator('[data-feature="ADMIN__QUICK_LIST_PREVIEW"]');
    await expect(preview).toBeVisible({ timeout: 5000 });

    // Screenshot for evidence
    await page.screenshot({ path: 'e2e/screenshots/quick-list-parsed.png', fullPage: true });

    // Assert fields populated
    const cityInput = preview.locator('input').nth(1); // City field
    const cityVal = await cityInput.inputValue();
    expect(cityVal.length).toBeGreaterThan(0);

    // Assert description is not empty (AI generated)
    const descTextarea = preview.locator('textarea').first();
    const descVal = await descTextarea.inputValue();
    expect(descVal.length).toBeGreaterThan(10);

    // Assert contact phone populated
    const phoneInput = preview.locator('input[placeholder="N/A"]').first();
    const phoneVal = await phoneInput.inputValue();
    expect(phoneVal).toContain('447788427524');
  });

  test('submit for approval button exists and is primary', async ({ page }) => {
    await page.goto(`${BASE}/admin/marketplace/quick-list`);
    await page.waitForTimeout(2000);

    const body = await page.textContent('body');
    if (body?.includes('Welcome back') || body?.includes('Sign in')) {
      test.skip(true, 'Not logged in as admin - skipping');
      return;
    }

    // Paste and parse
    const textarea = page.locator('[data-feature="ADMIN__QUICK_LIST_INPUT"]');
    await textarea.fill(SAMPLE_TEXT);
    await page.locator('[data-feature="ADMIN__QUICK_LIST_PARSE"]').click();
    await page.waitForTimeout(20000);

    // Check Submit for Approval button exists
    const submitBtn = page.locator('[data-feature="ADMIN__QUICK_LIST_SUBMIT"]');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    const btnText = await submitBtn.textContent();
    expect(btnText).toContain('Submit for Approval');

    await page.screenshot({ path: 'e2e/screenshots/quick-list-submit-btn.png', fullPage: true });
  });

  test('page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE}/admin/marketplace/quick-list`);
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'e2e/screenshots/quick-list-page-load.png', fullPage: true });

    // No JS errors on page load
    expect(errors.length).toBe(0);
  });
});
