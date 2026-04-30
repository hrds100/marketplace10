/**
 * dialer-pro-layout.spec.ts
 * Verifies the 3-layer Dialer Pro layout on hub.nfstay.com/crm/dialer-pro
 */
import { test, expect, type Page } from "@playwright/test";

const HUB = "https://hub.nfstay.com";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";

const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASSWORD = "Dgs58913347.";

async function getAuthTokens(email: string, password: string) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  );
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
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    { key: storageKey, value: sessionData },
  );
}

test.describe("Dialer Pro — 3-layer layout", () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${HUB}/crm/dialer-pro`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
  });

  test("Layer 1 — 4-column call room renders on load", async ({ page }) => {
    await page.screenshot({ path: "e2e/screenshots/dialer-pro-01-load.png", fullPage: true });

    // Empty states show when no call active
    await expect(page.getByText("No active contact")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Transcript appears during calls")).toBeVisible({ timeout: 5000 });

    // Resize handles present (3 between 4 columns)
    const handles = page.locator('[data-resize-handle-active]').or(page.locator('[data-panel-resize-handle-id]'));
    const handleCount = await handles.count();
    expect(handleCount).toBeGreaterThanOrEqual(3);
  });

  test("Layer 3 — Bottom strip with Queue/History tabs + Start button", async ({ page }) => {
    // Queue tab visible by default
    await expect(page.getByRole("button", { name: /Queue/i })).toBeVisible({ timeout: 10000 });

    // History tab available
    await expect(page.getByRole("button", { name: /History/i })).toBeVisible();

    // Start dialer button visible
    await expect(page.getByRole("button", { name: /Start dialer/i })).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/dialer-pro-02-bottom-strip.png" });
  });

  test("Layer 3 — Tab switching Queue <> History works", async ({ page }) => {
    // Click History tab
    await page.getByRole("button", { name: /History/i }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "e2e/screenshots/dialer-pro-03-history-tab.png" });

    // Click back to Queue tab
    await page.getByRole("button", { name: /Queue/i }).click();
    await page.waitForTimeout(1000);

    // Add lead button should be visible in queue view
    await expect(page.getByRole("button", { name: /Add lead/i })).toBeVisible({ timeout: 5000 });
  });

  test("No hardcoded PIPELINE_STAGES on page", async ({ page }) => {
    const pageText = await page.textContent("body");
    // Old hardcoded stages should NOT be present anywhere
    expect(pageText).not.toContain("Nurturing (msg sent)");
    expect(pageText).not.toContain("New Leads");
  });

  test("No KPI bar or pacing controls", async ({ page }) => {
    const pageText = await page.textContent("body");
    expect(pageText).not.toContain("MSG SENT");
    expect(pageText).not.toContain("DIALS 24H");
    // Pacing manual/auto toggle gone
    const pacingBtn = page.getByRole("button", { name: /^Manual$/i });
    await expect(pacingBtn).not.toBeVisible();
  });
});
