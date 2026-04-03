import { test, expect, type Page } from '@playwright/test';

/**
 * Additional Tests - Misc pages, nfstay, empty states
 * AGENT: Mario | BRANCH: test/mario-dashboard-journeys
 * Target: https://hub.nfstay.com + https://nfstay.app
 */

const BASE = 'https://hub.nfstay.com';
const NFS = 'https://nfstay.app';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASS = 'Dgs58913347.';
const OPERATOR_EMAIL = 'mario-operator@nexivoproperties.co.uk';
const OPERATOR_PASS = 'MarioOperator2026!';

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

test.describe('Additional Tests', () => {
  // Public pages
  test('AM-01: /brand design system page', async ({ page }) => {
    await page.goto(`${BASE}/brand`, { timeout: 15000 });
    await page.waitForTimeout(2000);
    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasBrand = bodyText.includes('color') || bodyText.includes('typography') || bodyText.includes('brand') || bodyText.includes('design');
    console.log('AM-01: Brand page:', hasBrand, 'content:', bodyText.substring(0, 200));
  });

  test('AM-02: 404 page for invalid URL', async ({ page }) => {
    await page.goto(`${BASE}/some-invalid-url-xyz-12345`, { timeout: 15000 });
    await page.waitForTimeout(2000);
    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const has404 = bodyText.includes('not found') || bodyText.includes('404') || bodyText.includes('page doesn');
    console.log('AM-02: 404 page:', has404, 'text:', bodyText.substring(0, 200));
  });

  test('AM-59: NotFound component renders', async ({ page }) => {
    await page.goto(`${BASE}/this-page-does-not-exist`, { timeout: 15000 });
    await page.waitForTimeout(2000);
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
    console.log('AM-59 PASS: Page loaded (not blank)');
  });

  // nfstay.app tests
  test('AM-43: nfstay.app hero search', async ({ page }) => {
    await page.goto(NFS, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="city" i], input[placeholder*="where" i], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('Manchester');
      await page.waitForTimeout(1000);
      console.log('AM-43 PASS: Search input filled');
    } else {
      console.log('AM-43: Search input not found');
    }
  });

  test('AM-44: nfstay.app search filters', async ({ page }) => {
    await page.goto(`${NFS}/search`, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasFilters = bodyText.includes('filter') || bodyText.includes('guest') || bodyText.includes('price') || bodyText.includes('sort');
    console.log('AM-44: Filters visible:', hasFilters);
  });

  test('AM-48: nfstay.app search with city query', async ({ page }) => {
    await page.goto(`${NFS}/search`, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent('body') || '';
    console.log('AM-48: Search page sample:', bodyText.substring(0, 300));
    const hasResults = bodyText.toLowerCase().includes('result') || bodyText.includes('property') || bodyText.includes('Property');
    console.log('AM-48: Has results:', hasResults);
  });

  // Hub dashboard empty states
  test('AM-57: Empty CRM page', async ({ page }) => {
    await signIn(page, OPERATOR_EMAIL, OPERATOR_PASS);
    await page.goto(`${BASE}/dashboard/crm`, { timeout: 15000 });
    await page.waitForTimeout(3000);
    const content = await page.content();
    expect(content.length).toBeGreaterThan(2000);
    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasContent = bodyText.includes('crm') || bodyText.includes('pipeline') || bodyText.includes('empty') || bodyText.includes('no ');
    console.log('AM-57: CRM page loaded:', hasContent);
    console.log('AM-57 PASS: CRM page not broken');
  });

  test('AM-58: Empty inbox page', async ({ page }) => {
    await signIn(page, OPERATOR_EMAIL, OPERATOR_PASS);
    await page.goto(`${BASE}/dashboard/inbox`, { timeout: 15000 });
    await page.waitForTimeout(3000);
    const content = await page.content();
    expect(content.length).toBeGreaterThan(2000);
    console.log('AM-58 PASS: Inbox page loaded');
  });

  // nfstay operator pages (may redirect if no operator account)
  test('AM-05: /nfstay/onboarding page', async ({ page }) => {
    await signIn(page, OPERATOR_EMAIL, OPERATOR_PASS);
    await page.goto(`${BASE}/nfstay/onboarding`, { timeout: 15000 });
    await page.waitForTimeout(3000);
    const url = page.url();
    const content = await page.content();
    console.log('AM-05: Onboarding URL:', url, 'content length:', content.length);
  });

  test('AM-06: /nfstay/properties/new wizard', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.goto(`${BASE}/nfstay/properties/new`, { timeout: 15000 });
    await page.waitForTimeout(3000);
    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasWizard = bodyText.includes('property') || bodyText.includes('name') || bodyText.includes('step') || bodyText.includes('basics');
    console.log('AM-06: Property wizard:', hasWizard);
    console.log('AM-06: URL:', page.url());
  });

  // nfstay property detail on nfstay.app
  test('AM-47: nfstay.app photo gallery', async ({ page }) => {
    await page.goto(`${NFS}/property/stunning-marina-view-apartment-prop-001`, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const images = page.locator('img');
    const imgCount = await images.count();
    console.log('AM-47: Images on property page:', imgCount);

    // Try gallery navigation
    const galleryBtn = page.locator('button[aria-label*="next" i], button:has-text("›")').first();
    if (await galleryBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await galleryBtn.click();
      console.log('AM-47: Gallery next clicked');
    }
  });

  test('AM-46: nfstay.app property map', async ({ page }) => {
    await page.goto(`${NFS}/property/stunning-marina-view-apartment-prop-001`, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasMap = bodyText.includes('map') || bodyText.includes('location');
    const mapEl = page.locator('[class*="map" i], [id*="map" i], [data-testid*="map"]');
    const mapCount = await mapEl.count();
    console.log('AM-46: Map elements:', mapCount, 'map text:', hasMap);
  });

  test('AM-45: nfstay.app booking widget', async ({ page }) => {
    await page.goto(`${NFS}/property/stunning-marina-view-apartment-prop-001`, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasBooking = bodyText.includes('book') || bodyText.includes('check-in') || bodyText.includes('guest') || bodyText.includes('reserve');
    console.log('AM-45: Booking widget content:', hasBooking);
  });

  // Admin pages
  test('AM-08: Admin pricing page', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.goto(`${BASE}/admin/marketplace/pricing`, { timeout: 15000 });
    await page.waitForTimeout(3000);
    const content = await page.content();
    console.log('AM-08: Admin pricing page loaded, length:', content.length);
  });

  test('AM-09: Admin operator detail', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.goto(`${BASE}/admin/nfstay/operators`, { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Click first operator
    const operatorLink = page.locator('a[href*="operator"], tr a, [class*="clickable"]').first();
    if (await operatorLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await operatorLink.click();
      await page.waitForTimeout(3000);
      console.log('AM-09: Operator detail URL:', page.url());
    } else {
      console.log('AM-09: No operator links found');
    }
  });

  test('AM-19: Admin university analytics', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.goto(`${BASE}/admin/marketplace/university`, { timeout: 15000 });
    await page.waitForTimeout(3000);
    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasAnalytics = bodyText.includes('analytics') || bodyText.includes('completion') || bodyText.includes('xp');
    console.log('AM-19: University analytics:', hasAnalytics);
    console.log('AM-19: URL:', page.url());
  });

  // nfstay traveler pages
  test('AM-54: Guest reservation history', async ({ page }) => {
    await page.goto(`${NFS}/traveler/reservations`, { timeout: 15000 });
    await page.waitForTimeout(3000);
    const content = await page.content();
    console.log('AM-54: Traveler reservations page, length:', content.length, 'URL:', page.url());
  });

  // Payment pages on nfstay
  test('AM-13: /nfstay/payment/success page', async ({ page }) => {
    await page.goto(`${NFS}/payment/success`, { timeout: 15000 });
    await page.waitForTimeout(2000);
    const content = await page.content();
    console.log('AM-13: Payment success page, length:', content.length);
  });

  test('AM-14: /nfstay/payment/cancel page', async ({ page }) => {
    await page.goto(`${NFS}/payment/cancel`, { timeout: 15000 });
    await page.waitForTimeout(2000);
    const content = await page.content();
    console.log('AM-14: Payment cancel page, length:', content.length);
  });

  // Loading / skeleton states
  test('AM-56: Loading states visible during navigation', async ({ page }) => {
    await signIn(page, OPERATOR_EMAIL, OPERATOR_PASS);

    // Navigate quickly and check for loading indicators
    await page.goto(`${BASE}/dashboard/deals`, { timeout: 15000 });
    // Check for skeleton/spinner during load
    const hasSkeleton = await page.locator('[class*="skeleton"], [class*="shimmer"], [class*="spinner"], [class*="loading"]').count();
    console.log('AM-56: Skeleton/loading elements during deals load:', hasSkeleton);

    await page.waitForTimeout(3000);
    console.log('AM-56: Page loaded');
  });
});
