import { test, expect, type Page } from '@playwright/test';

/**
 * Tenant-Side Full Audit - hub.nfstay.com (LIVE)
 * Tests all public and tenant-facing pages/flows.
 * Does NOT test investment module.
 *
 * Run: npx playwright test e2e/qa-tenant-audit-live.spec.ts --config=e2e/live-playwright.config.ts
 */

const BASE = 'https://hub.nfstay.com';
const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASSWORD = 'Dgs58913347.';
const SS = 'e2e/screenshots';

// ── Auth helpers ────────────────────────────────────────────────────────────────

async function getAuthTokens(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return await res.json();
}

async function injectAuth(page: Page, tokens: any) {
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
  await page.evaluate(
    ([key, data]) => localStorage.setItem(key, data),
    [storageKey, sessionData],
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC PAGES (no auth required)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. Homepage ───────────────────────────────────────────────────────────────
test.describe('1. Homepage', () => {
  test('loads with hero, nav header, and deals grid', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/01-homepage.png`, fullPage: false });

    // Hero heading
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    const headingText = await heading.textContent();
    console.log(`[1] Hero heading: "${headingText}"`);

    // Nav bar (static landing uses div#navbar with class nav_fixed, not <header>)
    const navbar = page.locator('#navbar, .nav_fixed, [data-feature="SHARED__LANDING_NAV"]').first();
    await expect(navbar).toBeVisible({ timeout: 5000 });
    console.log('[1] Navbar: VISIBLE');

    // Deals grid on homepage -- look for property images or link cards
    const propertyImages = page.locator('img[src*="unsplash"], img[src*="pexels"], img[alt*="property" i], img[loading="lazy"]');
    const imgCount = await propertyImages.count();
    console.log(`[1] Property images on homepage: ${imgCount}`);

    // JV / Pembroke Place card
    const pembroke = page.getByText(/Pembroke/i);
    const pembrokeCount = await pembroke.count();
    console.log(`[1] "Pembroke" text instances: ${pembrokeCount}`);
    if (pembrokeCount === 0) {
      console.log('[1] NOTE: Pembroke Place JV card NOT found on homepage -- may have been removed or renamed');
    }

    // Get Started / Login buttons
    const getStarted = page.getByText(/Get Started/i).first();
    const login = page.getByText(/Login/i).first();
    console.log(`[1] "Get Started" button: ${await getStarted.isVisible().catch(() => false)}`);
    console.log(`[1] "Login" button: ${await login.isVisible().catch(() => false)}`);

    await page.screenshot({ path: `${SS}/01-homepage-full.png`, fullPage: true });
  });
});

// ─── 2. Signup Flow ────────────────────────────────────────────────────────────
test.describe('2. Signup Flow', () => {
  test('role selection: rent vs list, and sub-roles', async ({ page }) => {
    await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/02-signup-initial.png`, fullPage: false });

    // Role selection -- "I want to rent" / "I want to list"
    const rentOption = page.getByText(/want to rent/i);
    const listOption = page.getByText(/want to list/i);
    await expect(rentOption).toBeVisible({ timeout: 5000 });
    await expect(listOption).toBeVisible({ timeout: 5000 });
    console.log('[2] "I want to rent" visible: PASS');
    console.log('[2] "I want to list" visible: PASS');

    // ── Click "I want to rent" ──
    await rentOption.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SS}/02-signup-rent-selected.png`, fullPage: false });

    // Sub-roles: Tenant and Airbnb Operator should appear as toggle buttons
    const tenantBtn = page.getByRole('button', { name: /^Tenant$/i });
    const operatorBtn = page.getByRole('button', { name: /Airbnb Operator/i });
    const tenantVisible = await tenantBtn.isVisible().catch(() => false);
    const operatorVisible = await operatorBtn.isVisible().catch(() => false);
    console.log(`[2] Tenant sub-role button: ${tenantVisible ? 'PASS' : 'FAIL -- not found'}`);
    console.log(`[2] Airbnb Operator sub-role button: ${operatorVisible ? 'PASS' : 'FAIL -- not found'}`);

    // Also check social login buttons appeared (meaning form loaded)
    const googleBtn = page.getByText(/Google/i);
    console.log(`[2] Google signup button visible: ${await googleBtn.isVisible().catch(() => false)}`);

    // ── Go back and click "I want to list" ──
    const backBtn = page.getByText(/Back/i).first();
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(1000);
    } else {
      await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
    }

    const listOption2 = page.getByText(/want to list/i);
    await listOption2.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SS}/02-signup-list-selected.png`, fullPage: false });

    // Sub-roles for listers: Landlord, Listing Agent, Deal Sourcer
    const landlord = page.getByText(/Landlord/i);
    const agent = page.getByText(/Listing Agent/i);
    const dealSourcer = page.getByText(/Deal Sourcer/i);
    console.log(`[2] Landlord visible: ${await landlord.isVisible().catch(() => false)}`);
    console.log(`[2] Listing Agent visible: ${await agent.isVisible().catch(() => false)}`);
    console.log(`[2] Deal Sourcer visible: ${await dealSourcer.isVisible().catch(() => false)}`);

    await page.screenshot({ path: `${SS}/02-signup-final.png`, fullPage: true });
  });
});

