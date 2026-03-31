import { test, expect } from '@playwright/test';

const LISTINGS = [
  "2-bed flat available in Kensington W8 London. £2500/mo serviced accommodation. Landlord WhatsApp: +447863992555",
  "3-bed house in Kensington W14 London. £3200/mo serviced accommodation. Landlord WhatsApp: +447863992555",
  "Studio apartment Kensington W11 London. £1800/mo serviced accommodation. Landlord WhatsApp: +447863992555",
];

test('Post 3 properties via Quick Listing as admin', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Sign in as admin
  await page.goto('https://hub.nfstay.com/signin', { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Click Sign In tab if needed
  const signinTab = page.locator('text=Sign In').first();
  if (await signinTab.isVisible()) await signinTab.click();
  await page.waitForTimeout(500);

  // Fill email
  await page.fill('input[type="email"]', 'admin@hub.nfstay.com');
  await page.fill('input[type="password"]', 'Dgs58913347.');
  
  // Click sign in button
  await page.locator('button:has-text("Sign In")').last().click();
  await page.waitForTimeout(5000);

  console.log('Current URL after login:', page.url());
  await page.screenshot({ path: 'e2e/screenshots/admin-logged-in.png' });

  // Navigate to Quick List
  await page.goto('https://hub.nfstay.com/admin/quick-list', { timeout: 15000 });
  await page.waitForTimeout(3000);
  
  console.log('Quick List URL:', page.url());
  await page.screenshot({ path: 'e2e/screenshots/quick-list-page.png' });

  for (let i = 0; i < LISTINGS.length; i++) {
    console.log(`\n--- Posting listing ${i + 1} ---`);
    
    // Find the textarea and fill it
    const textarea = page.locator('textarea').first();
    await textarea.fill(LISTINGS[i]);
    await page.waitForTimeout(1000);

    // Click submit/generate button
    const submitBtn = page.locator('button:has-text("Generate"), button:has-text("Submit"), button:has-text("Parse"), button:has-text("Create")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(5000);
      console.log(`Listing ${i + 1} submitted`);
      await page.screenshot({ path: `e2e/screenshots/listing-${i + 1}-submitted.png` });
    } else {
      console.log('No submit button found');
      await page.screenshot({ path: `e2e/screenshots/listing-${i + 1}-no-button.png` });
    }

    // Wait and check for success, then clear for next
    await page.waitForTimeout(2000);
    
    // Look for publish/save button
    const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Save"), button:has-text("List")').first();
    if (await publishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await publishBtn.click();
      await page.waitForTimeout(3000);
      console.log(`Listing ${i + 1} published`);
      await page.screenshot({ path: `e2e/screenshots/listing-${i + 1}-published.png` });
    }

    // Navigate back for next listing
    if (i < LISTINGS.length - 1) {
      await page.goto('https://hub.nfstay.com/admin/quick-list', { timeout: 15000 });
      await page.waitForTimeout(2000);
    }
  }

  await context.close();
});
