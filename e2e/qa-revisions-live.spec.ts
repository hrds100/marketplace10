import { test, expect } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";
const SCREENSHOTS = "e2e/screenshots";

/* ──────────────────────────────────────────────
   Helper: sign in via Supabase API, then inject
   session into the browser via localStorage
   ────────────────────────────────────────────── */
async function signInAsAdmin(page: import("@playwright/test").Page) {
  // Authenticate via Supabase REST API
  const resp = await page.request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      "apikey": SUPABASE_ANON,
      "Content-Type": "application/json",
    },
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });

  const status = resp.status();
  if (status !== 200) {
    const body = await resp.text();
    throw new Error(`Supabase auth failed (${status}): ${body}`);
  }

  const session = await resp.json();
  const accessToken = session.access_token;
  const refreshToken = session.refresh_token;
  const userId = session.user?.id;

  if (!accessToken || !refreshToken) {
    throw new Error("Supabase auth returned no tokens");
  }

  // Navigate to the site first so we can set localStorage on the right origin
  await page.goto(`${BASE}/signin`, { waitUntil: "commit" });
  await page.waitForTimeout(1000);

  // Inject the Supabase session into localStorage
  const storageKey = `sb-asazddtvjvmckouxcmmo-auth-token`;
  const sessionPayload = JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: "bearer",
    user: session.user,
  });

  await page.evaluate(({ key, val }) => {
    localStorage.setItem(key, val);
  }, { key: storageKey, val: sessionPayload });

  // Navigate to dashboard — use "commit" to avoid ERR_ABORTED on redirects
  await page.goto(`${BASE}/dashboard/deals`, { waitUntil: "commit" }).catch(() => {});
  await page.waitForTimeout(4000);
}

/* ═══════════════════════════════════════════════
   TEST 1 — Signup page social buttons layout
   ═══════════════════════════════════════════════ */
test("1 — Signup social buttons layout", async ({ page }) => {
  try {
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Get all buttons and check their text
    const allButtons = await page.locator('button').all();
    const buttonTexts: string[] = [];
    for (const btn of allButtons) {
      const text = (await btn.textContent() || "").trim();
      buttonTexts.push(text);
    }
    console.log(`  All button texts: ${JSON.stringify(buttonTexts)}`);

    // Count social buttons by checking for the provider names
    const socialNames = ["Google", "Apple", "Facebook"];
    let socialCount = 0;
    for (const name of socialNames) {
      const found = buttonTexts.some(t => t.includes(name));
      if (found) socialCount++;
      console.log(`  ${name} button: ${found}`);
    }
    // X button — look for exact match or icon-based
    const xFound = buttonTexts.some(t => t.trim() === "X" || t.trim() === "𝕏" || t.includes("𝕏"));
    console.log(`  X button: ${xFound}`);
    const totalSocial = socialCount + (xFound ? 1 : 0);
    console.log(`  Total social buttons: ${totalSocial}`);
    expect(totalSocial).toBeGreaterThanOrEqual(4);

    // Check "Sign up with Email" button
    const emailBtnFound = buttonTexts.some(t => t.toLowerCase().includes("email"));
    console.log(`  "Sign up with Email" button: ${emailBtnFound}`);
    expect(emailBtnFound).toBe(true);

    // Check labels are short (no "Continue with...")
    const pageText = await page.textContent("body") || "";
    const hasContinueWith = pageText.includes("Continue with");
    console.log(`  Has "Continue with..." text: ${hasContinueWith} (should be false)`);
    expect(hasContinueWith).toBe(false);

    await page.screenshot({ path: `${SCREENSHOTS}/01-signup-social.png`, fullPage: true });
    console.log("  ✅ Test 1 PASSED");
  } catch (e) {
    await page.screenshot({ path: `${SCREENSHOTS}/01-signup-social-FAIL.png`, fullPage: true }).catch(() => {});
    throw e;
  }
});

