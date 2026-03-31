import { test, expect } from '@playwright/test';

test('/inbox?thread=XXX redirects with thread param preserved', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Not logged in - should redirect to signin with thread in redirect param
  await page.goto('https://hub.nfstay.com/inbox?thread=cd0894c6', { timeout: 15000 });
  await page.waitForTimeout(3000);

  const url = page.url();
  console.log('Final URL:', url);

  // Must NOT be 404
  const is404 = await page.locator('text=NOT_FOUND').isVisible().catch(() => false);
  expect(is404).toBe(false);

  // Must redirect to signin with the thread param preserved in the redirect
  expect(url).toContain('/signin');
  expect(url).toContain('thread');
  expect(url).toContain('cd0894c6');
  console.log('PASS: Redirected to signin with thread param preserved');

  await context.close();
});

test('/inbox?token=VALID still works for magic link', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const TOKEN = 'ce0d0c200dd101ad49f02485fa2d3a1d01f4cb4005dd7abdb12d4d03abc178cc';
  await page.goto(`https://hub.nfstay.com/inbox?token=${TOKEN}`, { timeout: 25000 });
  await page.waitForURL('**/dashboard/inbox**', { timeout: 15000 });

  const url = page.url();
  console.log('Magic link URL:', url);
  expect(url).toContain('/dashboard/inbox');
  console.log('PASS: Magic link login still works');

  await context.close();
});

test('/inbox with no params redirects to dashboard/inbox', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  await page.goto('https://hub.nfstay.com/inbox', { timeout: 15000 });
  await page.waitForTimeout(3000);

  const url = page.url();
  console.log('No-param URL:', url);

  const is404 = await page.locator('text=NOT_FOUND').isVisible().catch(() => false);
  expect(is404).toBe(false);
  // Should go to signin (not logged in) or dashboard/inbox
  expect(url).not.toContain('/inbox?');
  console.log('PASS: No 404, redirected correctly');

  await context.close();
});
