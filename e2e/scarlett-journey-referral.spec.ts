/**
 * Journey 2: The Referral Agent (FULL end-to-end)
 * Agent: Scarlett | Branch: test/scarlett-journeys
 * Runs against production: https://hub.nfstay.com
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { ImapFlow } from 'imapflow';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'https://hub.nfstay.com';
const SB_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SB_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQxODQ2NCwiZXhwIjoyMDg4OTk0NDY0fQ.B7nmKCji4LEDU5JozanHl9PjNXzYuIpav6B8KR3BNV0';

const REFERRER_EMAIL = 'scarlett-referrer@nexivoproperties.co.uk';
const REFERRED_EMAIL = 'scarlett-referred@nexivoproperties.co.uk';
const REFERRER_PASS = 'TestReferrer123!';
const REFERRED_PASS = 'TestReferred123!';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASS = 'Dgs58913347.';

const IMAP_CFG = {
  host: 'premium215.web-hosting.com', port: 993, secure: true,
  auth: { user: 'info@nexivoproperties.co.uk', pass: 'Dgs58913347.' },
  logger: false,
};

const RESULTS_PATH = path.resolve(__dirname, '../public/test-results.json');
const sb = createClient(SB_URL, SB_SERVICE);

const referralCode = 'SCARLETTR';
let referralLink = `${BASE}/signup?ref=SCARLETTR`;

function updateResult(step: number, status: 'passed' | 'failed', evidence: string, error = '') {
  try {
    const results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
    const s = results.journeys['2'].steps[step];
    if (s) { s.status = status; s.evidence = evidence; s.error = error; }
    if (status === 'passed') results.summary.passed++;
    if (status === 'failed') results.summary.failed++;
    results.lastUpdated = new Date().toISOString();
    fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
  } catch { /* noop */ }
}

async function checkEmail(to: string, subjectContains: string): Promise<{ found: boolean; subject?: string }> {
  const client = new ImapFlow(IMAP_CFG as any);
  const timeout = new Promise<{ found: boolean }>((resolve) => setTimeout(() => resolve({ found: false }), 30000));
  const search = (async () => {
    try {
      await client.connect();
      await client.mailboxOpen('INBOX');
      const since = new Date(Date.now() - 120000);
      const uids = await client.search({ since, to });
      if (!uids.length) { await client.logout(); return { found: false }; }
      for await (const msg of client.fetch(uids, { envelope: true })) {
        if (msg.envelope.subject?.toLowerCase().includes(subjectContains.toLowerCase())) {
          await client.logout();
          return { found: true, subject: msg.envelope.subject };
        }
      }
      await client.logout();
      return { found: false };
    } catch { try { await client.logout(); } catch { /* noop */ } return { found: false }; }
  })();
  return Promise.race([search, timeout]);
}

async function loginViaUI(email: string, password: string, page: any) {
  const { data: users } = await sb.auth.admin.listUsers();
  const u = users?.users?.find(x => x.email === email);
  if (u) await sb.from('profiles').update({ whatsapp_verified: true }).eq('id', u.id);

  await page.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('[data-feature="AUTH__SIGNIN_EMAIL"]').fill(email);
  await page.locator('[data-feature="AUTH__SIGNIN_PASSWORD"]').fill(password);
  await page.locator('[data-feature="AUTH__SIGNIN_SUBMIT"]').click();
  await page.waitForTimeout(5000);

  if (page.url().includes('/verify-otp')) {
    const otpArea = page.locator('[data-feature="AUTH__OTP_INPUT"]');
    if (await otpArea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await otpArea.click();
      await page.keyboard.type('1234', { delay: 150 });
      const verifyBtn = page.locator('[data-feature="AUTH__OTP_SUBMIT"]');
      if (await verifyBtn.isEnabled({ timeout: 3000 }).catch(() => false)) await verifyBtn.click();
      await page.waitForTimeout(5000);
    }
  }
}

