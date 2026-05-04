import { test, expect } from "@playwright/test";

const AGREEMENT_URL = "https://hub.nfstay.com/agreement/mark-01";

test.setTimeout(60000);

test("anonymous user must sign in before SamCart redirect", async ({ page }) => {
  // 1. Load agreement as anonymous user (no login)
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

  // 3. Click confirm — should NOT redirect to SamCart, should show auth prompt
  await page.locator("button:has-text('Confirm & Proceed to Payment')").click();

  // 4. Verify AuthPrompt appears (sign-in enforcement)
  const authHeading = page.locator("text=You're almost a partner");
  const signInBtn = page.locator("button:has-text('Sign In')");
  const createAccountBtn = page.locator("button:has-text('Create Account')");

  await expect(authHeading).toBeVisible({ timeout: 10000 });
  console.log("✅ Auth prompt appeared: 'You're almost a partner'");

  await expect(signInBtn).toBeVisible();
  console.log("✅ Sign In button visible");

  await expect(createAccountBtn).toBeVisible();
  console.log("✅ Create Account button visible");

  // 5. Verify NOT redirected to SamCart (still on agreement page)
  expect(page.url()).toContain("/agreement/");
  expect(page.url()).not.toContain("samcart");
  console.log("✅ NOT redirected to SamCart — sign-in is enforced");

  // 6. Take screenshot as proof
  await page.screenshot({ path: "e2e/screenshots/auth-enforce-test.png", fullPage: true });
  console.log("✅ Screenshot saved");
});
