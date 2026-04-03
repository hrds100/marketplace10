import { test, expect } from '@playwright/test';

// Uses preview URL when available, falls back to live
const BASE = process.env.TEST_BASE_URL || 'https://hub.nfstay.com';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASS = 'Dgs58913347.';

async function adminSignIn(page: any) {
  await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const signInTab = page.locator('text=Sign In').first();
  if (await signInTab.isVisible()) await signInTab.click();
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL('**/dashboard/**', { timeout: 20000 });
}

test.describe('List-a-Deal: optional fields and pricing flow', () => {
  test.setTimeout(120_000);

  test('deposit and profit inputs are not required and labels have no asterisk', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/dashboard/list-a-deal`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Open Financials accordion
    const financials = page.locator('text=Financials').first();
    if (await financials.isVisible()) await financials.click();
    await page.waitForTimeout(500);

    // Deposit input should NOT be required
    const depositInput = page.locator('input[placeholder="2400"]').first();
    await expect(depositInput).toBeVisible({ timeout: 3000 });
    await expect(depositInput).not.toHaveAttribute('required', '');

    // Profit input should NOT be required
    const profitInput = page.locator('input[placeholder="600"]').first();
    await expect(profitInput).toBeVisible({ timeout: 3000 });
    await expect(profitInput).not.toHaveAttribute('required', '');

    // Deposit label has no asterisk
    const depositLabel = page.locator('label:has-text("Deposit")').first();
    await expect(depositLabel).toBeVisible();
    const depositText = await depositLabel.textContent();
    expect(depositText).not.toContain('*');

    // Profit label has no asterisk
    const profitLabel = page.locator('label:has-text("profit")').first();
    await expect(profitLabel).toBeVisible();
    const profitText = await profitLabel.textContent();
    expect(profitText).not.toContain('*');
  });

  test('email prefills from auth even without WhatsApp', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/dashboard/list-a-deal`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Open Contact Details accordion
    const contact = page.locator('text=Contact Details').first();
    if (await contact.isVisible()) await contact.click();
    await page.waitForTimeout(1500);

    // The contact email field should have a value (from auth email fallback)
    const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').last();
    const val = await emailInput.inputValue();
    expect(val.length).toBeGreaterThan(0);
  });

  test('form can submit without deposit/profit and shows analysing phase', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/dashboard/list-a-deal`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Select property type via the category cards (use force click to bypass overlays)
    const flatCard = page.locator('[data-feature="DEALS__LIST_A_DEAL"] >> text=Flat').first();
    await flatCard.click({ force: true });
    await page.waitForTimeout(500);

    // Select 2-bed
    const twoBed = page.locator('button:has-text("2-bed")').first();
    if (await twoBed.isVisible({ timeout: 3000 }).catch(() => false)) {
      await twoBed.click({ force: true });
      await page.waitForTimeout(300);
    }

    // Fill city
    const cityInput = page.locator('input[placeholder="e.g. Manchester"]').first();
    await expect(cityInput).toBeVisible({ timeout: 5000 });
    await cityInput.fill('Manchester');

    // Fill postcode
    const postcodeInput = page.locator('input[placeholder="e.g. M14"]').first();
    await postcodeInput.fill('M14 5TP');

    // Open Financials, fill rent only
    const financials = page.locator('text=Financials').first();
    if (await financials.isVisible()) await financials.click();
    await page.waitForTimeout(500);
    const rentInput = page.locator('input[placeholder="1200"]').first();
    await rentInput.fill('1200');

    // Check SA confirmation
    const saCheckbox = page.locator('#sa-confirm');
    if (await saCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saCheckbox.click({ force: true });
      await page.waitForTimeout(300);
    }

    // Submit
    const submitBtn = page.locator('button[type="submit"]:has-text("Submit Deal")');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // Should see analysing, congratulations, or submitted (any = success, no validation error)
    const success = page.locator('text=Analysing similar listings').or(
      page.locator('text=Congratulations')
    ).or(
      page.locator('text=Deal submitted')
    );
    await expect(success.first()).toBeVisible({ timeout: 30000 });
  });
});
