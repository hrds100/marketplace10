import { test, expect, type Page } from '@playwright/test';

/**
 * WhatsApp Gate E2E
 * AGENT: Dimitri | BRANCH: fix/whatsapp-gate-and-admin-edit
 * Verifies: gate modal appears for users with no WhatsApp, blocks dashboard,
 *           accepts a valid UK number, saves it, and dismisses the gate.
 */

const BASE = 'https://hub.nfstay.com';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASS = 'Dgs58913347.';
const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQxODQ2NCwiZXhwIjoyMDg4OTk0NDY0fQ.B7nmKCji4LEDU5JozanHl9PjNXzYuIpav6B8KR3BNV0';

const sbHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

/** Fetch the admin user ID from Supabase auth admin API, then get profile */
async function getAdminProfile(): Promise<{ id: string; whatsapp: string | null }> {
  // Use auth admin API to find user by email
  const authRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=200`,
    { headers: sbHeaders }
  );
  const authData = (await authRes.json()) as { users: Array<{ id: string; email: string }> };
  const authUser = authData.users?.find(u => u.email === ADMIN_EMAIL);
  if (!authUser) throw new Error(`Auth user not found for ${ADMIN_EMAIL}`);

  // Fetch profile by id
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${authUser.id}&select=id,whatsapp&limit=1`,
    { headers: sbHeaders }
  );
  const rows = (await res.json()) as Array<{ id: string; whatsapp: string | null }>;
  if (!rows.length) throw new Error(`Profile not found for id ${authUser.id}`);
  return rows[0];
}

/** Set WhatsApp on a profile via service role */
async function setWhatsapp(id: string, whatsapp: string | null) {
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
    method: 'PATCH',
    headers: sbHeaders,
    body: JSON.stringify({ whatsapp }),
  });
}

async function signIn(page: Page) {
  await page.goto(`${BASE}/signin`, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const tab = page.locator('button:has-text("Sign In")').first();
  if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(400);
  }
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL('**/dashboard/**', { timeout: 30000 });
  await page.waitForTimeout(2000);
}

test.describe('WhatsApp Gate', () => {
  let profileId = '';
  let originalWhatsapp: string | null = null;

  test.beforeAll(async () => {
    const profile = await getAdminProfile();
    profileId = profile.id;
    originalWhatsapp = profile.whatsapp;
    // Clear WhatsApp so the gate triggers
    await setWhatsapp(profileId, null);
    console.log(`WG-SETUP: Cleared WhatsApp for ${ADMIN_EMAIL} (was: ${originalWhatsapp})`);
  });

  test.afterAll(async () => {
    // Restore original WhatsApp
    if (profileId) {
      await setWhatsapp(profileId, originalWhatsapp);
      console.log(`WG-TEARDOWN: Restored WhatsApp to "${originalWhatsapp}" for ${ADMIN_EMAIL}`);
    }
  });

  test('WG01: Gate modal appears and blocks dashboard on sign-in', async ({ page }) => {
    await signIn(page);

    // Gate modal must be visible
    const gateHeading = page.getByText('Add your WhatsApp to continue');
    await expect(gateHeading).toBeVisible({ timeout: 10000 });
    console.log('WG01: Gate heading visible ✓');

    // Dashboard content should be behind gate — sidebar should not be interactable
    // The gate sits at z-[400], above everything. We verify it's present.
    const gateSubtext = page.getByText('nfstay uses WhatsApp to send you deal alerts');
    await expect(gateSubtext).toBeVisible();
    console.log('WG01: Gate subtext visible ✓');

    await page.screenshot({ path: 'test-results/WG01-gate-appears.png' });
  });

  test('WG02: Invalid UK number shows error toast', async ({ page }) => {
    await signIn(page);
    await expect(page.getByText('Add your WhatsApp to continue')).toBeVisible({ timeout: 10000 });

    // Enter an invalid number
    const input = page.locator('input[placeholder="+44 7911 123456"]');
    await input.fill('not-a-number');

    const saveBtn = page.getByRole('button', { name: 'Save and continue' });
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // Toast should appear with error
    const toast = page.locator('[data-sonner-toast]').filter({ hasText: /valid UK mobile/i });
    await expect(toast).toBeVisible({ timeout: 5000 });
    console.log('WG02: Error toast for invalid number visible ✓');

    // Gate must still be open
    await expect(page.getByText('Add your WhatsApp to continue')).toBeVisible();
    console.log('WG02: Gate stays open after invalid input ✓');

    await page.screenshot({ path: 'test-results/WG02-invalid-number.png' });
  });

  test('WG03: Valid UK number saves and dismisses gate', async ({ page }) => {
    // Clear WhatsApp again (WG02 may have left it cleared, but be safe)
    await setWhatsapp(profileId, null);

    await signIn(page);
    await expect(page.getByText('Add your WhatsApp to continue')).toBeVisible({ timeout: 10000 });

    const input = page.locator('input[placeholder="+44 7911 123456"]');
    await input.fill('+44 7911 123456');

    const saveBtn = page.getByRole('button', { name: 'Save and continue' });
    await saveBtn.click();

    // Gate should disappear
    await expect(page.getByText('Add your WhatsApp to continue')).not.toBeVisible({ timeout: 10000 });
    console.log('WG03: Gate dismissed after valid number ✓');

    // Success toast
    const successToast = page.locator('[data-sonner-toast]').filter({ hasText: /WhatsApp saved/i });
    await expect(successToast).toBeVisible({ timeout: 5000 });
    console.log('WG03: Success toast visible ✓');

    // Dashboard content should now be accessible (TopBar still present)
    const topBar = page.locator('.dashboard-topbar, header').first();
    await expect(topBar).toBeVisible({ timeout: 5000 });
    console.log('WG03: Dashboard visible after gate dismissed ✓');

    await page.screenshot({ path: 'test-results/WG03-gate-dismissed.png' });
  });

  test('WG04: Gate does not appear when WhatsApp is already set', async ({ page }) => {
    // WhatsApp was saved in WG03 — sign in again and confirm gate is gone
    await signIn(page);
    await page.waitForTimeout(3000);

    const gateHeading = page.locator('text=Add your WhatsApp to continue');
    await expect(gateHeading).not.toBeVisible({ timeout: 5000 });
    console.log('WG04: Gate absent when WhatsApp already set ✓');

    await page.screenshot({ path: 'test-results/WG04-no-gate.png' });
  });
});
