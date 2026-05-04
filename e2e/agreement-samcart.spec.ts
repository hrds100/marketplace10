import { test, expect } from "@playwright/test";

const AGREEMENT_URL = "https://hub.nfstay.com/agreement/mark-01";

test.setTimeout(120000);

test("agreement → sign in → lands on invest marketplace", async ({ page }) => {
  // 1. Load agreement
  await page.goto(AGREEMENT_URL, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Property Service" })).toBeVisible({ timeout: 20000 });

  // 2. Sign the agreement
  await page.locator("#signature").scrollIntoViewIfNeeded();
  await page.locator('input[placeholder="Enter your full name"]').fill("Hugo De Souza");
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 40);
    await page.mouse.up();
  }

  // 3. Confirm → redirects to /signin with marketplace redirect
  await page.locator("button:has-text('Confirm & Proceed to Payment')").click();
  await page.waitForURL(/\/signin\?redirect=/, { timeout: 15000 });
  expect(page.url()).toContain("redirect=/dashboard/invest/marketplace");
  await expect(page.locator("text=You're almost a partner")).toBeVisible({ timeout: 10000 });
  console.log("✅ Redirected to /signin with marketplace redirect + agreement messaging");

  // 4. Fill sign-in form
  await page.locator('input[type="email"]').fill("admin@hub.nfstay.com");
  await page.locator('input[type="password"]').fill("Dgs58913347.");
  await page.locator('form button[type="submit"]').click();
  console.log("✅ Sign-in submitted");

  // 5. Wait for redirect to marketplace
  await page.waitForURL(/\/dashboard\/invest\/marketplace/, { timeout: 30000 });
  console.log("✅ Landed on /dashboard/invest/marketplace");

  // 6. Verify marketplace page loaded and "Joint Venture Agreement" text
  await expect(page.locator("text=Joint Venture Agreement")).toBeVisible({ timeout: 15000 });
  console.log("✅ 'Joint Venture Agreement' text visible on marketplace");

  await page.screenshot({ path: "e2e/screenshots/agreement-marketplace-final.png", fullPage: false });
  console.log("✅ Screenshot saved");
});
