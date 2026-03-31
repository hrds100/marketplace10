/**
 * QA MARKETPLACE + ONBOARDING AUDIT — hub.nfstay.com
 * Combined Agent 1 (Marketplace) + Agent 7 (Onboarding)
 *
 * Run:
 *   cd marketplace10
 *   npx playwright test e2e/qa-marketplace-onboarding.spec.ts --config=e2e/hub-playwright.config.ts --reporter=list --timeout=120000
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const SCREENSHOTS = "e2e/screenshots";
const TIMESTAMP = Date.now();
const TEST_EMAIL = `qa-tenant-${TIMESTAMP}@hub.nfstay.com`;
const TEST_PASSWORD = "QaTest2026!";

/** Helper: take screenshot safely */
async function snap(page: Page, name: string) {
  try {
    await page.screenshot({
      path: `${SCREENSHOTS}/${name}.png`,
      fullPage: true,
    });
    console.log(`  [SCREENSHOT] ${name}.png saved`);
  } catch (e) {
    console.log(`  [SCREENSHOT] FAILED ${name}: ${e}`);
  }
}

/** Helper: check for placeholder / Lorem text */
function flagCopyIssues(text: string, pageName: string): string[] {
  const issues: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes("lorem ipsum"))
    issues.push(`${pageName}: Found "Lorem Ipsum"`);
  if (lower.includes("todo"))
    issues.push(`${pageName}: Found "TODO" in copy`);
  if (lower.includes("placeholder"))
    issues.push(`${pageName}: Found "placeholder" text`);
  if (lower.includes("undefined"))
    issues.push(`${pageName}: Found "undefined" in copy`);
  if (lower.includes("null"))
    issues.push(`${pageName}: Possible "null" in copy`);
  if (/\[.*?\]/.test(text) && !lower.includes("@"))
    issues.push(`${pageName}: Found bracket placeholder [...]`);
  if (lower.includes("xxx"))
    issues.push(`${pageName}: Found "xxx" placeholder`);
  return issues;
}

// ─────────────────────────────────────────────
//  PART A — ONBOARDING (Agent 7)
// ─────────────────────────────────────────────

