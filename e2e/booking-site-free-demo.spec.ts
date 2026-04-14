/**
 * Booking site — free user sees the interactive demo (BookingSitePreviewPage),
 * NOT the paid 6-tab dashboard.
 *
 * Verifies the surgical fix on src/pages/BookingSitePage.tsx that restores the
 * preview branch for non-admin, non-paid users (regression from PR #337).
 *
 * Login strategy: Supabase service role injects a session into localStorage,
 * bypassing the signin form. The test user is created on first run and
 * guaranteed tier='free' (no payment, no tier upgrade).
 *
 * Default BASE = https://hub.nfstay.com. Override with BASE_URL env var,
 * e.g. BASE_URL=http://localhost:4173 for local preview server.
 *
 * Run:
 *   npx playwright test e2e/booking-site-free-demo.spec.ts --reporter=line
 */
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = (() => {
  const raw = process.env.BASE_URL;
  if (!raw) return "https://hub.nfstay.com";
  if (/^https?:\/\//.test(raw)) return raw;
  return `https://${raw}`;
})();

const SB_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SB_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";
const SB_SERVICE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQxODQ2NCwiZXhwIjoyMDg4OTk0NDY0fQ.B7nmKCji4LEDU5JozanHl9PjNXzYuIpav6B8KR3BNV0";

// Dedicated free-tier test user. Created/repaired in beforeAll.
// Confirmed profiles.tier='free' on 2026-04-14.
const FREE_EMAIL = "free-booking-demo-20260414@nexivoproperties.co.uk";
const FREE_PASSWORD = "FreeDemo123!Booking";
const FREE_PHONE = "+447000000414";

const sbAdmin = createClient(SB_URL, SB_SERVICE);

async function ensureFreeUser(): Promise<string> {
  const { data: list, error: listErr } = await sbAdmin.auth.admin.listUsers({ perPage: 200 });
  if (listErr) throw listErr;
  let user = list?.users?.find((u) => u.email === FREE_EMAIL);
  if (!user) {
    const { data, error } = await sbAdmin.auth.admin.createUser({
      email: FREE_EMAIL,
      password: FREE_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user!;
  }
  // Make profile gate-ready but do NOT touch tier (leave as 'free').
  await sbAdmin
    .from("profiles")
    .update({ whatsapp_verified: true, whatsapp: FREE_PHONE, name: "Free Demo" })
    .eq("id", user.id);

  const { data: prof, error: profErr } = await sbAdmin
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();
  if (profErr) throw profErr;
  if (prof.tier && prof.tier !== "free") {
    throw new Error(`Test user is not free tier, got: ${prof.tier}`);
  }
  return user.id;
}

async function loginViaAPI(page: any) {
  const anon = createClient(SB_URL, SB_ANON);
  const { data, error } = await anon.auth.signInWithPassword({
    email: FREE_EMAIL,
    password: FREE_PASSWORD,
  });
  if (error) throw new Error(`Login failed: ${error.message}`);
  // Navigate to signin first so we're on the app origin before writing localStorage.
  await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ at, rt, expiresAt }: { at: string; rt: string; expiresAt: number }) => {
      const tokenData = {
        access_token: at,
        refresh_token: rt,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: expiresAt,
      };
      localStorage.setItem(
        "sb-asazddtvjvmckouxcmmo-auth-token",
        JSON.stringify(tokenData),
      );
    },
    {
      at: data.session!.access_token,
      rt: data.session!.refresh_token,
      expiresAt: data.session!.expires_at || Math.floor(Date.now() / 1000) + 3600,
    },
  );
}

test.describe("Booking site — free user sees preview demo", () => {
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    await ensureFreeUser();
  });

  test("free user sees BookingSitePreviewPage, not the 6-tab dashboard", async ({ page }) => {
    await loginViaAPI(page);
    await page.goto(`${BASE}/dashboard/booking-site`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Positive markers of BookingSitePreviewPage: Brand / Content / Contact
    // inner tab switcher buttons rendered near the top of the preview layout.
    await expect(page.getByRole("button", { name: /^Brand$/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Content$/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Contact$/i }).first()).toBeVisible();

    // Negative markers: BookingSiteDashboard's 6 top-level nav buttons must
    // NOT be present. These labels are unique to the dashboard markup.
    // "Branding" (dashboard top tab) vs "Brand" (preview inner tab) — anchor
    // with ^$ so we don't collide.
    await expect(page.getByRole("button", { name: /^Branding$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Dashboard$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Properties$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Reservations$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Analytics$/i })).toHaveCount(0);
  });
});
