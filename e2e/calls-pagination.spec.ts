import { test, expect, Page } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://hub.nfstay.com';
const EMAIL = 'admin@hub.nfstay.com';
const PASSWORD = 'Dgs58913347.';

async function signIn(page: Page) {
  await page.goto(`${BASE}/signin`);
  await page.waitForTimeout(3000);
  const url = page.url();
  if (!url.includes('signin')) return;
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/**', { timeout: 15_000 });
}

test.describe('Call history page — pagination + prospect name + stage', () => {
  test('loads all calls with total count, prospect names, and stages', async ({ page }) => {
    test.setTimeout(60_000);

    await signIn(page);
    await page.goto(`${BASE}/crm/calls`);
    await page.waitForTimeout(8000);

    await page.screenshot({
      path: 'e2e/screenshots/calls-pagination-01-loaded.png',
      fullPage: true,
    });

    const headerText = await page.locator('header p').first().textContent();
    console.log('Header:', headerText);

    const match = headerText?.match(/(\d+) of (\d+) calls/);
    const shown = parseInt(match?.[1] ?? '0');
    const total = parseInt(match?.[2] ?? '0');
    console.log(`Shown: ${shown}, Total: ${total}`);

    if (total === 0) {
      console.log('No calls in DB — skipping data assertions');
      return;
    }

    expect(shown).toBeGreaterThan(0);
    expect(total).toBeGreaterThan(0);
    expect(shown).toBeLessThanOrEqual(total);

    // Prospect column: at least some rows should show a name (not "—")
    const prospectCells = page.locator('tbody tr td:nth-child(3)');
    const cellCount = await prospectCells.count();
    let namesFound = 0;
    for (let i = 0; i < Math.min(cellCount, 20); i++) {
      const text = await prospectCells.nth(i).textContent();
      if (text && !text.trim().startsWith('—')) namesFound++;
    }
    console.log(`Prospect names found: ${namesFound} / ${Math.min(cellCount, 20)}`);
    expect(namesFound).toBeGreaterThan(0);

    // Stage column: at least some rows should show a stage badge
    const stageCells = page.locator('tbody tr td:nth-child(6)');
    const stageCount = await stageCells.count();
    let stagesFound = 0;
    for (let i = 0; i < Math.min(stageCount, 20); i++) {
      const text = await stageCells.nth(i).textContent();
      if (text && !text.trim().startsWith('—')) stagesFound++;
    }
    console.log(`Stages found: ${stagesFound} / ${Math.min(stageCount, 20)}`);
    expect(stagesFound).toBeGreaterThan(0);

    // If there are more calls than loaded, "Load more" button should appear
    if (total > shown) {
      const loadMoreBtn = page.locator('button', { hasText: /Load more calls/ });
      await expect(loadMoreBtn).toBeVisible({ timeout: 5000 });
      console.log('Load more button visible');
    }

    await page.screenshot({
      path: 'e2e/screenshots/calls-pagination-02-verified.png',
      fullPage: true,
    });
  });
});
