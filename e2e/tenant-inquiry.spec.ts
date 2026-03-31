import { test, expect } from '@playwright/test';

test('Tenant logs in and submits inquiry on Kensington W8', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Sign in as tenant
  await page.goto('https://hub.nfstay.com/signin', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const signinTab = page.locator('text=Sign In').first();
  if (await signinTab.isVisible()) await signinTab.click();
  await page.waitForTimeout(500);

  await page.fill('input[type="email"]', 'tenant-test@nexivoproperties.co.uk');
  // The sign-in form uses derivedPassword internally, we just enter email
  // and click sign in - the form derives the password
  
  // Actually the form has an email field and no password field visible initially
  // Let me check what fields exist
  const pwField = page.locator('input[type="password"]');
  if (await pwField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await pwField.fill('tenant-tes_NFsTay2!.co.uk');
  }

  await page.locator('button:has-text("Sign In")').last().click();
  await page.waitForTimeout(5000);

  const loginUrl = page.url();
  console.log('After login:', loginUrl);
  await page.screenshot({ path: 'e2e/screenshots/phase4-login.png', fullPage: false });

  // Navigate to deal detail for 2-Bed Flat W8
  await page.goto('https://hub.nfstay.com/dashboard/deals', { timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'e2e/screenshots/phase4-deals.png', fullPage: false });

  // Click on the Kensington property or use direct inquiry URL
  await page.goto('https://hub.nfstay.com/dashboard/inbox?deal=b0afdb88-2018-443b-8b92-a96565619f82', { timeout: 15000 });
  await page.waitForTimeout(8000);

  await page.screenshot({ path: 'e2e/screenshots/phase4-inquiry.png', fullPage: false });

  const url = page.url();
  console.log('After inquiry:', url);

  // Check if auto-message appeared
  const msg = page.locator('text=is this property still available');
  const msgVis = await msg.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Auto-message visible:', msgVis);

  // Check thread in inbox
  const thread = page.locator('text=Kensington');
  const threadVis = await thread.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Thread visible:', threadVis);

  await context.close();
});
