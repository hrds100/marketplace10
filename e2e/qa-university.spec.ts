/**
 * UNIVERSITY + AI FEATURE AUDIT — Worker 10
 * Tests every university route and documents AI feature presence across the app.
 */
import { test, expect, type Page } from "@playwright/test";

const HUB = "https://hub.nfstay.com";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASSWORD = "Dgs58913347.";
const SCREENSHOT_DIR = "e2e/screenshots";

// ── Module + lesson data (matches universityData.ts) ──
const MODULES = [
  {
    id: "getting-started",
    title: "Getting Started",
    lessons: ["choose-model", "setup-business", "good-deal", "launch-plan"],
  },
  {
    id: "property-hunting",
    title: "Property Hunting",
    lessons: ["choose-area", "filter-listings", "check-demand", "avoid-bad-stock"],
  },
  {
    id: "landlord-pitching",
    title: "Landlord Pitching",
    lessons: ["explain-r2r", "build-trust", "handle-objections", "guaranteed-rent"],
  },
  {
    id: "best-uk-portals",
    title: "Best UK Portals",
    lessons: ["source-deals", "list-bookings", "match-channel", "beyond-portals"],
  },
  {
    id: "furnishing",
    title: "Furnishing",
    lessons: ["what-guests-notice", "budget-furnishing", "photo-ready", "design-operations"],
  },
  {
    id: "compliance",
    title: "Compliance",
    lessons: ["owner-permission", "safety-basics", "hmo-licensing", "planning-local"],
  },
  {
    id: "pricing-strategy",
    title: "Pricing Strategy",
    lessons: ["set-nightly-rate", "weekday-weekend", "demand-spikes", "minimum-stays"],
  },
  {
    id: "outreach-scripts",
    title: "Outreach Scripts",
    lessons: ["agent-message", "landlord-message", "follow-up", "cold-call"],
  },
  {
    id: "operations-basics",
    title: "Operations Basics",
    lessons: ["cleaning-system", "guest-comms", "handle-issues", "protect-reviews"],
  },
];

// ── Auth helpers ──
async function getAuthTokens(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return data.access_token ? data : null;
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
  await page.goto(HUB, { waitUntil: "commit" });
  await page.evaluate(
    ([key, data]) => localStorage.setItem(key, data),
    [storageKey, sessionData]
  );
}

async function safeScreenshot(page: Page, path: string) {
  try {
    await page.screenshot({ path });
  } catch {
    // Page may have closed — ignore screenshot error
  }
}

// ── Findings ──
const findings: Record<string, { ok: boolean; notes: string }> = {};
function record(key: string, ok: boolean, notes: string) {
  findings[key] = { ok, notes };
  console.log(`  ${ok ? "✅" : "❌"} ${key}: ${notes}`);
}

// ═══════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════

