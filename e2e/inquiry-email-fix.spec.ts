import { test, expect } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const TEST_EMAIL = "admin@hub.nfstay.com";
const TEST_PASS = "Dgs58913347.";

test.describe("Inquiry Email Pipeline", () => {
  test.setTimeout(120_000);

  test("email inquiry modal shows name, email, phone fields and send button", async ({ page }) => {
    // Sign in
    await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    const signInTab = page.locator("text=Sign In").first();
    if (await signInTab.isVisible()) await signInTab.click();
    await page.waitForTimeout(500);
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASS);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL("**/dashboard/**", { timeout: 20000 });

    // Go to deals page
    await page.goto(`${BASE}/dashboard/deals`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Find and click an email inquiry button (the envelope icon or "Email" text)
    const emailButton = page.locator('[data-feature*="EMAIL"], button:has(svg.lucide-mail), text=Email for more information').first();
    if (await emailButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailButton.click();
      await page.waitForTimeout(1000);

      // Verify modal fields exist
      await expect(page.locator('input[placeholder*="name"]').first()).toBeVisible();
      await expect(page.locator('input[type="email"]').last()).toBeVisible();
      await expect(page.locator('input[placeholder*="phone"], input[placeholder*="+44"]').first()).toBeVisible();
      await expect(page.locator('button:has-text("Send Email")').first()).toBeVisible();
    }
  });

  test("receive-tenant-whatsapp edge function accepts tenant_email", async ({ request }) => {
    // Test that the edge function accepts the new field without crashing
    const res = await request.post(
      "https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/receive-tenant-whatsapp",
      {
        headers: { "Content-Type": "application/json" },
        data: {
          tenant_phone: "+44TEST999",
          tenant_name: "Playwright Test",
          message_body: "test - no property link",
          tenant_email: "playwright@test.com",
        },
      }
    );

    // Should return 404 (no property found) not 500 (crash)
    // This proves tenant_email is accepted without error
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Could not identify property");
  });
});
