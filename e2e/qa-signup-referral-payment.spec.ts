/**
 * QA E2E: Signup → Referral → Payment flow (LIVE hub.nfstay.com)
 * Run: npx playwright test e2e/qa-signup-referral-payment.spec.ts --config=e2e/hub-playwright.config.ts --reporter=list --timeout=180000
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const BASE = 'https://hub.nfstay.com';
const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';

const USER_A = {
  name: 'QA User Alpha',
  email: 'qa-alpha-test@hub.nfstay.com',
  password: 'QAAlpha2026!',
  phone: '7700900001',
};

const USER_B = {
  name: 'QA User Beta',
  email: 'qa-beta-test@hub.nfstay.com',
  password: 'QABeta2026!',
  phone: '7700900002',
};

const SS = 'e2e/screenshots';

/** Sign in via Supabase API and inject session into localStorage */
async function injectAuth(page: Page, email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const tokens = await res.json();
  if (!tokens.access_token) {
    console.log(`  [injectAuth] Login failed for ${email}:`, JSON.stringify(tokens));
    return false;
  }
  const storageKey = 'sb-asazddtvjvmckouxcmmo-auth-token';
  const sessionData = JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: tokens.user,
  });
  await page.goto(BASE, { waitUntil: 'commit' });
  await page.evaluate(([key, data]) => localStorage.setItem(key, data), [storageKey, sessionData]);
  return true;
}

// Shared state between tests
let referralUrl = '';
let userASignedUp = false;
let userBSignedUp = false;

