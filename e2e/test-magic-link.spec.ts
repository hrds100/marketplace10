import { test, expect } from '@playwright/test';

test('magic link opens inbox without error', async ({ page }) => {
  const TOKEN = '2062a9eaa6d76efe9d3f80bd24025502a435855279e705eec939cc54056a96ba';
  await page.goto(`https://hub.nfstay.com/inbox?token=${TOKEN}`);
  
  // Wait for the magic login to process and redirect
  await page.waitForTimeout(8000);
  
  const finalUrl = page.url();
  console.log('Final URL:', finalUrl);
  
  // Must NOT show error page
  const errorVisible = await page.locator('text=Link issue').isVisible().catch(() => false);
  const notFound = await page.locator('text=NOT_FOUND').isVisible().catch(() => false);
  expect(errorVisible).toBe(false);
  expect(notFound).toBe(false);
  
  // Should redirect to dashboard/inbox
  expect(finalUrl).toContain('/dashboard/inbox');
});
