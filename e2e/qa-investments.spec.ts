import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);

const BASE = "https://hub.nfstay.com";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";
const SCREENSHOT_DIR = path.join(__dirname2, "screenshots");

// Ensure screenshots directory exists
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, name),
    fullPage: true,
  });
  console.log(`  [SCREENSHOT] ${name}`);
}

async function signInAdmin(page: Page): Promise<boolean> {
  await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);

  try {
    // Click "Sign In" tab if present
    const signInTab = page.locator('button:has-text("Sign In"), [role="tab"]:has-text("Sign In")').first();
    if (await signInTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signInTab.click();
      await page.waitForTimeout(500);
    }

    // Fill email — use data-feature attribute from SignIn.tsx
    const emailInput = page.locator('[data-feature="AUTH__SIGNIN_EMAIL"], input[type="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 8000 });
    await emailInput.fill(ADMIN_EMAIL);

    // Fill password
    const passInput = page.locator('input[type="password"]').first();
    await passInput.waitFor({ state: "visible", timeout: 3000 });
    await passInput.fill(ADMIN_PASS);

    // Click submit
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    console.log("  [AUTH] Submitted sign-in form");

    // Wait for navigation away from signin
    await page.waitForURL((url) => !url.toString().includes("signin"), { timeout: 20000 });
    console.log(`  [AUTH] Signed in — now at ${page.url()}`);
    return true;
  } catch (e: any) {
    console.log(`  [AUTH FAIL] ${e.message?.slice(0, 150)}`);
    return false;
  }
}

async function flagPlaceholderText(page: Page, context: string) {
  const placeholders = [
    "Lorem ipsum",
    "lorem ipsum",
    "TODO",
    "FIXME",
    "coming soon",
    "TBD",
    "example.com",
    "test@test",
    "[object Object]",
  ];
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const found: string[] = [];
  for (const p of placeholders) {
    if (bodyText.toLowerCase().includes(p.toLowerCase())) {
      found.push(p);
    }
  }
  if (found.length > 0) {
    console.log(`  [COPY WARNING] ${context}: found placeholder text — ${found.join(", ")}`);
  } else {
    console.log(`  [COPY OK] ${context}: no placeholder text detected`);
  }
  return found;
}

// ─── 1. NAVIGATION — Find the investment section ─────────────────────────────

test.describe("1. Investment Section Navigation", () => {
  test("find and navigate to investment pages", async ({ page }) => {
    console.log("\n=== TEST 1: Navigation to Investment Pages ===\n");

    const tryPaths = [
      "/invest",
      "/dashboard/invest/marketplace",
      "/invest/marketplace",
    ];

    let investPath = "";
    for (const p of tryPaths) {
      try {
        const resp = await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded", timeout: 15000 });
        const status = resp?.status() ?? 0;
        const url = page.url();
        const isAuthRedirect = url.includes("signin") || url.includes("login");
        const hasContent = await page.locator("body").innerText().then(t => t.length > 100).catch(() => false);

        if (status < 400 && hasContent && !isAuthRedirect) {
          console.log(`  [OK] ${p} — status ${status}, loaded`);
          investPath = p;
          break;
        } else if (isAuthRedirect) {
          console.log(`  [AUTH-GATED] ${p} — redirected to sign-in`);
          investPath = p;
        } else {
          console.log(`  [SKIP] ${p} — status ${status}`);
        }
      } catch (e: any) {
        console.log(`  [ERROR] ${p} — ${e.message?.slice(0, 80)}`);
      }
    }

    // Check homepage for invest links
    try {
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
      const investLinks = page.locator('a[href*="invest"]');
      const count = await investLinks.count();
      console.log(`  [HOME] Found ${count} invest-related links on homepage`);
      for (let i = 0; i < Math.min(count, 5); i++) {
        const href = await investLinks.nth(i).getAttribute("href");
        const text = await investLinks.nth(i).innerText().catch(() => "(no text)");
        console.log(`    -> "${text.trim().slice(0, 50)}" => ${href}`);
      }
    } catch (e: any) {
      console.log(`  [ERROR] Homepage check — ${e.message?.slice(0, 80)}`);
    }

    console.log(`\n  [RESULT] Best investment path: ${investPath || "none found"}`);
  });
});