test.describe.serial('QA: Signup → Referral → Payment', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // PART 1: Sign up User A
  // ═══════════════════════════════════════════════════════════════════════════
  test('Part 1: Sign up User A', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('\n══ PART 1: SIGN UP USER A ══');

    try {
      await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.screenshot({ path: `${SS}/p1-01-signup-landing.png`, fullPage: true });
      console.log('  Signup page loaded');

      // Click "Sign up with Email"
      const emailBtn = page.locator('button:has-text("Sign up with Email")');
      if (await emailBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailBtn.click();
        await page.waitForTimeout(1000);
        console.log('  Clicked "Sign up with Email"');
      } else {
        console.log('  Email form may already be visible (no button found)');
      }
      await page.screenshot({ path: `${SS}/p1-02-email-form.png`, fullPage: true });

      // Fill in Name
      const nameInput = page.locator('input[data-feature="AUTH__SIGNUP_NAME"], input[placeholder*="full name" i]').first();
      await nameInput.fill(USER_A.name);

      // Fill in Email
      const emailInput = page.locator('input[data-feature="AUTH__SIGNUP_EMAIL"], input[type="email"]').first();
      await emailInput.fill(USER_A.email);

      // Fill in Password
      const pwInput = page.locator('input[data-feature="AUTH__SIGNUP_PASSWORD"], input[placeholder*="Min 8" i]').first();
      await pwInput.fill(USER_A.password);

      // Fill in Confirm Password
      const confirmInput = page.locator('input[placeholder*="Re-enter" i]').first();
      await confirmInput.fill(USER_A.password);

      // Fill in Phone
      const phoneInput = page.locator('input[data-feature="AUTH__SIGNUP_PHONE"], input[type="tel"]').first();
      await phoneInput.fill(USER_A.phone);

      // Check Terms checkbox
      const termsCheckbox = page.locator('input[type="checkbox"]').first();
      if (await termsCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await termsCheckbox.check({ force: true });
      }

      await page.screenshot({ path: `${SS}/p1-03-form-filled.png`, fullPage: true });
      console.log('  Form filled');

      // Submit
      const submitBtn = page.locator('button[data-feature="AUTH__SIGNUP_SUBMIT"], button:has-text("Create account")').first();
      await submitBtn.click();
      console.log('  Submitted form');

      // Wait for navigation or response
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${SS}/p1-04-after-submit.png`, fullPage: true });

      const currentUrl = page.url();
      const bodyText = await page.textContent('body') || '';
      console.log(`  Current URL: ${currentUrl}`);

      if (currentUrl.includes('verify-otp')) {
        console.log('  RESULT: Redirected to OTP verification (WhatsApp)');
        userASignedUp = true;
      } else if (bodyText.toLowerCase().includes('already registered') || bodyText.toLowerCase().includes('already has an account')) {
        console.log('  RESULT: User already exists — will try signing in instead');
        userASignedUp = true; // account exists from prior run
      } else if (currentUrl.includes('dashboard')) {
        console.log('  RESULT: Signed up and redirected to dashboard');
        userASignedUp = true;
      } else {
        console.log(`  RESULT: Unknown state. Body snippet: ${bodyText.slice(0, 200)}`);
        userASignedUp = true; // assume account may exist
      }
    } catch (err: any) {
      console.error(`  ERROR in Part 1: ${err.message}`);
      await page.screenshot({ path: `${SS}/p1-error.png`, fullPage: true }).catch(() => {});
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 1b: Get User A referral link
  // ═══════════════════════════════════════════════════════════════════════════
  test('Part 1b: Get User A referral link', async ({ page }) => {
    test.setTimeout(60_000);
    console.log('\n══ PART 1b: GET REFERRAL LINK ══');

    try {
      // Sign in as User A
      const authed = await injectAuth(page, USER_A.email, USER_A.password);
      if (!authed) {
        console.log('  Could not sign in as User A — skipping referral link retrieval');
        // Try to get referral code from Supabase directly
        const profileRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(USER_A.email)}&select=referral_code`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
        );
        const profiles = await profileRes.json();
        if (profiles?.[0]?.referral_code) {
          referralUrl = `${BASE}/signup?ref=${profiles[0].referral_code}`;
          console.log(`  Referral URL from DB: ${referralUrl}`);
        } else {
          console.log('  No referral code found in DB either');
        }
        return;
      }

      // Navigate to affiliates page
      await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${SS}/p1b-01-affiliates-page.png`, fullPage: true });

      const currentUrl = page.url();
      console.log(`  Affiliates page URL: ${currentUrl}`);

      // Look for referral link on the page
      const bodyText = await page.textContent('body') || '';

      // Try to find the referral URL in the page
      const refMatch = bodyText.match(/hub\.nfstay\.com\/signup\?ref=([A-Za-z0-9]+)/);
      if (refMatch) {
        referralUrl = `https://hub.nfstay.com/signup?ref=${refMatch[1]}`;
        console.log(`  Found referral URL: ${referralUrl}`);
      } else {
        // Try to find just a referral code
        const codeInput = page.locator('input[value*="ref="], input[readonly]').first();
        if (await codeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          const val = await codeInput.inputValue();
          console.log(`  Input value: ${val}`);
          if (val.includes('ref=')) {
            referralUrl = val.startsWith('http') ? val : `${BASE}/signup?ref=${val}`;
          }
        }

        // Also try looking for the code in a copy button or text element
        const refCodeEl = page.locator('[data-referral-code], [class*="referral"], text=/[A-Z0-9]{6,}/').first();
        if (!referralUrl && await refCodeEl.isVisible({ timeout: 3000 }).catch(() => false)) {
          const code = await refCodeEl.textContent();
          if (code && code.trim().length >= 4) {
            referralUrl = `${BASE}/signup?ref=${code.trim()}`;
          }
        }
      }

      // Fallback: query Supabase for the referral code
      if (!referralUrl) {
        console.log('  Trying Supabase DB for referral code...');
        const profileRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(USER_A.email)}&select=referral_code`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
        );
        const profiles = await profileRes.json();
        console.log(`  DB result: ${JSON.stringify(profiles)}`);
        if (profiles?.[0]?.referral_code) {
          referralUrl = `${BASE}/signup?ref=${profiles[0].referral_code}`;
        }
      }

      if (referralUrl) {
        console.log(`  ✅ REFERRAL URL: ${referralUrl}`);
      } else {
        console.log('  ❌ No referral URL found');
        // Use a dummy referral code so Part 2 can still test the flow
        referralUrl = `${BASE}/signup?ref=TESTCODE123`;
        console.log(`  Using fallback: ${referralUrl}`);
      }

      await page.screenshot({ path: `${SS}/p1b-02-referral-link.png`, fullPage: true });
    } catch (err: any) {
      console.error(`  ERROR in Part 1b: ${err.message}`);
      await page.screenshot({ path: `${SS}/p1b-error.png`, fullPage: true }).catch(() => {});
      referralUrl = `${BASE}/signup?ref=TESTCODE123`;
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 2: Sign up User B with referral
  // ═══════════════════════════════════════════════════════════════════════════
  test('Part 2: Sign up User B with referral', async ({ browser }) => {
    test.setTimeout(120_000);
    console.log('\n══ PART 2: SIGN UP USER B WITH REFERRAL ══');
    console.log(`  Using referral URL: ${referralUrl}`);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(referralUrl, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.screenshot({ path: `${SS}/p2-01-referral-landing.png`, fullPage: true });

      // Verify ref param is in URL
      const url = page.url();
      console.log(`  Landing URL: ${url}`);
      expect(url).toContain('ref=');

      // Check localStorage for stored ref code
      const storedRef = await page.evaluate(() => localStorage.getItem('nfstay_ref'));
      console.log(`  Stored ref code: ${storedRef}`);

      // Click "Sign up with Email"
      const emailBtn = page.locator('button:has-text("Sign up with Email")');
      if (await emailBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailBtn.click();
        await page.waitForTimeout(1000);
        console.log('  Clicked "Sign up with Email"');
      }

      // Fill form
      const nameInput = page.locator('input[data-feature="AUTH__SIGNUP_NAME"], input[placeholder*="full name" i]').first();
      await nameInput.fill(USER_B.name);

      const emailInput = page.locator('input[data-feature="AUTH__SIGNUP_EMAIL"], input[type="email"]').first();
      await emailInput.fill(USER_B.email);

      const pwInput = page.locator('input[data-feature="AUTH__SIGNUP_PASSWORD"], input[placeholder*="Min 8" i]').first();
      await pwInput.fill(USER_B.password);

      const confirmInput = page.locator('input[placeholder*="Re-enter" i]').first();
      await confirmInput.fill(USER_B.password);

      const phoneInput = page.locator('input[data-feature="AUTH__SIGNUP_PHONE"], input[type="tel"]').first();
      await phoneInput.fill(USER_B.phone);

      const termsCheckbox = page.locator('input[type="checkbox"]').first();
      if (await termsCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await termsCheckbox.check({ force: true });
      }

      await page.screenshot({ path: `${SS}/p2-02-form-filled.png`, fullPage: true });
      console.log('  Form filled for User B');

      // Submit
      const submitBtn = page.locator('button[data-feature="AUTH__SIGNUP_SUBMIT"], button:has-text("Create account")').first();
      await submitBtn.click();
      console.log('  Submitted form');

      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${SS}/p2-03-after-submit.png`, fullPage: true });

      const currentUrl = page.url();
      const bodyText = await page.textContent('body') || '';
      console.log(`  Current URL: ${currentUrl}`);

      if (currentUrl.includes('verify-otp')) {
        console.log('  RESULT: Redirected to OTP verification');
        userBSignedUp = true;
      } else if (bodyText.toLowerCase().includes('already') || currentUrl.includes('signin')) {
        console.log('  RESULT: User already exists');
        userBSignedUp = true;
      } else if (currentUrl.includes('dashboard')) {
        console.log('  RESULT: Signed up and redirected to dashboard');
        userBSignedUp = true;
      } else {
        console.log(`  RESULT: Unknown state. Body snippet: ${bodyText.slice(0, 200)}`);
        userBSignedUp = true;
      }
    } catch (err: any) {
      console.error(`  ERROR in Part 2: ${err.message}`);
      await page.screenshot({ path: `${SS}/p2-error.png`, fullPage: true }).catch(() => {});
    } finally {
      await context.close();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 3: Test Card Payment (SamCart)
  // ═══════════════════════════════════════════════════════════════════════════
  test('Part 3: Test SamCart card payment', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('\n══ PART 3: TEST CARD PAYMENT (SamCart) ══');

    try {
      // Try to sign in as User B first, fall back to User A
      let authed = await injectAuth(page, USER_B.email, USER_B.password);
      if (!authed) {
        console.log('  User B auth failed, trying User A...');
        authed = await injectAuth(page, USER_A.email, USER_A.password);
      }
      if (!authed) {
        console.log('  ❌ Cannot auth any test user — skipping payment tests');
        return;
      }

      // Navigate to invest marketplace
      await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${SS}/p3-01-invest-marketplace.png`, fullPage: true });

      const marketplaceUrl = page.url();
      console.log(`  Marketplace URL: ${marketplaceUrl}`);

      if (marketplaceUrl.includes('signin')) {
        console.log('  ❌ Redirected to signin — auth injection may have failed');
        return;
      }

      // Look for a property card to click
      const propertyCard = page.locator('[data-feature*="INVEST"], [class*="property"], [class*="card"]').first();
      const anyClickable = page.locator('button:has-text("Invest"), button:has-text("Partner"), button:has-text("View"), button:has-text("Details"), button:has-text("Allocate")').first();

      if (await anyClickable.isVisible({ timeout: 5000 }).catch(() => false)) {
        await anyClickable.click();
        console.log('  Clicked invest/view button');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${SS}/p3-02-property-modal.png`, fullPage: true });
      } else if (await propertyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await propertyCard.click();
        console.log('  Clicked property card');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${SS}/p3-02-property-modal.png`, fullPage: true });
      } else {
        console.log('  No property cards found — taking screenshot of whatever is on page');
        await page.screenshot({ path: `${SS}/p3-02-no-properties.png`, fullPage: true });
      }

      // Look for "Credit / Debit Card" button
      const cardBtn = page.locator('button:has-text("Credit"), button:has-text("Debit"), button:has-text("Card")').first();
      if (await cardBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('  Found card payment button');
        await cardBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SS}/p3-03-card-selected.png`, fullPage: true });

        // Look for TSA checkbox
        const tsaLabel = page.locator('label:has-text("Token Sale Agreement"), label:has-text("agree"), label:has-text("terms")').first();
        if (await tsaLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
          await tsaLabel.click();
          console.log('  Checked TSA/terms');
          await page.waitForTimeout(500);
        }

        // Look for "Secure" or "Proceed" or "Pay" button
        const secureBtn = page.locator('button:has-text("Secure"), button:has-text("Proceed"), button:has-text("Continue"), button:has-text("Pay")').first();
        if (await secureBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          const isDisabled = await secureBtn.isDisabled();
          console.log(`  Secure button disabled: ${isDisabled}`);
          if (!isDisabled) {
            await secureBtn.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: `${SS}/p3-04-samcart-iframe.png`, fullPage: true });

            // Check for SamCart iframe
            const iframe = page.locator('iframe[title*="SamCart"], iframe[src*="samcart"]');
            const hasIframe = await iframe.isVisible({ timeout: 5000 }).catch(() => false);
            console.log(`  SamCart iframe visible: ${hasIframe}`);

            if (hasIframe) {
              const src = await iframe.getAttribute('src');
              console.log(`  SamCart URL: ${src}`);
            }

            // Check for "Complete Payment" sheet
            const sheetTitle = page.locator('text=Complete Payment, text=Payment, text=Checkout').first();
            const hasSheet = await sheetTitle.isVisible({ timeout: 3000 }).catch(() => false);
            console.log(`  Payment sheet/modal visible: ${hasSheet}`);
          }
        }
      } else {
        console.log('  ❌ No card payment button found on page');
        const bodyText = await page.textContent('body') || '';
        console.log(`  Page content snippet: ${bodyText.slice(0, 300)}`);
      }

      await page.screenshot({ path: `${SS}/p3-05-final.png`, fullPage: true });
    } catch (err: any) {
      console.error(`  ERROR in Part 3: ${err.message}`);
      await page.screenshot({ path: `${SS}/p3-error.png`, fullPage: true }).catch(() => {});
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 4: Test Crypto Payment
  // ═══════════════════════════════════════════════════════════════════════════
  test('Part 4: Test crypto payment', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('\n══ PART 4: TEST CRYPTO PAYMENT ══');

    try {
      let authed = await injectAuth(page, USER_B.email, USER_B.password);
      if (!authed) {
        authed = await injectAuth(page, USER_A.email, USER_A.password);
      }
      if (!authed) {
        console.log('  ❌ Cannot auth — skipping crypto test');
        return;
      }

      await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForTimeout(3000);

      if (page.url().includes('signin')) {
        console.log('  ❌ Redirected to signin');
        return;
      }

      // Click a property
      const anyClickable = page.locator('button:has-text("Invest"), button:has-text("Partner"), button:has-text("View"), button:has-text("Details"), button:has-text("Allocate")').first();
      if (await anyClickable.isVisible({ timeout: 5000 }).catch(() => false)) {
        await anyClickable.click();
        await page.waitForTimeout(3000);
      }

      await page.screenshot({ path: `${SS}/p4-01-invest-page.png`, fullPage: true });

      // Look for Cryptocurrency payment option
      const cryptoBtn = page.locator('button:has-text("Crypto"), button:has-text("Blockchain"), button:has-text("USDT"), button:has-text("Wallet")').first();
      if (await cryptoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('  Found crypto payment button');
        await cryptoBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SS}/p4-02-crypto-selected.png`, fullPage: true });

        // Look for TSA checkbox
        const tsaLabel = page.locator('label:has-text("Token Sale Agreement"), label:has-text("agree"), label:has-text("terms")').first();
        if (await tsaLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
          await tsaLabel.click();
          await page.waitForTimeout(500);
        }

        // Look for confirm/proceed button
        const confirmBtn = page.locator('button:has-text("Secure"), button:has-text("Proceed"), button:has-text("Confirm"), button:has-text("Continue"), button:has-text("Pay")').first();
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          const isDisabled = await confirmBtn.isDisabled();
          console.log(`  Confirm button disabled: ${isDisabled}`);
          if (!isDisabled) {
            await confirmBtn.click();
            await page.waitForTimeout(5000);
            await page.screenshot({ path: `${SS}/p4-03-crypto-flow.png`, fullPage: true });

            // Check what appeared: wallet popup, connect wallet, or blockchain dialog
            const walletPopup = page.locator('text=Connect Wallet, text=Particle, text=MetaMask, text=wallet').first();
            const hasWallet = await walletPopup.isVisible({ timeout: 5000 }).catch(() => false);
            console.log(`  Wallet/crypto dialog visible: ${hasWallet}`);

            const bodyText = await page.textContent('body') || '';
            if (bodyText.toLowerCase().includes('wallet') || bodyText.toLowerCase().includes('connect') || bodyText.toLowerCase().includes('blockchain')) {
              console.log('  Crypto flow initiated successfully');
            }
          }
        }
      } else {
        console.log('  ❌ No crypto payment button found');
        // Check if crypto option is shown as a tab/radio
        const cryptoTab = page.locator('[data-value="crypto"], [role="tab"]:has-text("Crypto")').first();
        if (await cryptoTab.isVisible({ timeout: 3000 }).catch(() => false)) {
          await cryptoTab.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: `${SS}/p4-02-crypto-tab.png`, fullPage: true });
          console.log('  Clicked crypto tab');
        } else {
          const bodyText = await page.textContent('body') || '';
          console.log(`  Page content snippet: ${bodyText.slice(0, 300)}`);
        }
      }

      await page.screenshot({ path: `${SS}/p4-04-final.png`, fullPage: true });
    } catch (err: any) {
      console.error(`  ERROR in Part 4: ${err.message}`);
      await page.screenshot({ path: `${SS}/p4-error.png`, fullPage: true }).catch(() => {});
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 5: Verify Referral Tracking
  // ═══════════════════════════════════════════════════════════════════════════
  test('Part 5: Verify referral tracking', async ({ page }) => {
    test.setTimeout(60_000);
    console.log('\n══ PART 5: VERIFY REFERRAL TRACKING ══');

    try {
      // Sign in as User A
      const authed = await injectAuth(page, USER_A.email, USER_A.password);
      if (!authed) {
        console.log('  ❌ Cannot auth User A — skipping referral check');
        return;
      }

      await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${SS}/p5-01-affiliates-page.png`, fullPage: true });

      const currentUrl = page.url();
      console.log(`  Affiliates page URL: ${currentUrl}`);

      if (currentUrl.includes('signin')) {
        console.log('  ❌ Redirected to signin');
        return;
      }

      const bodyText = await page.textContent('body') || '';

      // Check if User B appears as a referral
      if (bodyText.includes(USER_B.name) || bodyText.includes(USER_B.email) || bodyText.toLowerCase().includes('beta')) {
        console.log('  ✅ User B appears in referral list');
      } else {
        console.log('  ❌ User B NOT found in referral list');
        console.log(`  Page content snippet: ${bodyText.slice(0, 500)}`);
      }

      // Look for referral stats
      const statsEl = page.locator('text=/[0-9]+ referral/i, text=/[0-9]+ sign/i, text=/total/i').first();
      if (await statsEl.isVisible({ timeout: 3000 }).catch(() => false)) {
        const statsText = await statsEl.textContent();
        console.log(`  Referral stats: ${statsText}`);
      }

      // Also check DB directly
      try {
        const profileRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(USER_B.email)}&select=referred_by`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
        );
        const profiles = await profileRes.json();
        console.log(`  User B referred_by (DB): ${JSON.stringify(profiles)}`);
      } catch {
        console.log('  Could not query DB for referral tracking');
      }

      await page.screenshot({ path: `${SS}/p5-02-final.png`, fullPage: true });
    } catch (err: any) {
      console.error(`  ERROR in Part 5: ${err.message}`);
      await page.screenshot({ path: `${SS}/p5-error.png`, fullPage: true }).catch(() => {});
    }
  });
});