test.describe("PART A — ONBOARDING AUDIT", () => {
  test("A1: Homepage loads in fresh context", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const res = await page.goto(BASE, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      expect(res?.status()).toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();
      const title = await page.title();
      console.log(`  [A1] Page title: "${title}"`);
      console.log(`  [A1] Status: ${res?.status()}`);
      expect(title.length).toBeGreaterThan(0);
    } finally {
      await context.close();
    }
  });

  test("A2: First impression — CTA above the fold + value proposition", async ({
    page,
  }) => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });

    // Check for a CTA button above the fold (first 800px)
    const ctaSelectors = [
      'a:has-text("Get Started")',
      'button:has-text("Get Started")',
      'a:has-text("Sign Up")',
      'button:has-text("Sign Up")',
      'a:has-text("Join")',
      'button:has-text("Join")',
      'a:has-text("Start")',
      'button:has-text("Start")',
      'a:has-text("Browse")',
      'button:has-text("Browse")',
      'a:has-text("Explore")',
    ];

    let ctaFound = false;
    for (const sel of ctaSelectors) {
      const el = page.locator(sel).first();
      if ((await el.count()) > 0) {
        const box = await el.boundingBox();
        if (box && box.y < 800) {
          ctaFound = true;
          const txt = await el.textContent();
          console.log(
            `  [A2] CTA found above fold: "${txt?.trim()}" at y=${Math.round(box.y)}`
          );
          break;
        }
      }
    }
    if (!ctaFound) {
      console.log("  [A2] WARNING: No clear CTA found above the fold");
    }

    // Check for value proposition text
    const heroArea = page.locator("h1, h2, [class*=hero]").first();
    if ((await heroArea.count()) > 0) {
      const heroText = await heroArea.textContent();
      console.log(`  [A2] Hero text: "${heroText?.trim()}"`);
    }

    expect(ctaFound).toBe(true);
  });

  test("A3: Homepage copy check + screenshots (desktop & mobile)", async ({
    page,
  }) => {
    // Desktop (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
    await snap(page, "homepage-desktop");

    const bodyText = (await page.locator("body").textContent()) ?? "";
    const issues = flagCopyIssues(bodyText, "Homepage");
    if (issues.length > 0) {
      console.log("  [A3] COPY ISSUES:");
      issues.forEach((i) => console.log(`    - ${i}`));
    } else {
      console.log("  [A3] No obvious copy issues on homepage");
    }

    // Mobile (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await snap(page, "homepage-mobile");

    // Check nothing overflows horizontally on mobile
    const overflowCheck = await page.evaluate(() => {
      return document.documentElement.scrollWidth > 375;
    });
    if (overflowCheck) {
      console.log(
        "  [A3] WARNING: Horizontal overflow detected on mobile homepage"
      );
    } else {
      console.log("  [A3] Mobile layout — no horizontal overflow");
    }
  });

  test("A4-A5: Sign Up flow — document each step + role selector", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });

    // Try to find a Sign Up link/button on homepage
    const signupLink =
      page.getByRole("link", { name: /sign up|register|get started/i }).first();
    const signupUrl = `${BASE}/signup`;

    if ((await signupLink.count()) > 0) {
      const href = await signupLink.getAttribute("href");
      console.log(`  [A4] Sign Up link found, href="${href}"`);
      await signupLink.click();
      await page.waitForLoadState("networkidle");
    } else {
      console.log(
        "  [A4] No Sign Up link on homepage, navigating directly to /signup"
      );
      await page.goto(signupUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
    }

    await snap(page, "signup-desktop");
    console.log(`  [A4] Current URL: ${page.url()}`);

    // Check if it's a tabbed UI (Sign In | Register) or separate page
    const bodyText = (await page.locator("body").textContent()) ?? "";
    const hasRegisterTab = bodyText.toLowerCase().includes("register");
    const hasSignUpHeading = bodyText.toLowerCase().includes("sign up");
    console.log(
      `  [A4] Has "Register" tab: ${hasRegisterTab}, Has "Sign Up" heading: ${hasSignUpHeading}`
    );

    // If there's a Register tab, click it
    const registerTab = page.getByRole("button", { name: /register/i }).first();
    if ((await registerTab.count()) > 0) {
      await registerTab.click();
      await page.waitForTimeout(500);
      console.log("  [A4] Clicked Register tab");
      await snap(page, "signup-register-tab");
    }

    // Check for role selector
    const roleSelectors = [
      "Tenant",
      "Operator",
      "Investor",
      "Landlord",
      "Property Manager",
    ];
    const rolesFound: string[] = [];
    for (const role of roleSelectors) {
      const el = page.getByText(role, { exact: false }).first();
      if ((await el.count()) > 0) {
        rolesFound.push(role);
      }
    }
    if (rolesFound.length > 0) {
      console.log(`  [A5] Role selector found with roles: ${rolesFound.join(", ")}`);
    } else {
      console.log("  [A5] WARNING: No role selector found on signup page");
    }

    // Document form fields present
    const emailInput = page.getByPlaceholder(/email/i).first();
    const passwordInput = page.getByPlaceholder(/password/i).first();
    const nameInput = page.getByPlaceholder(/name/i).first();

    console.log(`  [A4] Email field present: ${(await emailInput.count()) > 0}`);
    console.log(
      `  [A4] Password field present: ${(await passwordInput.count()) > 0}`
    );
    console.log(`  [A4] Name field present: ${(await nameInput.count()) > 0}`);

    // Check for social signup buttons
    const socialButtons = ["Google", "Apple", "Facebook", "X"];
    const socialFound: string[] = [];
    for (const provider of socialButtons) {
      const btn = page.getByRole("button", { name: new RegExp(provider, "i") }).first();
      if ((await btn.count()) > 0) {
        socialFound.push(provider);
      }
    }
    // Also check for text-based social login
    for (const provider of socialButtons) {
      if (!socialFound.includes(provider)) {
        const txt = page.getByText(new RegExp(`continue with ${provider}|sign .* with ${provider}`, "i")).first();
        if ((await txt.count()) > 0) {
          socialFound.push(provider);
        }
      }
    }
    console.log(
      `  [A4] Social signup options: ${socialFound.length > 0 ? socialFound.join(", ") : "NONE"}`
    );

    // Mobile view
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await snap(page, "signup-mobile");
  });

  test("A6-A7: Test signup with test email", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to signup
    await page.goto(`${BASE}/signup`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // If tabbed UI, click Register tab
    const registerTab = page.getByRole("button", { name: /register/i }).first();
    if ((await registerTab.count()) > 0) {
      await registerTab.click();
      await page.waitForTimeout(500);
    }

    // Fill in the signup form
    const emailInput = page.getByPlaceholder(/email/i).first();
    const passwordInput = page.getByPlaceholder(/password/i).first();

    if ((await emailInput.count()) === 0) {
      console.log("  [A6] SKIP: No email input found on signup page");
      return;
    }

    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    console.log(`  [A6] Filled signup form with: ${TEST_EMAIL}`);

    // Check for name field
    const nameInput = page.getByPlaceholder(/name/i).first();
    if ((await nameInput.count()) > 0) {
      await nameInput.fill("QA Tenant Test");
    }

    // Check for terms checkbox
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if ((await termsCheckbox.count()) > 0) {
      await termsCheckbox.check();
      console.log("  [A6] Checked terms checkbox");
    }

    await snap(page, "signup-filled");

    // Submit the form
    const submitBtn = page
      .getByRole("button", { name: /sign up|register|create account|submit/i })
      .first();

    if ((await submitBtn.count()) > 0) {
      await submitBtn.click();
      console.log("  [A6] Clicked submit button");

      // Wait and observe what happens
      await page.waitForTimeout(3000);
      const currentUrl = page.url();
      console.log(`  [A7] After signup URL: ${currentUrl}`);

      const bodyText = (await page.locator("body").textContent()) ?? "";
      const lower = bodyText.toLowerCase();

      if (lower.includes("verify") || lower.includes("otp") || lower.includes("code")) {
        console.log("  [A7] OTP/verification step detected");
      }
      if (lower.includes("confirm") || lower.includes("check your email")) {
        console.log("  [A7] Email confirmation step detected");
      }
      if (currentUrl.includes("dashboard") || currentUrl.includes("deals")) {
        console.log("  [A7] Redirected to dashboard/deals after signup");
      }
      if (lower.includes("error") || lower.includes("already")) {
        console.log(`  [A7] Possible error after signup`);
        // Extract error message
        const errorEl = page.locator('[role="alert"], .error, [class*="error"]').first();
        if ((await errorEl.count()) > 0) {
          const errorText = await errorEl.textContent();
          console.log(`  [A7] Error message: "${errorText?.trim()}"`);
        }
      }

      await snap(page, "signup-result");
    } else {
      console.log("  [A6] WARNING: No submit button found");
    }
  });

  test("A8: Forgot password page", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/signin`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Look for forgot password link
    const forgotLink = page
      .getByText(/forgot.*password/i)
      .first();

    if ((await forgotLink.count()) > 0) {
      await forgotLink.click();
      await page.waitForLoadState("networkidle");
      console.log(`  [A8] Forgot password page URL: ${page.url()}`);
      await snap(page, "forgot-password-desktop");

      // Check it has an email input
      const emailInput = page.getByPlaceholder(/email/i).first();
      console.log(
        `  [A8] Has email input: ${(await emailInput.count()) > 0}`
      );

      // Check for submit button
      const submitBtn = page
        .getByRole("button", { name: /reset|send|submit/i })
        .first();
      console.log(
        `  [A8] Has reset button: ${(await submitBtn.count()) > 0}`
      );

      // Mobile
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(500);
      await snap(page, "forgot-password-mobile");
    } else {
      console.log("  [A8] WARNING: No 'Forgot Password' link found on signin page");

      // Try direct URL
      await page.goto(`${BASE}/forgot-password`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });
      const status = page.url();
      console.log(`  [A8] Direct /forgot-password URL: ${status}`);
      await snap(page, "forgot-password-desktop");
    }
  });

  test("A9: Mobile viewport audit (375x812) — all key pages", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const pages = [
      { url: BASE, name: "homepage" },
      { url: `${BASE}/signin`, name: "signin" },
      { url: `${BASE}/signup`, name: "signup" },
    ];

    for (const p of pages) {
      try {
        await page.goto(p.url, { waitUntil: "networkidle", timeout: 20000 });
        await snap(page, `mobile-${p.name}`);

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        if (overflow) {
          console.log(`  [A9] WARNING: Horizontal overflow on mobile ${p.name}`);
        }

        // Check text is readable (no tiny text)
        const tinyText = await page.evaluate(() => {
          const elements = document.querySelectorAll("p, span, a, button, h1, h2, h3, h4, li");
          let tinyCount = 0;
          elements.forEach((el) => {
            const style = window.getComputedStyle(el);
            const fontSize = parseFloat(style.fontSize);
            if (fontSize < 10 && el.textContent?.trim()) tinyCount++;
          });
          return tinyCount;
        });
        if (tinyText > 0) {
          console.log(
            `  [A9] WARNING: ${tinyText} elements with font-size < 10px on mobile ${p.name}`
          );
        }

        console.log(`  [A9] Mobile ${p.name}: OK`);
      } catch (e) {
        console.log(`  [A9] Mobile ${p.name}: FAILED — ${e}`);
      }
    }
  });
});

// ─────────────────────────────────────────────
//  PART B — MARKETPLACE (Agent 1)
// ─────────────────────────────────────────────

test.describe("PART B — MARKETPLACE AUDIT", () => {
  test("B1: Admin login + dashboard access", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/signin`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Use admin credentials (raw password in UI)
    const emailInput = page.getByPlaceholder(/email/i).first();
    const passwordInput = page.getByPlaceholder(/password/i).first();

    await emailInput.fill("admin@hub.nfstay.com");
    await passwordInput.fill("Dgs58913347.");
    console.log("  [B1] Filled admin credentials");

    // Submit
    const signInBtn = page
      .getByRole("button", { name: /sign in|log in|submit/i })
      .first();
    if ((await signInBtn.count()) > 0) {
      await signInBtn.click();
      console.log("  [B1] Clicked sign in");

      // Wait for redirect
      await page.waitForTimeout(5000);
      const currentUrl = page.url();
      console.log(`  [B1] After login URL: ${currentUrl}`);

      if (
        currentUrl.includes("dashboard") ||
        currentUrl.includes("deals") ||
        currentUrl.includes("admin")
      ) {
        console.log("  [B1] Successfully logged in and redirected");
      } else if (currentUrl.includes("verify") || currentUrl.includes("otp")) {
        console.log("  [B1] OTP/verification required after login");
      } else {
        console.log(`  [B1] WARNING: Unexpected URL after login: ${currentUrl}`);
      }

      await snap(page, "dashboard-desktop");

      // Mobile
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(500);
      await snap(page, "dashboard-mobile");
    } else {
      console.log("  [B1] WARNING: No sign in button found");
    }
  });

  test("B2: Deals / Marketplace page — listings render", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Login first
    await page.goto(`${BASE}/signin`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.getByPlaceholder(/email/i).first().fill("admin@hub.nfstay.com");
    await page.getByPlaceholder(/password/i).first().fill("Dgs58913347.");
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForTimeout(5000);

    // Navigate to deals
    const dealsUrls = ["/deals", "/marketplace", "/properties"];
    let dealsLoaded = false;

    for (const path of dealsUrls) {
      try {
        const res = await page.goto(`${BASE}${path}`, {
          waitUntil: "networkidle",
          timeout: 15000,
        });
        if (res && res.status() < 400) {
          console.log(`  [B2] Deals page found at ${path}`);
          dealsLoaded = true;
          break;
        }
      } catch {
        // try next
      }
    }

    // Also try nav links
    if (!dealsLoaded) {
      await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
      const dealsLink = page
        .getByRole("link", { name: /deals|marketplace|properties|browse/i })
        .first();
      if ((await dealsLink.count()) > 0) {
        await dealsLink.click();
        await page.waitForLoadState("networkidle");
        dealsLoaded = true;
        console.log(`  [B2] Navigated to deals via nav link: ${page.url()}`);
      }
    }

    if (!dealsLoaded) {
      console.log("  [B2] WARNING: Could not find deals/marketplace page");
      return;
    }

    await page.waitForTimeout(2000);
    await snap(page, "deals-desktop");

    // Check for listing cards
    const cards = page.locator(
      '[class*="card"], [class*="listing"], [class*="property"], [class*="deal"]'
    );
    const cardCount = await cards.count();
    console.log(`  [B2] Found ${cardCount} card-like elements`);

    // Check for key listing elements
    const bodyText = (await page.locator("body").textContent()) ?? "";
    const copyIssues = flagCopyIssues(bodyText, "Deals");
    if (copyIssues.length > 0) {
      console.log("  [B2] COPY ISSUES on Deals page:");
      copyIssues.forEach((i) => console.log(`    - ${i}`));
    }

    // Check for images
    const images = page.locator("img");
    const imgCount = await images.count();
    let brokenImages = 0;
    for (let i = 0; i < Math.min(imgCount, 20); i++) {
      try {
        const naturalWidth = await images.nth(i).evaluate(
          (el: HTMLImageElement) => el.naturalWidth
        );
        if (naturalWidth === 0) brokenImages++;
      } catch {
        // skip
      }
    }
    console.log(
      `  [B2] Images: ${imgCount} total, ${brokenImages} broken`
    );

    // Check for price text
    const hasPrice =
      bodyText.includes("£") ||
      bodyText.includes("$") ||
      bodyText.includes("pcm") ||
      bodyText.toLowerCase().includes("price");
    console.log(`  [B2] Price visible: ${hasPrice}`);

    // Check for location text
    const hasLocation =
      bodyText.toLowerCase().includes("london") ||
      bodyText.toLowerCase().includes("manchester") ||
      bodyText.toLowerCase().includes("uk") ||
      bodyText.toLowerCase().includes("city") ||
      bodyText.toLowerCase().includes("location");
    console.log(`  [B2] Location visible: ${hasLocation}`);

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await snap(page, "deals-mobile");
  });

  test("B3: Deal detail page", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Login
    await page.goto(`${BASE}/signin`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.getByPlaceholder(/email/i).first().fill("admin@hub.nfstay.com");
    await page.getByPlaceholder(/password/i).first().fill("Dgs58913347.");
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForTimeout(5000);

    // Go to deals
    await page.goto(`${BASE}/deals`, {
      waitUntil: "networkidle",
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    // Click first deal card/link
    const dealLink = page
      .locator('a[href*="deal"], a[href*="property"]')
      .first();

    if ((await dealLink.count()) > 0) {
      await dealLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      console.log(`  [B3] Deal detail URL: ${page.url()}`);
      await snap(page, "deal-detail-desktop");

      const bodyText = (await page.locator("body").textContent()) ?? "";
      const copyIssues = flagCopyIssues(bodyText, "Deal Detail");
      if (copyIssues.length > 0) {
        console.log("  [B3] COPY ISSUES on Deal Detail:");
        copyIssues.forEach((i) => console.log(`    - ${i}`));
      }

      // Mobile
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(500);
      await snap(page, "deal-detail-mobile");
    } else {
      console.log(
        "  [B3] WARNING: No deal links found — cannot test deal detail"
      );

      // Try direct URL patterns
      const detailUrls = ["/deals/1", "/deal/1", "/property/1"];
      for (const path of detailUrls) {
        try {
          const res = await page.goto(`${BASE}${path}`, {
            waitUntil: "networkidle",
            timeout: 10000,
          });
          if (res && res.status() < 400) {
            console.log(`  [B3] Deal detail loaded at ${path}`);
            await snap(page, "deal-detail-desktop");
            break;
          }
        } catch {
          // try next
        }
      }
    }
  });

  test("B4: Deal detail buttons — Save, Contact, Chat, Share", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Login
    await page.goto(`${BASE}/signin`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.getByPlaceholder(/email/i).first().fill("admin@hub.nfstay.com");
    await page.getByPlaceholder(/password/i).first().fill("Dgs58913347.");
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForTimeout(5000);

    // Navigate to deals and click first deal
    await page.goto(`${BASE}/deals`, {
      waitUntil: "networkidle",
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    const dealLink = page
      .locator('a[href*="deal"], a[href*="property"]')
      .first();
    if ((await dealLink.count()) > 0) {
      await dealLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    } else {
      console.log("  [B4] No deal to click, checking current page buttons");
    }

    // Check for action buttons
    const buttonChecks = [
      { label: "Save", patterns: [/save|favourite|favorite|bookmark|heart/i] },
      { label: "Contact", patterns: [/contact|inquire|enquire|message/i] },
      { label: "Chat", patterns: [/chat|message|dm/i] },
      { label: "Share", patterns: [/share|copy link/i] },
    ];

    for (const check of buttonChecks) {
      let found = false;
      for (const pattern of check.patterns) {
        const btn = page.getByRole("button", { name: pattern }).first();
        if ((await btn.count()) > 0) {
          found = true;
          console.log(`  [B4] ${check.label} button: FOUND`);
          break;
        }
        // Also check for link-style buttons
        const link = page.getByRole("link", { name: pattern }).first();
        if ((await link.count()) > 0) {
          found = true;
          console.log(`  [B4] ${check.label} link: FOUND`);
          break;
        }
      }
      // Also check via text content
      if (!found) {
        const bodyText = (await page.locator("body").textContent()) ?? "";
        for (const pattern of check.patterns) {
          if (pattern.test(bodyText)) {
            found = true;
            console.log(`  [B4] ${check.label}: found in page text`);
            break;
          }
        }
      }
      if (!found) {
        console.log(`  [B4] ${check.label} button: NOT FOUND`);
      }
    }
  });

  test("B5: Deals page filters and dropdowns", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Login
    await page.goto(`${BASE}/signin`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.getByPlaceholder(/email/i).first().fill("admin@hub.nfstay.com");
    await page.getByPlaceholder(/password/i).first().fill("Dgs58913347.");
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForTimeout(5000);

    await page.goto(`${BASE}/deals`, {
      waitUntil: "networkidle",
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    // Check for filter elements
    const filterChecks = [
      { name: "Search input", selector: 'input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]' },
      { name: "Select/Dropdown", selector: "select, [role='combobox'], [role='listbox']" },
      { name: "Filter button", selector: 'button:has-text("Filter"), button:has-text("filter")' },
      { name: "Sort control", selector: 'button:has-text("Sort"), select:has-text("Sort")' },
      { name: "Location filter", selector: '[class*="filter"], [class*="Filter"]' },
    ];

    for (const check of filterChecks) {
      const el = page.locator(check.selector).first();
      const count = await el.count();
      console.log(
        `  [B5] ${check.name}: ${count > 0 ? "FOUND" : "NOT FOUND"}`
      );
    }

    // Try interacting with a dropdown if found
    const select = page.locator("select").first();
    if ((await select.count()) > 0) {
      const options = await select.locator("option").allTextContents();
      console.log(`  [B5] Dropdown options: ${options.join(", ")}`);
    }

    await snap(page, "deals-filters-desktop");
  });

  test("B6: Inbox check (if signed in)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Login
    await page.goto(`${BASE}/signin`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.getByPlaceholder(/email/i).first().fill("admin@hub.nfstay.com");
    await page.getByPlaceholder(/password/i).first().fill("Dgs58913347.");
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForTimeout(5000);

    // Try to find inbox
    const inboxPaths = ["/inbox", "/messages", "/chat", "/crm"];
    let inboxLoaded = false;

    for (const path of inboxPaths) {
      try {
        const res = await page.goto(`${BASE}${path}`, {
          waitUntil: "networkidle",
          timeout: 10000,
        });
        if (res && res.status() < 400 && !page.url().includes("signin")) {
          console.log(`  [B6] Inbox/Messages found at ${path}`);
          inboxLoaded = true;
          await snap(page, "inbox-desktop");
          break;
        }
      } catch {
        // try next
      }
    }

    if (!inboxLoaded) {
      // Try nav link
      const inboxLink = page
        .getByRole("link", { name: /inbox|messages|chat/i })
        .first();
      if ((await inboxLink.count()) > 0) {
        await inboxLink.click();
        await page.waitForLoadState("networkidle");
        console.log(`  [B6] Inbox via nav link: ${page.url()}`);
        inboxLoaded = true;
        await snap(page, "inbox-desktop");
      }
    }

    if (!inboxLoaded) {
      console.log("  [B6] WARNING: Could not find inbox/messages page");
    } else {
      const bodyText = (await page.locator("body").textContent()) ?? "";
      const copyIssues = flagCopyIssues(bodyText, "Inbox");
      if (copyIssues.length > 0) {
        console.log("  [B6] COPY ISSUES in Inbox:");
        copyIssues.forEach((i) => console.log(`    - ${i}`));
      }

      // Mobile
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(500);
      await snap(page, "inbox-mobile");
    }
  });

  test("B7: NDA prompt behavior", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Login
    await page.goto(`${BASE}/signin`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.getByPlaceholder(/email/i).first().fill("admin@hub.nfstay.com");
    await page.getByPlaceholder(/password/i).first().fill("Dgs58913347.");
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForTimeout(5000);

    // Go to deals and click a deal
    await page.goto(`${BASE}/deals`, {
      waitUntil: "networkidle",
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    const dealLink = page
      .locator('a[href*="deal"], a[href*="property"]')
      .first();
    if ((await dealLink.count()) > 0) {
      await dealLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Look for NDA-related elements
      const bodyText = (await page.locator("body").textContent()) ?? "";
      const lower = bodyText.toLowerCase();

      if (lower.includes("nda") || lower.includes("non-disclosure") || lower.includes("agreement")) {
        console.log("  [B7] NDA prompt/text detected on deal detail page");

        // Check for NDA button or modal
        const ndaBtn = page
          .getByRole("button", { name: /nda|agree|sign|accept/i })
          .first();
        if ((await ndaBtn.count()) > 0) {
          console.log("  [B7] NDA action button found (not clicking)");
        }

        await snap(page, "nda-prompt");
      } else {
        console.log(
          "  [B7] No NDA prompt visible on this deal detail page (may require specific deal type)"
        );
      }
    } else {
      console.log("  [B7] No deals available to check NDA behavior");
    }
  });

  test("B8-B10: Full copy audit + mobile layout for all authenticated pages", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Login
    await page.goto(`${BASE}/signin`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.getByPlaceholder(/email/i).first().fill("admin@hub.nfstay.com");
    await page.getByPlaceholder(/password/i).first().fill("Dgs58913347.");
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForTimeout(5000);

    const authenticatedPages = [
      { path: "/deals", name: "deals" },
      { path: "/dashboard", name: "dashboard" },
      { path: "/invest", name: "invest" },
      { path: "/crm", name: "crm" },
      { path: "/settings", name: "settings" },
      { path: "/profile", name: "profile" },
      { path: "/list-a-deal", name: "list-a-deal" },
    ];

    const allCopyIssues: string[] = [];

    for (const p of authenticatedPages) {
      try {
        const res = await page.goto(`${BASE}${p.path}`, {
          waitUntil: "networkidle",
          timeout: 15000,
        });

        if (!res || res.status() >= 400 || page.url().includes("signin")) {
          console.log(`  [B8] ${p.name}: skipped (${res?.status() || "redirect to signin"})`);
          continue;
        }

        await page.waitForTimeout(1500);

        // Desktop screenshot
        await page.setViewportSize({ width: 1280, height: 800 });
        await snap(page, `${p.name}-desktop`);

        // Copy audit
        const bodyText = (await page.locator("body").textContent()) ?? "";
        const issues = flagCopyIssues(bodyText, p.name);
        allCopyIssues.push(...issues);

        // Mobile screenshot + overflow check
        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(500);
        await snap(page, `${p.name}-mobile`);

        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        if (overflow) {
          console.log(`  [B9] WARNING: Horizontal overflow on mobile ${p.name}`);
        }

        console.log(`  [B8-B10] ${p.name}: audited`);
      } catch (e) {
        console.log(`  [B8-B10] ${p.name}: ERROR — ${e}`);
      }
    }

    // Report all copy issues
    if (allCopyIssues.length > 0) {
      console.log("\n  === COPY ISSUES SUMMARY ===");
      allCopyIssues.forEach((i) => console.log(`    - ${i}`));
    } else {
      console.log("\n  === No copy issues found across authenticated pages ===");
    }
  });
});
