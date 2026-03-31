import { test, expect } from '@playwright/test';

test('Full mobile flow: magic link, NDA modal, sign', async ({ browser }) => {
  const context = await browser.newContext({ 
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
  });
  const page = await context.newPage();

  const TOKEN = 'ce0d0c200dd101ad49f02485fa2d3a1d01f4cb4005dd7abdb12d4d03abc178cc';

  // Step 1: Magic link login
  await page.goto(`https://hub.nfstay.com/inbox?token=${TOKEN}`, { timeout: 25000 });
  await page.waitForURL('**/dashboard/inbox**', { timeout: 15000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'e2e/screenshots/flow-1-inbox.png', fullPage: false });
  console.log('1. Inbox loaded');

  // Step 2: Verify message visible
  const msg = page.locator('text=is this property still available');
  console.log('2. Message visible:', await msg.isVisible({ timeout: 3000 }).catch(() => false));

  // Step 3: Click NDA button
  const ndaBtn = page.locator('button:has-text("Sign NDA to reply")');
  const btnVis = await ndaBtn.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('3. NDA button visible:', btnVis);

  if (btnVis) {
    await ndaBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/screenshots/flow-2-modal.png', fullPage: false });

    // Step 4: Verify modal opened
    const modal = page.locator('[data-feature="CRM_INBOX__NDA_AGREEMENT"]');
    console.log('4. Modal visible:', await modal.isVisible().catch(() => false));

    // Step 5: Scroll to sign section
    const scrollArea = modal.locator('.overflow-y-auto');
    await scrollArea.evaluate(el => el.scrollTop = el.scrollHeight);
    await page.waitForTimeout(500);

    // Step 6: Fill and sign
    const nameInput = page.locator('input[placeholder="Enter full legal name"]');
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Hugo Test');
      await page.locator('input[type="checkbox"]').check();
      await page.waitForTimeout(300);
      
      const signBtn = page.locator('[data-feature="CRM_INBOX__NDA_SIGN"]');
      console.log('5. Sign button enabled:', await signBtn.isEnabled());
      await page.screenshot({ path: 'e2e/screenshots/flow-3-filled.png', fullPage: false });
    }
  }

  await context.close();
});
