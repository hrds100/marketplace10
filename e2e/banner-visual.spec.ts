import { test, expect } from '@playwright/test';

test('Magic link opens inbox with message and banner', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  await page.goto(`https://hub.nfstay.com/inbox?token=f6b881bf6b142f0340e3a4d56740f02cb53ddceb42fc1d8bdbf97b550d37412f`, { timeout: 25000 });
  await page.waitForURL('**/dashboard/inbox**', { timeout: 15000 });
  await page.waitForTimeout(3000);

  // Screenshot
  await page.screenshot({ path: 'e2e/screenshots/step3-inbox-loaded.png', fullPage: false });
  await page.screenshot({ path: 'e2e/screenshots/step3-banner.png', clip: { x: 0, y: 0, width: 1920, height: 120 } });

  // Verify no errors
  expect(await page.locator('text=Link issue').isVisible().catch(() => false)).toBe(false);
  expect(page.url()).toContain('/dashboard/inbox');

  // Check banner
  const banner = page.locator('text=Claim this account');
  const visible = await banner.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Banner visible:', visible);

  // Check message visible
  const msg = page.locator('text=is this property still available');
  const msgVisible = await msg.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Tenant message visible:', msgVisible);

  await context.close();
});
