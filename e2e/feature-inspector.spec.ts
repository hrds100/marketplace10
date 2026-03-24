import { test, expect } from '@playwright/test';

/**
 * Simulate Alt key + mousemove in-page.
 * Playwright's keyboard.down('Alt') alone doesn't reliably fire DOM keydown,
 * and page.mouse.move() dispatches from a different target than expected.
 * We dispatch both events programmatically inside the page context.
 */
async function altHoverElement(page: import('@playwright/test').Page, selector: string) {
  await page.evaluate((sel) => {
    // Fire Alt keydown on window
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Alt', altKey: true, bubbles: true }),
    );
    // Fire mousemove from the target element
    const el = document.querySelector(sel) as HTMLElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: rect.x + rect.width / 2,
        clientY: rect.y + rect.height / 2,
        bubbles: true,
      }),
    );
  }, selector);
}

async function altRelease(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Alt', altKey: false, bubbles: true }),
    );
  });
}

test.describe('FeatureInspector overlay', () => {
  test('data-feature attributes exist on signin page', async ({ page }) => {
    await page.goto('/signin?inspector');
    await page.waitForSelector('[data-feature]', { timeout: 10000 });

    const count = await page.locator('[data-feature]').count();
    expect(count).toBeGreaterThan(0);

    const tag = await page.locator('[data-feature="AUTH"]').first().getAttribute('data-feature');
    expect(tag).toBe('AUTH');
  });

  test('Alt+hover highlights element and shows tooltip with tag', async ({ page }) => {
    await page.goto('/signin?inspector');
    await page.waitForSelector('[data-feature="AUTH"]', { timeout: 10000 });

    await altHoverElement(page, '[data-feature="AUTH"]');
    await page.waitForTimeout(100);

    // Check outline was applied (format: "rgb(30, 154, 128) solid 2px")
    const outline = await page.locator('[data-feature="AUTH"]').first().evaluate(
      (el) => el.style.outline,
    );
    expect(outline).toContain('solid');
    expect(outline).toContain('2px');

    // Tooltip should be visible with the tag name
    const tooltip = page.locator('div[data-feature="SHARED"]');
    await expect(tooltip).toBeVisible({ timeout: 3000 });
    await expect(tooltip).toContainText('AUTH');

    await altRelease(page);
  });

  test('inspector persists via localStorage across navigations', async ({ page }) => {
    // First visit with ?inspector sets localStorage
    await page.goto('/signin?inspector');
    await page.waitForSelector('[data-feature]', { timeout: 10000 });

    const stored = await page.evaluate(() => localStorage.getItem('feature-inspector-enabled'));
    expect(stored).toBe('true');

    // Navigate without ?inspector — inspector should still work via localStorage
    await page.goto('/signin');
    await page.waitForSelector('[data-feature="AUTH"]', { timeout: 10000 });

    await altHoverElement(page, '[data-feature="AUTH"]');
    await page.waitForTimeout(100);

    const outline = await page.locator('[data-feature="AUTH"]').first().evaluate(
      (el) => el.style.outline,
    );
    expect(outline).toContain('solid');
    expect(outline).toContain('2px');

    await altRelease(page);
  });

  test('?inspector=off deactivates the inspector', async ({ page }) => {
    // Activate first
    await page.goto('/signin?inspector');
    await page.waitForSelector('[data-feature]', { timeout: 10000 });

    // Deactivate
    await page.goto('/signin?inspector=off');
    await page.waitForSelector('[data-feature]', { timeout: 10000 });

    const stored = await page.evaluate(() => localStorage.getItem('feature-inspector-enabled'));
    expect(stored).toBeNull();
  });
});
