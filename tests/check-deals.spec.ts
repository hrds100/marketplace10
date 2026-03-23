import { test } from '@playwright/test';

test('Check deals page for blurred photos', async ({ page }) => {
  // Login
  await page.goto('https://hub.nfstay.com/signin', { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('input[type="email"]').first().fill('admin@hub.nfstay.com');
  await page.locator('input[type="password"]').first().fill('NfstayTest2026!');
  await page.locator('button[type="submit"], button:has-text("Sign In")').last().click();
  await page.waitForTimeout(5000);

  await page.goto('https://hub.nfstay.com/dashboard/deals', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'tests/ss/01-deals.png' });

  // Check computed styles on card images
  const results = await page.evaluate(() => {
    const cards = document.querySelectorAll('.card-hover, [class*="rounded-2xl"]');
    const output: any[] = [];
    cards.forEach((card, i) => {
      const img = card.querySelector('img');
      if (!img) return;
      const src = img.src || '';
      if (src.includes('maps.') || src.includes('data:')) return;
      const computed = getComputedStyle(img);
      const filter = computed.filter;
      const style = img.getAttribute('style') || '';
      const isPexels = src.includes('pexels');
      output.push({
        idx: i,
        isPexels,
        filter,
        inlineStyle: style,
        src: src.slice(0, 80),
      });
    });
    return output;
  });

  console.log('\n=== CARD IMAGE ANALYSIS ===');
  results.forEach(r => {
    console.log(`Card ${r.idx}: pexels=${r.isPexels} filter="${r.filter}" style="${r.inlineStyle}" src=${r.src}`);
  });

  // Check for lock overlay
  const lockOverlays = await page.locator('text="Photos on request"').count();
  console.log('\nLock overlays found:', lockOverlays);

  // Check if the JS bundle has the new code
  const hasNewCode = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[src]');
    let jsUrl = '';
    scripts.forEach(s => {
      const src = s.getAttribute('src') || '';
      if (src.includes('index-') && src.endsWith('.js')) jsUrl = src;
    });
    return jsUrl;
  });
  console.log('JS bundle:', hasNewCode);
});