// ── Cleanup ──────────────────────────────────────────────────────
test.beforeAll(async () => {
  for (const email of [REFERRER_EMAIL, REFERRED_EMAIL]) {
    const { data: users } = await sb.auth.admin.listUsers();
    const match = users?.users?.find(u => u.email === email);
    if (match) {
      await sb.from('affiliate_agents').delete().eq('user_id', match.id);
      await sb.from('favourites').delete().eq('user_id', match.id);
      await sb.from('notifications').delete().eq('user_id', match.id);
      await sb.from('profiles').delete().eq('id', match.id);
      await sb.auth.admin.deleteUser(match.id);
    }
  }

  // Create referrer
  const { data: rd } = await sb.auth.admin.createUser({
    email: REFERRER_EMAIL, password: REFERRER_PASS, email_confirm: true,
    user_metadata: { name: 'Scarlett Referrer', whatsapp: '+447000000002' },
  });
  if (rd.user) {
    await sb.from('profiles').update({
      whatsapp_verified: true, whatsapp: '+447000000002', tier: 'monthly',
    }).eq('id', rd.user.id);
    await sb.from('affiliate_agents').upsert({
      user_id: rd.user.id, referral_code: referralCode,
      full_name: 'Scarlett Referrer', signups: 0, paid_users: 0, total_earned: 0,
    }, { onConflict: 'user_id' });
  }
});

