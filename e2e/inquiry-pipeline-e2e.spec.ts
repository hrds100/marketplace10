import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'hugords100+15@gmail.com';
const TEST_PASSWORD = 'TestNfstay2026!';
const NFSTAY_WHATSAPP = '447476368123';

test('Paid user: WhatsApp sends to NFStay number and calls process-inquiry', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // 1. Sign in
  await page.goto('https://hub.nfstay.com/signin', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const signinTab = page.locator('text=Sign In').first();
  if (await signinTab.isVisible()) await signinTab.click();
  await page.waitForTimeout(500);

  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  expect(page.url()).toContain('/dashboard');

  // 2. Navigate to deals
  await page.goto('https://hub.nfstay.com/dashboard/deals', { timeout: 15000 });
  await page.waitForTimeout(4000);

  // 3. Intercept window.open before clicking
  await page.evaluate(() => {
    (window as any).__openedUrls = [];
    const origOpen = window.open;
    window.open = function (url: any, ...args: any[]) {
      (window as any).__openedUrls.push(url);
      return null;
    };
  });

  // 4. Set up network interception for process-inquiry
  let processInquiryCalled = false;
  page.on('request', (req) => {
    if (req.url().includes('process-inquiry')) {
      processInquiryCalled = true;
    }
  });

  // 5. Click the WhatsApp button on the first property card
  const waBtn = page.locator('[data-feature="DEALS__PROPERTY_CARD_WHATSAPP"]').first();
  await waBtn.waitFor({ timeout: 10000 });
  await waBtn.click();
  await page.waitForTimeout(2000);

  // 6. Check if InquiryPanel opened (paid user sees Send button)
  const sendBtn = page.locator('button:has-text("Send on WhatsApp")');
  const panelOpened = await sendBtn.isVisible().catch(() => false);

  if (panelOpened) {
    console.log('InquiryPanel opened with Send button (expected for paid user)');
    await sendBtn.click();
    await page.waitForTimeout(2000);
  } else {
    // PropertyCard might have called process-inquiry directly (paid path)
    console.log('No panel - PropertyCard handled WhatsApp directly');
  }

  // 7. Verify results
  const openedUrls: string[] = await page.evaluate(() => (window as any).__openedUrls || []);
  console.log('Opened URLs:', openedUrls);
  console.log('process-inquiry called:', processInquiryCalled);

  // WhatsApp URL must go to NFStay company number
  const waUrls = openedUrls.filter((u: string) => u?.includes('wa.me'));
  expect(waUrls.length).toBeGreaterThan(0);
  expect(waUrls[0]).toContain(NFSTAY_WHATSAPP);

  // Reference number must be 5 chars (not full UUID)
  const decodedMsg = decodeURIComponent(waUrls[0]);
  const refMatch = decodedMsg.match(/(?:Reference no\.: |ref #)([A-Z0-9]+)/);
  expect(refMatch).not.toBeNull();
  expect(refMatch![1].length).toBe(5);
  // Must NOT contain a full UUID (36 chars with dashes)
  expect(decodedMsg).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

  // process-inquiry must have been called
  expect(processInquiryCalled).toBe(true);

  await context.close();
});
