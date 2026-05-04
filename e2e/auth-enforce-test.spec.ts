import { test, expect } from "@playwright/test";

const AGREEMENT_URL = "https://hub.nfstay.com/agreement/mark-01";

test.setTimeout(60000);

test("anonymous user redirected to /signin with agreement messaging after signing", async ({ page }) => {
  // 1. Load agreement as anonymous user
  await page.goto(AGREEMENT_URL, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Property Service" })).toBeVisible({ timeout: 20000 });
  console.log("✅ Agreement page loaded (anonymous)");

  // 2. Fill signature
  await page.locator("#signature").scrollIntoViewIfNeeded();
  await page.locator('input[placeholder="Enter your full name"]').fill("Test User");
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 40);
    await page.mouse.up();
  }
  console.log("✅ Name + signature filled");

  // 3. Click confirm → should redirect to /signin with agreement redirect param
  await page.locator("button:has-text('Confirm & Proceed to Payment')").click();
  await page.waitForURL(/\/signin\?redirect=/, { timeout: 15000 });
  expect(page.url()).toContain("redirect=%2Fagreement%2F");
  console.log("✅ Redirected to /signin with agreement redirect param");

  // 4. Verify agreement-specific messaging on /signin page
  await expect(page.locator("text=Agreement signed")).toBeVisible({ timeout: 10000 });
  console.log("✅ 'Agreement signed' badge visible");

  await expect(page.locator("text=You're almost a partner")).toBeVisible({ timeout: 5000 });
  console.log("✅ 'You're almost a partner' heading visible");

  // 5. Verify the real sign-in form is present (email, password, social buttons)
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  console.log("✅ Sign-in form fields visible");

  await expect(page.locator("button:has-text('Google')")).toBeVisible();
  await expect(page.locator("button:has-text('Apple')")).toBeVisible();
  console.log("✅ Social login buttons visible");

  // 6. Verify right panel shows "What happens next" steps (desktop only)
  const rightPanel = page.locator("text=What happens next");
  if (await rightPanel.isVisible().catch(() => false)) {
    await expect(page.locator("text=Sign in or create account")).toBeVisible();
    await expect(page.locator("text=Complete payment")).toBeVisible();
    await expect(page.locator("text=Access your dashboard")).toBeVisible();
    console.log("✅ Agreement right panel with next steps visible");
  } else {
    console.log("ℹ️ Right panel not visible (likely mobile viewport)");
  }

  // 7. Screenshot
  await page.screenshot({ path: "e2e/screenshots/auth-agreement-signin.png", fullPage: true });
  console.log("✅ Screenshot saved");
});