// ─── 2-5. LISTINGS + DETAIL + BUTTONS + FILTERS (signed in as admin) ────────

test.describe("2-5. Investment Listings, Detail, Buttons, Filters (Admin)", () => {
  test("sign in and audit investment marketplace", async ({ page }) => {
    console.log("\n=== TEST 2-5: Sign in + Marketplace Audit ===\n");

    const signedIn = await signInAdmin(page);
    if (!signedIn) {
      console.log("  [SKIP] Cannot proceed without auth");
      return;
    }

    // --- Navigate to Invest Marketplace ---
    console.log("\n--- 2. Investment Listings ---\n");
    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(4000);
    const marketplaceUrl = page.url();
    console.log(`  [NAV] Marketplace page URL: ${marketplaceUrl}`);

    // Check for investment listings
    const cardCount = await page.locator('[class*="card" i]').count();
    console.log(`  [LISTINGS] Found ${cardCount} card-like elements`);

    // Check for key investment data points (separate locators to avoid invalid RegExp)
    const titleCount = await page.locator('h2, h3').count();
    console.log(`  [DATA] titles (h2/h3): ${titleCount} elements`);

    const priceCount = await page.getByText(/\$|£|€|price|share/i).count().catch(() => 0);
    console.log(`  [DATA] price/share mentions: ${priceCount} elements`);

    const roiCount = await page.getByText(/ROI|yield|return|%/i).count().catch(() => 0);
    console.log(`  [DATA] ROI/yield mentions: ${roiCount} elements`);

    const locationCount = await page.locator('[class*="location" i]').count();
    const locationTextCount = await page.getByText(/location|city|country/i).count().catch(() => 0);
    console.log(`  [DATA] location elements: ${locationCount}, location text: ${locationTextCount}`);

    const imageCount = await page.locator('img[src*="http"]').count();
    console.log(`  [DATA] images: ${imageCount}`);

    // Take desktop screenshot
    await screenshot(page, "invest-listing-desktop.png");
    await flagPlaceholderText(page, "Marketplace page");

    // --- 3. Click into first investment deal ---
    console.log("\n--- 3. Investment Detail Page ---\n");

    try {
      // Look for "View" or "Invest" buttons inside cards only (avoid sidebar nav links)
      const cardBtns = [
        'button:has-text("View Details")',
        'button:has-text("View")',
        'button:has-text("Invest Now")',
        'button:has-text("Invest")',
        'button:has-text("Details")',
      ];

      let clicked = false;
      for (const sel of cardBtns) {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
          await el.click({ timeout: 5000 });
          await page.waitForTimeout(3000);
          console.log(`  [DETAIL] Clicked: ${sel}`);
          clicked = true;
          break;
        }
      }

      if (clicked) {
        console.log(`  [DETAIL] Current URL: ${page.url()}`);
        // Check if dialog/sheet opened
        const dialogVisible = await page.locator('[role="dialog"]').first().isVisible({ timeout: 2000 }).catch(() => false);
        if (dialogVisible) {
          console.log("  [DETAIL] Detail opened as dialog/sheet overlay");
        }
        await screenshot(page, "invest-detail-desktop.png");
        await flagPlaceholderText(page, "Detail page/dialog");
        const detailH1 = await page.locator("h1, h2").count();
        const detailDesc = await page.locator("p").count();
        const detailImages = await page.locator('img[src*="http"]').count();
        console.log(`  [DETAIL] Headings: ${detailH1}, Paragraphs: ${detailDesc}, Images: ${detailImages}`);
      } else {
        console.log("  [DETAIL] No clickable card button found — marketplace may use inline cards");
        // Take a screenshot of what we see
        await screenshot(page, "invest-detail-desktop.png");
      }
    } catch (e: any) {
      console.log(`  [DETAIL ERROR] ${e.message?.slice(0, 120)}`);
    }

    // --- 4. Check Buttons ---
    console.log("\n--- 4. Button Audit ---\n");

    // Go back to marketplace
    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(3000);

    const buttonLabels = [
      "Express Interest",
      "Contact",
      "Download",
      "Info Pack",
      "Buy",
      "Purchase",
      "Invest Now",
      "Invest",
      "View Details",
      "View",
      "Learn More",
      "Apply",
      "Reserve",
      "Share",
      "Save",
      "Favourite",
      "Compare",
    ];

    const allButtons = await page.locator("button").allInnerTexts();
    const allLinks = await page.locator("a").allInnerTexts();
    const allInteractive = [...allButtons, ...allLinks].map(t => t.trim()).filter(t => t.length > 0);
    console.log(`  [BUTTONS] Total buttons: ${allButtons.length}, links: ${allLinks.length}`);
    console.log(`  [BUTTONS] All button texts: ${allButtons.map(t => t.trim()).filter(t => t.length > 0 && t.length < 40).join(" | ")}`);

    for (const label of buttonLabels) {
      const found = allInteractive.some(t => t.toLowerCase().includes(label.toLowerCase()));
      console.log(`  [BUTTON] "${label}": ${found ? "FOUND" : "NOT FOUND"}`);
    }

    // --- 5. Filters, Dropdowns, Sort Controls ---
    console.log("\n--- 5. Filters & Sort Controls ---\n");

    const filterChecks = [
      { label: "select/dropdown", sel: "select, [role='combobox'], [role='listbox']" },
      { label: "search input", sel: 'input[type="search"]' },
      { label: "text input", sel: 'input[type="text"]' },
      { label: "sort button", sel: 'button:has-text("Sort")' },
      { label: "filter button", sel: 'button:has-text("Filter")' },
      { label: "slider", sel: '[role="slider"], input[type="range"]' },
      { label: "checkbox", sel: 'input[type="checkbox"]' },
      { label: "tabs", sel: '[role="tab"]' },
      { label: "tablist", sel: '[role="tablist"]' },
    ];

    for (const { label, sel } of filterChecks) {
      try {
        const ct = await page.locator(sel).count();
        console.log(`  [FILTER] ${label}: ${ct} elements`);
      } catch {
        console.log(`  [FILTER] ${label}: selector error`);
      }
    }

    // List all select options
    try {
      const selects = page.locator("select");
      const selectCount = await selects.count();
      for (let i = 0; i < Math.min(selectCount, 3); i++) {
        const options = await selects.nth(i).locator("option").allInnerTexts();
        console.log(`  [DROPDOWN ${i}] Options: ${options.join(", ").slice(0, 120)}`);
      }
    } catch {
      // no selects
    }
  });
});

