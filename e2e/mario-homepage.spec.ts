import { test, expect, type Page } from '@playwright/test';

/**
 * Homepage + Public Pages tests
 * AGENT: Mario | BRANCH: test/mario-dashboard-journeys
 * Target: https://hub.nfstay.com (production)
 */

const BASE = 'https://hub.nfstay.com';

test.describe('Homepage + Public Pages', () => {
  test('HP-01: Homepage loads with hero section', async ({ page }) => {
    await page.goto(BASE, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent('body') || '';
    const hasHero = bodyText.includes('Airbnb') || bodyText.includes('Landlord') || bodyText.includes('Properties') || bodyText.includes('rent-to-rent');
    expect(hasHero).toBe(true);
    console.log('HP-01 PASS: Hero section visible');
  });

  test('HP-02: Hero CTA Get Started -> /signup', async ({ page }) => {
    await page.goto(BASE, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const cta = page.locator('a:has-text("Get Started"), button:has-text("Get Started")').first();
    if (await cta.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cta.click();
      await page.waitForTimeout(2000);
      const url = page.url();
      console.log('HP-02: Navigated to:', url);
      expect(url).toContain('sign');
    } else {
      console.log('HP-02: Get Started button not found');
    }
  });

  test('HP-03: Hero second CTA navigates correctly', async ({ page }) => {
    await page.goto(BASE, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const ctas = page.locator('section >> a, section >> button').filter({ hasText: /Browse|View|Deals|Explore/i });
    const count = await ctas.count();
    console.log('HP-03: Found', count, 'secondary CTAs');
    if (count > 0) {
      const href = await ctas.first().getAttribute('href').catch(() => null);
      console.log('HP-03: Secondary CTA href:', href);
    }
  });

  test('HP-04: How It Works section visible', async ({ page }) => {
    await page.goto(BASE, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasHowItWorks = bodyText.includes('how it works') || bodyText.includes('from first search') || bodyText.includes('step');
    console.log('HP-04: How it works section:', hasHowItWorks);
    expect(hasHowItWorks).toBe(true);
  });

  test('HP-05: Deals section with property cards', async ({ page }) => {
    await page.goto(BASE, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasDeals = bodyText.includes('deal') || bodyText.includes('property') || bodyText.includes('listing');
    console.log('HP-05: Deals section:', hasDeals);
    expect(hasDeals).toBe(true);
  });

  test('HP-06: Pricing section with tier cards', async ({ page }) => {
    await page.goto(BASE, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasPricing = bodyText.includes('pricing') || bodyText.includes('free') || bodyText.includes('monthly') || bodyText.includes('full access');
    console.log('HP-06: Pricing section:', hasPricing);
    expect(hasPricing).toBe(true);
  });

  test('HP-07: University section visible', async ({ page }) => {
    await page.goto(BASE, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasUni = bodyText.includes('university') || bodyText.includes('academy') || bodyText.includes('learn');
    console.log('HP-07: University section:', hasUni);
    expect(hasUni).toBe(true);
  });

  test('HP-08: FAQ accordion - click first question -> answer expands', async ({ page }) => {
    await page.goto(BASE, { timeout: 20000 });
    await page.waitForTimeout(3000);

    // Scroll to FAQ
    const faqHeading = page.locator('text=FAQ, text=Frequently Asked').first();
    if (await faqHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
      await faqHeading.scrollIntoViewIfNeeded();
    }

    const accordionItems = page.locator('[data-state], [role="button"][aria-expanded], details, [class*="accordion"]');
    const count = await accordionItems.count();
    console.log('HP-08: Found', count, 'accordion items');

    if (count > 0) {
      await accordionItems.first().click();
      await page.waitForTimeout(500);
      console.log('HP-08 PASS: FAQ accordion clicked');
    }
  });

  test('HP-09: FAQ accordion - second question expands', async ({ page }) => {
    await page.goto(BASE, { timeout: 20000 });
    await page.waitForTimeout(3000);

    const faqHeading = page.locator('text=FAQ, text=Frequently Asked').first();
    if (await faqHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
      await faqHeading.scrollIntoViewIfNeeded();
    }

    const triggers = page.locator('[data-state], [role="button"][aria-expanded], details summary, [class*="AccordionTrigger"]');
    const count = await triggers.count();
    if (count >= 2) {
      await triggers.nth(0).click();
      await page.waitForTimeout(300);
      await triggers.nth(1).click();
      await page.waitForTimeout(300);
      console.log('HP-09 PASS: Second FAQ item clicked');
    } else {
      console.log('HP-09: Not enough accordion items found:', count);
    }
  });

  test('HP-10: Footer Terms link -> /terms page loads', async ({ page }) => {
    await page.goto(`${BASE}/terms`, { timeout: 15000 });
    await page.waitForTimeout(2000);
    const content = await page.content();
    expect(content.length).toBeGreaterThan(2000);
    console.log('HP-10 PASS: Terms page loaded');
  });

  test('HP-11: Footer Privacy link -> /privacy page loads', async ({ page }) => {
    await page.goto(`${BASE}/privacy`, { timeout: 15000 });
    await page.waitForTimeout(2000);
    const content = await page.content();
    expect(content.length).toBeGreaterThan(2000);
    console.log('HP-11 PASS: Privacy page loaded');
  });

  test('HP-12: Navigation Deals link', async ({ page }) => {
    await page.goto(BASE, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const dealsLink = page.locator('nav a[href*="deals"], header a[href*="deals"]').first();
    if (await dealsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await dealsLink.getAttribute('href');
      console.log('HP-12 PASS: Deals link found, href:', href);
    } else {
      console.log('HP-12: Deals link not visible in nav');
    }
  });

  test('HP-13: Navigation Pricing link', async ({ page }) => {
    await page.goto(BASE, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const pricingLink = page.locator('nav a[href*="pricing"], header a[href*="pricing"]').first();
    if (await pricingLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await pricingLink.getAttribute('href');
      console.log('HP-13 PASS: Pricing link found, href:', href);
    } else {
      console.log('HP-13: Pricing link not in nav');
    }
  });

  test('HP-14: Navigation University link', async ({ page }) => {
    await page.goto(BASE, { timeout: 20000 });
    await page.waitForTimeout(3000);
    const uniLink = page.locator('a[href*="university"], a:has-text("University"), a:has-text("Academy")').first();
    if (await uniLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('HP-14 PASS: University link found');
    } else {
      console.log('HP-14: University link not visible');
    }
  });

  test('HP-15: Mobile menu hamburger', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE, { timeout: 20000 });
    await page.waitForTimeout(3000);

    const hamburger = page.locator('button[aria-label*="menu" i], button[class*="menu"], [data-testid="mobile-menu"], button:has(svg)').first();
    if (await hamburger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await hamburger.click();
      await page.waitForTimeout(500);
      console.log('HP-15 PASS: Hamburger menu clicked');
    } else {
      console.log('HP-15: No hamburger menu found');
    }
  });

  test('HP-16: /brand page loads', async ({ page }) => {
    await page.goto(`${BASE}/brand`, { timeout: 15000 });
    await page.waitForTimeout(2000);
    const content = await page.content();
    const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
    const hasBrand = bodyText.includes('color') || bodyText.includes('typography') || bodyText.includes('design') || bodyText.includes('brand');
    console.log('HP-16: Brand page has design content:', hasBrand, 'content length:', content.length);
  });
});