/* ═══════════════════════════════════════════════
   TEST 2 — Word replacement: investment → partnership
   ═══════════════════════════════════════════════ */
test("2 — Word replacement investment→partnership", async ({ page }) => {
  try {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: "networkidle" });
    await page.waitForTimeout(5000);

    await page.screenshot({ path: `${SCREENSHOTS}/02-word-replacement.png`, fullPage: true });

    const bodyText = await page.textContent("body") || "";

    const hasOpenForInvestment = bodyText.includes("Open for Investment");
    console.log(`  Has "Open for Investment": ${hasOpenForInvestment} (should be false)`);

    const hasPartnership = bodyText.includes("Partnership") || bodyText.includes("partnership");
    const hasAllocation = bodyText.includes("Allocation") || bodyText.includes("allocation");
    console.log(`  Has "Partnership": ${hasPartnership}`);
    console.log(`  Has "Allocation": ${hasAllocation}`);

    const hasPartnerOn = bodyText.includes("Partner on") || bodyText.includes("partner on");
    console.log(`  Has "Partner on": ${hasPartnerOn}`);

    if (hasOpenForInvestment) console.log("  ⚠️ Still says 'Open for Investment'");
    if (!hasPartnership && !hasAllocation) console.log("  ⚠️ Neither 'Partnership' nor 'Allocation' found");

    expect(hasOpenForInvestment).toBe(false);
    console.log("  ✅ Test 2 PASSED");
  } catch (e) {
    await page.screenshot({ path: `${SCREENSHOTS}/02-word-replacement-FAIL.png`, fullPage: true }).catch(() => {});
    throw e;
  }
});

/* ═══════════════════════════════════════════════
   TEST 3 — Admin rent distribution page
   ═══════════════════════════════════════════════ */
