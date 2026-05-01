import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PREVIEW_URL || 'https://hub.nfstay.com';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASS = 'Test1234!';
const CAMPAIGN_ID = '905224db-5ec2-4cba-a4bf-9ad835a1ea2c';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/signin`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(3000);

  // Screenshot to debug sign-in state
  await page.screenshot({ path: 'e2e/screenshots/csv-import-signin.png' });

  // Click "Sign In" tab if present
  try {
    const tab = page.getByRole('button', { name: /sign in/i }).first();
    if (await tab.isVisible({ timeout: 3000 })) await tab.click();
  } catch { /* ignore */ }
  await page.waitForTimeout(500);

  // Try multiple selectors for email input
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="Email" i]').first();
  const isEmailVisible = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
  if (!isEmailVisible) {
    // Maybe we need to click "or sign in with email" link
    try {
      await page.getByText(/sign in with email/i).click();
      await page.waitForTimeout(500);
    } catch { /* ignore */ }
  }

  await page.screenshot({ path: 'e2e/screenshots/csv-import-signin-after-tab.png' });

  await emailInput.fill(ADMIN_EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(ADMIN_PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'e2e/screenshots/csv-import-after-login.png' });
}

test.describe('CSV lead import — duplicate email handling', () => {
  test('imports CSV with duplicate emails without crashing', async ({ page }) => {
    await signIn(page);

    await page.goto(
      `${BASE_URL}/crm/settings?scope=campaign&campaignId=${CAMPAIGN_ID}&tab=leads`,
      { waitUntil: 'networkidle', timeout: 20_000 }
    );
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/csv-import-settings.png' });

    // Click "Upload CSV" to open the modal
    await page.getByRole('button', { name: /upload csv/i }).click();
    await page.waitForTimeout(500);

    const ts = Date.now();
    const p = ts.toString().slice(-7);
    const csvContent = [
      'name,phone,email',
      `Test Alpha ${ts},+44700${p},dupe${ts}@test.com`,
      `Test Beta ${ts},+44701${p},dupe${ts}@test.com`,
      `Test Gamma ${ts},+44702${p},`,
      `Test Delta ${ts},+44703${p},`,
    ].join('\n');

    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    await fileInput.setInputFiles({
      name: 'test-dedup.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/csv-import-review.png' });

    const importBtn = page.getByRole('button', { name: /import \d+ contact/i });
    await expect(importBtn).toBeVisible({ timeout: 5000 });
    await importBtn.click();

    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'e2e/screenshots/csv-import-result.png' });

    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('wk_contacts_email_uniq');
    expect(pageText).not.toContain('duplicate key value');

    const hasSuccess =
      pageText?.includes('Imported') ||
      pageText?.includes('imported') ||
      pageText?.includes('queued') ||
      pageText?.includes('skipped');
    expect(hasSuccess).toBeTruthy();
  });
});
