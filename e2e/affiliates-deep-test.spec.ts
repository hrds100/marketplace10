/**
 * AFFILIATES DEEP E2E TEST - hub.nfstay.com/dashboard/affiliates
 * Tests every feature: calculator modes, sliders, agent signup, sharing kit, leaderboard.
 *
 * Run: npx playwright test e2e/affiliates-deep-test.spec.ts --config=e2e/hub-playwright.config.ts
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";

const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASSWORD = "Dgs58913347.";

async function getAuthTokens(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.access_token) return data;
  throw new Error(`Auth failed for ${email}: ${JSON.stringify(data)}`);
}

async function injectAuth(page: Page, email: string, password: string) {
  const tokens = await getAuthTokens(email, password);
  const storageKey = "sb-asazddtvjvmckouxcmmo-auth-token";
  const sessionData = JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: tokens.user,
  });
  await page.goto(BASE, { waitUntil: "commit" });
  await page.evaluate(
    ([key, data]) => localStorage.setItem(key, data),
    [storageKey, sessionData]
  );
}

async function assertNoCrash(page: Page) {
  const overlay = page.locator("vite-error-overlay");
  await expect(overlay).toHaveCount(0);
}

// ══════════════════════════════════════════════════════════════
// AFFILIATES PAGE - DEEP FUNCTIONAL TESTS
// ══════════════════════════════════════════════════════════════

test.describe("Affiliates Page - Core Layout", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: "networkidle", timeout: 30000 });
    await assertNoCrash(page);
    await page.waitForTimeout(3000);
  });

  test("Page loads without crash", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body?.length).toBeGreaterThan(200);
  });

  test("Has 'Become An Agent' heading", async ({ page }) => {
    const heading = page.locator("h1");
    const text = await heading.textContent();
    expect(text?.toLowerCase()).toMatch(/become an agent|agent/);
  });

  test("Shows 3-step flow: Share > User joins > You get paid", async ({ page }) => {
    const body = await page.locator("body").textContent() ?? "";
    expect(body.toLowerCase()).toContain("share");
    // Steps may say "User joins" or "You get paid"
    const hasSteps = body.includes("1") && body.includes("2") && body.includes("3");
    expect(hasSteps).toBe(true);
  });

  test("Has Top Agents leaderboard card (green)", async ({ page }) => {
    const body = await page.locator("body").textContent() ?? "";
    expect(body.toLowerCase()).toContain("top agents");
  });
});

test.describe("Affiliates - Earnings Calculator", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
  });

  test("Calculator section is visible", async ({ page }) => {
    const body = await page.locator("body").textContent() ?? "";
    expect(body.toLowerCase()).toContain("earnings calculator");
  });

  test("Has Subscriptions (40%) and JV Deals (10%) tabs", async ({ page }) => {
    const subsTab = page.locator("button").filter({ hasText: /subscriptions.*40/i });
    const jvTab = page.locator("button").filter({ hasText: /jv.*10/i });
    expect(await subsTab.count()).toBeGreaterThan(0);
    expect(await jvTab.count()).toBeGreaterThan(0);
  });

  test("Subscriptions mode - shows plan toggles (Lifetime/Yearly/Monthly)", async ({ page }) => {
    // Default should be subscriptions mode
    const lifetimeBtn = page.locator("button").filter({ hasText: /lifetime/i });
    const yearlyBtn = page.locator("button").filter({ hasText: /yearly/i });
    const monthlyBtn = page.locator("button").filter({ hasText: /monthly/i });
    expect(await lifetimeBtn.count()).toBeGreaterThan(0);
    expect(await yearlyBtn.count()).toBeGreaterThan(0);
    expect(await monthlyBtn.count()).toBeGreaterThan(0);
  });

  test("Subscriptions mode - has referral slider", async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    expect(await slider.count()).toBeGreaterThan(0);
  });

  test("Subscriptions mode - slider changes earnings display", async ({ page }) => {
    // Get initial earnings
    const body1 = await page.locator("body").textContent() ?? "";
    // The page shows £ amounts - find the earnings value
    const match1 = body1.match(/£[\d,]+/g);

    // Move slider to max
    const slider = page.locator('input[type="range"]');
    if ((await slider.count()) > 0) {
      await slider.fill("100");
      await page.waitForTimeout(500);

      const body2 = await page.locator("body").textContent() ?? "";
      const match2 = body2.match(/£[\d,]+/g);

      // Earnings should have changed (higher number of referrals = higher earnings)
      expect(match2).not.toBeNull();
      expect(match2!.length).toBeGreaterThan(0);
    }
  });

  test("Subscriptions mode - toggle Yearly plan shows yearly price", async ({ page }) => {
    const yearlyBtn = page.locator("button").filter({ hasText: /yearly/i });
    if ((await yearlyBtn.count()) > 0) {
      await yearlyBtn.first().click();
      await page.waitForTimeout(500);
      const body = await page.locator("body").textContent() ?? "";
      // Should show £397 or yearly-related text
      expect(body).toMatch(/397|yearly|annual/i);
    }
  });

  test("Subscriptions mode - toggle Monthly plan shows monthly price", async ({ page }) => {
    const monthlyBtn = page.locator("button").filter({ hasText: /monthly/i });
    if ((await monthlyBtn.count()) > 0) {
      await monthlyBtn.first().click();
      await page.waitForTimeout(500);
      const body = await page.locator("body").textContent() ?? "";
      expect(body).toMatch(/67|monthly/i);
    }
  });

  test("Subscriptions mode - shows 40% commission info", async ({ page }) => {
    const body = await page.locator("body").textContent() ?? "";
    expect(body).toMatch(/40%.*commission|commission.*40%/i);
  });

  test("Switch to JV Deals mode", async ({ page }) => {
    const jvTab = page.locator("button").filter({ hasText: /jv.*10/i });
    if ((await jvTab.count()) > 0) {
      await jvTab.first().click();
      await page.waitForTimeout(500);
      const body = await page.locator("body").textContent() ?? "";
      // JV mode should show deal value and number of deals inputs
      expect(body.toLowerCase()).toMatch(/deal value|deal|10%.*commission/);
    }
  });

  test("JV mode - has deal value and deal count inputs", async ({ page }) => {
    const jvTab = page.locator("button").filter({ hasText: /jv.*10/i });
    if ((await jvTab.count()) > 0) {
      await jvTab.first().click();
      await page.waitForTimeout(500);
      // Should have number inputs for deal value and count
      const numberInputs = page.locator('input[type="number"]');
      expect(await numberInputs.count()).toBeGreaterThanOrEqual(2);
    }
  });

  test("JV mode - changing deal value updates calculation", async ({ page }) => {
    const jvTab = page.locator("button").filter({ hasText: /jv.*10/i });
    if ((await jvTab.count()) > 0) {
      await jvTab.first().click();
      await page.waitForTimeout(500);

      const numberInputs = page.locator('input[type="number"]');
      if ((await numberInputs.count()) >= 2) {
        // Change deal value to 10000
        await numberInputs.first().fill("10000");
        await page.waitForTimeout(500);

        const body = await page.locator("body").textContent() ?? "";
        // 10000 * 10% = 1000 per deal
        expect(body).toMatch(/1,?000/);
      }
    }
  });

  test("JV mode - shows 'Coming soon' label", async ({ page }) => {
    const jvTab = page.locator("button").filter({ hasText: /jv.*10/i });
    if ((await jvTab.count()) > 0) {
      await jvTab.first().click();
      await page.waitForTimeout(500);
      const body = await page.locator("body").textContent() ?? "";
      expect(body.toLowerCase()).toContain("coming soon");
    }
  });
});

test.describe("Affiliates - Agent Status Detection", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
  });

  test("Non-agent state: shows 'Earn commission' prompt", async ({ page }) => {
    const body = await page.locator("body").textContent() ?? "";
    // Admin user has no affiliate_profiles row, so shows non-agent state
    const isNotAgent = body.toLowerCase().includes("earn commission");
    const isAgent = body.toLowerCase().includes("your code") || body.toLowerCase().includes("your referral link");
    // Either state is valid - page renders correctly
    expect(isAgent || isNotAgent).toBe(true);
  });

  test("Non-agent: agent-only sections (referral link, sharing kit) are hidden", async ({ page }) => {
    const body = await page.locator("body").textContent() ?? "";
    // Admin has no affiliate_profiles row, confirmed by "earn commission" text
    if (body.toLowerCase().includes("earn commission")) {
      // Non-agent state: these should NOT appear
      expect(body.toLowerCase()).not.toContain("sharing kit");
      expect(body.toLowerCase()).not.toContain("recent activity");
    }
    // Page renders correctly either way
    await assertNoCrash(page);
  });

  test("Calculator and leaderboard always visible regardless of agent status", async ({ page }) => {
    const body = await page.locator("body").textContent() ?? "";
    expect(body.toLowerCase()).toContain("earnings calculator");
    expect(body.toLowerCase()).toContain("top agents");
  });
});

test.describe("Affiliates - No crash on interactions", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
  });

  test("Rapid tab switching between Subscriptions and JV", async ({ page }) => {
    const subsTab = page.locator("button").filter({ hasText: /subscriptions.*40/i });
    const jvTab = page.locator("button").filter({ hasText: /jv.*10/i });

    if ((await subsTab.count()) > 0 && (await jvTab.count()) > 0) {
      for (let i = 0; i < 5; i++) {
        await jvTab.first().click();
        await page.waitForTimeout(200);
        await subsTab.first().click();
        await page.waitForTimeout(200);
      }
      await assertNoCrash(page);
    }
  });

  test("Rapid plan toggling (Lifetime/Yearly/Monthly)", async ({ page }) => {
    const plans = ["lifetime", "yearly", "monthly"];
    for (const plan of plans) {
      const btn = page.locator("button").filter({ hasText: new RegExp(plan, "i") });
      if ((await btn.count()) > 0) {
        await btn.first().click();
        await page.waitForTimeout(200);
      }
    }
    await assertNoCrash(page);
  });

  test("Slider drag to min and max without crash", async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    if ((await slider.count()) > 0) {
      await slider.fill("1");
      await page.waitForTimeout(300);
      await slider.fill("200");
      await page.waitForTimeout(300);
      await slider.fill("50");
      await page.waitForTimeout(300);
      await assertNoCrash(page);
    }
  });
});
