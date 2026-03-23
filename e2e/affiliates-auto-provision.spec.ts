/**
 * AFFILIATES AUTO-PROVISION TEST
 * Verifies that visiting /dashboard/affiliates auto-creates an affiliate profile
 * and shows the full agent dashboard (referral link, stats, sharing kit).
 *
 * Run: npx playwright test e2e/affiliates-auto-provision.spec.ts --config=e2e/hub-playwright.config.ts
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";

const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASSWORD = "Dgs58913347.";

async function injectAuth(page: Page, email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const tokens = await res.json();
  if (!tokens.access_token) throw new Error(`Auth failed: ${JSON.stringify(tokens)}`);
  const storageKey = "sb-asazddtvjvmckouxcmmo-auth-token";
  await page.goto(BASE, { waitUntil: "commit" });
  await page.evaluate(
    ([key, data]) => localStorage.setItem(key, data),
    [storageKey, JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: tokens.user,
    })]
  );
}

test.describe("Affiliates - Auto Provision", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test("Page auto-provisions affiliate profile and shows full dashboard", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: "networkidle", timeout: 30000 });
    // Wait for auto-provision + re-render (up to 10 seconds)
    await page.waitForTimeout(5000);

    const body = await page.locator("body").textContent() ?? "";
    const bodyLower = body.toLowerCase();

    // Should now show the full agent dashboard
    expect(bodyLower).toContain("your referral link");
    expect(bodyLower).toContain("sharing kit");
    expect(bodyLower).toContain("monthly earnings");
    expect(bodyLower).toContain("recent activity");
    expect(bodyLower).toContain("commission rates");
  });

  test("Referral link contains hub.nfstay.com", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);

    const readonlyInput = page.locator('input[readonly]');
    const count = await readonlyInput.count();
    expect(count).toBeGreaterThan(0);
    const value = await readonlyInput.first().inputValue();
    expect(value).toContain("hub.nfstay.com");
  });

  test("Copy button works for referral link", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);

    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    const copyBtn = page.locator("button").filter({ hasText: /^copy$/i });
    if ((await copyBtn.count()) > 0) {
      await copyBtn.first().click();
      await page.waitForTimeout(1000);
      const body = await page.locator("body").textContent() ?? "";
      expect(body.toLowerCase()).toContain("copied");
    }
  });

  test("Stats bar shows 4 stat cards", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);

    const body = await page.locator("body").textContent() ?? "";
    const bodyLower = body.toLowerCase();
    expect(bodyLower).toContain("link clicks");
    expect(bodyLower).toContain("signups");
    expect(bodyLower).toContain("paid users");
    expect(bodyLower).toContain("pending balance");
  });

  test("Sharing kit has WhatsApp, Email, Copy Message options", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);

    const body = await page.locator("body").textContent() ?? "";
    expect(body).toContain("WhatsApp");
    expect(body).toContain("Email");
    expect(body).toContain("Copy Message");
  });

  test("Share via WhatsApp button links to wa.me", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);

    const waBtn = page.locator("a").filter({ hasText: /share via whatsapp/i });
    expect(await waBtn.count()).toBeGreaterThan(0);
    const href = await waBtn.getAttribute("href");
    expect(href).toContain("wa.me");
  });

  test("Commission rates card shows 40% and 10%", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);

    const body = await page.locator("body").textContent() ?? "";
    expect(body).toContain("40%");
    expect(body).toContain("10%");
    expect(body).toContain("Commission Rates");
  });

  test("Payouts section links to Settings", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);

    const settingsLink = page.locator("a").filter({ hasText: /payout settings/i });
    expect(await settingsLink.count()).toBeGreaterThan(0);
    const href = await settingsLink.getAttribute("href");
    expect(href).toContain("/dashboard/settings");
  });

  test("No crash on page load", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);
    const overlay = page.locator("vite-error-overlay");
    await expect(overlay).toHaveCount(0);
  });
});
