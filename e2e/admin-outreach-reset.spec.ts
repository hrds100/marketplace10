import { test, expect } from "@playwright/test";

const BASE = "https://marketplace10-git-feat-outreach-862b2b-hugos-projects-f8cc36a8.vercel.app";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";

test.describe("Admin Outreach - Reset Button (PR #175)", () => {
  test.setTimeout(120_000);

  test("Admin outreach page loads with Listings tab as admin", async ({ page }) => {
    // Sign in as admin
    await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const signInTab = page.locator("text=Sign In").first();
    if (await signInTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signInTab.click();
      await page.waitForTimeout(500);
    }

    await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL("**/dashboard/**", { timeout: 20000 });

    // Navigate to outreach page
    await page.goto(`${BASE}/admin/outreach`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Assert page is accessible to admin (not redirected)
    await expect(page).toHaveURL(/\/admin\/outreach/);

    // Assert Listings/Landlord Activation tab is visible
    await expect(page.locator("text=Landlord Activation").first()).toBeVisible({ timeout: 5000 });

    // If there are landlord groups, assert the Reset button exists
    const groups = page.locator('button[title*="Reset test data"]');
    const groupCount = await groups.count();
    if (groupCount > 0) {
      // Data exists - verify reset button visible
      await expect(groups.first()).toBeVisible();

      // Register dialog handler to dismiss (don't actually reset)
      page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('This cannot be undone');
        await dialog.dismiss();
      });

      await groups.first().click();
      await page.waitForTimeout(1000);
    } else {
      // No data on preview — verify page structure instead
      console.log('No landlord groups found on preview - verifying page structure only');
      await expect(page.locator("text=Tenant Requests").first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("AdminOutreachV2 source contains reset function with correct logic", async () => {
    const fs = await import('fs');
    const path = new URL('../src/pages/admin/AdminOutreachV2.tsx', import.meta.url).pathname;
    const content = fs.readFileSync(path, 'utf-8');

    // Reset function exists
    expect(content).toContain('const resetLandlord = async (group: LandlordGroup)');

    // Calls edge function (not direct DB writes)
    expect(content).toContain('reset-landlord-test-data');

    // Confirmation before destructive action
    expect(content).toContain('window.confirm(');
    expect(content).toContain('This cannot be undone.');

    // Audit logged
    expect(content).toContain('reset_landlord_test_data');
    expect(content).toContain('logAdminAction');

    // Refreshes query after reset
    expect(content).toContain('queryClient.invalidateQueries');

    // Button in UI with Trash2 icon
    expect(content).toContain('resetLandlord(group)');
    expect(content).toContain('<Trash2');
    expect(content).toContain('Resetting...');
  });
});
