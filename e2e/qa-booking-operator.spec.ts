/**
 * AGENT 2 — Booking Site Auditor (Operator Side)
 * Audits booking-site management from hub.nfstay.com + nfstay.app direct
 */
import { test, expect } from "@playwright/test";

const HUB = "https://hub.nfstay.com";
const BOOKING_SITE = "https://nfstay.app";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";
const SCREENSHOTS = "e2e/screenshots";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";

/* ─── helper: sign in via hub (with graceful failure) ─── */
async function hubSignIn(page: import("@playwright/test").Page): Promise<boolean> {
  try {
    const resp = await page.goto(`${HUB}/sign-in`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const status = resp?.status() ?? 0;
    if (status >= 400) {
      console.log(`  [auth] Hub sign-in page returned HTTP ${status} — site may be down`);
      return false;
    }
    await page.waitForTimeout(3000);

    // Check if sign-in form is present
    const emailInput = page.locator('[data-feature="AUTH__SIGNIN_EMAIL"], input[type="email"], input[placeholder*="email" i]').first();
    const formVisible = await emailInput.isVisible({ timeout: 10000 }).catch(() => false);
    if (!formVisible) {
      console.log(`  [auth] Sign-in form not found on page`);
      await page.screenshot({ path: `${SCREENSHOTS}/hub-signin-debug.png`, fullPage: true }).catch(() => {});
      return false;
    }

    await emailInput.fill(ADMIN_EMAIL);
    const passInput = page.locator('[data-feature="AUTH__SIGNIN_PASSWORD"], input[type="password"]').first();
    await passInput.fill(ADMIN_PASS);
    const submitBtn = page.locator('[data-feature="AUTH__SIGNIN_SUBMIT"], button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForURL(/dashboard|deals|admin/, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(3000);
    return true;
  } catch (e) {
    console.log(`  [auth] Sign-in failed: ${(e as Error).message.slice(0, 100)}`);
    return false;
  }
}

/* ─── helper: safe screenshot ─── */
async function snap(page: import("@playwright/test").Page, name: string) {
  try {
    await page.screenshot({ path: `${SCREENSHOTS}/${name}`, fullPage: true });
    console.log(`  [screenshot] Saved: ${name}`);
  } catch (e) {
    console.log(`  [screenshot-fail] ${name}: ${(e as Error).message.slice(0, 60)}`);
  }
}

/* ─── helper: collect visible links/buttons ─── */
async function collectClickables(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("a, button, [role='tab'], [role='button']"));
    return els
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .map((el) => ({
        tag: el.tagName,
        text: (el as HTMLElement).innerText?.trim().slice(0, 80),
        href: (el as HTMLAnchorElement).href || null,
      }));
  });
}

