// Debug: expand a campaign in /crm/settings → grab the runtime error.
import { test, expect } from '@playwright/test';

const EMAIL = 'crmtest-pw@nexivoproperties.co.uk';
const PASSWORD = 'CrmTest2026Pw!';

test('reproduce campaigns expand crash', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors: string[] = [];
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}\n${e.stack}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`console: ${msg.text()}`);
  });

  await page.goto('https://hub.nfstay.com/crm/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();
  await page.waitForURL(/\/crm\/(inbox|dashboard|settings)/, { timeout: 30_000 });

  await page.goto('https://hub.nfstay.com/crm/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Campaigns', { timeout: 10_000 });

  // Click the Campaigns nav tab (left sidebar).
  await page.locator('button', { hasText: /^Campaigns$/ }).first().click();
  await page.waitForTimeout(2000);

  // Screenshot before expand.
  await page.screenshot({ path: 'e2e/screenshots/debug-campaigns-list.png', fullPage: true });

  // Find any campaign expand arrow (▸).
  const expandButtons = page.locator('button:has-text("▸")');
  const count = await expandButtons.count();
  console.log(`Found ${count} expand buttons`);
  if (count > 0) {
    await expandButtons.first().click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'e2e/screenshots/debug-campaigns-expanded.png', fullPage: true });
  }

  console.log('--- console errors collected ---');
  for (const e of consoleErrors) console.log(e);
  console.log('--- end ---');
});
