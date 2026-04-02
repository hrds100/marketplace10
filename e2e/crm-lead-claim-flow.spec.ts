import { test, expect } from '@playwright/test';

/**
 * CRM Lead Claim Flow - e2e verification
 *
 * Part 1: Code-inspection tests (no network, no secrets)
 * Part 2: Live flow requiring env vars:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   Skipped automatically if env vars are not set.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BASE_URL = process.env.PREVIEW_URL || 'https://hub.nfstay.com';
const HAS_LIVE_CREDS = !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_KEY);

// ─── Helpers ─────────────────────────────────────────────────────────
async function adminFetch(path: string, opts: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

async function callEdge(fn: string, body: Record<string, unknown>, token?: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

// ═══════════════════════════════════════════════════════════════════════
// PART 1: Code Verification (no secrets, no network)
// ═══════════════════════════════════════════════════════════════════════
test.describe('Code Verification', () => {
  test('LeadsTab: claim banner is clickable button, handleExpand re-triggers claim, passes ndaAlreadySigned', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../src/components/crm/LeadsTab.tsx', import.meta.url).pathname.replace(/%20/g, ' '), 'utf-8'
    );
    expect(content).toContain('Claim required: tap here to complete your account and unlock this lead.');
    expect(content).toMatch(/<button[\s\S]*?Claim required: tap here/);
    expect(content).not.toContain("toast.error('This lead requires account claim before details can be opened.')");
    expect(content).toContain('else if (requiresClaimForLead(lead))');
    expect(content).toContain('ndaAlreadySigned={');
    expect(content).toContain('supabase.auth.refreshSession()');
  });

  test('LeadAccessAgreement: password field, ndaAlreadySigned skip, session refresh, error parsing', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../src/components/crm/LeadAccessAgreement.tsx', import.meta.url).pathname.replace(/%20/g, ' '), 'utf-8'
    );
    expect(content).toContain('type="password"');
    expect(content).toContain('claimPassword');
    expect(content).toContain('minLength={6}');
    expect(content).toContain('ndaAlreadySigned');
    expect(content).toContain('setShowClaimForm(true)');
    const refreshIdx = content.indexOf('supabase.auth.refreshSession()');
    const completeIdx = content.indexOf('onClaimComplete?.()');
    expect(refreshIdx).toBeGreaterThan(-1);
    expect(refreshIdx).toBeLessThan(completeIdx);
    expect(content).toContain('body?.error');
  });

  test('Edge function: raw REST password setting + phone linkage', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../supabase/functions/claim-landlord-account/index.ts', import.meta.url).pathname.replace(/%20/g, ' '), 'utf-8'
    );
    expect(content).toContain('{ email, name, password }');
    expect(content).toContain('/auth/v1/admin/users/');
    expect(content).toContain('JSON.stringify({ password })');
    expect(content).toContain('password.length >= 6');
    expect(content).toContain("submitted_by: user.id");
    expect(content).toContain("lister_email: email");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PART 2: Live Claim Flow (requires env vars, skips otherwise)
// ═══════════════════════════════════════════════════════════════════════
test.describe('Live Claim Flow', () => {
  test.skip(!HAS_LIVE_CREDS, 'Skipped: set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY env vars to run');

  test('Full claim flow: unclaimed -> claim with password -> password login -> CRM with no claim blocks', async ({ page }) => {
    const ts = Date.now();
    const inquiryToken = `e2e_claim_${ts}`;
    const testPhone = `+447000${ts.toString().slice(-5)}`;
    const claimEmail = `e2e_claim_${ts}@nexivoproperties.co.uk`;
    const claimPassword = 'E2eClaim2026!';
    let inquiryId = '';
    let userId = '';

    try {
      // ── Step 1: Create test inquiry ──────────────────────────────
      console.log('Step 1: Creating test inquiry...');
      const insertRes = await adminFetch('/rest/v1/inquiries', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({
          tenant_name: 'E2E Tenant',
          tenant_email: 'e2e-tenant@example.com',
          tenant_phone: '+447777000222',
          lister_phone: testPhone,
          lister_name: 'E2E Lister',
          lister_type: 'landlord',
          token: inquiryToken,
          channel: 'whatsapp',
          message: 'E2E claim test',
          status: 'new',
          stage: 'New Leads',
          nda_required: true,
          nda_signed: false,
          authorisation_type: 'nda_and_claim',
          authorized: true,
        }),
      });
      expect(insertRes.status).toBeLessThan(300);
      const rows = await insertRes.json();
      inquiryId = Array.isArray(rows) ? rows[0].id : rows.id;
      console.log(`  Inquiry created: ${inquiryId}`);

      // ── Step 2: Get unclaimed session via lead-magic-login ───────
      console.log('Step 2: Getting unclaimed session...');
      const { status: loginStatus, data: loginData } = await callEdge('lead-magic-login', { token: inquiryToken });
      expect(loginStatus).toBe(200);
      expect(loginData.access_token).toBeTruthy();
      userId = loginData.user_id;

      // Verify unclaimed
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
      });
      const userData = await userRes.json();
      expect(userData.email).toContain('@nfstay.internal');
      console.log(`  Unclaimed user: ${userData.email}`);

      // ── Step 3: Claim account with password ──────────────────────
      console.log('Step 3: Claiming account...');
      const { status: claimStatus, data: claimData } = await callEdge(
        'claim-landlord-account',
        { email: claimEmail, name: 'E2E Claimed User', password: claimPassword },
        loginData.access_token
      );
      expect(claimStatus).toBe(200);
      expect(claimData.ok).toBe(true);

      // Verify email updated
      const userRes2 = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
      });
      const userData2 = await userRes2.json();
      expect(userData2.email).toBe(claimEmail);
      console.log(`  Email updated to: ${claimEmail}`);

      // ── Step 4: Password login via GoTrue API ────────────────────
      console.log('Step 4: Testing password login via API...');
      await page.waitForTimeout(1500);

      const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: claimEmail, password: claimPassword }),
      });
      const signInData = await signInRes.json();
      expect(signInRes.status).toBe(200);
      expect(signInData.access_token).toBeTruthy();
      expect(signInData.user.email).toBe(claimEmail);
      console.log('  API password login: OK');

      // ── Step 5: Browser sign-in MUST reach /dashboard ────────────
      console.log('Step 5: Browser sign-in...');
      await page.goto(`${BASE_URL}/signin`, { timeout: 15000 });
      await page.waitForTimeout(2000);

      const signinTab = page.locator('text=Sign In').first();
      if (await signinTab.isVisible()) await signinTab.click();
      await page.waitForTimeout(500);

      await page.fill('input[type="email"]', claimEmail);
      await page.fill('input[type="password"]', claimPassword);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);

      const postLoginUrl = page.url();
      console.log(`  Post-login URL: ${postLoginUrl}`);
      expect(postLoginUrl).toContain('/dashboard');

      // ── Step 6: CRM loads with ZERO claim blocks ─────────────────
      console.log('Step 6: Verifying CRM...');
      await page.goto(`${BASE_URL}/dashboard/crm`, { timeout: 15000 });
      await page.waitForTimeout(3000);

      const pageContent = await page.content();
      const hasCrmContent = pageContent.toLowerCase().includes('leads') || pageContent.includes('My Deals');
      expect(hasCrmContent).toBeTruthy();
      console.log('  CRM loaded: OK');

      const hasClaimBlock = pageContent.includes('Claim required');
      console.log(`  Claim required blocks: ${hasClaimBlock ? 'PRESENT' : 'none'}`);
      expect(hasClaimBlock).toBe(false);

      console.log('ALL STEPS PASSED');

    } finally {
      // ── Cleanup ────────────────────────────────────────────────────
      if (inquiryId) {
        await adminFetch(`/rest/v1/inquiries?id=eq.${inquiryId}`, { method: 'DELETE' });
      }
      if (userId) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
        });
        await adminFetch(`/rest/v1/profiles?id=eq.${userId}`, { method: 'DELETE' });
      }
      console.log('Cleanup complete');
    }
  });
});
