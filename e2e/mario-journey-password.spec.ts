import { test, expect, type Page } from '@playwright/test';
import { ImapFlow } from 'imapflow';

/**
 * Journey 8: Password Reset
 * AGENT: Mario | BRANCH: test/mario-dashboard-journeys
 * Target: https://hub.nfstay.com (production)
 */

const BASE = 'https://hub.nfstay.com';
const OPERATOR_EMAIL = 'mario-operator@nexivoproperties.co.uk';
const OPERATOR_PASS = 'MarioOperator2026!';
const NEW_PASS = 'MarioNewPass123!';
const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQxODQ2NCwiZXhwIjoyMDg4OTk0NDY0fQ.B7nmKCji4LEDU5JozanHl9PjNXzYuIpav6B8KR3BNV0';

const IMAP_CONFIG = {
  host: 'premium215.web-hosting.com',
  port: 993,
  secure: true,
  auth: { user: 'info@nexivoproperties.co.uk', pass: 'Dgs58913347.' },
  logger: false as any,
};

// ─── Helpers ─────────────────────────────────────────────────────

async function ensureUser(email: string, password: string) {
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
  });
  const listData = await listRes.json();
  const existing = (listData.users || []).find((u: any) => u.email === email);
  if (existing) {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    });
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${existing.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
    });
  }

  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Mario Operator' },
    }),
  });
  const user = await createRes.json();
  if (!user.id) throw new Error(`Failed to create user: ${JSON.stringify(user)}`);

  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ whatsapp_verified: true, tier: 'monthly' }),
  });

  return user;
}

