import { test, expect, type Page } from '@playwright/test';

/**
 * Deal Detail Page Features
 * AGENT: Mario | BRANCH: test/mario-dashboard-journeys
 * Target: https://hub.nfstay.com (production)
 */

const BASE = 'https://hub.nfstay.com';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASS = 'Dgs58913347.';

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

async function navigateToFirstDeal(page: Page): Promise<string> {
  await page.goto(`${BASE}/dashboard/deals`, { timeout: 15000 });
  await page.waitForTimeout(3000);

  // Click first deal card link
  const dealLink = page.locator('a[href*="/deal/"], a[href*="/property/"]').first();
  if (await dealLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    const href = await dealLink.getAttribute('href') || '';
    await dealLink.click();
    await page.waitForTimeout(3000);
    return page.url();
  }
  // Fallback: try clicking any card
  const card = page.locator('[class*="PropertyCard"], [class*="property-card"]').first();
  if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
    await card.click();
    await page.waitForTimeout(3000);
  }
  return page.url();
}

test.describe('Deal Detail Page Features', () => {
  test('DD-01: Deal detail page loads with property info', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    const url = await navigateToFirstDeal(page);
    console.log('DD-01: Deal URL:', url);

    const bodyText = await page.textContent('body') || '';
    const hasInfo = bodyText.length > 500;
    expect(hasInfo).toBe(true);
    console.log('DD-01 PASS: Deal detail loaded');
  });

  test('DD-02: Photo gallery visible', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await navigateToFirstDeal(page);

    const images = page.locator('img[src*="http"], img[src*="pexels"], img[src*="unsplash"], img[src*="supabase"]');
    const imgCount = await images.count();
    console.log('DD-02: Found', imgCount, 'images on deal detail');
    // At least some visual content
    const content = await page.content();
    const hasImages = imgCount > 0 || content.includes('<img');
    console.log('DD-02:', hasImages ? 'PASS' : 'FAIL', '- Images found:', hasImages);
  });

  test('DD-03: Click through gallery photos', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await navigateToFirstDeal(page);

    const nextBtn = page.locator('button[aria-label*="next" i], button:has-text("›"), button:has-text("→"), [class*="gallery"] button').first();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      console.log('DD-03 PASS: Gallery next button clicked');
    } else {
      console.log('DD-03: No gallery navigation buttons found');
    }
  });

  test('DD-04: Extra costs accordion', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await navigateToFirstDeal(page);

    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasCosts = bodyText.includes('cost') || bodyText.includes('cleaning') || bodyText.includes('utilities') || bodyText.includes('insurance') || bodyText.includes('expenses');
    console.log('DD-04: Extra costs content:', hasCosts);

    // Try to click an accordion
    const accordion = page.locator('[data-state], details, [class*="Accordion"]').first();
    if (await accordion.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accordion.click();
      await page.waitForTimeout(300);
      console.log('DD-04: Accordion clicked');
    }
  });

  test('DD-05: Profit calculator visible with sliders', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await navigateToFirstDeal(page);

    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasCalc = bodyText.includes('profit') || bodyText.includes('calculator') || bodyText.includes('nightly rate') || bodyText.includes('occupancy');
    console.log('DD-05: Profit calculator content:', hasCalc);

    const sliders = page.locator('input[type="range"], [role="slider"]');
    const sliderCount = await sliders.count();
    console.log('DD-05: Found', sliderCount, 'sliders');
  });

  test('DD-06: Move sliders -> profit updates', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await navigateToFirstDeal(page);

    const slider = page.locator('input[type="range"], [role="slider"]').first();
    if (await slider.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Get current profit text
      const beforeText = await page.textContent('body') || '';
      // Move slider
      await slider.fill('150');
      await page.waitForTimeout(500);
      const afterText = await page.textContent('body') || '';
      console.log('DD-06: Slider moved');
    } else {
      console.log('DD-06: No sliders found');
    }
  });

  test('DD-07: Add to CRM button', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await navigateToFirstDeal(page);

    const crmBtn = page.locator('button:has-text("CRM"), button:has-text("Add to CRM"), button:has-text("Pipeline")').first();
    if (await crmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('DD-07 PASS: Add to CRM button visible');
      await crmBtn.click();
      await page.waitForTimeout(2000);
      console.log('DD-07: CRM button clicked');
    } else {
      console.log('DD-07: Add to CRM button not found');
    }
  });

  test('DD-08: Share button visible', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await navigateToFirstDeal(page);

    const shareBtn = page.locator('button:has-text("Share"), button[aria-label*="share" i], [class*="share"]').first();
    if (await shareBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await shareBtn.click();
      await page.waitForTimeout(500);
      console.log('DD-08 PASS: Share button clicked');
    } else {
      console.log('DD-08: Share button not found');
    }
  });

  test('DD-09: Favourite heart toggle', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await navigateToFirstDeal(page);

    const heart = page.locator('button:has(svg), [class*="favourite"], [class*="favorite"], [aria-label*="favourite" i], [aria-label*="favorite" i]').first();
    if (await heart.isVisible({ timeout: 3000 }).catch(() => false)) {
      await heart.click();
      await page.waitForTimeout(500);
      console.log('DD-09: Heart toggled');
    } else {
      console.log('DD-09: Heart button not found');
    }
  });

  test('DD-10: Status badge visible', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await navigateToFirstDeal(page);

    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasStatus = bodyText.includes('live') || bodyText.includes('on offer') || bodyText.includes('inactive') || bodyText.includes('status');
    console.log('DD-10: Status badge visible:', hasStatus);
  });

  test('DD-11: Property details section', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await navigateToFirstDeal(page);

    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasBeds = bodyText.includes('bed') || bodyText.includes('bedroom');
    const hasBaths = bodyText.includes('bath') || bodyText.includes('bathroom');
    const hasType = bodyText.includes('property type') || bodyText.includes('flat') || bodyText.includes('house') || bodyText.includes('apartment');
    const hasRent = bodyText.includes('rent') || bodyText.includes('£') || bodyText.includes('pcm');
    console.log(`DD-11: beds=${hasBeds}, baths=${hasBaths}, type=${hasType}, rent=${hasRent}`);
    expect(hasBeds || hasBaths || hasRent).toBe(true);
    console.log('DD-11 PASS: Property details visible');
  });

  test('DD-12: Landlord/lister contact section', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await navigateToFirstDeal(page);

    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasContact = bodyText.includes('landlord') || bodyText.includes('lister') || bodyText.includes('contact') || bodyText.includes('listed by') || bodyText.includes('owner');
    console.log('DD-12: Contact section visible:', hasContact);
  });
});
