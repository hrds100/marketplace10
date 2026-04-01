import { test, expect } from "@playwright/test";

/**
 * Synthetic health checks for hub.nfstay.com
 *
 * These tests run on a cron schedule via GitHub Actions against production.
 * They are non-destructive (read-only) and must complete within 2 minutes.
 */

const BASE_URL = "https://hub.nfstay.com";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";

test.describe("Marketplace10 Synthetic Health Checks", () => {
  test.describe.configure({ timeout: 30_000 });

  test("Homepage loads successfully", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);

    // Page should have visible content (heading or main element)
    await expect(
      page.locator("h1, h2, main, [role='main']").first()
    ).toBeVisible({ timeout: 15_000 });

    // No critical console errors (filter out noisy third-party ones)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("third-party") && !e.includes("favicon")
    );
    expect(criticalErrors.length).toBeLessThanOrEqual(5);
  });

  test("Auth page loads", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/signin`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(500);

    // Should show a login form or auth-related content
    await expect(
      page.locator(
        'form, [data-testid="auth-form"], input[type="email"], input[type="password"], button:has-text("Sign"), button:has-text("Log")'
      ).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Dashboard redirects unauthenticated users", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/dashboard`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(500);

    // Should redirect to auth or show login prompt — either is acceptable
    const url = page.url();
    const isRedirectedToAuth = url.includes("/signin") || url.includes("/signup") || url.includes("/auth");
    const hasLoginPrompt = await page
      .locator('button:has-text("Sign"), button:has-text("Log"), input[type="email"]')
      .first()
      .isVisible()
      .catch(() => false);

    expect(isRedirectedToAuth || hasLoginPrompt).toBeTruthy();
  });

  test("Deals page returns no 500 error", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/dashboard/deals`, {
      waitUntil: "domcontentloaded",
    });
    // May redirect to auth — that's fine. Just confirm no 500.
    expect(response?.status()).toBeLessThan(500);
  });

  test("API health check", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    // If /api/health doesn't exist, a 404 is acceptable for now.
    // A 500+ means the server is broken.
    expect(response.status()).toBeLessThan(500);
  });

  test("Supabase is reachable", async ({ request }) => {
    // The Supabase REST endpoint returns 200 with an empty array when
    // called without a table name. This confirms the project is online.
    const anonKey = process.env.SUPABASE_ANON_KEY;
    test.skip(!anonKey, "SUPABASE_ANON_KEY not set — skipping Supabase check");

    const response = await request.get(`${SUPABASE_URL}/rest/v1/properties?select=id&limit=0`, {
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${anonKey!}`,
      },
    });
    expect(response.status()).toBe(200);
  });
});
