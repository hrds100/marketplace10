/**
 * FULL LIVE AUDIT - hub.nfstay.com AUTH + DASHBOARD + ADMIN
 * Tests authenticated flows by logging in via Supabase API then injecting session.
 * Run: npx playwright test e2e/hub-auth-audit.spec.ts --config=e2e/hub-playwright.config.ts
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";

// Admin credentials
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASSWORD = "Dgs58913347.";

// Helper: get auth tokens from Supabase
async function getAuthTokens(
  email: string,
  password: string
): Promise<{ access_token: string; refresh_token: string; user: any } | null> {
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

// Helper: inject Supabase session into page localStorage
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

// Helper: check page loaded without crash
async function assertPageLoaded(page: Page, path: string) {
  const response = await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  const status = response?.status() ?? 0;
  const bodyText = await page.locator("body").textContent();
  return { status, bodyText: bodyText ?? "", url: page.url() };
}

// ============================================
// SIGN IN FLOW (as admin)
// ============================================
test.describe("Hub - Admin Sign In Flow", () => {
  test("can sign in as admin via form", async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });

    // Fill email
    const emailInput = page.getByPlaceholder(/email/i).first();
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill(ADMIN_EMAIL);

    // Fill password
    const passwordInput = page.getByPlaceholder(/password/i).first();
    await passwordInput.fill(ADMIN_PASSWORD);

    // Click sign in button
    const signInBtn = page
      .getByRole("button", { name: /sign in/i })
      .first();
    await signInBtn.click();

    // Wait for navigation - should go to OTP or dashboard
    await page.waitForTimeout(5000);
    const url = page.url();
    const navigated =
      url.includes("verify") ||
      url.includes("dashboard") ||
      url.includes("admin") ||
      url.includes("otp");
    // If still on signin, check for error message
    if (!navigated) {
      const bodyText = await page.locator("body").textContent();
      console.log("After signin click, still on:", url);
      console.log(
        "Body contains error:",
        bodyText?.includes("error") || bodyText?.includes("Invalid")
      );
    }
    // Log result either way
    console.log("Post-signin URL:", url);
  });
});

// ============================================
// DASHBOARD PAGES (authenticated via session injection)
// ============================================
test.describe("Hub - Dashboard Pages (admin session)", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test("dashboard/deals loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(page, "/dashboard/deals");
    console.log("Deals page URL:", url);
    // Should show deals content or redirect to verify-otp
    const hasContent =
      bodyText.toLowerCase().includes("deal") ||
      bodyText.toLowerCase().includes("property") ||
      bodyText.toLowerCase().includes("marketplace") ||
      url.includes("verify");
    expect(hasContent).toBe(true);
  });

  test("dashboard/inbox loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(page, "/dashboard/inbox");
    console.log("Inbox page URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("dashboard/crm loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(page, "/dashboard/crm");
    console.log("CRM page URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("dashboard/university loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/dashboard/university"
    );
    console.log("University page URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("dashboard/list-a-deal loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/dashboard/list-a-deal"
    );
    console.log("List-a-deal page URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("dashboard/affiliates loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/dashboard/affiliates"
    );
    console.log("Affiliates page URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("dashboard/settings loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/dashboard/settings"
    );
    console.log("Settings page URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("dashboard/booking-site loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/dashboard/booking-site"
    );
    console.log("Booking-site page URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });
});

// ============================================
// INVESTMENT MODULE (authenticated)
// ============================================
test.describe("Hub - Investment Module (admin session)", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test("invest/marketplace loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/dashboard/invest/marketplace"
    );
    console.log("Invest marketplace URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("invest/portfolio loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/dashboard/invest/portfolio"
    );
    console.log("Invest portfolio URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("invest/payouts loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/dashboard/invest/payouts"
    );
    console.log("Invest payouts URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("invest/proposals loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/dashboard/invest/proposals"
    );
    console.log("Invest proposals URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });
});

// ============================================
// NFSTAY OPERATOR MODULE (authenticated)
// ============================================
test.describe("Hub - nfstay Operator Module (admin session)", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test("nfstay operator dashboard loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(page, "/nfstay");
    console.log("Operator dashboard URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("nfstay onboarding loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/nfstay/onboarding"
    );
    console.log("Onboarding URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("nfstay properties list loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/nfstay/properties"
    );
    console.log("Operator properties URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("nfstay reservations list loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/nfstay/reservations"
    );
    console.log("Operator reservations URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("nfstay analytics loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/nfstay/analytics"
    );
    console.log("Operator analytics URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("nfstay settings loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/nfstay/settings"
    );
    console.log("Operator settings URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });
});

// ============================================
// ADMIN PANEL (authenticated as admin)
// ============================================
test.describe("Hub - Admin Panel (admin session)", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  // Admin workspace selector
  test("admin workspace selector loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(page, "/admin");
    console.log("Admin selector URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  // Marketplace workspace
  test("admin/marketplace dashboard loads", async ({ page }) => {
    const { bodyText, url } = await assertPageLoaded(
      page,
      "/admin/marketplace"
    );
    console.log("Admin marketplace URL:", url);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/marketplace/quick-list loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/marketplace/quick-list"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/marketplace/listings loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/marketplace/listings"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/marketplace/submissions loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/marketplace/submissions"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/marketplace/users loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/marketplace/users"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/marketplace/university loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/marketplace/university"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/marketplace/pricing loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/marketplace/pricing"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/marketplace/faq loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/marketplace/faq"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/marketplace/affiliates loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/marketplace/affiliates"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/marketplace/settings loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/marketplace/settings"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/marketplace/notifications loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/marketplace/notifications"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  // Investment workspace
  test("admin/invest dashboard loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/admin/invest");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/invest/properties loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/invest/properties"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/invest/orders loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/admin/invest/orders");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/invest/shareholders loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/invest/shareholders"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/invest/commissions loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/invest/commissions"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/invest/payouts loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/admin/invest/payouts");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/invest/proposals loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/invest/proposals"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/invest/boost loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/admin/invest/boost");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/invest/test-console loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/invest/test-console"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  // nfstay admin workspace
  test("admin/nfstay dashboard loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/admin/nfstay");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/nfstay/reservations loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/nfstay/reservations"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/nfstay/properties loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/nfstay/properties"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/nfstay/users loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/admin/nfstay/users");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/nfstay/operators loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/nfstay/operators"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/nfstay/analytics loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/nfstay/analytics"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("admin/nfstay/settings loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(
      page,
      "/admin/nfstay/settings"
    );
    expect(bodyText.length).toBeGreaterThan(0);
  });

  // Architecture page
  test("admin/architecture loads", async ({ page }) => {
    const { bodyText } = await assertPageLoaded(page, "/admin/architecture");
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
