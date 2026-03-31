import { test, expect, Page } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";

// ---- helpers ----

interface PageResult {
  path: string;
  status: "ok" | "blank" | "error";
  consoleErrors: string[];
  badText: string[];
  title: string;
  horizontalOverflow: boolean;
  notes: string[];
}

async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text().slice(0, 200));
  });
  return errors;
}

async function checkBadText(page: Page): Promise<string[]> {
  const bad: string[] = [];
  const body = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  for (const pattern of ["undefined", "null", "[object Object]"]) {
    // Only flag standalone occurrences, not inside normal words
    const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");
    const matches = body.match(regex);
    if (matches && matches.length > 0) {
      bad.push(`"${pattern}" x${matches.length}`);
    }
  }
  return bad;
}

async function checkHorizontalOverflow(page: Page): Promise<boolean> {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  // Reset viewport
  await page.setViewportSize({ width: 1280, height: 720 });
  return overflow;
}

async function auditPage(page: Page, path: string): Promise<PageResult> {
  const result: PageResult = {
    path,
    status: "ok",
    consoleErrors: [],
    badText: [],
    title: "",
    horizontalOverflow: false,
    notes: [],
  };

  // Set up console listener before navigation
  const errors: string[] = [];
  const handler = (msg: any) => {
    if (msg.type() === "error") {
      const text = msg.text().slice(0, 200);
      // Filter out common noise
      if (!text.includes("favicon") && !text.includes("third-party")) {
        errors.push(text);
      }
    }
  };
  page.on("console", handler);

  try {
    const resp = await page.goto(`${BASE}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.waitForTimeout(3000); // let React render

    // Check if page is blank
    const bodyHTML = await page.locator("body").innerHTML({ timeout: 5000 }).catch(() => "");
    if (!bodyHTML || bodyHTML.trim().length < 50) {
      result.status = "blank";
      result.notes.push("Page body is empty or near-empty");
    }

    // Check for 404 / Not Found text
    const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
    if (bodyText.includes("404") || bodyText.toLowerCase().includes("not found")) {
      result.notes.push("404 / Not Found detected");
    }

    // Title
    result.title = await page.title();

    // Bad text
    result.badText = await checkBadText(page);

    // Horizontal overflow on mobile
    result.horizontalOverflow = await checkHorizontalOverflow(page);

  } catch (e: any) {
    result.status = "error";
    result.notes.push(e.message?.slice(0, 200) || "Navigation error");
  }

  result.consoleErrors = errors;
  page.removeListener("console", handler);
  return result;
}

// ---- sign in helper ----

async function signInAsAdmin(page: Page) {
  await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Fill email and password using visible inputs (form has no name attributes)
  const allInputs = await page.locator("input:visible").all();
  if (allInputs.length >= 2) {
    await allInputs[0].fill(ADMIN_EMAIL);
    await allInputs[1].fill(ADMIN_PASS);
  }

  // Submit — the last "Sign In" button is the form submit (first is the tab)
  await page.locator('button:has-text("Sign In")').last().click();

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard/**", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

// ---- tests ----

test.describe("Deep Audit - hub.nfstay.com", () => {
  test.setTimeout(300000);

  // PUBLIC PAGES (no auth needed)
  const publicPages = [
    "/signin",
    "/signup",
    "/forgot-password",
    "/privacy",
    "/terms",
  ];

  for (const path of publicPages) {
    test(`PUBLIC: ${path}`, async ({ page }) => {
      const r = await auditPage(page, path);
      console.log(`[AUDIT] ${path} => status=${r.status} title="${r.title}" consoleErrors=${r.consoleErrors.length} badText=${r.badText.join(",")} overflow=${r.horizontalOverflow} notes=${r.notes.join("; ")}`);
      expect(r.status).not.toBe("blank");
    });
  }

  // AUTHENTICATED PAGES
  const authPages = [
    "/dashboard/deals",
    "/dashboard/invest/marketplace",
    "/dashboard/invest/portfolio",
    "/dashboard/invest/proposals",
    "/dashboard/invest/payouts",
    "/dashboard/affiliates",
    "/dashboard/university",
    "/dashboard/inbox",
    "/dashboard/booking-site",
    "/dashboard/settings",
    "/dashboard/crm",
    "/admin/marketplace",
    "/admin/marketplace/users",
    "/admin/marketplace/submissions",
    "/admin/marketplace/listings",
    "/admin/marketplace/notifications",
    "/admin/invest",
    "/admin/invest/orders",
    "/admin/invest/properties",
    "/admin/invest/shareholders",
    "/admin/invest/commissions",
    "/admin/invest/commission-settings",
    "/admin/invest/payouts",
    "/admin/invest/proposals",
    "/admin/invest/endpoints",
    "/admin/invest/test-console",
    "/admin/observatory",
  ];

  test("Sign in as admin and audit all auth pages", async ({ page }) => {
    // Sign in once
    await signInAsAdmin(page);

    const results: PageResult[] = [];

    for (const path of authPages) {
      const r = await auditPage(page, path);
      results.push(r);
      console.log(`[AUDIT] ${path} => status=${r.status} title="${r.title}" consoleErrors=${r.consoleErrors.length} badText=${r.badText.join(",")} overflow=${r.horizontalOverflow} notes=${r.notes.join("; ")}`);
    }

    // Summary
    const blanks = results.filter((r) => r.status === "blank");
    const errors = results.filter((r) => r.status === "error");
    const withConsoleErrors = results.filter((r) => r.consoleErrors.length > 0);
    const withBadText = results.filter((r) => r.badText.length > 0);
    const withOverflow = results.filter((r) => r.horizontalOverflow);

    console.log("\n========== AUDIT SUMMARY ==========");
    console.log(`Total pages: ${results.length}`);
    console.log(`Blank pages: ${blanks.length} ${blanks.map((r) => r.path).join(", ")}`);
    console.log(`Error pages: ${errors.length} ${errors.map((r) => r.path).join(", ")}`);
    console.log(`Console errors: ${withConsoleErrors.length} pages`);
    withConsoleErrors.forEach((r) => {
      console.log(`  ${r.path}: ${r.consoleErrors.slice(0, 3).join(" | ")}`);
    });
    console.log(`Bad text: ${withBadText.length} pages`);
    withBadText.forEach((r) => {
      console.log(`  ${r.path}: ${r.badText.join(", ")}`);
    });
    console.log(`Horizontal overflow: ${withOverflow.length} pages`);
    withOverflow.forEach((r) => {
      console.log(`  ${r.path}`);
    });
    console.log("====================================\n");

    // Fail if any page is blank
    expect(blanks.length, `Blank pages: ${blanks.map((r) => r.path).join(", ")}`).toBe(0);
  });

  // SECURITY: unauthenticated access to protected routes
  test("SECURITY: /admin/marketplace redirects without auth", async ({ page }) => {
    await page.goto(`${BASE}/admin/marketplace`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(3000);
    const url = page.url();
    const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
    const blocked = url.includes("/signin") || bodyText.includes("Sign In") || bodyText.includes("not authorized") || bodyText.includes("Access Denied");
    console.log(`[SECURITY] /admin/marketplace without auth => URL: ${url}, blocked: ${blocked}`);
    expect(blocked, "Admin page should redirect/block unauthenticated users").toBeTruthy();
  });

  test("SECURITY: /dashboard/deals redirects without auth", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/deals`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(3000);
    const url = page.url();
    const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
    const blocked = url.includes("/signin") || bodyText.includes("Sign In") || bodyText.includes("not authorized");
    console.log(`[SECURITY] /dashboard/deals without auth => URL: ${url}, blocked: ${blocked}`);
    expect(blocked, "Dashboard should redirect/block unauthenticated users").toBeTruthy();
  });
});