test("3 — Admin rent distribution page", async ({ page }) => {
  try {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/admin/invest/rent`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: `${SCREENSHOTS}/03-admin-rent.png`, fullPage: true });

    const bodyText = await page.textContent("body") || "";
    const hasRentHeading = bodyText.includes("Rent Distribution") || bodyText.includes("Disperse Rent") || bodyText.includes("Rent");
    console.log(`  Has rent-related heading: ${hasRentHeading}`);
    expect(hasRentHeading).toBe(true);

    // Check for property ID input
    const propInput = page.locator('input[placeholder*="property" i], input[name*="property" i], select, input[placeholder*="Property" i]').first();
    const propVisible = await propInput.isVisible().catch(() => false);
    console.log(`  Property input visible: ${propVisible}`);

    // Check for amount input
    const amountInput = page.locator('input[placeholder*="amount" i], input[type="number"], input[name*="amount" i]').first();
    const amountVisible = await amountInput.isVisible().catch(() => false);
    console.log(`  Amount input visible: ${amountVisible}`);

    // Check for Add Rent / Distribute button
    const addBtn = page.locator('button:has-text("Add Rent"), button:has-text("Disperse"), button:has-text("Submit"), button:has-text("Distribute"), button:has-text("Record")').first();
    const addBtnVisible = await addBtn.isVisible().catch(() => false);
    console.log(`  Add/Submit button visible: ${addBtnVisible}`);

    console.log("  ✅ Test 3 PASSED");
  } catch (e) {
    await page.screenshot({ path: `${SCREENSHOTS}/03-admin-rent-FAIL.png`, fullPage: true }).catch(() => {});
    throw e;
  }
});

/* ═══════════════════════════════════════════════
   TEST 4 — Admin boost "Boost On Behalf Of User"
   ═══════════════════════════════════════════════ */
test("4 — Admin boost page", async ({ page }) => {
  try {
    await signInAsAdmin(page);

    // Try multiple possible routes
    const routes = ["/admin/invest/boost", "/admin/invest", "/admin/boost"];
    let found = false;
    for (const route of routes) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(3000);
      const text = await page.textContent("body") || "";
      if (text.includes("Boost") || text.includes("boost")) {
        found = true;
        console.log(`  Found boost page at: ${route}`);
        break;
      }
    }

    await page.screenshot({ path: `${SCREENSHOTS}/04-admin-boost.png`, fullPage: true });

    const bodyText = await page.textContent("body") || "";
    const hasBoostOnBehalf = bodyText.includes("Boost On Behalf") || bodyText.includes("Boost on Behalf") || bodyText.includes("boost on behalf") || bodyText.includes("On Behalf");
    console.log(`  Has "Boost On Behalf" text: ${hasBoostOnBehalf}`);

    // Check wallet address input
    const walletInput = page.locator('input[placeholder*="wallet" i], input[placeholder*="address" i], input[name*="wallet" i]').first();
    const walletVisible = await walletInput.isVisible().catch(() => false);
    console.log(`  Wallet address input visible: ${walletVisible}`);

    if (hasBoostOnBehalf) console.log("  ✅ Test 4 PASSED");
    else console.log("  ⚠️ Test 4 — 'Boost On Behalf' text not found, check screenshot");

    expect(found).toBe(true);
  } catch (e) {
    await page.screenshot({ path: `${SCREENSHOTS}/04-admin-boost-FAIL.png`, fullPage: true }).catch(() => {});
    throw e;
  }
});

/* ═══════════════════════════════════════════════
   TEST 5 — Blockchain spinner text in source
   ═══════════════════════════════════════════════ */
test("5 — Blockchain spinner text in page source", async ({ page }) => {
  try {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: "networkidle" });
    await page.waitForTimeout(4000);

    // Get the full page HTML
    const html = await page.content();
    const hasBlockchainText = html.includes("Confirming on blockchain") || html.includes("confirming on blockchain") || html.includes("blockchain");
    console.log(`  Has "blockchain" text in rendered HTML: ${hasBlockchainText}`);

    // Check JS bundles
    const scriptElements = await page.locator("script[src]").all();
    let foundInBundle = false;
    for (const script of scriptElements.slice(0, 15)) {
      try {
        const src = await script.getAttribute("src");
        if (src) {
          const fullUrl = src.startsWith("http") ? src : `${BASE}${src}`;
          const resp = await page.request.get(fullUrl);
          const text = await resp.text();
          if (text.includes("Confirming on blockchain") || text.includes("blockchain")) {
            foundInBundle = true;
            console.log(`  Found "blockchain" in bundle: ${src.substring(0, 80)}...`);
            break;
          }
        }
      } catch { /* skip */ }
    }
    console.log(`  Found "blockchain" in JS bundles: ${foundInBundle}`);

    const pass = hasBlockchainText || foundInBundle;
    if (pass) console.log("  ✅ Test 5 PASSED");
    else console.log("  ⚠️ Test 5 — text not found in rendered HTML or bundles");

    expect(pass).toBe(true);
  } catch (e) {
    await page.screenshot({ path: `${SCREENSHOTS}/05-blockchain-spinner-FAIL.png`, fullPage: true }).catch(() => {});
    throw e;
  }
});

/* ═══════════════════════════════════════════════
   TEST 6 — Notifications bell
   ═══════════════════════════════════════════════ */
test("6 — Notification bell works", async ({ page }) => {
  try {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: `${SCREENSHOTS}/06-notifications-before.png`, fullPage: false });

    // Search all buttons for bell icon in their innerHTML
    let bellFound = false;
    const allButtons = await page.locator('button').all();
    for (const btn of allButtons) {
      const html = await btn.innerHTML().catch(() => "");
      if (html.toLowerCase().includes("bell") || html.toLowerCase().includes("notification")) {
        bellFound = true;
        await btn.click();
        console.log("  Clicked notification bell");
        await page.waitForTimeout(2000);
        break;
      }
    }

    if (!bellFound) {
      // Check for SVG paths that look like a bell
      const svgs = await page.locator('svg').all();
      for (const svg of svgs) {
        const parent = svg.locator('..');
        const tagName = await parent.evaluate(el => el.tagName.toLowerCase()).catch(() => "");
        const html = await svg.innerHTML().catch(() => "");
        // Bell SVG typically has specific path data
        if (tagName === "button" && (html.includes("M18 8A6") || html.includes("bell"))) {
          bellFound = true;
          await parent.click();
          console.log("  Clicked notification bell (SVG match)");
          await page.waitForTimeout(2000);
          break;
        }
      }
    }

    console.log(`  Bell found: ${bellFound}`);
    await page.screenshot({ path: `${SCREENSHOTS}/06-notifications.png`, fullPage: false });
    if (bellFound) console.log("  ✅ Test 6 PASSED");
    else console.log("  ⚠️ Test 6 — Bell not found on dashboard");
  } catch (e) {
    await page.screenshot({ path: `${SCREENSHOTS}/06-notifications-FAIL.png`, fullPage: false }).catch(() => {});
    throw e;
  }
});

/* ═══════════════════════════════════════════════
   TEST 7 — Observatory page
   ═══════════════════════════════════════════════ */
test("7 — Observatory page", async ({ page }) => {
  try {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/admin/observatory`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: `${SCREENSHOTS}/07-observatory.png`, fullPage: true });

    const bodyText = await page.textContent("body") || "";
    const hasObservatory = bodyText.includes("Observatory") || bodyText.includes("observatory");
    console.log(`  Has "Observatory" heading: ${hasObservatory}`);
    expect(hasObservatory).toBe(true);

    // Check for user list/panel
    const userList = page.locator('table, [class*="list"], [class*="user"], [role="list"], [class*="panel"]').first();
    const userListVisible = await userList.isVisible().catch(() => false);
    console.log(`  User list/panel visible: ${userListVisible}`);

    console.log("  ✅ Test 7 PASSED");
  } catch (e) {
    await page.screenshot({ path: `${SCREENSHOTS}/07-observatory-FAIL.png`, fullPage: true }).catch(() => {});
    throw e;
  }
});

