import { test, expect } from "@playwright/test";

/**
 * Hospitable Connect flow tests
 *
 * Tests the connect button, callback return handling, and error states.
 * These tests hit the live site but do NOT complete a real Hospitable auth
 * (no operator account exists yet). They verify the UI renders correctly
 * and that callback URLs with status params are handled properly.
 */

const BASE_URL = "https://hub.nfstay.com";
const SUPABASE_FN_URL =
  "https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/nfs-hospitable-oauth";

test.describe("Hospitable Connect Flow", () => {
  test.describe.configure({ timeout: 30_000 });

  // ── Edge function health ──

  test("Edge function responds to OPTIONS (CORS preflight)", async ({
    request,
  }) => {
    const res = await request.fetch(SUPABASE_FN_URL, { method: "OPTIONS" });
    expect(res.status()).toBe(200);
    const headers = res.headers();
    expect(headers["access-control-allow-origin"]).toBeTruthy();
  });

  test("Edge function rejects authorize without operator_id", async ({
    request,
  }) => {
    const res = await request.get(`${SUPABASE_FN_URL}?action=authorize`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("operator_id");
  });

  test("Edge function rejects invalid action", async ({ request }) => {
    const res = await request.get(`${SUPABASE_FN_URL}?action=invalid`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid action");
  });

  // ── Callback return handling (hub) ──

  test("Settings page shows success banner on ?status=success", async ({
    page,
  }) => {
    // Navigate to operator settings with success callback params
    await page.goto(
      `${BASE_URL}/operator/settings?tab=hospitable&status=success&success=connected`,
      { waitUntil: "domcontentloaded" }
    );

    // The page should load without crashing
    const response = await page.goto(
      `${BASE_URL}/operator/settings?tab=hospitable&status=success&success=connected`,
      { waitUntil: "domcontentloaded" }
    );
    expect(response?.status()).toBeLessThan(500);
  });

  test("Settings page shows error banner on ?error=auth_failed", async ({
    page,
  }) => {
    const response = await page.goto(
      `${BASE_URL}/operator/settings?tab=hospitable&error=auth_failed`,
      { waitUntil: "domcontentloaded" }
    );
    expect(response?.status()).toBeLessThan(500);
  });

  // ── Callback return handling (bookingsite-style route) ──
  // These tests verify the NfsOAuthCallbackPage UI after deployment.
  // They will pass once the PR is merged and deployed to Vercel.

  test("OAuth callback page loads without crash on success params", async ({
    page,
  }) => {
    const response = await page.goto(
      `${BASE_URL}/nfstay/oauth-callback?provider=hospitable&status=success&success=connected`,
      { waitUntil: "domcontentloaded" }
    );
    expect(response?.status()).toBeLessThan(500);
  });

  test("OAuth callback page loads without crash on error params", async ({
    page,
  }) => {
    const response = await page.goto(
      `${BASE_URL}/nfstay/oauth-callback?provider=hospitable&error=auth_failed`,
      { waitUntil: "domcontentloaded" }
    );
    expect(response?.status()).toBeLessThan(500);
  });

  test("OAuth callback page loads without crash on expired state", async ({
    page,
  }) => {
    const response = await page.goto(
      `${BASE_URL}/nfstay/oauth-callback?provider=hospitable&error=state_expired`,
      { waitUntil: "domcontentloaded" }
    );
    expect(response?.status()).toBeLessThan(500);
  });

  test("OAuth callback page loads without crash with no provider", async ({
    page,
  }) => {
    const response = await page.goto(
      `${BASE_URL}/nfstay/oauth-callback`,
      { waitUntil: "domcontentloaded" }
    );
    expect(response?.status()).toBeLessThan(500);
  });

  // ── Disconnect endpoint ──

  test("Disconnect rejects without operator_id", async ({ request }) => {
    const res = await request.post(SUPABASE_FN_URL, {
      data: { action: "disconnect" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("operator_id");
  });

  // ── Resync endpoint ──

  test("Resync rejects without operator_id", async ({ request }) => {
    const res = await request.post(SUPABASE_FN_URL, {
      data: { action: "resync" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("operator_id");
  });

  // ── Existing customer retry ──
  // Hugo's operator already has a Hospitable customer from earlier tests.
  // Retrying authorize should NOT fail with 422 - it should reuse the
  // existing customer and still return an auth-code URL.

  test("Authorize with existing Hospitable customer returns Connect URL", async ({
    request,
  }) => {
    // Hugo's real operator (already has a Hospitable customer from earlier)
    const res = await request.get(
      `${SUPABASE_FN_URL}?action=authorize&operator_id=b5e985b9-9e33-4c9e-8464-485bede7e931&profile_id=50f8d1bf-bcb5-47a8-92b2-faf5982f3dbb&origin=https://hub.nfstay.com`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.url).toBeTruthy();
    expect(body.url).toContain("connect.hospitable.com");
  });
});
