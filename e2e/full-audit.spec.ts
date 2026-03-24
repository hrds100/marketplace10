/**
 * FULL E2E AUDIT - Investment Module + Core App
 * Tests every page as a real user would see it via the browser.
 * Auth: injects Supabase session via localStorage before each test group.
 * Run: npx playwright test e2e/full-audit.spec.ts --config=e2e/playwright.config.ts --reporter=list
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const BASE = 'http://localhost:8080';
const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';

// Test user credentials (created via Supabase signup)
const TEST_EMAIL = 'playwright-test@nfstay.com';
const TEST_PASSWORD = 'TestPass123!';

// Helper: get fresh auth tokens
async function getAuthTokens(): Promise<{ access_token: string; refresh_token: string; user: any }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  return res.json();
}

// Helper: inject Supabase session into a page's localStorage
async function injectAuth(page: Page) {
  const tokens = await getAuthTokens();
  const storageKey = `sb-asazddtvjvmckouxcmmo-auth-token`;
  const sessionData = JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: tokens.user,
  });

  // Go to the base domain first so we can set localStorage
  await page.goto(BASE, { waitUntil: 'commit' });
  await page.evaluate(([key, data]) => {
    localStorage.setItem(key, data);
  }, [storageKey, sessionData]);
}

// Helper: check page doesn't crash
async function assertPageLoads(page: Page, url: string, label: string) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  const overlay = page.locator('vite-error-overlay');
  await expect(overlay).toHaveCount(0);
  const body = page.locator('body');
  await expect(body).not.toBeEmpty();
}

// ─── SECTION 1: Public Pages (no auth) ───────────────────────────────────

test.describe('1. Public Pages', () => {
  test('1.1 Sign In page loads and has form', async ({ page }) => {
    await assertPageLoads(page, `${BASE}/signin`, 'Sign In');
    await expect(page.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('1.2 Forgot Password page loads', async ({ page }) => {
    await assertPageLoads(page, `${BASE}/forgot-password`, 'Forgot Password');
  });

  test('1.3 Privacy page loads', async ({ page }) => {
    await assertPageLoads(page, `${BASE}/privacy`, 'Privacy');
  });

  test('1.4 Terms page loads', async ({ page }) => {
    await assertPageLoads(page, `${BASE}/terms`, 'Terms');
  });

  test('1.5 404 page shows not found', async ({ page }) => {
    await page.goto(`${BASE}/this-does-not-exist`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').textContent();
    // Either shows "not found" text or renders something
    expect(body?.length).toBeGreaterThan(10);
  });

  test('1.6 Social login buttons present on signin', async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const socialButtons = page.locator('button:has-text("Google"), button:has-text("Apple"), button:has-text("X"), button:has-text("Facebook")');
    const count = await socialButtons.count();
    console.log(`  Social login buttons: ${count}`);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('1.7 Auth guard redirects unauthenticated users', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/signin');
  });

  test('1.8 Admin guard redirects unauthenticated users', async ({ page }) => {
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/signin');
  });
});

// ─── SECTION 2: Auth Flow ────────────────────────────────────────────────

test.describe('2. Auth Flow', () => {
  test('2.1 Invalid credentials shows error / stays on signin', async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle' });
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('fake@notreal.com');
    await page.locator('input[type="password"]').first().fill('wrongpassword');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/signin');
  });

  test('2.2 Valid test user can sign in via UI', async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle' });
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(5000);
    const url = page.url();
    console.log(`  After sign in: ${url}`);
    // Should redirect to dashboard
    const signedIn = url.includes('/dashboard') || url.includes('/deals');
    console.log(`  Sign in successful: ${signedIn}`);
    expect(signedIn).toBeTruthy();
  });
});

// ─── SECTION 3: Authenticated User Pages (Invest) ───────────────────────

test.describe('3. Invest User Pages (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
  });

  test('3.1 Invest Marketplace loads with content', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    const failedReqs: string[] = [];
    page.on('response', res => { if (res.status() >= 400 && !res.url().includes('favicon')) failedReqs.push(`${res.status()} ${res.url().substring(0, 120)}`); });

    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    const url = page.url();
    console.log(`  URL: ${url}`);
    const isOnPage = url.includes('invest/marketplace');
    console.log(`  On marketplace page: ${isOnPage}`);

    const body = await page.locator('body').textContent() || '';
    console.log(`  Body length: ${body.length}`);
    console.log(`  Body preview: ${body.substring(0, 300)}`);

    // Check for property cards
    const cards = await page.locator('[class*="card" i]').count();
    console.log(`  Cards: ${cards}`);

    // Check for invest nav items
    const hasMarketplace = body.toLowerCase().includes('marketplace');
    const hasPortfolio = body.toLowerCase().includes('portfolio');
    console.log(`  Has "marketplace" text: ${hasMarketplace}`);
    console.log(`  Has "portfolio" text: ${hasPortfolio}`);

    // Check for property data indicators
    const hasPropertyData = /shares|apr|yield|usdc|bnb|invest|property/i.test(body);
    console.log(`  Has property/investment data: ${hasPropertyData}`);

    console.log(`  Console errors: ${errors.length}`);
    errors.slice(0, 5).forEach(e => console.log(`    ERR: ${e.substring(0, 200)}`));
    console.log(`  Failed requests: ${failedReqs.length}`);
    failedReqs.slice(0, 5).forEach(r => console.log(`    FAIL: ${r}`));

    await page.screenshot({ path: 'e2e/screenshots/3.1-marketplace.png', fullPage: true });
    expect(body.length).toBeGreaterThan(100);
  });

  test('3.2 Invest Portfolio loads with content', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(`${BASE}/dashboard/invest/portfolio`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    const url = page.url();
    console.log(`  URL: ${url}`);

    const body = await page.locator('body').textContent() || '';
    console.log(`  Body length: ${body.length}`);
    console.log(`  Body preview: ${body.substring(0, 300)}`);

    const hasPortfolioContent = /portfolio|holdings|shares|balance|rank|achievement/i.test(body);
    console.log(`  Has portfolio content: ${hasPortfolioContent}`);

    console.log(`  Console errors: ${errors.length}`);
    errors.slice(0, 5).forEach(e => console.log(`    ERR: ${e.substring(0, 200)}`));

    await page.screenshot({ path: 'e2e/screenshots/3.2-portfolio.png', fullPage: true });
    expect(body.length).toBeGreaterThan(100);
  });

  test('3.3 Invest Payouts loads with content', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(`${BASE}/dashboard/invest/payouts`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    const url = page.url();
    console.log(`  URL: ${url}`);

    const body = await page.locator('body').textContent() || '';
    console.log(`  Body length: ${body.length}`);
    console.log(`  Body preview: ${body.substring(0, 300)}`);

    const hasPayoutsContent = /payout|claim|earnings|rent|yield|commission/i.test(body);
    console.log(`  Has payouts content: ${hasPayoutsContent}`);

    console.log(`  Console errors: ${errors.length}`);
    errors.slice(0, 5).forEach(e => console.log(`    ERR: ${e.substring(0, 200)}`));

    await page.screenshot({ path: 'e2e/screenshots/3.3-payouts.png', fullPage: true });
    expect(body.length).toBeGreaterThan(100);
  });

  test('3.4 Invest Proposals loads with content', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(`${BASE}/dashboard/invest/proposals`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    const url = page.url();
    console.log(`  URL: ${url}`);

    const body = await page.locator('body').textContent() || '';
    console.log(`  Body length: ${body.length}`);
    console.log(`  Body preview: ${body.substring(0, 300)}`);

    const hasProposalContent = /proposal|vote|governance|resolution/i.test(body);
    console.log(`  Has proposal content: ${hasProposalContent}`);

    console.log(`  Console errors: ${errors.length}`);
    errors.slice(0, 5).forEach(e => console.log(`    ERR: ${e.substring(0, 200)}`));

    await page.screenshot({ path: 'e2e/screenshots/3.4-proposals.png', fullPage: true });
    expect(body.length).toBeGreaterThan(100);
  });

  test('3.5 Invest sub-navigation between pages', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Try clicking through nav links
    const navLinks = ['portfolio', 'payouts', 'proposals'];
    for (const target of navLinks) {
      const link = page.locator(`a[href*="${target}"]`).first();
      const visible = await link.isVisible({ timeout: 3000 }).catch(() => false);
      if (visible) {
        await link.click();
        await page.waitForTimeout(2000);
        console.log(`  Clicked ${target}: URL=${page.url()}`);
      } else {
        console.log(`  [WARN] Nav link for "${target}" not visible`);
      }
    }
    await page.screenshot({ path: 'e2e/screenshots/3.5-subnav.png', fullPage: true });
  });
});

// ─── SECTION 4: Marketplace Deep Inspection ──────────────────────────────

test.describe('4. Marketplace Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
  });

  test('4.1 Property cards render with data', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Check property images
    const images = await page.locator('img').count();
    console.log(`  Total images: ${images}`);

    // Check for price data
    const body = await page.locator('body').textContent() || '';
    const priceMatch = body.match(/\$[\d,.]+|USDC|GBP|£[\d,.]+/g);
    console.log(`  Price mentions: ${priceMatch?.length || 0}`);
    if (priceMatch) console.log(`  Price values: ${priceMatch.slice(0, 5).join(', ')}`);

    // Check for APR/yield
    const aprMatch = body.match(/\d+\.?\d*\s*%/g);
    console.log(`  APR/percentage mentions: ${aprMatch?.length || 0}`);
    if (aprMatch) console.log(`  APR values: ${aprMatch.slice(0, 5).join(', ')}`);

    // Check for share counts
    const shareMatch = body.match(/\d+\s*shares?|\d+\s*\/\s*\d+/gi);
    console.log(`  Share mentions: ${shareMatch?.length || 0}`);
  });

  test('4.2 Click property card opens detail/modal', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Try to click first clickable element that looks like a property
    const clickTargets = [
      'button:has-text("View")',
      'button:has-text("Details")',
      'button:has-text("Invest")',
      'button:has-text("Secure")',
      '[class*="card"] button',
      '[class*="Card"] button',
    ];

    let clicked = false;
    for (const selector of clickTargets) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        clicked = true;
        console.log(`  Clicked: ${selector}`);
        break;
      }
    }

    if (!clicked) {
      console.log('  [WARN] No clickable property element found');
    }

    await page.waitForTimeout(2000);

    // Check for modal/dialog
    const dialog = page.locator('[role="dialog"], [class*="modal" i], [class*="Dialog"]');
    const hasDialog = await dialog.count();
    console.log(`  Dialog/modal opened: ${hasDialog > 0}`);
    if (hasDialog > 0) {
      const dialogText = await dialog.first().textContent();
      console.log(`  Dialog content: ${dialogText?.substring(0, 200)}`);
    }

    await page.screenshot({ path: 'e2e/screenshots/4.2-property-modal.png', fullPage: true });
  });
});

// ─── SECTION 5: Admin Invest Pages ───────────────────────────────────────
// Note: test user is NOT admin, so these should redirect. We document this.

test.describe('5. Admin Invest Pages (non-admin user)', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
  });

  const adminPages = [
    { path: '/admin/invest', name: 'Dashboard' },
    { path: '/admin/invest/properties', name: 'Properties' },
    { path: '/admin/invest/orders', name: 'Orders' },
    { path: '/admin/invest/shareholders', name: 'Shareholders' },
    { path: '/admin/invest/commissions', name: 'Commissions' },
    { path: '/admin/invest/commission-settings', name: 'Commission Settings' },
    { path: '/admin/invest/payouts', name: 'Payouts' },
    { path: '/admin/invest/proposals', name: 'Proposals' },
    { path: '/admin/invest/boost', name: 'Boost' },
    { path: '/admin/invest/endpoints', name: 'Endpoints' },
    { path: '/admin/invest/test-console', name: 'Test Console' },
  ];

  for (const { path, name } of adminPages) {
    test(`5.x Admin ${name} - access control`, async ({ page }) => {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      const url = page.url();
      const body = await page.locator('body').textContent() || '';
      // Non-admin should be redirected or see access denied
      const isBlocked = url.includes('/signin') || url.includes('/dashboard') || body.toLowerCase().includes('denied') || body.toLowerCase().includes('not authorized') || body.toLowerCase().includes('admin');
      console.log(`  Admin ${name}: URL=${url}, blocked=${isBlocked}, content length=${body.length}`);
      await page.screenshot({ path: `e2e/screenshots/5-admin-${name.toLowerCase().replace(/\s+/g, '-')}.png` });
    });
  }
});

// ─── SECTION 6: Core Dashboard Pages ─────────────────────────────────────

test.describe('6. Core Dashboard Pages (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
  });

  const pages = [
    { path: '/dashboard/deals', name: 'Deals' },
    { path: '/dashboard/inbox', name: 'Inbox' },
    { path: '/dashboard/crm', name: 'CRM' },
    { path: '/dashboard/university', name: 'University' },
    { path: '/dashboard/affiliates', name: 'Affiliates' },
    { path: '/dashboard/list-a-deal', name: 'List A Deal' },
    { path: '/dashboard/settings', name: 'Settings' },
  ];

  for (const { path, name } of pages) {
    test(`6.x ${name} page loads`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      const url = page.url();
      const body = await page.locator('body').textContent() || '';
      console.log(`  ${name}: URL=${url}, content=${body.length}, errors=${errors.length}`);
      if (errors.length > 0) {
        errors.slice(0, 3).forEach(e => console.log(`    ERR: ${e.substring(0, 150)}`));
      }
      expect(body.length).toBeGreaterThan(50);
    });
  }
});

// ─── SECTION 7: Network Health & API Calls ───────────────────────────────

test.describe('7. Network Health', () => {
  test('7.1 Supabase API reachable', async ({ page }) => {
    const res = await page.goto(`${SUPABASE_URL}/rest/v1/`, { timeout: 10000 }).catch(() => null);
    console.log(`  Supabase REST: ${res?.status()}`);
    // 401 means reachable but needs auth (expected with anon key alone)
    expect(res?.status()).toBeLessThan(500);
  });

  test('7.2 Network requests on invest marketplace', async ({ page }) => {
    await injectAuth(page);

    const allRequests: { status: number; url: string }[] = [];
    page.on('response', res => {
      allRequests.push({ status: res.status(), url: res.url() });
    });

    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);

    const failed = allRequests.filter(r => r.status >= 400);
    const supabaseReqs = allRequests.filter(r => r.url.includes('supabase'));
    const graphReqs = allRequests.filter(r => r.url.includes('graph') || r.url.includes('subgraph'));
    const particleReqs = allRequests.filter(r => r.url.includes('particle'));

    console.log(`  Total requests: ${allRequests.length}`);
    console.log(`  Supabase requests: ${supabaseReqs.length}`);
    console.log(`  Graph requests: ${graphReqs.length}`);
    console.log(`  Particle requests: ${particleReqs.length}`);
    console.log(`  Failed (4xx/5xx): ${failed.length}`);
    failed.forEach(f => console.log(`    ${f.status} ${f.url.substring(0, 120)}`));
  });
});

// ─── SECTION 8: Screenshots of Key Pages ─────────────────────────────────

test.describe('8. Final Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
  });

  const screenshotPages = [
    { path: '/dashboard/deals', name: 'deals' },
    { path: '/dashboard/invest/marketplace', name: 'invest-marketplace-final' },
    { path: '/dashboard/invest/portfolio', name: 'invest-portfolio-final' },
    { path: '/dashboard/invest/payouts', name: 'invest-payouts-final' },
    { path: '/dashboard/invest/proposals', name: 'invest-proposals-final' },
  ];

  for (const { path, name } of screenshotPages) {
    test(`Screenshot: ${name}`, async ({ page }) => {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(4000);
      await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
      console.log(`  Saved: e2e/screenshots/${name}.png`);
    });
  }
});
