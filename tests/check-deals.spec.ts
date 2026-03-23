import { test } from '@playwright/test';

test('Check deals page for blurred photos', async ({ page }) => {
  // Login
  await page.goto('https://hub.nfstay.com/signin', { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('input[type="email"]').first().fill('admin@hub.nfstay.com');
  await page.locator('input[type="password"]').first().fill('NfstayTest2026!');
  await page.locator('button[type="submit"], button:has-text("Sign In")').last().click();
  await page.waitForTimeout(5000);

  // Go to deals
  await page.goto('https://hub.nfstay.com/dashboard/deals', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'tests/ss/01-deals.png' });

  // Check what images are showing
  const allImages = page.locator('img');
  const imgCount = await allImages.count();
  console.log('Total images on page:', imgCount);

  for (let i = 0; i < Math.min(imgCount, 15); i++) {
    const src = await allImages.nth(i).getAttribute('src') || '';
    const classes = await allImages.nth(i).getAttribute('class') || '';
    const hasBlur = classes.includes('blur');
    console.log(`  img[${i}]: blur=${hasBlur} src=${src.slice(0, 80)}`);
  }

  // Check for lock icons
  const locks = await page.locator('text=/Photos on request/i').count();
  console.log('Lock labels found:', locks);

  // Check for blurred class
  const blurred = await page.locator('.blur-\\[8px\\]').count();
  console.log('Blurred images:', blurred);

  // Check property card structure
  const cards = await page.locator('.card-hover').count();
  console.log('Property cards:', cards);

  // Get all property names visible
  const bodyText = await page.locator('body').textContent();
  const propNames = bodyText?.match(/Property #\d+|[\d]+-Bed[^<]*/g) || [];
  console.log('Property names:', propNames.slice(0, 10));

  // Check what the usePropertyImage hook resolved
  const cardImages = page.locator('.card-hover img, [class*="rounded-2xl"] img');
  const cardImgCount = await cardImages.count();
  console.log('\nCard images specifically:');
  for (let i = 0; i < cardImgCount; i++) {
    const src = await cardImages.nth(i).getAttribute('src') || '';
    const cls = await cardImages.nth(i).getAttribute('class') || '';
    console.log(`  card-img[${i}]: blur=${cls.includes('blur')} pexels=${src.includes('pexels')} placeholder=${src.includes('placehold')} src=${src.slice(0, 100)}`);
  }

  // Scroll down
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/ss/02-deals-scrolled.png' });
});
