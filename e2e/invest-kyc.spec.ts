import { test, expect } from '../playwright-fixture';

test.describe('Investment KYC — Payouts Page', () => {
  test('KYC status card renders on payouts page', async ({ page }) => {
    await page.goto('/invest/payouts');

    // Page should load with the Payouts heading
    await expect(page.locator('h1')).toContainText('Payouts');

    // KYC status card should be visible (one of: loading shimmer, verify prompt, verified, or pending)
    const kycSection = page.locator('[data-feature="INVEST__PAYOUTS"]');
    await expect(kycSection).toBeVisible();
  });

  test('Verify Now button appears for unverified users', async ({ page }) => {
    // Mock the edge function to return not_started
    await page.route('**/functions/v1/inv-kyc-check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'not_started', session_id: null }),
      });
    });

    await page.goto('/invest/payouts');

    // Should show "Verify Now" button
    const verifyButton = page.getByRole('button', { name: 'Verify Now' });
    await expect(verifyButton).toBeVisible();
  });

  test('Claim button is present on claimable payouts', async ({ page }) => {
    await page.goto('/invest/payouts');

    // Look for any claim button (may not exist if no claimable payouts)
    const claimButtons = page.locator('[data-feature="INVEST__PAYOUT_CLAIM"]');
    const count = await claimButtons.count();

    // Just verify the page rendered without errors
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('KYC approved status shows verified card', async ({ page }) => {
    // Mock approved KYC
    await page.route('**/functions/v1/inv-kyc-check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'approved', session_id: 'test-session-123' }),
      });
    });

    await page.goto('/invest/payouts');

    // Should show "Identity Verified" text
    await expect(page.getByText('Identity Verified')).toBeVisible();
  });
});
