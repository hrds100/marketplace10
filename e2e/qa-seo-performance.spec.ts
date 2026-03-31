import { test, expect } from '@playwright/test';

const BASE = 'https://hub.nfstay.com';
const PAGES = [
  { url: '/', name: 'Homepage' },
  { url: '/sign-in', name: 'Sign In' },
  { url: '/sign-up', name: 'Sign Up' },
  { url: '/privacy', name: 'Privacy' },
  { url: '/terms', name: 'Terms' },
];

test.describe('SEO + Performance Audit', () => {

  for (const page of PAGES) {
    test(`${page.name} - SEO meta tags`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const p = await context.newPage();
      await p.goto(`${BASE}${page.url}`, { waitUntil: 'networkidle', timeout: 30000 });

      // Check title
      const title = await p.title();
      console.log(`[${page.name}] Title: "${title}"`);

      // Check meta description
      const metaDesc = await p.locator('meta[name="description"]').getAttribute('content').catch(() => null);
      console.log(`[${page.name}] Meta description: "${metaDesc || 'MISSING'}"`);

      // Check OG image
      const ogImage = await p.locator('meta[property="og:image"]').getAttribute('content').catch(() => null);
      console.log(`[${page.name}] OG image: "${ogImage || 'MISSING'}"`);

      // Flag generic titles
      if (title?.includes('Vite') || title?.includes('React')) {
        console.log(`❌ [${page.name}] GENERIC TITLE: "${title}"`);
      }

      await context.close();
    });
  }

  test('Homepage - Performance timing', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await context.newPage();
    const startTime = Date.now();
    await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const domReady = Date.now() - startTime;
    console.log(`Homepage DOM ready: ${domReady}ms`);

    await p.waitForLoadState('networkidle').catch(() => {});
    const fullLoad = Date.now() - startTime;
    console.log(`Homepage full load: ${fullLoad}ms`);

    if (fullLoad > 4000) {
      console.log(`❌ SLOW: Homepage took ${fullLoad}ms (>4000ms threshold)`);
    } else {
      console.log(`✅ Homepage load OK: ${fullLoad}ms`);
    }

    // Console errors
    const errors: string[] = [];
    p.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await p.reload({ waitUntil: 'networkidle', timeout: 30000 });
    if (errors.length > 0) {
      console.log(`❌ Console errors on homepage:`);
      errors.forEach(e => console.log(`  - ${e}`));
    } else {
      console.log(`✅ No console errors on homepage`);
    }

    await context.close();
  });

  test('Broken images check', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await context.newPage();
    const brokenImages: string[] = [];

    p.on('response', response => {
      if (response.request().resourceType() === 'image' && response.status() >= 400) {
        brokenImages.push(`${response.url()} (${response.status()})`);
      }
    });

    await p.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });

    if (brokenImages.length > 0) {
      console.log(`❌ Broken images:`);
      brokenImages.forEach(img => console.log(`  - ${img}`));
    } else {
      console.log(`✅ All images loaded OK`);
    }

    await context.close();
  });

  test('Favicon check', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await context.newPage();
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });

    const favicon = await p.locator('link[rel*="icon"]').first().getAttribute('href').catch(() => null);
    console.log(`Favicon: ${favicon || '❌ MISSING'}`);

    await context.close();
  });

  test('robots.txt exists', async ({ browser }) => {
    const context = await browser.newContext();
    const p = await context.newPage();
    const response = await p.goto(`${BASE}/robots.txt`, { timeout: 10000 });
    console.log(`robots.txt: ${response?.status() === 200 ? '✅ exists' : '❌ missing or error (' + response?.status() + ')'}`);
    if (response?.status() === 200) {
      const text = await p.textContent('body');
      console.log(`robots.txt content: ${text?.substring(0, 200)}`);
    }
    await context.close();
  });

  test('sitemap.xml exists', async ({ browser }) => {
    const context = await browser.newContext();
    const p = await context.newPage();
    const response = await p.goto(`${BASE}/sitemap.xml`, { timeout: 10000 });
    console.log(`sitemap.xml: ${response?.status() === 200 ? '✅ exists' : '❌ missing or error (' + response?.status() + ')'}`);
    await context.close();
  });

  test('404 page check', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await context.newPage();
    await p.goto(`${BASE}/this-page-does-not-exist-qa-test`, { waitUntil: 'networkidle', timeout: 30000 });
    const bodyText = await p.textContent('body');
    const has404 = bodyText?.toLowerCase().includes('not found') || bodyText?.toLowerCase().includes('404');
    console.log(`404 page: ${has404 ? '✅ shows 404 content' : '❌ no 404 page'}`);
    await p.screenshot({ path: 'e2e/screenshots/404-page.png' });
    await context.close();
  });

  test('HTTPS check - no mixed content', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await context.newPage();
    const mixedContent: string[] = [];

    p.on('request', req => {
      if (req.url().startsWith('http://') && !req.url().includes('localhost')) {
        mixedContent.push(req.url());
      }
    });

    await p.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });

    if (mixedContent.length > 0) {
      console.log(`❌ Mixed content found:`);
      mixedContent.forEach(url => console.log(`  - ${url}`));
    } else {
      console.log(`✅ HTTPS clean - no mixed content`);
    }

    await context.close();
  });

  test('Navigation links audit', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await context.newPage();
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });

    // Get all internal links
    const links = await p.locator('a[href^="/"], a[href^="https://hub.nfstay.com"]').all();
    const hrefs = new Set<string>();
    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href) hrefs.add(href.replace('https://hub.nfstay.com', ''));
    }

    console.log(`Found ${hrefs.size} unique internal links on homepage`);

    // Test each link (just check they don't 404)
    for (const href of hrefs) {
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
      const fullUrl = href.startsWith('http') ? href : `${BASE}${href}`;
      try {
        const resp = await p.goto(fullUrl, { timeout: 15000, waitUntil: 'commit' });
        if (resp && resp.status() >= 400) {
          console.log(`❌ Broken link: ${href} (${resp.status()})`);
        } else {
          console.log(`✅ Link OK: ${href}`);
        }
      } catch (e) {
        console.log(`⚠️ Link timeout: ${href}`);
      }
    }

    await context.close();
  });
});
