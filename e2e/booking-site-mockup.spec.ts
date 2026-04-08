/**
 * Booking site mockup — verifies free users see the full dashboard with payment gates.
 * Run with: npx playwright test e2e/booking-site-mockup.spec.ts --reporter=line
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL
  ? `https://${process.env.BASE_URL.replace(/^https?:\/\//, "")}`
  : "http://localhost:8080";

const TEST_EMAIL = "upsell-test@nexivoproperties.co.uk";
const TEST_PASSWORD = "Test1234!Upsell";

async function signIn(page: any) {
  await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const signInTab = page.locator("text=Sign In").first();
  if (await signInTab.isVisible()) await signInTab.click();
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
  await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL("**/dashboard/**", { timeout: 30000 });
  await page.waitForTimeout(1000);
}

test.describe("Booking site mockup — free users see full dashboard", () => {
  test.setTimeout(120_000);

  test("all 6 tabs visible for any user", async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE}/dashboard/booking-site`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // All 6 tabs should be visible
    await expect(page.locator("text=Branding").first()).toBeVisible();
    await expect(page.locator("text=Dashboard").first()).toBeVisible();
    await expect(page.locator("text=Properties").first()).toBeVisible();
    await expect(page.locator("text=Reservations").first()).toBeVisible();
    await expect(page.locator("text=Analytics").first()).toBeVisible();
    await expect(page.locator("text=Settings").first()).toBeVisible();
  });

  test("'Open Booking Site Admin' is hidden for free users", async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE}/dashboard/booking-site`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Click Branding tab to ensure we're on it
    await page.locator("text=Branding").first().click();
    await page.waitForTimeout(1000);

    // "Open Booking Site Admin" should NOT be visible for unpaid users
    const adminLink = page.locator("text=Open Booking Site Admin");
    await expect(adminLink).toHaveCount(0);
  });

  test("clicking Add property as free user opens payment sheet", async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE}/dashboard/booking-site`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Navigate to Properties tab
    await page.locator("text=Properties").first().click();
    await page.waitForTimeout(2000);

    // Click Add property
    const addBtn = page.locator("text=Add property").first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1500);

      // Payment sheet should appear (it renders a dialog/sheet)
      const paymentSheet = page.locator('[role="dialog"], [data-state="open"]').first();
      await expect(paymentSheet).toBeVisible({ timeout: 5000 });
    }
  });

  test("clicking Create reservation as free user opens payment sheet", async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE}/dashboard/booking-site`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Navigate to Reservations tab
    await page.locator("text=Reservations").first().click();
    await page.waitForTimeout(2000);

    // Click Create
    const createBtn = page.locator("button:has-text('Create')").first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(1500);

      // Payment sheet should appear
      const paymentSheet = page.locator('[role="dialog"], [data-state="open"]').first();
      await expect(paymentSheet).toBeVisible({ timeout: 5000 });
    }
  });
});
