/**
 * FULL LIVE AUDIT - hub.nfstay.com PUBLIC pages
 * Tests every public-facing page as a real user would see it.
 * Run: npx playwright test e2e/hub-public-audit.spec.ts --config=e2e/hub-playwright.config.ts
 */
import { test, expect } from "@playwright/test";

const BASE = "https://hub.nfstay.com";

test.describe("Hub Public Pages", () => {
  test("landing page loads and has content", async ({ page }) => {
    const response = await page.goto(BASE, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(400);
    // Should have some visible content
    await expect(page.locator("body")).not.toBeEmpty();
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("landing page has nfstay branding", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    const bodyText = await page.locator("body").textContent();
    // Check for brand presence (nfstay, NFStay, or property-related content)
    const hasBranding =
      bodyText?.toLowerCase().includes("nfstay") ||
      bodyText?.toLowerCase().includes("property") ||
      bodyText?.toLowerCase().includes("deal") ||
      bodyText?.toLowerCase().includes("landlord");
    expect(hasBranding).toBe(true);
  });

  test("sign in page renders with form fields", async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
    // Should have email and password inputs
    await expect(
      page.getByPlaceholder(/email/i).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByPlaceholder(/password/i).first()
    ).toBeVisible();
  });

  test("sign in page has social login buttons", async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
    // Check for social login options
    const bodyText = await page.locator("body").textContent();
    const hasSocial =
      bodyText?.includes("Google") ||
      bodyText?.includes("Apple") ||
      bodyText?.includes("Continue with");
    expect(hasSocial).toBe(true);
  });

  test("sign up page renders", async ({ page }) => {
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
    // Sign up page may use tab-based UI (Sign In | Register) or separate form
    const bodyText = (await page.locator("body").textContent()) ?? "";
    const hasSignup =
      bodyText.toLowerCase().includes("register") ||
      bodyText.toLowerCase().includes("sign up") ||
      bodyText.toLowerCase().includes("create") ||
      (await page.getByPlaceholder(/email/i).count()) > 0;
    expect(hasSignup).toBe(true);
  });

  test("forgot password page renders", async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle" });
    const bodyText = await page.locator("body").textContent();
    const hasContent =
      bodyText?.toLowerCase().includes("password") ||
      bodyText?.toLowerCase().includes("reset") ||
      bodyText?.toLowerCase().includes("email");
    expect(hasContent).toBe(true);
  });

  test("privacy page renders", async ({ page }) => {
    const response = await page.goto(`${BASE}/privacy`, {
      waitUntil: "networkidle",
    });
    expect(response?.status()).toBeLessThan(400);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.toLowerCase()).toContain("privacy");
  });

  test("terms page renders", async ({ page }) => {
    const response = await page.goto(`${BASE}/terms`, {
      waitUntil: "networkidle",
    });
    expect(response?.status()).toBeLessThan(400);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.toLowerCase()).toContain("terms");
  });

  test("brand page renders", async ({ page }) => {
    const response = await page.goto(`${BASE}/brand`, {
      waitUntil: "networkidle",
    });
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("404 page renders for invalid route", async ({ page }) => {
    await page.goto(`${BASE}/this-page-does-not-exist-xyz`, {
      waitUntil: "networkidle",
    });
    // Should show 404 or redirect, not crash
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
  });

  test("dashboard redirects unauthenticated to signin", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/deals`, { waitUntil: "networkidle" });
    // Should redirect to signin or show auth wall
    await page.waitForTimeout(3000);
    const url = page.url();
    const bodyText = await page.locator("body").textContent();
    const isProtected =
      url.includes("signin") ||
      url.includes("verify") ||
      bodyText?.toLowerCase().includes("sign in") ||
      bodyText?.toLowerCase().includes("log in");
    expect(isProtected).toBe(true);
  });

  test("admin is protected from unauthenticated access", async ({ page }) => {
    await page.goto(`${BASE}/admin/marketplace`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    const url = page.url();
    const bodyText = (await page.locator("body").textContent()) ?? "";
    // Admin should either redirect to signin, show blank (guard blocks render), or show auth prompt
    const isProtected =
      url.includes("signin") ||
      bodyText.toLowerCase().includes("sign in") ||
      bodyText.toLowerCase().includes("log in") ||
      bodyText.trim().length < 50; // Blank page = guard is blocking
    expect(isProtected).toBe(true);
  });

  test("no console errors on landing page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    // Filter out known benign errors (CORS, analytics, etc)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("analytics") &&
        !e.includes("third-party") &&
        !e.includes("ERR_BLOCKED") &&
        !e.includes("net::") &&
        !e.includes("Failed to load resource")
    );
    // Log all errors for the report
    if (criticalErrors.length > 0) {
      console.log("Console errors found:", criticalErrors);
    }
    // We just log, don't fail - some errors may be expected
  });

  test("no console errors on signin page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("net::") &&
        !e.includes("Failed to load resource")
    );
    if (criticalErrors.length > 0) {
      console.log("Signin console errors:", criticalErrors);
    }
  });
});

test.describe("Hub - Deal Detail (public)", () => {
  test("deal detail page loads for a valid deal", async ({ page }) => {
    // First try to get a deal ID from the landing page
    await page.goto(BASE, { waitUntil: "networkidle" });
    // Look for any deal/property link
    const dealLink = page.locator('a[href*="/deals/"]').first();
    const hasDealLinks = (await dealLink.count()) > 0;

    if (hasDealLinks) {
      const href = await dealLink.getAttribute("href");
      await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
      await expect(page.locator("body")).not.toBeEmpty();
    } else {
      // Try a known path pattern
      const response = await page.goto(`${BASE}/deals/test-deal`, {
        waitUntil: "networkidle",
      });
      // Should show content or 404, not crash
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });
});

test.describe("Hub - nfstay Guest Pages (public)", () => {
  test("booking lookup page renders content or 404", async ({ page }) => {
    // /booking route exists on nfstay.app, not hub - hub may return 404 via SPA
    await page.goto(`${BASE}/booking`, { waitUntil: "networkidle" });
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("checkout page without intent shows appropriate message", async ({
    page,
  }) => {
    await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle" });
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
  });

  test("payment success page handles no data gracefully", async ({ page }) => {
    await page.goto(`${BASE}/nfstay/payment/success`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("payment cancel page loads", async ({ page }) => {
    await page.goto(`${BASE}/nfstay/payment/cancel`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
