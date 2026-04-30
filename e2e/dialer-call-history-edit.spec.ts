/**
 * dialer-call-history-edit.spec.ts
 * Verifies the pencil edit button on call history rows in /crm/dialer.
 *
 * PRE-FIX:  no pencil button exists → test fails at step 4.
 * POST-FIX: pencil appears on hover, opens EditContactModal via portal.
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
    }
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
  await page.goto(HUB, { waitUntil: "commit" });
  await page.evaluate(
    ([key, data]) => localStorage.setItem(key, data),
    [storageKey, sessionData]
  );
}

test("call history row shows pencil on hover, opens and closes edit modal", async ({ page }) => {
  await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto(`${HUB}/crm/dialer`, { waitUntil: "domcontentloaded" });

  // Wait for at least one call history row to appear
  const historyRow = page.locator("li").filter({ has: page.locator("button[title='Edit contact']") }).first();
  await expect(historyRow).toBeVisible({ timeout: 15_000 });

  // Hover to reveal the pencil button
  await historyRow.hover();
  const pencilBtn = historyRow.locator("button[title='Edit contact']");
  await expect(pencilBtn).toBeVisible({ timeout: 3_000 });

  // Click pencil → EditContactModal should appear
  await pencilBtn.click();
  const modal = page.locator("[role='dialog'], [data-modal='edit-contact']").or(
    page.locator("div.fixed").filter({ hasText: /edit contact|contact name|name/i })
  );
  await expect(modal).toBeVisible({ timeout: 5_000 });

  // Close the modal (Escape key)
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible({ timeout: 3_000 });
});