// ─── 3. Sign In ────────────────────────────────────────────────────────────────
test.describe('3. Sign In', () => {
  test('form loads with email, password, social logins, and submit', async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/03-signin.png`, fullPage: false });

    // Email input
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    console.log('[3] Email input: PASS');

    // Password input
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    console.log('[3] Password input: PASS');

    // Social login buttons
    const google = page.getByText(/Google/i);
    const apple = page.getByText(/Apple/i);
    console.log(`[3] Google login: ${await google.isVisible().catch(() => false) ? 'PASS' : 'FAIL'}`);
    console.log(`[3] Apple login: ${await apple.isVisible().catch(() => false) ? 'PASS' : 'FAIL'}`);

    // Submit button
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    console.log('[3] Submit button: PASS');

    // Sign In / Register tabs
    const signInTab = page.getByText(/Sign In/i).first();
    const registerTab = page.getByText(/Register/i).first();
    console.log(`[3] Sign In tab: ${await signInTab.isVisible().catch(() => false) ? 'PASS' : 'FAIL'}`);
    console.log(`[3] Register tab: ${await registerTab.isVisible().catch(() => false) ? 'PASS' : 'FAIL'}`);

    // Forgot password link
    const forgot = page.getByText(/Forgot/i);
    console.log(`[3] Forgot password: ${await forgot.isVisible().catch(() => false) ? 'PASS' : 'FAIL'}`);

    await page.screenshot({ path: `${SS}/03-signin-full.png`, fullPage: true });
  });
});

// ─── 11. Lead Page ─────────────────────────────────────────────────────────────
test.describe('11. Lead Page', () => {
  test('/lead/test-token-123 renders (not blank)', async ({ page }) => {
    const resp = await page.goto(`${BASE}/lead/test-token-123`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/11-lead-page.png`, fullPage: false });

    const url = page.url();
    const status = resp?.status();
    console.log(`[11] Lead page URL: ${url}`);
    console.log(`[11] HTTP status: ${status}`);

    // Check content
    const body = page.locator('body');
    const bodyText = await body.textContent();
    const textLen = bodyText?.trim().length ?? 0;
    console.log(`[11] Body text length: ${textLen}`);

    // A 404 from Vercel (not the React app) means the route isn't caught by SPA
    if (status === 404) {
      console.log('[11] RESULT: Vercel 404 -- /lead/:token route is NOT handled by the SPA catch-all');
      console.log('[11] This means the route may be missing from vercel.json rewrites or the React router');
    } else {
      const error = page.getByText(/error|invalid|expired|not found/i);
      console.log(`[11] Error/invalid messages: ${await error.count()}`);
    }

    await page.screenshot({ path: `${SS}/11-lead-page-full.png`, fullPage: true });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATED PAGES (inject auth session)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Authenticated flows', () => {
  let authTokens: any;

  test.beforeAll(async () => {
    authTokens = await getAuthTokens(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!authTokens.access_token) {
      console.error('AUTH FAILED:', JSON.stringify(authTokens));
      throw new Error('Could not authenticate -- check credentials');
    }
    console.log('[AUTH] Logged in as', authTokens.user?.email);
  });

  // ─── 4. Deals Page ─────────────────────────────────────────────────────────
  test('4. Deals page - filters and listings', async ({ page }) => {
    await injectAuth(page, authTokens);
    await page.goto(`${BASE}/dashboard/deals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/04-deals-page.png`, fullPage: false });

    const url = page.url();
    console.log(`[4] Current URL: ${url}`);
    if (url.includes('signin')) {
      console.log('[4] FAIL -- redirected to signin even with injected auth');
      return;
    }

    // Filter bar
    const allFilters = page.locator('select, [role="combobox"], button[class*="filter" i], [data-feature*="FILTER" i], [data-feature*="filter" i]');
    console.log(`[4] Filter elements found: ${await allFilters.count()}`);

    // Specific filters by text
    const cityFilter = page.getByText(/cit/i).first();
    const typeFilter = page.getByText(/type/i).first();
    const bedFilter = page.getByText(/bed/i).first();
    const sortFilter = page.getByText(/sort/i).first();
    const listedByFilter = page.getByText(/listed by/i).first();
    const listingsFilter = page.getByText(/listing/i).first();

    console.log(`[4] City filter: ${await cityFilter.isVisible().catch(() => false)}`);
    console.log(`[4] Type filter: ${await typeFilter.isVisible().catch(() => false)}`);
    console.log(`[4] Bed filter: ${await bedFilter.isVisible().catch(() => false)}`);
    console.log(`[4] Sort filter: ${await sortFilter.isVisible().catch(() => false)}`);
    console.log(`[4] "Listed by" filter: ${await listedByFilter.isVisible().catch(() => false)}`);
    console.log(`[4] "Listing" text: ${await listingsFilter.isVisible().catch(() => false)}`);

    // Property cards
    const cards = page.locator('[data-feature*="PROPERTY_CARD"], [class*="PropertyCard"], [class*="property-card"]');
    const genericCards = page.locator('[class*="rounded"]:has(img)');
    console.log(`[4] PropertyCard elements: ${await cards.count()}`);
    console.log(`[4] Cards with images: ${await genericCards.count()}`);

    await page.screenshot({ path: `${SS}/04-deals-full.png`, fullPage: true });
  });

  // ─── 5. Property Card Buttons ───────────────────────────────────────────────
  test('5. Property card buttons - Visit Listing, Email, WhatsApp, Heart', async ({ page }) => {
    await injectAuth(page, authTokens);
    await page.goto(`${BASE}/dashboard/deals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const url = page.url();
    if (url.includes('signin')) {
      console.log('[5] FAIL -- redirected to signin');
      return;
    }

    await page.screenshot({ path: `${SS}/05-property-cards.png`, fullPage: false });

    // Visit Listing
    const visitBtns = page.getByText(/Visit Listing/i);
    const visitCount = await visitBtns.count();
    console.log(`[5] "Visit Listing" buttons: ${visitCount} ${visitCount > 0 ? 'PASS' : 'FAIL'}`);

    // WhatsApp icons/links
    const waLinks = page.locator('a[href*="wa.me"], a[href*="whatsapp"], [aria-label*="WhatsApp" i]');
    console.log(`[5] WhatsApp links/icons: ${await waLinks.count()}`);

    // Email icons
    const mailLinks = page.locator('a[href*="mailto:"], [aria-label*="mail" i], [aria-label*="email" i]');
    console.log(`[5] Email links/icons: ${await mailLinks.count()}`);

    // Heart / Favourite
    const heartBtns = page.locator('button:has(svg.lucide-heart), button[aria-label*="fav" i], [data-feature*="FAVOURITE"], [data-feature*="HEART"]');
    const heartSvgs = page.locator('svg.lucide-heart');
    console.log(`[5] Heart buttons: ${await heartBtns.count()}`);
    console.log(`[5] Heart SVGs: ${await heartSvgs.count()}`);

    // Broader check for any SVG icons on cards
    const svgIcons = page.locator('[class*="rounded"]:has(img) svg');
    console.log(`[5] SVG icons inside card areas: ${await svgIcons.count()}`);

    await page.screenshot({ path: `${SS}/05-cards-detail.png`, fullPage: true });
  });

  // ─── 6. Deal Detail Page ────────────────────────────────────────────────────
  test('6. Deal detail - WhatsApp, Email, earnings estimator', async ({ page }) => {
    await injectAuth(page, authTokens);
    await page.goto(`${BASE}/dashboard/deals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const url = page.url();
    if (url.includes('signin')) {
      console.log('[6] FAIL -- redirected to signin');
      return;
    }

    // Find and click first deal link
    const dealLink = page.locator('a[href*="/dashboard/deals/"]').first();
    const visitBtn = page.getByText(/Visit Listing/i).first();

    let clicked = false;
    if (await dealLink.isVisible().catch(() => false)) {
      const href = await dealLink.getAttribute('href');
      console.log(`[6] Navigating to deal: ${href}`);
      await dealLink.click();
      clicked = true;
    } else if (await visitBtn.isVisible().catch(() => false)) {
      await visitBtn.click();
      clicked = true;
    }

    if (!clicked) {
      console.log('[6] FAIL -- no deal links found on deals page');
      return;
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/06-deal-detail.png`, fullPage: false });

    const detailUrl = page.url();
    console.log(`[6] Detail URL: ${detailUrl}`);

    // WhatsApp button
    const wa = page.locator('a[href*="wa.me"], a[href*="whatsapp"], button:has-text("WhatsApp"), [aria-label*="WhatsApp" i]');
    const waCount = await wa.count();
    console.log(`[6] WhatsApp buttons: ${waCount} ${waCount > 0 ? 'PASS' : 'FAIL'}`);

    // Email button
    const email = page.locator('a[href*="mailto:"], button:has-text("Email"), [aria-label*="email" i]');
    const emailCount = await email.count();
    console.log(`[6] Email buttons: ${emailCount} ${emailCount > 0 ? 'PASS' : 'FAIL'}`);

    // Earnings estimator
    const earn = page.getByText(/earn/i);
    const estimator = page.getByText(/estimat/i);
    const revenue = page.getByText(/revenue/i);
    const profit = page.getByText(/profit/i);
    const monthly = page.getByText(/monthly/i);
    console.log(`[6] "earn" text: ${await earn.count()}`);
    console.log(`[6] "estimat" text: ${await estimator.count()}`);
    console.log(`[6] "revenue" text: ${await revenue.count()}`);
    console.log(`[6] "profit" text: ${await profit.count()}`);
    console.log(`[6] "monthly" text: ${await monthly.count()}`);

    // Scroll down to see full detail
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SS}/06-deal-detail-scrolled.png`, fullPage: false });
    await page.screenshot({ path: `${SS}/06-deal-detail-full.png`, fullPage: true });
  });

  // ─── 7. CRM Page ────────────────────────────────────────────────────────────
  test('7. CRM page - My Deals / My Leads tabs, Kanban', async ({ page }) => {
    await injectAuth(page, authTokens);
    await page.goto(`${BASE}/dashboard/crm`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/07-crm.png`, fullPage: false });

    const url = page.url();
    console.log(`[7] CRM URL: ${url}`);
    if (url.includes('signin')) {
      console.log('[7] FAIL -- redirected to signin');
      return;
    }

    // Tabs: My Deals, My Leads
    const myDeals = page.getByText(/My Deals/i);
    const myLeads = page.getByText(/My Leads/i);
    console.log(`[7] "My Deals" tab: ${await myDeals.isVisible().catch(() => false) ? 'PASS' : 'FAIL'}`);
    console.log(`[7] "My Leads" tab: ${await myLeads.isVisible().catch(() => false) ? 'PASS' : 'FAIL'}`);

    // Kanban columns -- look for typical status headers
    const colHeaders = page.locator('[data-feature*="CRM"], [class*="kanban" i], [class*="column" i]');
    console.log(`[7] Kanban-related elements: ${await colHeaders.count()}`);

    // Common CRM column names
    for (const name of ['New', 'Contacted', 'Viewing', 'Negotiating', 'Won', 'Lost']) {
      const el = page.getByText(new RegExp(`^${name}$`, 'i')).first();
      const vis = await el.isVisible().catch(() => false);
      if (vis) console.log(`[7] Column "${name}": VISIBLE`);
    }

    await page.screenshot({ path: `${SS}/07-crm-full.png`, fullPage: true });
  });

  // ─── 8. University ──────────────────────────────────────────────────────────
  test('8. University page loads', async ({ page }) => {
    await injectAuth(page, authTokens);
    await page.goto(`${BASE}/dashboard/university`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/08-university.png`, fullPage: false });

    const url = page.url();
    console.log(`[8] University URL: ${url}`);
    if (url.includes('signin')) {
      console.log('[8] FAIL -- redirected to signin');
      return;
    }

    // Heading
    const heading = page.locator('h1, h2').first();
    if (await heading.isVisible().catch(() => false)) {
      console.log(`[8] Heading: "${await heading.textContent()}"`);
    }

    // Course/module/lesson references
    const course = page.getByText(/course/i);
    const module = page.getByText(/module/i);
    const lesson = page.getByText(/lesson/i);
    console.log(`[8] "course": ${await course.count()}, "module": ${await module.count()}, "lesson": ${await lesson.count()}`);

    await page.screenshot({ path: `${SS}/08-university-full.png`, fullPage: true });
  });

  // ─── 9. Affiliates ──────────────────────────────────────────────────────────
  test('9. Affiliates page loads', async ({ page }) => {
    await injectAuth(page, authTokens);
    await page.goto(`${BASE}/dashboard/affiliates`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/09-affiliates.png`, fullPage: false });

    const url = page.url();
    console.log(`[9] Affiliates URL: ${url}`);
    if (url.includes('signin')) {
      console.log('[9] FAIL -- redirected to signin');
      return;
    }

    // Heading
    const heading = page.locator('h1, h2').first();
    if (await heading.isVisible().catch(() => false)) {
      console.log(`[9] Heading: "${await heading.textContent()}"`);
    }

    // Affiliate content keywords
    const referral = page.getByText(/referral/i);
    const commission = page.getByText(/commission/i);
    const share = page.getByText(/share/i);
    console.log(`[9] "referral": ${await referral.count()}, "commission": ${await commission.count()}, "share": ${await share.count()}`);

    await page.screenshot({ path: `${SS}/09-affiliates-full.png`, fullPage: true });
  });

  // ─── 10. Settings ───────────────────────────────────────────────────────────
  test('10. Settings page loads', async ({ page }) => {
    await injectAuth(page, authTokens);
    await page.goto(`${BASE}/dashboard/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/10-settings.png`, fullPage: false });

    const url = page.url();
    console.log(`[10] Settings URL: ${url}`);
    if (url.includes('signin')) {
      console.log('[10] FAIL -- redirected to signin');
      return;
    }

    // Heading
    const heading = page.locator('h1, h2').first();
    if (await heading.isVisible().catch(() => false)) {
      console.log(`[10] Heading: "${await heading.textContent()}"`);
    }

    // Profile / account references
    const profile = page.getByText(/profile/i);
    const account = page.getByText(/account/i);
    const nameInputs = page.locator('input[name*="name" i], input[placeholder*="name" i]');
    const emailInputs = page.locator('input[name*="email" i], input[type="email"]');
    console.log(`[10] "profile": ${await profile.count()}, "account": ${await account.count()}`);
    console.log(`[10] Name inputs: ${await nameInputs.count()}, Email inputs: ${await emailInputs.count()}`);

    await page.screenshot({ path: `${SS}/10-settings-full.png`, fullPage: true });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE RESPONSIVE (no auth -- public pages)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('12. Mobile Responsive', () => {
  test('homepage at 390px width', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/12-mobile-homepage.png`, fullPage: false });

    // Navbar visible (static landing uses div#navbar / .nav_fixed)
    const navbar = page.locator('#navbar, .nav_fixed, [data-feature="SHARED__LANDING_NAV"]').first();
    await expect(navbar).toBeVisible({ timeout: 10000 });
    console.log('[12] Mobile navbar: VISIBLE');

    // Heading visible
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    console.log(`[12] Mobile heading: "${await heading.textContent()}"`);

    // No horizontal overflow
    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    console.log(`[12] Scroll width: ${scrollW}, viewport: 390`);
    console.log(`[12] Horizontal overflow: ${scrollW > 400 ? 'YES -- FAIL' : 'NO -- PASS'}`);

    await page.screenshot({ path: `${SS}/12-mobile-homepage-full.png`, fullPage: true });
    await context.close();
  });

  test('deals page at 390px (authed)', async ({ browser }) => {
    // Auth first
    const tokens = await getAuthTokens(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!tokens.access_token) {
      console.log('[12] SKIP -- auth failed');
      return;
    }

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();

    // Inject auth
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
    await page.evaluate(([k, d]) => localStorage.setItem(k, d), [storageKey, sessionData]);

    await page.goto(`${BASE}/dashboard/deals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/12-mobile-deals.png`, fullPage: false });

    const url = page.url();
    console.log(`[12] Mobile deals URL: ${url}`);

    if (url.includes('signin')) {
      console.log('[12] FAIL -- redirected to signin on mobile');
      await context.close();
      return;
    }

    // No horizontal overflow
    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    console.log(`[12] Deals scroll width at 390px: ${scrollW}`);
    console.log(`[12] Horizontal overflow: ${scrollW > 400 ? 'YES -- FAIL' : 'NO -- PASS'}`);

    // Cards stack
    const cards = page.locator('[class*="rounded"]:has(img)');
    console.log(`[12] Cards on mobile deals: ${await cards.count()}`);

    await page.screenshot({ path: `${SS}/12-mobile-deals-full.png`, fullPage: true });
    await context.close();
  });
});
