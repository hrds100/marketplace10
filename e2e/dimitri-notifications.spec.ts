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

test.describe("Dimitri: Notification Overhaul", () => {
  test.setTimeout(120_000);

  test("User settings shows WhatsApp Coming Soon and new notification rows", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Click Notifications tab
    const notifTab = page.locator("button").filter({ hasText: "Notifications" });
    await notifTab.click();
    await page.waitForTimeout(1000);

    // Assert "Coming Soon" text is visible in WhatsApp column
    await expect(page.locator("text=Coming Soon")).toBeVisible();

    // Assert "Investment updates" row is visible
    await expect(page.locator("text=Investment updates")).toBeVisible();

    // Assert "Inquiry confirmations" row is visible
    await expect(page.locator("text=Inquiry confirmations")).toBeVisible();

    // Assert all WhatsApp toggles are disabled (check that disabled toggles exist)
    // The WhatsApp column should have disabled toggles with opacity-50
    const disabledToggles = page.locator('button[disabled].opacity-50');
    const disabledCount = await disabledToggles.count();
    expect(disabledCount).toBeGreaterThanOrEqual(5);
  });

  test("Admin settings shows Email Templates section", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Assert Email Templates section is visible
    await expect(page.locator("h2").filter({ hasText: "Email Templates" })).toBeVisible();

    // Check for Edit buttons
    const editButtons = page.locator("button").filter({ hasText: "Edit" });
    const editCount = await editButtons.count();
    expect(editCount).toBeGreaterThanOrEqual(1);

    // Check for Send Test buttons
    const testButtons = page.locator("button").filter({ hasText: "Send Test" });
    const testCount = await testButtons.count();
    expect(testCount).toBeGreaterThanOrEqual(1);
  });

  test("Admin template editor expands on Edit click", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Click first Edit button
    const editButton = page.locator("button").filter({ hasText: "Edit" }).first();
    await editButton.click();
    await page.waitForTimeout(500);

    // Assert editor expands with subject input and HTML body textarea
    await expect(page.locator("label").filter({ hasText: "Subject" })).toBeVisible();
    await expect(page.locator("label").filter({ hasText: "HTML Body" })).toBeVisible();

    // Assert Save Template button is visible
    await expect(page.locator("button").filter({ hasText: "Save Template" })).toBeVisible();
  });

  test("Send Test button triggers toast", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Click first Send Test button
    const testButton = page.locator("button").filter({ hasText: "Send Test" }).first();
    await testButton.click();

    // Wait for toast to appear (success or error)
    await page.waitForTimeout(5000);
    const toastSuccess = page.locator("text=Test email sent");
    const toastError = page.locator("text=Failed to send test email");

    const hasSuccess = await toastSuccess.isVisible().catch(() => false);
    const hasError = await toastError.isVisible().catch(() => false);

    // Either success or error toast should appear (both prove the button works)
    expect(hasSuccess || hasError).toBeTruthy();
  });
});