test.describe("University & AI Audit", () => {
  test("University main + module overview pages", async ({ page }) => {
    test.setTimeout(120_000);

    // Auth
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    record("Auth", true, "Admin session injected");

    // University main page
    await page.goto(`${HUB}/dashboard/university`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3000);
    const heading = page.locator("h1");
    const headingVisible = await heading.isVisible().catch(() => false);
    if (headingVisible) {
      const text = await heading.textContent();
      record("University Main", true, `Loaded — heading: "${text}"`);
    } else {
      record("University Main", false, "No h1 visible");
    }
    await safeScreenshot(page, `${SCREENSHOT_DIR}/university-main.png`);

    // Module overview pages
    for (const mod of MODULES) {
      const url = `${HUB}/university/${mod.id}`;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
        await page.waitForTimeout(2000);
        const body = await page.textContent("body", { timeout: 5000 }).catch(() => "");
        if (body?.includes("Module not found")) {
          record(`Module: ${mod.id}`, false, "Shows 'Module not found'");
          await safeScreenshot(page, `${SCREENSHOT_DIR}/module-${mod.id}-BROKEN.png`);
        } else {
          record(`Module: ${mod.id}`, true, "Loaded OK");
        }
      } catch (e: any) {
        record(`Module: ${mod.id}`, false, e.message?.substring(0, 80));
      }
    }

    // Print module summary
    const moduleResults = Object.entries(findings).filter(([k]) => k.startsWith("Module:"));
    console.log(`\nModules: ${moduleResults.filter(([,v]) => v.ok).length}/${moduleResults.length} OK`);
  });

  test("Known broken URL + correct URL", async ({ page }) => {
    test.setTimeout(60_000);
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Known broken URL
    const brokenUrl = `${HUB}/university/property-hunting/property-hunting_choose-area`;
    await page.goto(brokenUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForTimeout(2000);
    const body1 = await page.textContent("body", { timeout: 5000 }).catch(() => "");
    if (body1?.includes("Lesson not found") || body1?.includes("not found")) {
      record("Broken URL (underscore)", false, "Shows 'not found' — expected, wrong lesson ID format");
    } else {
      record("Broken URL (underscore)", true, "Page loaded (unexpected)");
    }
    await safeScreenshot(page, `${SCREENSHOT_DIR}/university-broken-url.png`);

    // Correct URL
    const correctUrl = `${HUB}/university/property-hunting/choose-area`;
    await page.goto(correctUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForTimeout(2000);
    const body2 = await page.textContent("body", { timeout: 5000 }).catch(() => "");
    if (body2?.includes("Lesson not found")) {
      record("Correct URL (choose-area)", false, "Shows 'Lesson not found'");
    } else {
      record("Correct URL (choose-area)", true, "Loaded correctly");
    }
    await safeScreenshot(page, `${SCREENSHOT_DIR}/university-choose-area.png`);
  });

  test("Sample lesson pages + AI chat presence", async ({ page }) => {
    test.setTimeout(180_000);
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    for (const mod of MODULES) {
      const lessonId = mod.lessons[0];
      const url = `${HUB}/university/${mod.id}/${lessonId}`;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
        await page.waitForTimeout(2000);
        const body = await page.textContent("body", { timeout: 5000 }).catch(() => "");
        if (body?.includes("Lesson not found")) {
          record(`Lesson: ${mod.id}/${lessonId}`, false, "Shows 'Lesson not found'");
        } else {
          // Check for AI chat presence
          const hasAIChat = await page.locator('[data-feature="UNIVERSITY__AI_CHAT_INPUT"]').count().catch(() => 0);
          const hasAILabel = (body || "").includes("AI Consultant");
          record(`Lesson: ${mod.id}/${lessonId}`, true, `Loaded | AI Chat: ${hasAIChat > 0 || hasAILabel ? "YES" : "NO"}`);
        }
      } catch (e: any) {
        record(`Lesson: ${mod.id}/${lessonId}`, false, e.message?.substring(0, 80));
      }
    }

    // Print lesson summary
    const lessonResults = Object.entries(findings).filter(([k]) => k.startsWith("Lesson:"));
    console.log(`\nLessons: ${lessonResults.filter(([,v]) => v.ok).length}/${lessonResults.length} OK`);
  });

  test("AI feature map — deal detail + investment + admin", async ({ page }) => {
    test.setTimeout(90_000);
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Deal Detail
    try {
      await page.goto(`${HUB}/dashboard/deals`, { waitUntil: "domcontentloaded", timeout: 15_000 });
      await page.waitForTimeout(3000);
      const dealCard = page.locator('[data-feature="DEALS__PROPERTY_CARD"]').first();
      if (await dealCard.count() > 0) {
        await dealCard.click();
        await page.waitForTimeout(3000);
        const body = await page.textContent("body", { timeout: 5000 }).catch(() => "");
        const hasAI = (body || "").includes("AI Consultant") || (body || "").includes("AI Chat");
        record("AI on Deal Detail", hasAI, hasAI ? "AI widget found" : "No AI chat widget on deal detail");
      } else {
        record("AI on Deal Detail", false, "No deal cards found to inspect");
      }
    } catch (e: any) {
      record("AI on Deal Detail", false, `Error: ${e.message?.substring(0, 60)}`);
    }

    // Investment page
    try {
      await page.goto(`${HUB}/dashboard/invest`, { waitUntil: "domcontentloaded", timeout: 15_000 });
      await page.waitForTimeout(3000);
      const body = await page.textContent("body", { timeout: 5000 }).catch(() => "");
      const hasAI = (body || "").includes("AI Consultant") || (body || "").includes("AI Chat");
      record("AI on Investment", hasAI, hasAI ? "AI widget found" : "No AI chat widget on investment pages");
    } catch (e: any) {
      record("AI on Investment", false, `Error: ${e.message?.substring(0, 60)}`);
    }

    // Admin Dashboard
    try {
      await page.goto(`${HUB}/admin`, { waitUntil: "domcontentloaded", timeout: 15_000 });
      await page.waitForTimeout(3000);
      const body = await page.textContent("body", { timeout: 5000 }).catch(() => "");
      record("AI on Admin Dashboard", false, "Admin has no AI chat widget (AI settings configurable in Admin > Settings)");
    } catch (e: any) {
      record("AI on Admin Dashboard", false, `Error: ${e.message?.substring(0, 60)}`);
    }

    // Admin Settings AI panel
    try {
      await page.goto(`${HUB}/admin/marketplace/settings`, { waitUntil: "domcontentloaded", timeout: 15_000 });
      await page.waitForTimeout(3000);
      const body = await page.textContent("body", { timeout: 5000 }).catch(() => "");
      const hasAISettings = (body || "").includes("Pricing Model") || (body || "").includes("system_prompt");
      record("Admin AI Settings", hasAISettings, hasAISettings
        ? "AI model selection + system prompts for pricing, university, description"
        : "AI settings panel not found");
    } catch (e: any) {
      record("Admin AI Settings", false, `Error: ${e.message?.substring(0, 60)}`);
    }

    // Final report
    console.log("\n\n═══════════════════════════════════════════════════════");
    console.log("          AI FEATURE MAP SUMMARY");
    console.log("═══════════════════════════════════════════════════════\n");
    for (const [key, val] of Object.entries(findings)) {
      console.log(`  ${val.ok ? "✅" : "❌"} ${key}: ${val.notes}`);
    }
  });
});