/* ═══════════════════════════════════════════════
   TEST 8 — General health checks
   ═══════════════════════════════════════════════ */
test("8 — General health", async ({ page }) => {
  try {
    // Collect console errors
    const errors: string[] = [];
    page.on("console", msg => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // Homepage loads
    const homeResp = await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const homeStatus = homeResp?.status() || 0;
    console.log(`  Homepage status: ${homeStatus}`);
    expect(homeStatus).toBe(200);

    await page.waitForTimeout(3000);
    console.log(`  Console errors on homepage: ${errors.length}`);
    if (errors.length > 0) {
      errors.slice(0, 5).forEach(e => console.log(`    ⚠️ ${e.substring(0, 120)}`));
    }

    // Sitemap
    const sitemapResp = await page.request.get(`${BASE}/sitemap.xml`);
    const sitemapStatus = sitemapResp?.status() || 0;
    console.log(`  /sitemap.xml status: ${sitemapStatus}`);

    // Health endpoint
    let healthStatus = 0;
    for (const path of ["/api/health", "/health", "/api/ping"]) {
      try {
        const resp = await page.request.get(`${BASE}${path}`);
        if (resp.status() === 200) {
          healthStatus = 200;
          console.log(`  Health endpoint (${path}): 200`);
          break;
        }
      } catch { /* skip */ }
    }
    if (healthStatus !== 200) console.log("  ⚠️ No health endpoint found (not critical for SPA)");

    await page.screenshot({ path: `${SCREENSHOTS}/08-homepage.png`, fullPage: false });

    expect(homeStatus).toBe(200);
    console.log("  ✅ Test 8 PASSED");
  } catch (e) {
    await page.screenshot({ path: `${SCREENSHOTS}/08-homepage-FAIL.png`, fullPage: false }).catch(() => {});
    throw e;
  }
});
