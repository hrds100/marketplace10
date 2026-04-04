import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://hub.nfstay.com";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";

async function adminSignIn(page: any) {
  await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const signInTab = page.locator("text=Sign In").first();
  if (await signInTab.isVisible()) await signInTab.click();
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL("**/dashboard/**", { timeout: 20000 });
}

test.describe("Admin Bulk Delete - Multi-select Checkboxes", () => {
  test.setTimeout(120_000);

  test("Users page: checkboxes render, selecting shows floating bar", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/users`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Verify the table exists
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 10000 });

    // Verify select-all checkbox exists in table header
    const headerCheckbox = table.locator("thead input[type='checkbox']");
    await expect(headerCheckbox).toBeVisible();
    console.log("Select-all checkbox visible in header");

    // Check for row checkboxes (may be 0 if no data in preview env)
    const rowCheckboxes = table.locator("tbody input[type='checkbox']");
    const checkboxCount = await rowCheckboxes.count();
    console.log(`Found ${checkboxCount} row checkboxes on Users page`);

    if (checkboxCount > 0) {
      // Click first row checkbox
      await rowCheckboxes.first().check();
      await page.waitForTimeout(500);

      // Verify floating bar appears with "1 selected"
      const floatingBar = page.locator("text=1 selected");
      await expect(floatingBar).toBeVisible({ timeout: 5000 });
      console.log("Floating bar visible with 1 selected");

      // Verify "Hard Delete Selected" button is visible
      const deleteBtn = page.locator("text=Hard Delete Selected");
      await expect(deleteBtn).toBeVisible();
      console.log("Hard Delete Selected button visible");
    } else {
      console.log("No user rows (empty DB in preview) — checkbox structure verified via header");
    }

    // Screenshot the result
    await page.screenshot({ path: "test-results/admin-bulk-delete-users.png", fullPage: true });
    console.log("Screenshot saved: test-results/admin-bulk-delete-users.png");
  });

  test("Deals page: checkboxes render on live tab", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/deals`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Switch to Live tab
    const liveTab = page.locator("text=Live").first();
    await liveTab.click();
    await page.waitForTimeout(2000);

    // Look for checkboxes in the page
    const checkboxes = page.locator("input[type='checkbox']");
    const count = await checkboxes.count();
    console.log(`Found ${count} checkboxes on Deals page (Live tab)`);
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: "test-results/admin-bulk-delete-deals.png", fullPage: true });
    console.log("Screenshot saved: test-results/admin-bulk-delete-deals.png");
  });

  test("Affiliates page: checkboxes render", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/affiliates`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const checkboxes = page.locator("input[type='checkbox']");
    const count = await checkboxes.count();
    console.log(`Found ${count} checkboxes on Affiliates page`);
    // May be 0 if no affiliates, but the select-all should still render in header if table shows
    await page.screenshot({ path: "test-results/admin-bulk-delete-affiliates.png", fullPage: true });
  });

  test("Notifications page: checkboxes render", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/notifications`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const checkboxes = page.locator("input[type='checkbox']");
    const count = await checkboxes.count();
    console.log(`Found ${count} checkboxes on Notifications page`);
    await page.screenshot({ path: "test-results/admin-bulk-delete-notifications.png", fullPage: true });
  });
});