// ─── 6. Admin Investment Management ──────────────────────────────────────────

test.describe("6. Admin Investment Pages", () => {
  test("audit admin invest management tools", async ({ page }) => {
    console.log("\n=== TEST 6: Admin Investment Management ===\n");

    const signedIn = await signInAdmin(page);
    if (!signedIn) {
      console.log("  [SKIP] Cannot proceed without auth");
      return;
    }

    const adminPages = [
      { path: "/admin/invest", label: "Admin Invest Dashboard" },
      { path: "/admin/invest/properties", label: "Admin Invest Properties" },
      { path: "/admin/invest/orders", label: "Admin Invest Orders" },
      { path: "/admin/invest/shareholders", label: "Admin Invest Shareholders" },
      { path: "/admin/invest/commissions", label: "Admin Invest Commissions" },
      { path: "/admin/invest/commission-settings", label: "Admin Commission Settings" },
      { path: "/admin/invest/payouts", label: "Admin Invest Payouts" },
      { path: "/admin/invest/proposals", label: "Admin Invest Proposals" },
      { path: "/admin/invest/boost", label: "Admin Invest Boost" },
      { path: "/admin/invest/endpoints", label: "Admin Endpoints" },
      { path: "/admin/invest/test-console", label: "Admin Test Console" },
    ];

    for (const ap of adminPages) {
      try {
        const resp = await page.goto(`${BASE}${ap.path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(2500);
        const status = resp?.status() ?? 0;
        const url = page.url();
        const bodyText = await page.locator("body").innerText().catch(() => "");
        const hasContent = bodyText.length > 50;
        const isError = bodyText.toLowerCase().includes("not found") || bodyText.includes("404");
        const isAuthBlocked = url.includes("signin") || url.includes("login");

        if (isAuthBlocked) {
          console.log(`  [ADMIN] ${ap.label}: BLOCKED — redirected to sign-in`);
        } else if (isError) {
          console.log(`  [ADMIN] ${ap.label}: ERROR — page shows error/404`);
        } else if (hasContent) {
          console.log(`  [ADMIN] ${ap.label}: OK (status ${status})`);
          const tables = await page.locator("table").count();
          const forms = await page.locator("form").count();
          const actionBtns = await page.locator("button").count();
          console.log(`    Tables: ${tables}, Forms: ${forms}, Buttons: ${actionBtns}`);
        } else {
          console.log(`  [ADMIN] ${ap.label}: EMPTY (status ${status})`);
        }

        await flagPlaceholderText(page, ap.label);
      } catch (e: any) {
        console.log(`  [ADMIN ERROR] ${ap.label}: ${e.message?.slice(0, 100)}`);
      }
    }
  });
});

// ─── 7. Copy Audit ───────────────────────────────────────────────────────────

test.describe("7. Copy Audit", () => {
  test("check all investment pages for placeholder/missing text", async ({ page }) => {
    console.log("\n=== TEST 7: Copy Audit ===\n");

    const signedIn = await signInAdmin(page);
    if (!signedIn) {
      console.log("  [SKIP] Cannot proceed without auth");
      return;
    }

    const investPages = [
      { path: "/dashboard/invest/marketplace", label: "Marketplace" },
      { path: "/dashboard/invest/portfolio", label: "Portfolio" },
      { path: "/dashboard/invest/payouts", label: "Payouts" },
      { path: "/dashboard/invest/proposals", label: "Proposals" },
    ];

    for (const pg of investPages) {
      try {
        await page.goto(`${BASE}${pg.path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(3000);
        await flagPlaceholderText(page, pg.label);

        // Check for empty headings
        const emptyHeadings = await page.locator("h1:empty, h2:empty, h3:empty").count();
        if (emptyHeadings > 0) {
          console.log(`  [COPY WARNING] ${pg.label}: ${emptyHeadings} empty heading(s)`);
        }

        // Check for $0 or £0 prices
        const bodyText = await page.locator("body").innerText().catch(() => "");
        if (/\$0\.00|\$0[^.]|£0\.00|£0[^.]/.test(bodyText)) {
          console.log(`  [COPY WARNING] ${pg.label}: found $0 or £0 price values`);
        }

        // Check for "N/A" or empty values
        const naCount = (bodyText.match(/\bN\/A\b/g) || []).length;
        if (naCount > 2) {
          console.log(`  [COPY WARNING] ${pg.label}: ${naCount} instances of "N/A"`);
        }

        // Check for broken/missing content
        if (bodyText.length < 50) {
          console.log(`  [COPY WARNING] ${pg.label}: very little content (${bodyText.length} chars)`);
        }
      } catch (e: any) {
        console.log(`  [COPY ERROR] ${pg.label}: ${e.message?.slice(0, 100)}`);
      }
    }
  });
});

// ─── 8. Mobile Layout ────────────────────────────────────────────────────────

test.describe("8. Mobile Layout (375x812)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("audit investment pages on mobile viewport", async ({ page }) => {
    console.log("\n=== TEST 8: Mobile Layout (375x812) ===\n");

    const signedIn = await signInAdmin(page);
    if (!signedIn) {
      console.log("  [SKIP] Cannot proceed without auth");
      return;
    }

    const mobilePages = [
      { path: "/dashboard/invest/marketplace", label: "Marketplace (Mobile)" },
      { path: "/dashboard/invest/portfolio", label: "Portfolio (Mobile)" },
      { path: "/dashboard/invest/payouts", label: "Payouts (Mobile)" },
    ];

    for (const pg of mobilePages) {
      try {
        await page.goto(`${BASE}${pg.path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(3000);

        console.log(`  [MOBILE] ${pg.label}: loaded at ${page.url()}`);

        // Check for horizontal overflow
        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        if (hasOverflow) {
          console.log(`  [MOBILE WARNING] ${pg.label}: horizontal overflow detected!`);
        } else {
          console.log(`  [MOBILE OK] ${pg.label}: no horizontal overflow`);
        }

        // Check for tiny text
        const tinyText = await page.evaluate(() => {
          const allEls = document.querySelectorAll("*");
          let count = 0;
          allEls.forEach((el) => {
            const style = window.getComputedStyle(el);
            const size = parseFloat(style.fontSize);
            if (size > 0 && size < 10 && el.textContent && el.textContent.trim().length > 0) {
              count++;
            }
          });
          return count;
        });
        if (tinyText > 0) {
          console.log(`  [MOBILE WARNING] ${pg.label}: ${tinyText} elements with font < 10px`);
        }

        // Check touch targets
        const smallTargets = await page.evaluate(() => {
          const els = document.querySelectorAll("button, a");
          let count = 0;
          els.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && (rect.width < 30 || rect.height < 30)) {
              count++;
            }
          });
          return count;
        });
        if (smallTargets > 3) {
          console.log(`  [MOBILE WARNING] ${pg.label}: ${smallTargets} small touch targets (<30px)`);
        }

      } catch (e: any) {
        console.log(`  [MOBILE ERROR] ${pg.label}: ${e.message?.slice(0, 100)}`);
      }
    }

    // Take mobile screenshot on marketplace
    try {
      await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(3000);
      await screenshot(page, "invest-mobile.png");
    } catch (e: any) {
      console.log(`  [SCREENSHOT ERROR] invest-mobile.png: ${e.message?.slice(0, 100)}`);
    }
  });
});

// ─── 9. Sub-navigation audit ─────────────────────────────────────────────────

test.describe("9. Invest Sub-Pages (Portfolio, Payouts, Proposals)", () => {
  test("audit all invest sub-pages", async ({ page }) => {
    console.log("\n=== TEST 9: Invest Sub-Pages ===\n");

    const signedIn = await signInAdmin(page);
    if (!signedIn) {
      console.log("  [SKIP] Cannot proceed without auth");
      return;
    }

    const subPages = [
      { path: "/dashboard/invest/portfolio", label: "Portfolio" },
      { path: "/dashboard/invest/payouts", label: "Payouts" },
      { path: "/dashboard/invest/proposals", label: "Proposals" },
    ];

    for (const sp of subPages) {
      try {
        await page.goto(`${BASE}${sp.path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(3000);
        const bodyText = await page.locator("body").innerText().catch(() => "");
        const hasContent = bodyText.length > 100;
        console.log(`  [PAGE] ${sp.label}: ${hasContent ? "HAS CONTENT" : "EMPTY/MINIMAL"} (${bodyText.length} chars)`);

        // Check for tables, cards, empty states
        const tables = await page.locator("table").count();
        const cards = await page.locator('[class*="card" i]').count();
        const emptyState = bodyText.toLowerCase().includes("no ") || bodyText.toLowerCase().includes("empty") || bodyText.toLowerCase().includes("nothing");
        console.log(`    Tables: ${tables}, Cards: ${cards}, Empty state msg: ${emptyState}`);

        await flagPlaceholderText(page, sp.label);
      } catch (e: any) {
        console.log(`  [ERROR] ${sp.label}: ${e.message?.slice(0, 100)}`);
      }
    }
  });
});