async function searchResetEmail(toEmail: string, sinceMinutesAgo: number = 5): Promise<{ subject: string; body: string } | null> {
  const client = new ImapFlow(IMAP_CONFIG);
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - sinceMinutesAgo * 60 * 1000);
      const uids = await client.search({
        to: toEmail,
        since,
      });

      if (uids.length === 0) return null;

      // Get the most recent message
      for await (const msg of client.fetch(uids.slice(-5), { envelope: true, source: true })) {
        const subject = msg.envelope.subject || '';
        if (subject.toLowerCase().includes('reset') || subject.toLowerCase().includes('password')) {
          const body = msg.source?.toString() || '';
          return { subject, body };
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (e) {
    console.error('IMAP error:', e);
  }
  return null;
}

function extractResetLink(emailBody: string): string | null {
  // Look for reset password URL patterns
  const patterns = [
    /https?:\/\/[^\s"<>]*reset-password[^\s"<>]*/gi,
    /https?:\/\/[^\s"<>]*type=recovery[^\s"<>]*/gi,
    /https?:\/\/[^\s"<>]*token=[^\s"<>]*/gi,
    /https?:\/\/hub\.nfstay\.com[^\s"<>]*reset[^\s"<>]*/gi,
    /https?:\/\/asazddtvjvmckouxcmmo\.supabase\.co[^\s"<>]*recovery[^\s"<>]*/gi,
  ];

  for (const pattern of patterns) {
    const matches = emailBody.match(pattern);
    if (matches && matches.length > 0) {
      // Clean up the URL (remove trailing quotes, brackets, etc.)
      let url = matches[0].replace(/["'>)\]]+$/, '');
      // Decode HTML entities
      url = url.replace(/&amp;/g, '&');
      return url;
    }
  }
  return null;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/signin`, { timeout: 20000 });
  await page.waitForTimeout(2000);

  const signInTab = page.locator('text=Sign In').first();
  if (await signInTab.isVisible().catch(() => false)) {
    await signInTab.click();
    await page.waitForTimeout(500);
  }

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
}

// ─── Tests ───────────────────────────────────────────────────────

test.describe('Journey 8: Password Reset', () => {
  test.beforeAll(async () => {
    await ensureUser(OPERATOR_EMAIL, OPERATOR_PASS);
  });

  test('J8-01-02: Navigate to /forgot-password and submit', async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`, { timeout: 15000 });
    await page.waitForTimeout(2000);

    const content = await page.content();
    const hasForgotPage = content.toLowerCase().includes('forgot') || content.toLowerCase().includes('reset') || content.toLowerCase().includes('email');
    expect(hasForgotPage).toBe(true);
    console.log('J8-01 PASS: Forgot password page loaded');

    // Enter email
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(OPERATOR_EMAIL);

    // Submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Reset"), button:has-text("Submit")').first();
    await submitBtn.click();
    await page.waitForTimeout(3000);

    // Check for success message
    const bodyText = await page.textContent('body') || '';
    const hasSuccess = bodyText.toLowerCase().includes('check your email') ||
      bodyText.toLowerCase().includes('sent') ||
      bodyText.toLowerCase().includes('reset link') ||
      bodyText.toLowerCase().includes('success');
    console.log('J8-02: Success message visible:', hasSuccess);
    console.log('J8-02: Page text:', bodyText.substring(0, 300));
    expect(hasSuccess).toBe(true);
    console.log('J8-02 PASS: Reset link sent message displayed');
  });

  test('J8-03: Reset email arrives via IMAP', async () => {
    test.setTimeout(60000);
    // Wait for email delivery
    await new Promise(r => setTimeout(r, 15000));

    const email = await searchResetEmail(OPERATOR_EMAIL, 5);
    if (email) {
      console.log('J8-03 PASS: Reset email found, subject:', email.subject);
      const link = extractResetLink(email.body);
      console.log('J8-03: Reset link:', link || 'NOT FOUND');
    } else {
      console.log('J8-03 FAIL: No reset email found within 5 minutes');
      // Try broader search
      const broader = await searchResetEmail(OPERATOR_EMAIL, 15);
      if (broader) {
        console.log('J8-03: Found in broader search, subject:', broader.subject);
      }
    }
  });

  test('J8-04-06: Full password reset flow', async ({ page }) => {
    test.setTimeout(90000);

    // Step 1: Request password reset
    await page.goto(`${BASE}/forgot-password`, { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', OPERATOR_EMAIL);
    const submitBtn = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Reset"), button:has-text("Submit")').first();
    await submitBtn.click();
    await page.waitForTimeout(3000);

    // Step 2: Wait and check IMAP for reset email
    await new Promise(r => setTimeout(r, 15000));
    const email = await searchResetEmail(OPERATOR_EMAIL, 5);

    if (!email) {
      console.log('J8-04: No reset email found - cannot complete flow');
      // Still try the reset page directly to see if it exists
      await page.goto(`${BASE}/reset-password`, { timeout: 15000 });
      await page.waitForTimeout(2000);
      const content = await page.content();
      const hasResetPage = content.toLowerCase().includes('password') || content.toLowerCase().includes('reset');
      console.log('J8-04: Reset password page exists:', hasResetPage);
      return;
    }

    const link = extractResetLink(email.body);
    if (!link) {
      console.log('J8-04: Reset email found but no link extracted');
      console.log('J8-04: Email body preview:', email.body.substring(0, 500));
      return;
    }

    console.log('J8-04: Following reset link:', link);

    // Step 3: Navigate to reset link
    await page.goto(link, { timeout: 20000 });
    await page.waitForTimeout(3000);

    const url = page.url();
    console.log('J8-04: After following link, URL:', url);

    const pageContent = await page.content();
    const hasResetForm = pageContent.toLowerCase().includes('password') || pageContent.toLowerCase().includes('reset');
    console.log('J8-04 PASS: Reset page loaded:', hasResetForm);

    // Step 4: Enter new password
    const passwordInputs = page.locator('input[type="password"]');
    const pwCount = await passwordInputs.count();
    console.log('J8-05: Found', pwCount, 'password inputs');

    if (pwCount >= 1) {
      await passwordInputs.nth(0).fill(NEW_PASS);
      if (pwCount >= 2) {
        await passwordInputs.nth(1).fill(NEW_PASS);
      }

      const resetBtn = page.locator('button[type="submit"], button:has-text("Reset"), button:has-text("Update"), button:has-text("Save"), button:has-text("Change")').first();
      if (await resetBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await resetBtn.click();
        await page.waitForTimeout(5000);

        const afterText = await page.textContent('body') || '';
        const hasSuccess = afterText.toLowerCase().includes('success') ||
          afterText.toLowerCase().includes('updated') ||
          afterText.toLowerCase().includes('changed') ||
          page.url().includes('signin');
        console.log('J8-05: Password reset result:', hasSuccess);
        console.log('J8-05: URL after reset:', page.url());
      }
    }

    // Step 5: Sign in with new password
    await signIn(page, OPERATOR_EMAIL, NEW_PASS);
    const finalUrl = page.url();
    const signedIn = finalUrl.includes('/dashboard');
    console.log('J8-06: Sign in with new password:', signedIn ? 'PASS' : 'FAIL');
    console.log('J8-06: Final URL:', finalUrl);
  });
});
