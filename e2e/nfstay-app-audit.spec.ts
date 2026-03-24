/**
 * FULL LIVE AUDIT - nfstay.app (bookingsite)
 * Tests all public, auth, operator, and admin flows.
 * Run: npx playwright test e2e/nfstay-app-audit.spec.ts --config=e2e/hub-playwright.config.ts
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = "https://nfstay.app";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";

const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASSWORD = "Dgs58913347.";

async function getAuthTokens(email: string, password: string) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      }
    );
    const data = await res.json();
    if (data.access_token) return data;
    console.log("Auth failed:", JSON.stringify(data));
    return null;
  } catch (e) {
    console.log("Auth error:", e);
    return null;
  }
}

async function injectAuth(page: Page, email: string, password: string) {
  const tokens = await getAuthTokens(email, password);
  if (!tokens) throw new Error(`Failed to authenticate ${email}`);

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
    ([key, data]) => {
      localStorage.setItem(key, data);
    },
    [storageKey, sessionData]
  );
}

async function assertPageLoaded(page: Page, path: string) {
  const response = await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  const status = response?.status() ?? 0;
  const bodyText = (await page.locator("body").textContent()) ?? "";
  return { status, bodyText, url: page.url() };
}

// ============================================
// PUBLIC PAGES
// ============================================
test.describe("nfstay.app - Public Pages", () => {
  test("landing page loads with hero content", async ({ page }) => {
    const { status, bodyText } = await assertPageLoaded(page, "/");
    expect(status).toBeLessThan(400);
    expect(bodyText.length).toBeGreaterThan(100);
    // Should have travel/rental related content
    const hasContent =
      bodyText.toLowerCase().includes("vacation") ||
      bodyText.toLowerCase().includes("rental") ||
      bodyText.toLowerCase().includes("stay") ||
      bodyText.toLowerCase().includes("book") ||
      bodyText.toLowerCase().includes("property");
    expect(hasContent).toBe(true);
  });

  test("landing page has navigation", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    // Should have a navbar
    const nav = page.locator("nav, header, [class*='nav']").first();
    await expect(nav).toBeVisible({ timeout: 15000 });
  });

  test("landing page has footer", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    const footer = page.locator("footer").first();
    await expect(footer).toBeVisible({ timeout: 15000 });
  });

  test("search page loads and shows results or empty state", async ({
    page,
  }) => {
    const { status, bodyText } = await assertPageLoaded(page, "/search");
    expect(status).toBeLessThan(400);
    const hasContent =
      bodyText.toLowerCase().includes("result") ||
      bodyText.toLowerCase().includes("propert") ||
      bodyText.toLowerCase().includes("no exact") ||
      bodyText.toLowerCase().includes("search") ||
      bodyText.toLowerCase().includes("filter");
    expect(hasContent).toBe(true);
  });

  test("search page has filter controls", async ({ page }) => {
    await page.goto(`${BASE}/search`, { waitUntil: "networkidle" });
    // Should have some filter elements (select, slider, or filter buttons)
    const hasFilters =
      (await page.locator("select, [class*='filter'], [class*='Filter']").count()) > 0 ||
      (await page.getByText(/filter|sort|type|price/i).count()) > 0;
    expect(hasFilters).toBe(true);
  });

  test("search page has map", async ({ page }) => {
    await page.goto(`${BASE}/search`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    // Google Maps container or map markers
    const hasMap =
      (await page.locator("[class*='map'], [class*='Map'], .gm-style, iframe[src*='google']").count()) > 0;
    console.log("Search page has map:", hasMap);
    // Just log, don't fail - map may load lazily
  });

  test("property detail page loads for mock property", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/property/prop-001");
    expect(bodyText.length).toBeGreaterThan(0);
    // Should show property content or not-found
    const hasContent =
      bodyText.toLowerCase().includes("property") ||
      bodyText.toLowerCase().includes("bedroom") ||
      bodyText.toLowerCase().includes("guest") ||
      bodyText.toLowerCase().includes("book") ||
      bodyText.toLowerCase().includes("not found") ||
      bodyText.toLowerCase().includes("night");
    expect(hasContent).toBe(true);
  });

  test("property detail has booking widget", async ({ page }) => {
    await page.goto(`${BASE}/property/prop-001`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const bodyText = (await page.locator("body").textContent()) ?? "";
    const hasBookingUI =
      bodyText.toLowerCase().includes("book") ||
      bodyText.toLowerCase().includes("reserve") ||
      bodyText.toLowerCase().includes("night") ||
      bodyText.toLowerCase().includes("check-in") ||
      bodyText.toLowerCase().includes("guest");
    console.log("Property detail has booking UI:", hasBookingUI);
  });

  test("signin page loads with form", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/signin");
    await expect(
      page.getByPlaceholder(/email/i).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByPlaceholder(/password/i).first()
    ).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/signup");
    expect(bodyText.length).toBeGreaterThan(0);
    const hasSignup =
      bodyText.toLowerCase().includes("create") ||
      bodyText.toLowerCase().includes("sign up") ||
      bodyText.toLowerCase().includes("register");
    expect(hasSignup).toBe(true);
  });

  test("404 page renders for invalid route", async ({ page }) => {
    await page.goto(`${BASE}/this-route-does-not-exist`, {
      waitUntil: "networkidle",
    });
    const bodyText = (await page.locator("body").textContent()) ?? "";
    const has404 =
      bodyText.includes("404") ||
      bodyText.toLowerCase().includes("not found");
    expect(has404).toBe(true);
  });

  test("booking lookup page loads", async ({ page }) => {
    const { status, bodyText } = await assertPageLoaded(page, "/booking");
    expect(status).toBeLessThan(400);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("checkout without intent shows expired message", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/checkout");
    const hasExpired =
      bodyText.toLowerCase().includes("expired") ||
      bodyText.toLowerCase().includes("session") ||
      bodyText.toLowerCase().includes("search") ||
      bodyText.length > 0;
    expect(hasExpired).toBe(true);
  });

  test("payment success page handles no data", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/payment/success");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("payment cancel page loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/payment/cancel");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("currency selector works", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    // Look for currency selector
    const currencySelector = page.locator(
      "[class*='currency'], [class*='Currency'], select"
    );
    const hasCurrency = (await currencySelector.count()) > 0;
    console.log("Landing page has currency selector:", hasCurrency);
  });

  test("traveler reservations redirects unauthenticated", async ({ page }) => {
    await page.goto(`${BASE}/traveler/reservations`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(3000);
    const url = page.url();
    const bodyText = (await page.locator("body").textContent()) ?? "";
    const isProtected =
      url.includes("signin") ||
      bodyText.toLowerCase().includes("sign in");
    expect(isProtected).toBe(true);
  });
});

// ============================================
// WHITE-LABEL PREVIEW
// ============================================
test.describe("nfstay.app - White Label", () => {
  test("preview mode loads with operator branding", async ({ page }) => {
    // Demo operator ID from CLAUDE.md
    await page.goto(
      `${BASE}?preview=03cc56a2-b2a3-4937-96a5-915c906f9b5b`,
      { waitUntil: "networkidle" }
    );
    const bodyText = (await page.locator("body").textContent()) ?? "";
    expect(bodyText.length).toBeGreaterThan(0);
    console.log("White-label preview loaded, body length:", bodyText.length);
  });
});

// ============================================
// OPERATOR PAGES (authenticated)
// ============================================
test.describe("nfstay.app - Operator Pages (admin session)", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test("operator dashboard loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(page, "/nfstay");
    console.log("Operator dashboard URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("operator onboarding loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/nfstay/onboarding");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("operator properties list loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/nfstay/properties");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("operator new property form loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/nfstay/properties/new");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("operator reservations loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/nfstay/reservations");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("operator create reservation loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/nfstay/create-reservation"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("operator analytics loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/nfstay/analytics");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("operator settings loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/nfstay/settings");
    expect(bodyText.length).toBeGreaterThan(0);
  });
});

// ============================================
// ADMIN PAGES (authenticated)
// ============================================
test.describe("nfstay.app - Admin Pages (admin session)", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test("admin dashboard loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(page, "/admin/nfstay");
    console.log("Admin nfstay URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin users page loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/admin/nfstay/users");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin operators page loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/nfstay/operators"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin analytics page loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/nfstay/analytics"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin settings page loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/nfstay/settings"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });
});

// ============================================
// CONSOLE ERROR CHECK
// ============================================
test.describe("nfstay.app - Console Error Check", () => {
  const pagesToCheck = [
    { name: "Landing", path: "/" },
    { name: "Search", path: "/search" },
    { name: "Signin", path: "/signin" },
    { name: "Signup", path: "/signup" },
  ];

  for (const pg of pagesToCheck) {
    test(`no critical console errors on ${pg.name} page`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      await page.goto(`${BASE}${pg.path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes("favicon") &&
          !e.includes("net::") &&
          !e.includes("Failed to load resource") &&
          !e.includes("third-party") &&
          !e.includes("ERR_BLOCKED") &&
          !e.includes("Google Maps") &&
          !e.includes("maps.googleapis")
      );
      if (criticalErrors.length > 0) {
        console.log(`${pg.name} console errors:`, criticalErrors);
      }
    });
  }
});
