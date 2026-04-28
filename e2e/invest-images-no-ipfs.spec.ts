import { test, expect, Page } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";

async function signInAdmin(page: Page) {
  await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.locator('[data-feature="AUTH__SIGNIN_EMAIL"]').fill(ADMIN_EMAIL);
  await page.locator('[data-feature="AUTH__SIGNIN_PASSWORD"]').fill(ADMIN_PASS);
  await page.locator('[data-feature="AUTH__SIGNIN_SUBMIT"]').click();
  await page.waitForTimeout(7000);

  if (page.url().includes('/verify-otp')) {
    const otp = page.locator('[data-feature="AUTH__OTP_INPUT"]');
    await otp.click();
    await page.keyboard.type('1234', { delay: 120 });
    const submit = page.locator('[data-feature="AUTH__OTP_SUBMIT"]');
    if (await submit.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await submit.click();
    }
    await page.waitForTimeout(7000);
  }
}

test("invest marketplace images are served from Supabase Storage, not ipfs.io", async ({ page }) => {
  const ipfsRequests: string[] = [];
  const supabaseImageRequests: string[] = [];

  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("ipfs.io") || url.includes("cloudflare-ipfs.com") || url.includes("gateway.pinata.cloud")) {
      ipfsRequests.push(url);
    }
    if (url.includes("supabase.co/storage/v1/object/public/property-images/inv/")) {
      supabaseImageRequests.push(url);
    }
  });

  await signInAdmin(page);

  await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(6000);

  // The hero image element on the marketplace card
  const heroImg = page.locator('img[data-feature="INVEST__MARKETPLACE_IMAGE"]').first();
  await expect(heroImg).toBeVisible({ timeout: 15000 });

  const src = await heroImg.getAttribute("src");
  console.log("hero image src:", src);
  expect(src).toBeTruthy();
  expect(src).toContain("supabase.co/storage/v1/object/public/property-images/inv/");
  expect(src).not.toContain("ipfs.io");

  // The image must actually load (naturalWidth > 0)
  await page.waitForFunction(
    () => {
      const i = document.querySelector('img[data-feature="INVEST__MARKETPLACE_IMAGE"]') as HTMLImageElement | null;
      return !!i && i.complete && i.naturalWidth > 0;
    },
    { timeout: 15000 },
  );

  console.log(`ipfs.io requests during page load: ${ipfsRequests.length}`);
  if (ipfsRequests.length) console.log("  first:", ipfsRequests[0]);
  console.log(`supabase property-images requests: ${supabaseImageRequests.length}`);

  expect(ipfsRequests, `Expected zero ipfs.io requests, got ${ipfsRequests.length}`).toHaveLength(0);
  expect(supabaseImageRequests.length).toBeGreaterThan(0);
});