/* ─── helper: check hub page availability ─── */
async function checkHubPage(page: import("@playwright/test").Page, path: string, label: string): Promise<{ loaded: boolean; status: number }> {
  try {
    const resp = await page.goto(`${HUB}${path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
    const status = resp?.status() ?? 0;
    await page.waitForTimeout(2000);
    const bodyLen = await page.locator("body").textContent().then((t) => t?.length ?? 0).catch(() => 0);
    const loaded = status < 400 && bodyLen > 200;
    console.log(`  [${label}] Status: ${status}, Body length: ${bodyLen}, Loaded: ${loaded}`);
    return { loaded, status };
  } catch (e) {
    console.log(`  [${label}] Failed: ${(e as Error).message.slice(0, 80)}`);
    return { loaded: false, status: 0 };
  }
}

// ════════════════════════════════════════════════════════════════
// PART 1: OPERATOR-SIDE BOOKING SITE (hub.nfstay.com)
// ════════════════════════════════════════════════════════════════

test.describe("PART 1 — Hub Operator Booking Site", () => {
  test("1.1 Hub connectivity and sign-in", async ({ page }) => {
    // First check if hub is up at all
    const hubHome = await checkHubPage(page, "/", "hub-home");
    await snap(page, "hub-homepage-check.png");

    const signInPage = await checkHubPage(page, "/sign-in", "hub-signin");
    await snap(page, "hub-signin-check.png");

    if (!hubHome.loaded && !signInPage.loaded) {
      console.log(`  [CRITICAL] hub.nfstay.com appears to be DOWN (both / and /sign-in return errors)`);
      console.log(`  [CRITICAL] HTTP status on /: ${hubHome.status}`);
      console.log(`  [CRITICAL] HTTP status on /sign-in: ${signInPage.status}`);
      console.log(`  [CRITICAL] Cannot test operator booking-site features without hub access`);
      // Don't fail — just report the finding
      return;
    }

    const signedIn = await hubSignIn(page);
    console.log(`  [auth] Sign-in successful: ${signedIn}`);

    if (signedIn) {
      await page.goto(`${HUB}/dashboard/booking-site`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);
      await snap(page, "booking-operator-dashboard.png");
      const heading = await page.locator("h1, h2, h3").first().textContent().catch(() => "none");
      console.log(`  [booking-site] Page heading: ${heading}`);
    }
  });

  test("1.2 Hub booking-site page (unauthenticated probe)", async ({ page }) => {
    // Try to access booking-site pages without auth to map what exists
    const pagesToCheck = [
      { path: "/dashboard/booking-site", label: "dashboard-booking-site" },
      { path: "/nfstay/dashboard", label: "nfstay-dashboard" },
      { path: "/nfstay/settings", label: "nfstay-settings" },
      { path: "/dashboard/settings", label: "dashboard-settings" },
    ];

    for (const p of pagesToCheck) {
      const result = await checkHubPage(page, p.path, p.label);
      if (result.loaded) {
        await snap(page, `hub-${p.label}.png`);
      }
    }
  });

  test("1.3 Supabase auth + API check for booking-related tables", async ({ page }) => {
    // Use Supabase REST API to check if booking-related tables exist
    try {
      const authResp = await page.evaluate(async ({ url, key, email, pass }) => {
        const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
          body: JSON.stringify({ email, password: pass }),
        });
        return { status: r.status, data: await r.json() };
      }, { url: SUPABASE_URL, key: SUPABASE_ANON, email: ADMIN_EMAIL, pass: ADMIN_PASS });

      console.log(`  [supabase-auth] Status: ${authResp.status}`);
      const hasToken = !!authResp.data?.access_token;
      console.log(`  [supabase-auth] Got access token: ${hasToken}`);

      if (hasToken) {
        const token = authResp.data.access_token;
        // Check for nfs_* tables (booking site related)
        const tables = ["nfs_properties", "nfs_bookings", "nfs_operators", "nfs_reservations", "nfs_reviews"];
        for (const table of tables) {
          try {
            const r = await page.evaluate(async ({ url, key, tkn, tbl }) => {
              const resp = await fetch(`${url}/rest/v1/${tbl}?limit=1`, {
                headers: { apikey: key, Authorization: `Bearer ${tkn}` },
              });
              return { status: resp.status };
            }, { url: SUPABASE_URL, key: SUPABASE_ANON, tkn: token, tbl: table });
            console.log(`  [supabase] Table ${table}: ${r.status === 200 ? "EXISTS" : `status ${r.status}`}`);
          } catch {
            console.log(`  [supabase] Table ${table}: ERROR`);
          }
        }
      }
    } catch (e) {
      console.log(`  [supabase] API check failed: ${(e as Error).message.slice(0, 80)}`);
    }
  });
});

// ════════════════════════════════════════════════════════════════
// PART 2: BOOKING SITE DIRECT (nfstay.app)
// ════════════════════════════════════════════════════════════════

test.describe("PART 2 — nfstay.app Direct Audit", () => {
  test("2.1 Homepage loads and screenshot", async ({ page }) => {
    const resp = await page.goto(BOOKING_SITE, { waitUntil: "domcontentloaded", timeout: 30000 });
    const status = resp?.status() ?? 0;
    console.log(`  [nfstay.app] Status: ${status}`);

    await page.waitForTimeout(3000);
    await snap(page, "booking-site-homepage.png");

    const title = await page.title();
    console.log(`  [nfstay.app] Page title: "${title}"`);

    const heading = await page.locator("h1, h2").first().textContent().catch(() => "none");
    console.log(`  [nfstay.app] Main heading: "${heading?.trim()}"`);

    const bodyLen = await page.locator("body").textContent().then((t) => t?.length ?? 0);
    console.log(`  [nfstay.app] Body text length: ${bodyLen}`);

    expect(status).toBeLessThan(500);
  });

  test("2.2 Browse available properties", async ({ page }) => {
    await page.goto(BOOKING_SITE, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Look for property cards/listings
    const cards = await page.locator('[class*="property" i], [class*="listing" i], [class*="card" i], article').count();
    console.log(`  [properties] Property-like elements: ${cards}`);

    // Look for search/filter
    const searchInput = await page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="where" i], input[placeholder*="destination" i]').count();
    console.log(`  [search] Search inputs: ${searchInput}`);

    // Look for property links
    const propertyLinks = await page.locator('a[href*="property"], a[href*="listing"], a[href*="/p/"]').count();
    console.log(`  [properties] Property links: ${propertyLinks}`);

    // Check for Browse/Explore buttons
    const browseBtn = await page.locator('button:has-text("Browse"), button:has-text("Explore"), a:has-text("View All"), button:has-text("Search"), a:has-text("Browse")').count();
    console.log(`  [browse] Browse/explore buttons: ${browseBtn}`);

    // Collect all links
    const allLinks = await page.locator("a").evaluateAll((els) =>
      els
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => ({ text: el.innerText?.trim().slice(0, 50), href: el.href }))
    );
    console.log(`  [links] All visible links: ${JSON.stringify(allLinks.slice(0, 15))}`);

    await snap(page, "booking-site-properties.png");
  });

  test("2.3 Click into a property listing", async ({ page }) => {
    await page.goto(BOOKING_SITE, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    let clickedProperty = false;

    // Strategy 1: click a property link
    try {
      const propLink = page.locator('a[href*="/property/"]').first();
      if (await propLink.isVisible({ timeout: 3000 })) {
        await propLink.click();
        await page.waitForTimeout(3000);
        clickedProperty = true;
        console.log(`  [property-detail] Navigated to: ${page.url()}`);
      }
    } catch { /* try next */ }

    // Strategy 2: click any card with image
    if (!clickedProperty) {
      try {
        const propCard = page.locator('[class*="card" i]:has(img), article:has(img)').first();
        if (await propCard.isVisible({ timeout: 3000 })) {
          await propCard.click();
          await page.waitForTimeout(2000);
          clickedProperty = true;
          console.log(`  [property-detail] Navigated via card to: ${page.url()}`);
        }
      } catch { /* no cards */ }
    }

    if (clickedProperty) {
      await snap(page, "booking-property-detail.png");

      const details = {
        images: await page.locator("img").count(),
        price: await page.locator('text=/\\$|\\£|price|night|per/i').count(),
        beds: await page.locator('text=/bed|bedroom|sleep/i').count(),
        baths: await page.locator('text=/bath|bathroom|shower/i').count(),
        guests: await page.locator('text=/guest|people|capacity/i').count(),
        bookButton: await page.locator('button:has-text("Book"), button:has-text("Reserve"), button:has-text("Check"), a:has-text("Book")').count(),
        calendar: await page.locator('input[type="date"], [class*="calendar" i], [class*="datepicker" i]').count(),
        description: await page.locator('text=/description|about|overview/i').count(),
        amenities: await page.locator('text=/amenities|features|facilities/i').count(),
        reviews: await page.locator('text=/review|rating|star/i').count(),
        map: await page.locator('[class*="map" i], iframe[src*="map"]').count(),
        host: await page.locator('text=/host|owner|managed/i').count(),
      };
      console.log(`  [property-detail] Elements: ${JSON.stringify(details)}`);

      const buttons = await page.locator("button").allTextContents();
      console.log(`  [property-detail] Buttons: ${JSON.stringify(buttons.map((b) => b.trim()).filter(Boolean).slice(0, 15))}`);
    } else {
      console.log(`  [property-detail] Could not click into any property listing`);
    }
  });

  test("2.4 Check all buttons and functionality on homepage", async ({ page }) => {
    await page.goto(BOOKING_SITE, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    const clickables = await collectClickables(page);
    console.log(`  [homepage] Total clickable elements: ${clickables.length}`);

    const buttons = clickables.filter((c) => c.tag === "BUTTON");
    console.log(`  [homepage] Buttons: ${JSON.stringify(buttons.map((b) => b.text).slice(0, 20))}`);

    const links = clickables.filter((c) => c.tag === "A");
    console.log(`  [homepage] Links: ${JSON.stringify(links.map((l) => ({ text: l.text?.slice(0, 40), href: l.href })).slice(0, 20))}`);

    const navItems = await page.locator("nav a, nav button, header a, header button").allTextContents();
    console.log(`  [homepage] Nav items: ${JSON.stringify(navItems.map((n) => n.trim()).filter(Boolean))}`);

    const footerText = await page.locator("footer").textContent().catch(() => "no footer");
    console.log(`  [homepage] Footer: "${footerText?.trim().slice(0, 200)}"`);

    // Check the search page
    try {
      await page.goto(`${BOOKING_SITE}/search`, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(2000);
      const searchHeading = await page.locator("h1, h2").first().textContent().catch(() => "none");
      console.log(`  [search-page] Heading: "${searchHeading?.trim()}"`);
      await snap(page, "booking-site-search.png");
    } catch {
      console.log(`  [search-page] Could not load /search`);
    }

    // Check operator landing page
    try {
      await page.goto(`${BOOKING_SITE}/nfstay`, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(2000);
      const opHeading = await page.locator("h1, h2").first().textContent().catch(() => "none");
      console.log(`  [operator-page] Heading: "${opHeading?.trim()}"`);
      await snap(page, "booking-site-operator-landing.png");
    } catch {
      console.log(`  [operator-page] Could not load /nfstay`);
    }
  });

  test("2.5 Mobile layout test (375x812)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BOOKING_SITE, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    await snap(page, "booking-mobile.png");

    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(`  [mobile] Horizontal overflow: ${overflowX}`);

    const hamburger = await page.locator('button[aria-label*="menu" i], button:has(svg), [class*="hamburger" i], [class*="menu-toggle" i]').count();
    console.log(`  [mobile] Hamburger/menu buttons: ${hamburger}`);

    const smallButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button, a"));
      return btns.filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
      }).length;
    });
    console.log(`  [mobile] Buttons smaller than 44px touch target: ${smallButtons}`);

    const tinyText = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("p, span, a, button, li, td, th, label"));
      return els.filter((el) => {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && fs < 12;
      }).length;
    });
    console.log(`  [mobile] Elements with font < 12px: ${tinyText}`);

    // Try property detail on mobile
    try {
      const mobileLink = page.locator('a[href*="/property/"]').first();
      if (await mobileLink.isVisible({ timeout: 3000 })) {
        await mobileLink.click();
        await page.waitForTimeout(3000);
        await snap(page, "booking-mobile-detail.png");
        console.log(`  [mobile] Property detail URL: ${page.url()}`);
      }
    } catch {
      console.log(`  [mobile] Could not click property on mobile`);
    }
  });
});

// ════════════════════════════════════════════════════════════════
// PART 3: OPERATOR BRANDING + SUMMARY
// ════════════════════════════════════════════════════════════════

test.describe("PART 3 — Branding & Summary", () => {
  test("3.1 Check operator branding features on nfstay.app", async ({ page }) => {
    // Check operator-facing pages on nfstay.app
    const operatorPages = [
      { url: `${BOOKING_SITE}/nfstay`, label: "operator-landing" },
      { url: `${BOOKING_SITE}/signin`, label: "signin" },
      { url: `${BOOKING_SITE}/admin/nfstay`, label: "admin" },
    ];

    for (const p of operatorPages) {
      try {
        const resp = await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 15000 });
        const status = resp?.status() ?? 0;
        await page.waitForTimeout(2000);
        const bodyLen = await page.locator("body").textContent().then((t) => t?.length ?? 0).catch(() => 0);
        console.log(`  [${p.label}] Status: ${status}, Body: ${bodyLen} chars`);

        // Check for branding-related UI
        const brandingUI = await page.locator('text=/brand|logo|colo[u]?r|theme|white.?label|customiz/i').count();
        console.log(`  [${p.label}] Branding-related text: ${brandingUI}`);

        await snap(page, `booking-${p.label}.png`);
      } catch (e) {
        console.log(`  [${p.label}] Failed: ${(e as Error).message.slice(0, 60)}`);
      }
    }
  });

  test("3.2 Final connectivity + feature summary", async ({ page }) => {
    const results: Record<string, string> = {};

    // Hub booking-site page
    try {
      const resp = await page.goto(`${HUB}/dashboard/booking-site`, { waitUntil: "domcontentloaded", timeout: 20000 });
      const status = resp?.status() ?? 0;
      results["Hub /dashboard/booking-site"] = status < 400 ? `OK (${status})` : `DOWN (${status})`;
    } catch (e) {
      results["Hub /dashboard/booking-site"] = `ERROR: ${(e as Error).message.slice(0, 60)}`;
    }

    // Hub root
    try {
      const resp = await page.goto(HUB, { waitUntil: "domcontentloaded", timeout: 20000 });
      results["Hub root"] = `HTTP ${resp?.status()}`;
    } catch (e) {
      results["Hub root"] = `ERROR: ${(e as Error).message.slice(0, 60)}`;
    }

    // nfstay.app homepage
    try {
      const resp = await page.goto(BOOKING_SITE, { waitUntil: "domcontentloaded", timeout: 20000 });
      results["nfstay.app homepage"] = resp?.status() === 200 ? "OK (200)" : `STATUS ${resp?.status()}`;
    } catch (e) {
      results["nfstay.app homepage"] = `ERROR: ${(e as Error).message.slice(0, 60)}`;
    }

    // nfstay.app property page
    try {
      const resp = await page.goto(`${BOOKING_SITE}/property/stunning-marina-view-apartment-prop-001`, { waitUntil: "domcontentloaded", timeout: 20000 });
      results["nfstay.app property detail"] = resp?.status() === 200 ? "OK (200)" : `STATUS ${resp?.status()}`;
    } catch (e) {
      results["nfstay.app property detail"] = `ERROR: ${(e as Error).message.slice(0, 60)}`;
    }

    // nfstay.app operator page
    try {
      const resp = await page.goto(`${BOOKING_SITE}/nfstay`, { waitUntil: "domcontentloaded", timeout: 20000 });
      results["nfstay.app /nfstay (operator)"] = resp?.status() === 200 ? "OK (200)" : `STATUS ${resp?.status()}`;
    } catch (e) {
      results["nfstay.app /nfstay (operator)"] = `ERROR: ${(e as Error).message.slice(0, 60)}`;
    }

    // nfstay.app search page
    try {
      const resp = await page.goto(`${BOOKING_SITE}/search`, { waitUntil: "domcontentloaded", timeout: 20000 });
      results["nfstay.app /search"] = resp?.status() === 200 ? "OK (200)" : `STATUS ${resp?.status()}`;
    } catch (e) {
      results["nfstay.app /search"] = `ERROR: ${(e as Error).message.slice(0, 60)}`;
    }

    console.log("\n══════════════════════════════════════════════════════");
    console.log("BOOKING SITE AUDIT — FINAL SUMMARY");
    console.log("══════════════════════════════════════════════════════");
    for (const [key, val] of Object.entries(results)) {
      const icon = val.includes("OK") ? "OK" : val.includes("DOWN") || val.includes("ERROR") ? "XX" : "??";
      console.log(`  [${icon}] ${key}: ${val}`);
    }
    console.log("══════════════════════════════════════════════════════\n");
  });
});
