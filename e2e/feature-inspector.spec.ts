import { test, expect } from '@playwright/test';

test.describe('FeatureInspector overlay', () => {
  test('data-feature attributes are present on signin page', async ({ page }) => {
    await page.goto('/signin');

    // Wait for the page to render
    const taggedEl = page.locator('[data-feature="AUTH"]').first();
    await expect(taggedEl).toBeVisible({ timeout: 10000 });

    // Verify data-feature attribute value
    const tag = await taggedEl.getAttribute('data-feature');
    expect(tag).toBe('AUTH');
  });

  test('multiple data-feature elements exist on signin page', async ({ page }) => {
    await page.goto('/signin');

    // Wait for page to render
    await page.waitForSelector('[data-feature]', { timeout: 10000 });

    // Count data-feature elements on the page
    const count = await page.locator('[data-feature]').count();
    expect(count).toBeGreaterThan(0);
  });
});
