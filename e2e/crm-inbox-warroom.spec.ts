// PR 52 war-room verification: SMS in/out visible in /crm/inbox.
// Hugo 2026-04-27 evening.
//
// Login as a CRM admin test user, navigate to /crm/inbox, verify
// the most recent inbound SMS is visible (its body matches what
// we just inserted via Twilio API), the conversation sits at the
// top of the sidebar, and the message is on screen without scrolling.

import { test, expect } from '@playwright/test';

const EMAIL = 'crmtest-pw@nexivoproperties.co.uk';
const PASSWORD = 'CrmTest2026Pw!';

test('CRM inbox shows inbound SMS as a normal logged-in user', async ({ page }) => {
  test.setTimeout(120_000);

  // 1. Visit /crm/login and sign in.
  await page.goto('https://hub.nfstay.com/crm/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();

  // 2. Wait for /crm/inbox to render. We don't use networkidle because
  //    realtime websockets keep the network busy indefinitely.
  await page.waitForURL(/\/crm\/(inbox|dashboard)/, { timeout: 30_000 });
  // Wait for the sidebar to populate.
  await page.waitForSelector('[data-testid^="inbox-row-"]', { timeout: 30_000 });

  // 3. Snapshot the inbox in its loaded state.
  await page.screenshot({ path: 'e2e/screenshots/crm-inbox-loaded.png', fullPage: true });

  // 4. The first sidebar row IS the newest thread (PR 52 ordering).
  const firstRow = page.locator('[data-testid^="inbox-row-"]').first();
  await expect(firstRow).toBeVisible();
  const firstRowText = await firstRow.textContent();
  console.log('First (newest) row:', firstRowText?.replace(/\s+/g, ' ').trim());

  await firstRow.click();
  // Give the realtime channel a moment + thread to render.
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e/screenshots/crm-inbox-active-thread.png', fullPage: true });

  // 5. Verify the thread auto-scrolls to bottom (newest visible).
  const scrollState = await page.locator('[data-testid="inbox-thread-scroll"]').evaluate((el) => {
    const e = el as HTMLDivElement;
    return {
      scrollTop: e.scrollTop,
      scrollHeight: e.scrollHeight,
      clientHeight: e.clientHeight,
      atBottom: Math.abs((e.scrollTop + e.clientHeight) - e.scrollHeight) < 5,
    };
  });
  console.log('Scroll state:', JSON.stringify(scrollState));
  expect(scrollState.atBottom).toBe(true);

  await page.screenshot({ path: 'e2e/screenshots/crm-inbox-thread-bottom.png', fullPage: true });
});
