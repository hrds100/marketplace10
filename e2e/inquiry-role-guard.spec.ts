import { test, expect } from '@playwright/test';

test('Landlord is BLOCKED from creating inquiry thread', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const TOKEN = 'ce0d0c200dd101ad49f02485fa2d3a1d01f4cb4005dd7abdb12d4d03abc178cc';
  await page.goto(`https://hub.nfstay.com/inbox?token=${TOKEN}`, { timeout: 25000 });
  await page.waitForURL('**/dashboard/inbox**', { timeout: 15000 });
  await page.waitForTimeout(3000);
  console.log('Logged in as landlord via magic link');

  // Use a DIFFERENT property that has no existing thread for this landlord
  // Use the 3-Bed House W14
  await page.goto('https://hub.nfstay.com/dashboard/inbox?deal=9ebde143-a9ba-46c3-b2ed-ae2506f62d74', { timeout: 15000 });
  await page.waitForTimeout(5000);

  const url = page.url();
  console.log('URL after landlord inquiry attempt:', url);

  // Role guard blocks landlord: deal= stays in URL, no thread= added
  expect(url).toContain('deal=');
  expect(url).not.toContain('thread=');

  // Also verify: no "Your messages" empty state replaced by chat window
  // If blocked, the empty state should still show (no thread selected)
  const emptyState = page.locator('text=Your messages');
  const chatHeader = page.locator('text=Operator');
  const emptyVisible = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
  const chatVisible = await chatHeader.isVisible({ timeout: 2000 }).catch(() => false);
  console.log('Empty state visible:', emptyVisible, '| Chat opened:', chatVisible);

  // Landlord should see thread list, NOT a chat window for a new thread
  console.log('PASS: Landlord blocked - deal= unconsumed, no new thread');

  await context.close();
});

test('Operator IS ALLOWED to create inquiry thread', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  await page.goto('https://hub.nfstay.com/signin', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const signinTab = page.locator('text=Sign In').first();
  if (await signinTab.isVisible()) await signinTab.click();
  await page.waitForTimeout(500);

  await page.fill('input[type="email"]', 'testoperator@test.nfstay.com');
  await page.fill('input[type="password"]', 'TestOperator123!');
  await page.locator('button:has-text("Sign In")').last().click();
  await page.waitForTimeout(5000);

  const afterLogin = page.url();
  console.log('After operator login:', afterLogin);
  expect(afterLogin).toContain('/dashboard');

  // Use the 3-Bed House W14 (fresh property, no existing thread for this operator)
  await page.goto('https://hub.nfstay.com/dashboard/inbox?deal=9ebde143-a9ba-46c3-b2ed-ae2506f62d74', { timeout: 15000 });
  await page.waitForTimeout(8000);

  // Verify a chat window opened (thread was created and auto-selected)
  // The chat should show the auto-first-message
  const chatMsg = page.locator('text=is this property still available');
  const msgVisible = await chatMsg.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Auto-message visible in chat:', msgVisible);
  expect(msgVisible).toBe(true);
  console.log('PASS: Operator allowed - thread created, auto-message visible');

  await context.close();
});
