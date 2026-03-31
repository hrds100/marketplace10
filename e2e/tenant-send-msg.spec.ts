import { test, expect } from '@playwright/test';

test('Tenant sends manual message to trigger landlord WhatsApp', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Sign in
  await page.goto('https://hub.nfstay.com/signin', { timeout: 15000 });
  await page.waitForTimeout(2000);
  const signinTab = page.locator('text=Sign In').first();
  if (await signinTab.isVisible()) await signinTab.click();
  await page.fill('input[type="email"]', 'tenant-test@nexivoproperties.co.uk');
  const pwField = page.locator('input[type="password"]');
  if (await pwField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await pwField.fill('tenant-tes_NFsTay2!.co.uk');
  }
  await page.locator('button:has-text("Sign In")').last().click();
  await page.waitForTimeout(5000);
  console.log('Logged in:', page.url());

  // Go to inbox with the deal
  await page.goto('https://hub.nfstay.com/dashboard/inbox?deal=b0afdb88-2018-443b-8b92-a96565619f82', { timeout: 15000 });
  await page.waitForTimeout(5000);

  // Type and send a message
  const textarea = page.locator('[data-feature="CRM_INBOX__MESSAGE_INPUT"]');
  if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
    await textarea.fill('Hello, I would love to view this property. When is a good time?');
    await page.waitForTimeout(500);
    
    const sendBtn = page.locator('[data-feature="CRM_INBOX__SEND_BUTTON"]');
    await sendBtn.click();
    await page.waitForTimeout(3000);
    
    console.log('Message sent!');
    await page.screenshot({ path: 'e2e/screenshots/phase4-message-sent.png', fullPage: false });
  } else {
    console.log('Textarea not visible - checking for payment gate');
    await page.screenshot({ path: 'e2e/screenshots/phase4-no-textarea.png', fullPage: false });
  }

  await context.close();
});
