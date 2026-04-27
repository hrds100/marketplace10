// PR 62 verification: campaign-first Settings + agent gate.
import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'crmtest-pw@nexivoproperties.co.uk';
const ADMIN_PASSWORD = 'CrmTest2026Pw!';

test('admin sees campaigns sidebar + can expand a campaign without crash', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });

  await page.goto('https://hub.nfstay.com/crm/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();
  await page.waitForURL(/\/crm\//, { timeout: 30_000 });
  // Wait for the CRM layout to render so the auth session is fully settled.
  await page.waitForSelector('text=Inbox', { timeout: 30_000 });

  await page.goto('https://hub.nfstay.com/crm/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'e2e/screenshots/pr62-settings-debug.png', fullPage: true });
  console.log('--- console errors so far ---');
  for (const e of errors) console.log(e);
  console.log('--- end ---');
  // The sidebar is the load signal — admin only.
  await page.waitForSelector('text=Master template', { timeout: 15_000 });
  await page.waitForSelector('text=Workspace defaults', { timeout: 15_000 });
  await page.screenshot({ path: 'e2e/screenshots/pr62-settings-default.png', fullPage: true });

  // Master template loads
  await page.locator('button', { hasText: /Master template/ }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'e2e/screenshots/pr62-workspace-bundle.png', fullPage: true });

  // Pick the first real campaign in the sidebar (not "Master template")
  const campaignButton = page.locator('nav button', { hasText: /^[a-zA-Z]/ }).filter({
    hasNot: page.locator('text=Master template'),
  }).filter({
    hasNot: page.locator('text=Workspace-only'),
  }).filter({
    hasNot: page.locator('text=Pacing'),
  }).filter({
    hasNot: page.locator('text=Kill switches'),
  }).first();

  if (await campaignButton.count() > 0) {
    await campaignButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/screenshots/pr62-campaign-bundle.png', fullPage: true });

    // Click the "Upload leads (CSV)" tab
    const uploadTab = page.locator('button', { hasText: /Upload leads/ });
    if (await uploadTab.count() > 0) {
      await uploadTab.first().click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: 'e2e/screenshots/pr62-leads-tab.png', fullPage: true });
    }
  }

  console.log('--- console errors collected ---');
  for (const e of errors) console.log(e);
  console.log('--- end ---');

  // Anything serious would have crashed the page. Soft-assert no fatal errors.
  const fatal = errors.filter((e) => !e.includes('Browser-side error report'));
  expect(fatal).toEqual([]);
});