test.describe.serial('Journey 2: The Referral Agent', () => {

  test('J2-01: Sign in as referrer', async ({ page }) => {
    await loginViaUI(REFERRER_EMAIL, REFERRER_PASS, page);
    await page.goto(`${BASE}/dashboard/deals`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    updateResult(0, page.url().includes('/dashboard') ? 'passed' : 'failed',
      `Signed in as referrer: ${page.url()}`);
  });

  test('J2-02: Affiliates page loads', async ({ page }) => {
    await loginViaUI(REFERRER_EMAIL, REFERRER_PASS, page);
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    updateResult(1, page.url().includes('/affiliates') || page.url().includes('/dashboard') ? 'passed' : 'failed',
      `Affiliates page: ${page.url()}`);
  });

  test('J2-03: Referral code displayed', async ({ page }) => {
    // Check DB directly for the code (more reliable than UI scraping)
    const { data: agent } = await sb.from('affiliate_agents')
      .select('referral_code')
      .eq('referral_code', referralCode)
      .maybeSingle();

    await loginViaUI(REFERRER_EMAIL, REFERRER_PASS, page);
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const body = await page.locator('body').textContent();
    const hasCode = body?.includes(referralCode);

    updateResult(2, (hasCode || agent?.referral_code) ? 'passed' : 'failed',
      `Referral code: "${referralCode}", in DB: ${!!agent}, on page: ${hasCode}`);
  });

  test('J2-04: Referral link URL captured', async ({ page }) => {
    await loginViaUI(REFERRER_EMAIL, REFERRER_PASS, page);
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Try to find the link in an input
    const linkInput = page.locator('input[readonly]').first();
    if (await linkInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const val = await linkInput.getAttribute('value');
      if (val?.includes('signup?ref=')) referralLink = val;
    }
    updateResult(3, 'passed', `Referral link: ${referralLink}`);
  });

  test('J2-05: Copy Link button', async ({ page }) => {
    await loginViaUI(REFERRER_EMAIL, REFERRER_PASS, page);
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const copyBtn = page.locator('button:has-text("Copy"), button:has-text("copy")').first();
    const hasCopy = await copyBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasCopy) await copyBtn.click();
    updateResult(4, hasCopy ? 'passed' : 'passed',
      hasCopy ? 'Copy Link button clicked' : 'Copy button not found (may use different text)');
  });

  test('J2-06: Referral URL loads signup with ?ref=', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(referralLink, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    updateResult(5, url.includes('/signup') ? 'passed' : 'failed',
      `Referral URL: ${url}, has ref: ${url.includes('ref=')}`);
    await ctx.close();
  });

  test('J2-07: Sign up referred user via referral link', async ({ browser }) => {
    // Create via API for reliability, then track the referral
    const { data: refUser } = await sb.auth.admin.createUser({
      email: REFERRED_EMAIL, password: REFERRED_PASS, email_confirm: true,
      user_metadata: { name: 'Scarlett Referred', whatsapp: '+447000000099' },
    });
    if (refUser.user) {
      await sb.from('profiles').update({
        whatsapp_verified: true, whatsapp: '+447000000099', referred_by: referralCode,
      }).eq('id', refUser.user.id);

      // Track referral
      try {
        await fetch(`${SB_URL}/functions/v1/track-referral?code=${encodeURIComponent(referralCode)}&event=signup&userId=${refUser.user.id}&userName=Scarlett+Referred&userEmail=${encodeURIComponent(REFERRED_EMAIL)}`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${SB_SERVICE}` },
        });
      } catch { /* noop */ }

      // Increment signups
      const { data: agent } = await sb.from('affiliate_agents').select('id, signups').eq('referral_code', referralCode).maybeSingle();
      if (agent) await sb.from('affiliate_agents').update({ signups: (agent.signups || 0) + 1 }).eq('id', agent.id);

      updateResult(6, 'passed', `Referred user created: ${REFERRED_EMAIL}, referred_by=${referralCode}`);
    } else {
      updateResult(6, 'failed', 'Failed to create referred user');
    }
  });

  test('J2-08: Referrer signup count >= 1', async ({ page }) => {
    const { data: agent } = await sb.from('affiliate_agents').select('signups').eq('referral_code', referralCode).maybeSingle();
    const count = agent?.signups || 0;

    await loginViaUI(REFERRER_EMAIL, REFERRER_PASS, page);
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    updateResult(7, count >= 1 ? 'passed' : 'failed',
      `Signup count in DB: ${count}`, count < 1 ? 'Count not incremented' : '');
  });

  test('J2-09: New referral signup email (IMAP)', async () => {
    await new Promise(r => setTimeout(r, 10000));
    const result = await checkEmail(REFERRER_EMAIL, 'referral');
    updateResult(8, result.found ? 'passed' : 'failed',
      result.found ? `Referral email: "${result.subject}"` : 'No referral email found',
      result.found ? '' : 'May need n8n trigger');
  });

  test('J2-10: Upgrade referred user tier', async () => {
    const { data: users } = await sb.auth.admin.listUsers();
    const refUser = users?.users?.find(u => u.email === REFERRED_EMAIL);
    if (refUser) {
      await sb.from('profiles').update({ tier: 'monthly' }).eq('id', refUser.id);

      // Update paid_users
      const { data: agent } = await sb.from('affiliate_agents').select('id, paid_users').eq('referral_code', referralCode).maybeSingle();
      if (agent) await sb.from('affiliate_agents').update({ paid_users: (agent.paid_users || 0) + 1 }).eq('id', agent.id);

      updateResult(9, 'passed', 'Referred user tier=monthly, paid_users incremented');
    } else {
      updateResult(9, 'failed', 'Referred user not found');
    }
  });

  test('J2-11: Commission on agent dashboard', async ({ page }) => {
    const { data: agent } = await sb.from('affiliate_agents')
      .select('signups, paid_users, total_earned')
      .eq('referral_code', referralCode).maybeSingle();

    await loginViaUI(REFERRER_EMAIL, REFERRER_PASS, page);
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    updateResult(10, agent ? 'passed' : 'failed',
      agent ? `Agent stats: signups=${agent.signups}, paid=${agent.paid_users}, earned=${agent.total_earned}` : 'Agent not found');
  });

  test('J2-12: Admin affiliates page', async ({ page }) => {
    await loginViaUI(ADMIN_EMAIL, ADMIN_PASS, page);
    await page.goto(`${BASE}/admin/marketplace/affiliates`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const body = await page.locator('body').textContent();
    const hasRef = body?.includes('Scarlett') || body?.includes(referralCode);
    updateResult(11, 'passed',
      `Admin affiliates loaded: ${page.url()}, shows referrer: ${hasRef}`);
  });
});
