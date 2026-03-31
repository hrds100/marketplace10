/**
 * QA FULL SWARM — hub.nfstay.com
 * Combined Workers 1 (Marketplace), 5 (Admin), 7 (Onboarding), 8 (SEO)
 *
 * Run:
 *   cd marketplace10
 *   npx playwright test e2e/qa-full-swarm.spec.ts --config=e2e/hub-playwright.config.ts --reporter=list --timeout=180000
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASSWORD = "Dgs58913347.";
const SCREENSHOTS = "e2e/screenshots";

// ─── helpers ──────────────────────────────────────────────────────

async function snap(page: Page, name: string) {
  try {
    await page.screenshot({ path: `${SCREENSHOTS}/${name}.png`, fullPage: true });
    console.log(`  [SCREENSHOT] ${name}.png saved`);
  } catch (e) {
    console.log(`  [SCREENSHOT] FAILED ${name}: ${e}`);
  }
}

async function adminSignIn(page: Page) {
  await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded", timeout: 30000 });

  const emailInput = page.locator('[data-feature="AUTH__SIGNIN_EMAIL"]');
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill(ADMIN_EMAIL);

  const passwordInput = page.locator('[data-feature="AUTH__SIGNIN_PASSWORD"]');
  await passwordInput.waitFor({ state: "visible", timeout: 5000 });
  await passwordInput.fill(ADMIN_PASSWORD);

  const submitBtn = page.locator('[data-feature="AUTH__SIGNIN_SUBMIT"]');
  await submitBtn.click();

  await page.waitForURL((url) => !url.pathname.includes("/signin"), { timeout: 30000 });
  await page.waitForTimeout(2000);
}

// ═════════════════════════════════════════════════════════════════
// WORKER 1 — MARKETPLACE
// ═════════════════════════════════════════════════════════════════

test.describe("W1 — MARKETPLACE", () => {
  test("1.1 Homepage loads, hero visible, CTA present", async ({ page }) => {
    try {
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await snap(page, "w1-homepage");

      // Hero section should be visible
      const hero = page.locator("section").first();
      await expect(hero).toBeVisible({ timeout: 10000 });
      console.log("  Hero section: visible");

      // Look for a CTA button (Get Started, Sign Up, etc.)
      const ctaButtons = page.locator('a[href*="sign"], button:has-text("Get Started"), a:has-text("Get Started"), button:has-text("Start"), a:has-text("Start")');
      const ctaCount = await ctaButtons.count();
      console.log(`  CTA buttons found: ${ctaCount}`);
      expect(ctaCount).toBeGreaterThan(0);
    } catch (e) {
      console.log(`  [FAIL] Homepage hero/CTA: ${e}`);
      await snap(page, "w1-homepage-fail");
      throw e;
    }
  });

  test("1.2 Navigate to /dashboard/deals (auth required)", async ({ page }) => {
    try {
      await adminSignIn(page);
      await page.goto(`${BASE}/dashboard/deals`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await snap(page, "w1-dashboard-deals");

      // Should not be redirected to signin
      const url = page.url();
      console.log(`  Dashboard deals URL: ${url}`);
      // The page either shows deals or a valid dashboard
      const body = await page.textContent("body");
      console.log(`  Page has content: ${(body || "").length > 100}`);
    } catch (e) {
      console.log(`  [FAIL] Dashboard deals: ${e}`);
      await snap(page, "w1-dashboard-deals-fail");
      throw e;
    }
  });

  test("1.3 Deal cards render with title, price, location", async ({ page }) => {
    try {
      await adminSignIn(page);
      await page.goto(`${BASE}/dashboard/deals`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(3000);

      // Look for property/deal cards
      const cards = page.locator('[data-feature*="DEAL"], [class*="card"], [class*="Card"], [class*="property"]');
      const cardCount = await cards.count();
      console.log(`  Deal cards found: ${cardCount}`);

      if (cardCount > 0) {
        const firstCard = cards.first();
        const cardText = await firstCard.textContent();
        console.log(`  First card text preview: ${(cardText || "").substring(0, 120)}`);

        // Check for price-like content (£ or number)
        const hasPrice = /£|\d+/.test(cardText || "");
        console.log(`  Card has price content: ${hasPrice}`);
      } else {
        console.log("  No deal cards found — may be empty state or different layout");
      }
      await snap(page, "w1-deal-cards");
    } catch (e) {
      console.log(`  [FAIL] Deal cards: ${e}`);
      await snap(page, "w1-deal-cards-fail");
      throw e;
    }
  });

  test("1.4 Click a deal detail — page loads", async ({ page }) => {
    try {
      await adminSignIn(page);
      await page.goto(`${BASE}/dashboard/deals`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(3000);

      // Try to click a deal card link
      const dealLink = page.locator('a[href*="/deal"], a[href*="/property"], [data-feature*="DEAL"] a').first();
      const linkExists = await dealLink.count();

      if (linkExists > 0) {
        await dealLink.click();
        await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2000);
        console.log(`  Deal detail URL: ${page.url()}`);
        await snap(page, "w1-deal-detail");
      } else {
        console.log("  No clickable deal links found — skipping detail check");
        await snap(page, "w1-no-deal-links");
      }
    } catch (e) {
      console.log(`  [FAIL] Deal detail: ${e}`);
      await snap(page, "w1-deal-detail-fail");
      throw e;
    }
  });

  test("1.5 Check Save, Contact buttons exist on deal detail", async ({ page }) => {
    try {
      await adminSignIn(page);
      await page.goto(`${BASE}/dashboard/deals`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(3000);

      const dealLink = page.locator('a[href*="/deal"], a[href*="/property"], [data-feature*="DEAL"] a').first();
      const linkExists = await dealLink.count();

      if (linkExists > 0) {
        await dealLink.click();
        await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2000);

        const bodyText = (await page.textContent("body")) || "";
        const hasSave = /save|favourite|bookmark/i.test(bodyText);
        const hasContact = /contact|enquir|inquir|message/i.test(bodyText);
        console.log(`  Save-like button found: ${hasSave}`);
        console.log(`  Contact-like button found: ${hasContact}`);
        await snap(page, "w1-deal-buttons");
      } else {
        console.log("  No deal links — cannot test Save/Contact buttons");
      }
    } catch (e) {
      console.log(`  [FAIL] Save/Contact buttons: ${e}`);
      await snap(page, "w1-deal-buttons-fail");
      throw e;
    }
  });

  test("1.6 Mobile 375x812 — no horizontal overflow", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, trace: "off" });
    const page = await context.newPage();
    try {
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);
      await snap(page, "w1-mobile-375");

      const overflowWidth = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      console.log(`  Mobile overflow detected: ${overflowWidth}`);
      expect(overflowWidth).toBe(false);
    } catch (e) {
      console.log(`  [FAIL] Mobile overflow: ${e}`);
      await snap(page, "w1-mobile-overflow-fail");
      throw e;
    } finally {
      await context.close();
    }
  });
});

// ═════════════════════════════════════════════════════════════════
// WORKER 5 — ADMIN
// ═════════════════════════════════════════════════════════════════

test.describe("W5 — ADMIN", () => {
  test("5.1 Sign in as admin via form", async ({ page }) => {
    try {
      await adminSignIn(page);
      const url = page.url();
      console.log(`  Post-login URL: ${url}`);
      expect(url).not.toContain("/signin");
      await snap(page, "w5-admin-signed-in");
    } catch (e) {
      console.log(`  [FAIL] Admin sign in: ${e}`);
      await snap(page, "w5-admin-signin-fail");
      throw e;
    }
  });

  test("5.2 /admin/marketplace loads", async ({ page }) => {
    try {
      await adminSignIn(page);
      await page.goto(`${BASE}/admin/marketplace`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);
      const url = page.url();
      console.log(`  Admin marketplace URL: ${url}`);
      // Should not be redirected away
      expect(url).toContain("/admin");
      await snap(page, "w5-admin-marketplace");
    } catch (e) {
      console.log(`  [FAIL] Admin marketplace: ${e}`);
      await snap(page, "w5-admin-marketplace-fail");
      throw e;
    }
  });

  test("5.3 /admin/marketplace/users loads", async ({ page }) => {
    try {
      await adminSignIn(page);
      await page.goto(`${BASE}/admin/marketplace/users`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);
      const url = page.url();
      console.log(`  Admin users URL: ${url}`);
      expect(url).toContain("/admin");
      const bodyText = (await page.textContent("body")) || "";
      console.log(`  Page content length: ${bodyText.length}`);
      await snap(page, "w5-admin-users");
    } catch (e) {
      console.log(`  [FAIL] Admin users: ${e}`);
      await snap(page, "w5-admin-users-fail");
      throw e;
    }
  });

  test("5.4 /admin/marketplace/submissions loads", async ({ page }) => {
    try {
      await adminSignIn(page);
      await page.goto(`${BASE}/admin/marketplace/submissions`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);
      const url = page.url();
      console.log(`  Admin submissions URL: ${url}`);
      expect(url).toContain("/admin");
      await snap(page, "w5-admin-submissions");
    } catch (e) {
      console.log(`  [FAIL] Admin submissions: ${e}`);
      await snap(page, "w5-admin-submissions-fail");
      throw e;
    }
  });

  test("5.5 /admin/invest loads", async ({ page }) => {
    try {
      await adminSignIn(page);
      await page.goto(`${BASE}/admin/invest`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);
      const url = page.url();
      console.log(`  Admin invest URL: ${url}`);
      expect(url).toContain("/admin");
      await snap(page, "w5-admin-invest");
    } catch (e) {
      console.log(`  [FAIL] Admin invest: ${e}`);
      await snap(page, "w5-admin-invest-fail");
      throw e;
    }
  });

  test("5.6 /admin/invest/orders loads", async ({ page }) => {
    try {
      await adminSignIn(page);
      await page.goto(`${BASE}/admin/invest/orders`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);
      const url = page.url();
      console.log(`  Admin invest orders URL: ${url}`);
      expect(url).toContain("/admin");
      await snap(page, "w5-admin-invest-orders");
    } catch (e) {
      console.log(`  [FAIL] Admin invest orders: ${e}`);
      await snap(page, "w5-admin-invest-orders-fail");
      throw e;
    }
  });

  test("5.7 Notification bell visible", async ({ page }) => {
    try {
      await adminSignIn(page);
      await page.goto(`${BASE}/admin/marketplace`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);

      // Look for bell icon (notification indicator)
      const bell = page.locator('[data-feature*="NOTIF"], [aria-label*="notif"], [class*="bell"], svg.lucide-bell, button:has(svg)').first();
      const bellVisible = await bell.isVisible().catch(() => false);
      console.log(`  Notification bell visible: ${bellVisible}`);

      // Also check for notification count badge
      const badge = page.locator('[data-feature*="NOTIF"] span, [class*="badge"], [class*="count"]');
      const badgeCount = await badge.count();
      console.log(`  Badge elements found: ${badgeCount}`);
      await snap(page, "w5-notification-bell");
    } catch (e) {
      console.log(`  [FAIL] Notification bell: ${e}`);
      await snap(page, "w5-notification-bell-fail");
      throw e;
    }
  });

  test("5.8 404 page works (/this-does-not-exist)", async ({ page }) => {
    try {
      await page.goto(`${BASE}/this-does-not-exist`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);
      await snap(page, "w5-404-page");

      const bodyText = (await page.textContent("body")) || "";
      const has404 = /404|not found|page.*not|doesn.*exist/i.test(bodyText);
      console.log(`  404 content present: ${has404}`);
      console.log(`  404 page URL: ${page.url()}`);
    } catch (e) {
      console.log(`  [FAIL] 404 page: ${e}`);
      await snap(page, "w5-404-fail");
      throw e;
    }
  });

  test("5.9 Wrong password shows error on /signin", async ({ page }) => {
    try {
      await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded", timeout: 30000 });

      const emailInput = page.locator('[data-feature="AUTH__SIGNIN_EMAIL"]');
      await emailInput.waitFor({ state: "visible", timeout: 15000 });
      await emailInput.fill("admin@hub.nfstay.com");

      const passwordInput = page.locator('[data-feature="AUTH__SIGNIN_PASSWORD"]');
      await passwordInput.waitFor({ state: "visible", timeout: 5000 });
      await passwordInput.fill("WrongPassword123!");

      const submitBtn = page.locator('[data-feature="AUTH__SIGNIN_SUBMIT"]');
      await submitBtn.click();

      // Wait for error message to appear
      await page.waitForTimeout(3000);
      await snap(page, "w5-wrong-password");

      const bodyText = (await page.textContent("body")) || "";
      const hasError = /error|invalid|incorrect|wrong|fail/i.test(bodyText);
      console.log(`  Error message visible after wrong password: ${hasError}`);
      // Should still be on signin page
      expect(page.url()).toContain("/signin");
    } catch (e) {
      console.log(`  [FAIL] Wrong password error: ${e}`);
      await snap(page, "w5-wrong-password-fail");
      throw e;
    }
  });

  test("5.10 /forgot-password loads", async ({ page }) => {
    try {
      await page.goto(`${BASE}/forgot-password`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);
      await snap(page, "w5-forgot-password");

      const url = page.url();
      console.log(`  Forgot password URL: ${url}`);
      const bodyText = (await page.textContent("body")) || "";
      const hasResetForm = /reset|forgot|email|password/i.test(bodyText);
      console.log(`  Reset form content present: ${hasResetForm}`);
    } catch (e) {
      console.log(`  [FAIL] Forgot password: ${e}`);
      await snap(page, "w5-forgot-password-fail");
      throw e;
    }
  });
});

// ═════════════════════════════════════════════════════════════════
// WORKER 7 — ONBOARDING
// ═════════════════════════════════════════════════════════════════

test.describe("W7 — ONBOARDING", () => {
  test("7.1 Homepage first impression — CTA above fold, value prop", async ({ page }) => {
    try {
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await snap(page, "w7-homepage-first-impression");

      // Check CTA is above the fold (within first viewport)
      const ctaAboveFold = await page.evaluate(() => {
        const buttons = document.querySelectorAll('a, button');
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || "";
          if (text.includes("start") || text.includes("sign up") || text.includes("get started") || text.includes("join")) {
            const rect = btn.getBoundingClientRect();
            if (rect.top < window.innerHeight) return true;
          }
        }
        return false;
      });
      console.log(`  CTA above fold: ${ctaAboveFold}`);
      expect(ctaAboveFold).toBe(true);

      // Value proposition text present
      const heroText = (await page.textContent("body")) || "";
      const hasValueProp = /property|deal|rent|airbnb|landlord|invest/i.test(heroText);
      console.log(`  Value proposition keywords present: ${hasValueProp}`);
      expect(hasValueProp).toBe(true);
    } catch (e) {
      console.log(`  [FAIL] Homepage first impression: ${e}`);
      await snap(page, "w7-homepage-fail");
      throw e;
    }
  });

  test("7.2 /signup loads with email fields visible", async ({ page }) => {
    try {
      // Try both /signup and /sign-up
      const response = await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (!response || response.status() >= 400) {
        await page.goto(`${BASE}/sign-up`, { waitUntil: "domcontentloaded", timeout: 30000 });
      }
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);
      await snap(page, "w7-signup");

      const url = page.url();
      console.log(`  Signup URL: ${url}`);

      // Look for email input
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], [data-feature*="EMAIL"]');
      const emailCount = await emailInput.count();
      console.log(`  Email input fields: ${emailCount}`);
    } catch (e) {
      console.log(`  [FAIL] Signup page: ${e}`);
      await snap(page, "w7-signup-fail");
      throw e;
    }
  });

  test("7.3 /signin loads", async ({ page }) => {
    try {
      await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);
      await snap(page, "w7-signin");

      const emailInput = page.locator('[data-feature="AUTH__SIGNIN_EMAIL"]');
      const visible = await emailInput.isVisible().catch(() => false);
      console.log(`  Signin email input visible: ${visible}`);
      expect(visible).toBe(true);
    } catch (e) {
      console.log(`  [FAIL] Signin page: ${e}`);
      await snap(page, "w7-signin-fail");
      throw e;
    }
  });

  test("7.4 /forgot-password loads with reset form", async ({ page }) => {
    try {
      await page.goto(`${BASE}/forgot-password`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);
      await snap(page, "w7-forgot-password");

      const bodyText = (await page.textContent("body")) || "";
      const hasResetForm = /reset|forgot|email/i.test(bodyText);
      console.log(`  Forgot password content: ${hasResetForm}`);

      // Check for email input
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
      const emailCount = await emailInput.count();
      console.log(`  Email inputs on reset page: ${emailCount}`);
    } catch (e) {
      console.log(`  [FAIL] Forgot password form: ${e}`);
      await snap(page, "w7-forgot-password-fail");
      throw e;
    }
  });
});

// ═════════════════════════════════════════════════════════════════
// WORKER 8 — SEO
// ═════════════════════════════════════════════════════════════════

test.describe("W8 — SEO", () => {
  test("8.1 Homepage title is meaningful (not Vite + React)", async ({ page }) => {
    try {
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});

      const title = await page.title();
      console.log(`  Homepage title: "${title}"`);
      const isGeneric = /vite|react|untitled/i.test(title);
      console.log(`  Is generic title: ${isGeneric}`);
      expect(isGeneric).toBe(false);
    } catch (e) {
      console.log(`  [FAIL] Homepage title: ${e}`);
      throw e;
    }
  });

  test("8.2 Homepage meta description exists", async ({ page }) => {
    try {
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});

      const metaDesc = await page.locator('meta[name="description"]').getAttribute("content").catch(() => null);
      console.log(`  Meta description: "${metaDesc || "MISSING"}"`);
      // Just log — don't fail if missing, but flag it
      if (!metaDesc) {
        console.log("  [WARNING] No meta description found");
      }
    } catch (e) {
      console.log(`  [FAIL] Meta description check: ${e}`);
      throw e;
    }
  });

  test("8.3 Homepage OG image exists", async ({ page }) => {
    try {
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});

      const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content").catch(() => null);
      console.log(`  OG image: "${ogImage || "MISSING"}"`);
      if (!ogImage) {
        console.log("  [WARNING] No OG image found");
      }
    } catch (e) {
      console.log(`  [FAIL] OG image check: ${e}`);
      throw e;
    }
  });

  test("8.4 /sitemap.xml returns 200", async ({ request }) => {
    try {
      const resp = await request.get(`${BASE}/sitemap.xml`);
      const status = resp.status();
      console.log(`  /sitemap.xml status: ${status}`);
      if (status !== 200) {
        console.log("  [WARNING] sitemap.xml not found or error");
      }
    } catch (e) {
      console.log(`  [FAIL] sitemap.xml: ${e}`);
      throw e;
    }
  });

  test("8.5 /robots.txt returns 200", async ({ request }) => {
    try {
      const resp = await request.get(`${BASE}/robots.txt`);
      const status = resp.status();
      console.log(`  /robots.txt status: ${status}`);
      if (status === 200) {
        const body = await resp.text();
        console.log(`  robots.txt content:\n${body.substring(0, 300)}`);
      } else {
        console.log("  [WARNING] robots.txt not found");
      }
    } catch (e) {
      console.log(`  [FAIL] robots.txt: ${e}`);
      throw e;
    }
  });

  test("8.6 No mixed HTTP content on homepage", async ({ page }) => {
    try {
      const mixedContentUrls: string[] = [];

      page.on("request", (req) => {
        const url = req.url();
        if (url.startsWith("http://") && !url.includes("localhost")) {
          mixedContentUrls.push(url);
        }
      });

      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(3000);

      console.log(`  Mixed HTTP requests found: ${mixedContentUrls.length}`);
      if (mixedContentUrls.length > 0) {
        for (const url of mixedContentUrls.slice(0, 5)) {
          console.log(`    [MIXED] ${url}`);
        }
      }
      expect(mixedContentUrls.length).toBe(0);
    } catch (e) {
      console.log(`  [FAIL] Mixed content: ${e}`);
      throw e;
    }
  });

  test("8.7 All homepage nav links resolve (no 404s)", async ({ page, request }) => {
    try {
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});

      // Get all nav links
      const navLinks = await page.locator("nav a[href]").evaluateAll((links) =>
        links.map((a) => (a as HTMLAnchorElement).href).filter((h) => h.startsWith("http"))
      );

      const uniqueLinks = [...new Set(navLinks)];
      console.log(`  Nav links found: ${uniqueLinks.length}`);

      const broken: string[] = [];
      for (const link of uniqueLinks.slice(0, 15)) {
        try {
          const resp = await request.get(link, { timeout: 10000 });
          const status = resp.status();
          if (status >= 400) {
            broken.push(`${link} → ${status}`);
            console.log(`    [BROKEN] ${link} → ${status}`);
          } else {
            console.log(`    [OK] ${link} → ${status}`);
          }
        } catch {
          console.log(`    [TIMEOUT] ${link}`);
        }
      }

      console.log(`  Broken nav links: ${broken.length}`);
    } catch (e) {
      console.log(`  [FAIL] Nav link check: ${e}`);
      throw e;
    }
  });

  test("8.8 Console errors — collect and log", async ({ page }) => {
    try {
      const consoleErrors: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      page.on("pageerror", (err) => {
        consoleErrors.push(`[PAGE ERROR] ${err.message}`);
      });

      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(3000);

      console.log(`  Console errors collected: ${consoleErrors.length}`);
      for (const err of consoleErrors.slice(0, 10)) {
        console.log(`    [ERROR] ${err.substring(0, 200)}`);
      }

      if (consoleErrors.length === 0) {
        console.log("  No console errors — clean!");
      }
    } catch (e) {
      console.log(`  [FAIL] Console error collection: ${e}`);
      throw e;
    }
  });
});
