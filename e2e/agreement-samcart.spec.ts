import { test, expect } from "@playwright/test";

const AGREEMENT_URL = "https://hub.nfstay.com/agreement/mark-01";

test.setTimeout(120000);

test("agreement → sign in → SamCart has wallet + amount in URL", async ({ page }) => {
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

  // 3. Confirm → auth prompt → Sign In page
  await page.locator("button:has-text('Confirm & Proceed to Payment')").click();
  await expect(page.locator("text=You're almost a partner")).toBeVisible({ timeout: 10000 });
  await page.locator("button:has-text('Sign In')").click();
  await page.waitForURL(/\/signin/, { timeout: 10000 });

  // 4. Fill admin credentials (known working account)
  await page.waitForTimeout(2000);
  await page.locator('input[placeholder="Enter your email"]').fill("admin@hub.nfstay.com");
  await page.locator('input[placeholder="Enter your password"]').fill("Dgs58913347.");

  // 5. Set up route interception to capture SamCart redirect URL
  let capturedSamcartUrl = "";
  await page.route("**stay.samcart.com**", (route) => {
    capturedSamcartUrl = route.request().url();
    route.abort();
  });

  // 6. Submit sign in (the form uses onSubmit, button type=submit not guaranteed)
  await page.locator('button:has-text("Sign In")').last().click();
  console.log("Sign-in submitted, waiting for redirect flow...");

  // 7. Wait for redirect back to agreement page
  try {
    await page.waitForURL(/\/agreement\/mark/, { timeout: 30000 });
    console.log("Redirected to agreement page, wallet fetch in progress...");
  } catch {
    const url = page.url();
    console.log("Did not reach /agreement/. Current URL:", url);
    await page.screenshot({ path: "e2e/screenshots/agreement-samcart-debug.png", fullPage: true });
    if (!url.includes("agreement")) {
      expect(url, "Should have redirected to /agreement/ after sign-in").toContain("agreement");
    }
  }

  // 8. Wait for SamCart redirect to be intercepted (wallet fetch may take time)
  const deadline = Date.now() + 50000;
  while (!capturedSamcartUrl && Date.now() < deadline) {
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: "e2e/screenshots/agreement-samcart-final.png", fullPage: false });

  console.log("Captured SamCart URL:", capturedSamcartUrl ? capturedSamcartUrl.slice(0, 80) + "..." : "(none)");

  if (capturedSamcartUrl) {
    const url = new URL(capturedSamcartUrl);

    expect(url.searchParams.get("first_name")).toBe("Hugo");
    expect(url.searchParams.get("last_name")).toBe("De Souza");
    expect(url.searchParams.get("email")).toContain("admin@hub.nfstay.com");

    const phoneData = url.searchParams.get("phone_number");
    expect(phoneData).toBeTruthy();
    const parsed = JSON.parse(phoneData!);
    console.log("phone_number payload:", JSON.stringify(parsed, null, 2));

    expect(parsed.investAmountUsd).toBeGreaterThan(0);
    expect(parsed.propertyId).toBeGreaterThan(0);
    expect(parsed.recipient).toBeTruthy();
    expect(typeof parsed.recipient).toBe("string");
    expect(parsed.recipient.length).toBeGreaterThan(5);

    const customWallet = url.searchParams.get("custom_0zdAJJKy");
    expect(customWallet).toBeTruthy();
    expect(customWallet).toBe(parsed.recipient);

    const amountParam = url.searchParams.get("amount");
    expect(amountParam).toBeTruthy();
    expect(Number(amountParam)).toBeGreaterThan(0);

    console.log("\n✅ wallet:", parsed.recipient.slice(0, 12) + "...");
    console.log("✅ amount (PWYW):", amountParam);
    console.log("✅ amount (phone_number):", parsed.investAmountUsd);
    console.log("✅ propertyId:", parsed.propertyId);
  } else {
    console.log("Current page URL:", page.url());
    await page.screenshot({ path: "e2e/screenshots/agreement-samcart-debug.png", fullPage: true });
    expect(capturedSamcartUrl, "SamCart redirect was not captured — wallet fetch may have failed").toBeTruthy();
  }
});
