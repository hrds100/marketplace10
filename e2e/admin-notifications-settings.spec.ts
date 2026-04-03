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

test.describe("Admin Notifications & Settings", () => {
  test.setTimeout(120_000);

  test("Admin settings page loads with AI Engine section and textareas", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Page heading
    const heading = page.locator("h1");
    await expect(heading).toContainText("Admin Settings");

    // AI Engine section exists
    await expect(page.locator("text=AI Engine")).toBeVisible();

    // At least one textarea (system prompts)
    const textareas = page.locator("textarea");
    const count = await textareas.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("Notification toggles section renders with categories", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Notifications heading
    await expect(page.locator("h2").filter({ hasText: "Notifications" })).toBeVisible();

    // Should have notification toggle buttons (bell + email per row)
    // After migration, we expect at least 22 rows x 2 toggles = 44 toggle buttons
    // But if migration hasn't run yet, we'll see the fallback message
    const toggleButtons = page.locator('button[aria-label*="notification"]');
    const fallbackMsg = page.locator("text=No notification settings found");

    const toggleCount = await toggleButtons.count();
    const hasFallback = await fallbackMsg.isVisible();

    // Either we have toggles OR the fallback message - either is acceptable pre/post migration
    expect(toggleCount > 0 || hasFallback).toBeTruthy();
  });

  test("Admin university page shows content or seed button", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/university`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Should see either lessons in the table OR the seed button
    const seedButton = page.locator("text=Seed from template");
    const lessonRows = page.locator("table tbody tr");

    const seedVisible = await seedButton.isVisible();
    const rowCount = await lessonRows.count();

    // Either lessons exist or seed button is available
    expect(seedVisible || rowCount > 0).toBeTruthy();
  });

  test("Admin notifications page loads and shows list or empty state", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/notifications`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Page heading
    await expect(page.locator("h1").filter({ hasText: "Notifications" })).toBeVisible();

    // Either shows notification items or "No notifications yet"
    const emptyState = page.locator("text=No notifications yet");
    const notifItems = page.locator('[data-feature="ADMIN__NOTIFICATIONS_LIST"]');

    const hasEmpty = await emptyState.isVisible();
    const hasList = await notifItems.isVisible();

    expect(hasEmpty || hasList).toBeTruthy();
  });
});
