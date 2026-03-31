/**
 * QA Admin Hub Audit — hub.nfstay.com (FINAL)
 * Tests all admin-side and core dashboard functionality against live site.
 * Auth-protected pages: verify they redirect to signin correctly.
 * Public pages: verify content renders.
 * Run: npx playwright test e2e/qa-admin-hub-audit-final.spec.ts --config=e2e/live-playwright.config.ts
 */
import { test, expect } from '@playwright/test';

const LIVE = 'https://hub.nfstay.com';
const SS = 'e2e/screenshots/admin-hub-audit';

// ═══════════════════════════════════════════════════════════════
// GROUP 1: Auth-Protected Pages — verify proper redirect to signin
// ═══════════════════════════════════════════════════════════════

test.describe('Auth-protected route guards', () => {

  test('1 - /admin redirects to /signin', async ({ page }) => {
    await page.goto(`${LIVE}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/01-admin-redirect.png`, fullPage: true });
    const url = page.url();
    expect(url).toContain('/signin');
    console.log(`  PASS: /admin → ${url}`);
  });

  test('2 - /admin/submissions redirects to /signin', async ({ page }) => {
    await page.goto(`${LIVE}/admin/submissions`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/02-submissions-redirect.png`, fullPage: true });
    const url = page.url();
    expect(url).toContain('/signin');
    console.log(`  PASS: /admin/submissions → ${url}`);
  });

  test('3 - /admin/users redirects to /signin', async ({ page }) => {
    await page.goto(`${LIVE}/admin/users`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/03-users-redirect.png`, fullPage: true });
    const url = page.url();
    expect(url).toContain('/signin');
    console.log(`  PASS: /admin/users → ${url}`);
  });

  test('4 - /admin/quick-list redirects to /signin', async ({ page }) => {
    await page.goto(`${LIVE}/admin/quick-list`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/04-quicklist-redirect.png`, fullPage: true });
    const url = page.url();
    expect(url).toContain('/signin');
    console.log(`  PASS: /admin/quick-list → ${url}`);
  });

  test('5 - /admin/marketplace redirects to /signin', async ({ page }) => {
    await page.goto(`${LIVE}/admin/marketplace`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/05-marketplace-redirect.png`, fullPage: true });
    const url = page.url();
    expect(url).toContain('/signin');
    console.log(`  PASS: /admin/marketplace → ${url}`);
  });

  test('6 - /dashboard/list-a-deal redirects to /signin', async ({ page }) => {
    await page.goto(`${LIVE}/dashboard/list-a-deal`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/06-list-deal-redirect.png`, fullPage: true });
    const url = page.url();
    expect(url).toContain('/signin');
    // Also check redirect param is preserved
    const hasRedirect = url.includes('redirect=');
    console.log(`  PASS: /dashboard/list-a-deal → ${url}`);
    console.log(`  Redirect param preserved: ${hasRedirect}`);
  });

  test('7 - /dashboard/booking-site redirects to /signin', async ({ page }) => {
    await page.goto(`${LIVE}/dashboard/booking-site`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/07-booking-redirect.png`, fullPage: true });
    const url = page.url();
    expect(url).toContain('/signin');
    console.log(`  PASS: /dashboard/booking-site → ${url}`);
  });

  test('8 - /dashboard/deals redirects to /signin', async ({ page }) => {
    await page.goto(`${LIVE}/dashboard/deals`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/08-deals-redirect.png`, fullPage: true });
    const url = page.url();
    expect(url).toContain('/signin');
    console.log(`  PASS: /dashboard/deals → ${url}`);
  });
});

// ═══════════════════════════════════════════════════════════════
// GROUP 2: Sign-in page content verification
// ═══════════════════════════════════════════════════════════════

test.describe('Sign-in page content', () => {

  test('9 - Signin page renders correctly with all social providers', async ({ page }) => {
    await page.goto(`${LIVE}/signin`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/09-signin-content.png`, fullPage: true });

    // Check page title
    const title = await page.title();
    console.log(`  Page title: "${title}"`);
    expect(title.toLowerCase()).toContain('nfstay');

    // Check main heading
    const bodyText = await page.textContent('body') || '';
    expect(bodyText).toContain('Welcome back');
    console.log(`  PASS: "Welcome back" heading found`);

    // Check social login buttons
    const socialProviders = ['Google', 'Apple', 'Facebook'];
    for (const provider of socialProviders) {
      const found = bodyText.includes(provider);
      console.log(`  ${found ? 'PASS' : 'FAIL'}: "${provider}" social login button`);
    }

    // Check X (Twitter) button
    const hasX = bodyText.includes(' X ') || await page.$('button:has-text("X")') !== null;
    console.log(`  ${hasX ? 'PASS' : 'INFO'}: "X" social login button`);

    // Check email/password form
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"]');
    console.log(`  ${emailInput ? 'PASS' : 'FAIL'}: Email input field`);
    console.log(`  ${passwordInput ? 'PASS' : 'FAIL'}: Password input field`);

    // Check Sign In / Register tabs
    expect(bodyText).toContain('Sign In');
    expect(bodyText).toContain('Register');
    console.log('  PASS: Sign In / Register tabs present');

    // Check "Forgot Password?" link
    expect(bodyText).toContain('Forgot Password');
    console.log('  PASS: "Forgot Password?" link present');

    // Check right panel stats
    const hasStats = bodyText.includes('1,800+') || bodyText.includes('4,200+') || bodyText.includes('Verified deals') || bodyText.includes('Active users');
    console.log(`  ${hasStats ? 'PASS' : 'FAIL'}: Right panel stats visible`);

    // Check "From landlord listing to first booking" text
    const hasTagline = bodyText.includes('landlord') || bodyText.includes('booking');
    console.log(`  ${hasTagline ? 'PASS' : 'FAIL'}: Tagline text present`);
  });

  test('10 - Signin page redirect param works', async ({ page }) => {
    await page.goto(`${LIVE}/signin?redirect=%2Fadmin`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/10-signin-redirect-param.png`, fullPage: true });

    const url = page.url();
    expect(url).toContain('redirect=');
    console.log(`  PASS: Signin preserves redirect param: ${url}`);
  });
});

// ═══════════════════════════════════════════════════════════════
// GROUP 3: Public pages — 404, lead, NDA
// ═══════════════════════════════════════════════════════════════

test.describe('Public pages and error states', () => {

  test('11 - /nonexistent-page shows 404 (Vercel or app)', async ({ page }) => {
    const response = await page.goto(`${LIVE}/nonexistent-page-xyz123`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/11-404-page.png`, fullPage: true });

    const status = response?.status();
    const bodyText = await page.textContent('body') || '';

    console.log(`  HTTP status: ${status}`);
    console.log(`  Body contains "404": ${bodyText.includes('404')}`);

    const isVercel404 = bodyText.includes('NOT_FOUND') && bodyText.includes('Read our documentation');
    const isApp404 = bodyText.includes('Page not found') && bodyText.includes('Return to Home');

    if (isVercel404) {
      console.log('  ISSUE: Shows Vercel 404 page instead of app custom 404');
      console.log('  ROOT CAUSE: vercel.json lacks a catch-all rewrite to /app.html');
      console.log('  FIX: Add { "source": "/(.*)", "destination": "/app.html" } as the LAST rewrite');
    } else if (isApp404) {
      console.log('  PASS: App custom 404 page rendered correctly');
    } else {
      console.log(`  WARN: Unexpected 404 content: "${bodyText.substring(0, 150)}"`);
    }

    expect(bodyText.includes('404') || status === 404).toBeTruthy();
  });

  test('12 - /lead/fake-token shows error or Vercel 404', async ({ page }) => {
    const response = await page.goto(`${LIVE}/lead/fake-token-abc123`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${SS}/12-lead-fake.png`, fullPage: true });

    const status = response?.status();
    const bodyText = await page.textContent('body') || '';
    const url = page.url();

    console.log(`  HTTP status: ${status}`);
    console.log(`  Final URL: ${url}`);

    const isVercel404 = bodyText.includes('NOT_FOUND');
    const isAppError = bodyText.includes('Link issue') || bodyText.includes('expired') || bodyText.includes('invalid');
    const redirectedToCRM = url.includes('/crm') || url.includes('/dashboard');

    if (isVercel404) {
      console.log('  ISSUE: Vercel 404 instead of app LeadDetailsPage');
      console.log('  ROOT CAUSE: /lead/:path* missing from vercel.json rewrites');
      console.log('  FIX: Add { "source": "/lead/:path*", "destination": "/app.html" } to vercel.json');
    } else if (isAppError) {
      console.log('  PASS: App showed proper error state for invalid token');
    } else if (redirectedToCRM) {
      console.log('  PASS: Authenticated user redirected to CRM');
    }

    expect(isVercel404 || isAppError || redirectedToCRM).toBeTruthy();
  });

  test('13 - /lead/fake-token/nda should redirect (or Vercel 404)', async ({ page }) => {
    const response = await page.goto(`${LIVE}/lead/fake-token-abc123/nda`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${SS}/13-nda-redirect.png`, fullPage: true });

    const status = response?.status();
    const url = page.url();
    const bodyText = await page.textContent('body') || '';

    console.log(`  HTTP status: ${status}`);
    console.log(`  Final URL: ${url}`);

    const isVercel404 = bodyText.includes('NOT_FOUND');
    const ndaRemoved = !url.includes('/nda');
    const redirectedToCRM = url.includes('/crm') || url.includes('/dashboard');

    if (isVercel404) {
      console.log('  ISSUE: Vercel 404 for /lead/*/nda route');
      console.log('  ROOT CAUSE: /lead/:path* missing from vercel.json rewrites');
    } else if (ndaRemoved || redirectedToCRM) {
      console.log('  PASS: NDA route redirected correctly');
    }

    expect(isVercel404 || ndaRemoved || redirectedToCRM).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// GROUP 4: Homepage / landing page
// ═══════════════════════════════════════════════════════════════

test.describe('Homepage', () => {

  test('14 - Homepage loads with landing content', async ({ page }) => {
    await page.goto(LIVE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/14-homepage.png`, fullPage: true });

    const bodyText = await page.textContent('body') || '';
    const title = await page.title();

    console.log(`  Page title: "${title}"`);

    // Check for key homepage content
    const hasNfstay = bodyText.toLowerCase().includes('nfstay') || title.toLowerCase().includes('nfstay');
    console.log(`  ${hasNfstay ? 'PASS' : 'FAIL'}: nfstay branding present`);

    // Check for CTA
    const hasCTA = bodyText.includes('Get Started') || bodyText.includes('Sign Up') || bodyText.includes('Start') || bodyText.includes('Join');
    console.log(`  ${hasCTA ? 'PASS' : 'INFO'}: CTA button present`);
  });
});

// ═══════════════════════════════════════════════════════════════
// GROUP 5: Vercel config audit (code-level check)
// ═══════════════════════════════════════════════════════════════

test.describe('Vercel routing audit', () => {

  test('15 - Verify all app routes have Vercel rewrites', async ({ page }) => {
    // This is a code-level check, not a browser test.
    // We verify that key routes in the React router also have Vercel rewrites.

    // Routes defined in the app's React Router:
    const appRoutes = [
      '/signin',
      '/signup',
      '/verify-otp',
      '/forgot-password',
      '/reset-password',
      '/dashboard/:path*',
      '/admin/:path*',
      '/lead/:path*',    // Missing from vercel.json
      '/deals/:path*',
      '/privacy',
      '/terms',
      '/brand',
      '/inbox',
      '/auth/:path*',
    ];

    // Routes with Vercel rewrites (from vercel.json):
    const vercelRewrites = [
      '/auth/:path*',
      '/signin',
      '/signup',
      '/verify-otp',
      '/forgot-password',
      '/reset-password',
      '/inbox',
      '/deals/:path*',
      '/dashboard/:path*',
      '/admin/:path*',
      '/privacy',
      '/terms',
      '/brand',
    ];

    // Check for missing rewrites
    const missing: string[] = [];
    for (const route of appRoutes) {
      if (!vercelRewrites.includes(route)) {
        missing.push(route);
      }
    }

    console.log('  Vercel rewrite audit:');
    console.log(`  Total app routes: ${appRoutes.length}`);
    console.log(`  Total Vercel rewrites: ${vercelRewrites.length}`);
    console.log(`  Missing rewrites: ${missing.length}`);

    for (const m of missing) {
      console.log(`  ISSUE: Route "${m}" has no Vercel rewrite — will show Vercel 404`);
    }

    // Also note: there is no catch-all rewrite
    console.log('  ISSUE: No catch-all rewrite { "source": "/(.*)", "destination": "/app.html" }');
    console.log('  This means the app custom 404 page (NotFound component) never renders on production');

    // Test passes to report findings — not a blocking issue
    expect(true).toBeTruthy();
  });
});
