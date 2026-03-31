import { test, expect } from '@playwright/test';

test('Desktop flow: magic link, banner, NDA', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const TOKEN = 'ce0d0c200dd101ad49f02485fa2d3a1d01f4cb4005dd7abdb12d4d03abc178cc';
  await page.goto(`https://hub.nfstay.com/inbox?token=${TOKEN}`, { timeout: 25000 });
  await page.waitForURL('**/dashboard/inbox**', { timeout: 15000 });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'e2e/screenshots/desktop-inbox.png', clip: { x: 0, y: 0, width: 1920, height: 200 } });

  // Banner visible
  const banner = page.locator('text=Claim this account');
  console.log('Banner:', await banner.isVisible({ timeout: 3000 }).catch(() => false));

  // Message visible
  const msg = page.locator('text=is this property still available');
  console.log('Message:', await msg.isVisible({ timeout: 3000 }).catch(() => false));

  // NDA button
  const ndaBtn = page.locator('button:has-text("Sign NDA to reply")');
  console.log('NDA button:', await ndaBtn.isVisible({ timeout: 3000 }).catch(() => false));

  await context.close();
});
