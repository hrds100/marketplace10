import { test, expect } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
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

test.describe("Admin Deals Grouped View", () => {
  test.setTimeout(120_000);

  test("Admin deals page loads with 3 tabs", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/deals`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const heading = page.locator("h1");
    await expect(heading).toContainText("Deals");

    // Verify all 3 tabs exist
    await expect(page.locator("text=Pending Review")).toBeVisible();
    await expect(page.locator("text=Live")).toBeVisible();
    await expect(page.locator("text=Inactive")).toBeVisible();
  });

  test("Deals can be viewed in grouped mode with toggle", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/deals`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Look for the group/flat toggle button
    const toggle = page.locator('[data-testid="group-toggle"]');
    await expect(toggle).toBeVisible();

    // Check if grouped view is active by default
    const toggleText = await toggle.textContent();
    if (toggleText?.includes("Grouped by landlord")) {
      // Grouped view is active - check for landlord group headers or empty state
      const groupHeaders = page.locator('[data-testid="landlord-group-header"]');
      const emptyState = page.locator("text=No pending submissions");
      const hasGroups = await groupHeaders.count();
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      // Either groups or empty state should be visible
      expect(hasGroups > 0 || hasEmpty).toBeTruthy();

      if (hasGroups > 0) {
        // Verify first group shows phone or "Unknown"
        const firstHeader = groupHeaders.first();
        const headerText = await firstHeader.textContent();
        expect(headerText).toBeTruthy();
        // Should contain a property count badge
        expect(headerText).toMatch(/propert(y|ies)/i);
      }
    }

    // Toggle to flat list
    await toggle.click();
    await page.waitForTimeout(500);
    const toggleTextAfter = await toggle.textContent();
    expect(toggleTextAfter).toContain("Flat list");

    // Toggle back to grouped
    await toggle.click();
    await page.waitForTimeout(500);
    const toggleTextBack = await toggle.textContent();
    expect(toggleTextBack).toContain("Grouped by landlord");
  });

  test("Admin outreach page loads", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/outreach`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Page should load without error - check for no crash
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("Something went wrong");
  });
});
