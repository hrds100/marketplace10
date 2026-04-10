import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://hub.nfstay.com";

test.describe('Airbnb pricing label updates', () => {
  test('property cards show "Airbnb verified" and "Est. monthly cash flow"', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/deals`);
    await page.waitForLoadState('networkidle');

    // Wait for at least one property card to render
    const card = page.locator('[data-feature="DEALS__PROPERTY_CARD"]').first();
    await expect(card).toBeVisible({ timeout: 15000 });

    // Check that "Airbnb verified" text appears (not "AirDNA")
    const verifiedText = card.locator('text=Airbnb verified');
    await expect(verifiedText).toBeVisible();

    // Check that "AirDNA" text does NOT appear on cards
    const airdnaText = card.locator('text=AirDNA');
    await expect(airdnaText).toHaveCount(0);

    // Check that "Est. monthly cash flow" appears (not "profit")
    const cashFlowLabel = card.locator('text=Est. monthly cash flow');
    await expect(cashFlowLabel).toBeVisible();

    // Verify the old "Est. monthly profit" label is gone from regular cards
    const profitLabel = card.locator('text=Est. monthly profit');
    await expect(profitLabel).toHaveCount(0);
  });

  test('Airbnb verified link points to airbnb.co.uk', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/deals`);
    await page.waitForLoadState('networkidle');

    const card = page.locator('[data-feature="DEALS__PROPERTY_CARD"]').first();
    await expect(card).toBeVisible({ timeout: 15000 });

    // The "Airbnb verified" link should point to airbnb.co.uk
    const link = card.locator('a:has-text("Airbnb verified")');
    const href = await link.getAttribute('href');
    expect(href).toContain('airbnb.co.uk');
  });
});
