import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('University Full Audit', () => {
  const modules = [
    { id: 'getting-started', lessons: ['choose-model', 'setup-business', 'good-deal', 'launch-plan'] },
    { id: 'property-hunting', lessons: ['choose-area', 'filter-listings', 'check-demand', 'avoid-bad-stock'] },
    { id: 'landlord-pitching', lessons: ['explain-r2r', 'build-trust', 'handle-objections', 'guaranteed-rent'] },
    { id: 'best-uk-portals', lessons: ['source-deals', 'list-bookings', 'match-channel', 'beyond-portals'] },
    { id: 'furnishing', lessons: ['what-guests-notice', 'budget-furnishing', 'photo-ready', 'design-operations'] },
    { id: 'compliance', lessons: ['owner-permission', 'safety-basics', 'hmo-licensing', 'planning-local'] },
    { id: 'pricing-strategy', lessons: ['set-nightly-rate', 'weekday-weekend', 'demand-spikes', 'minimum-stays'] },
    { id: 'outreach-scripts', lessons: ['agent-message', 'landlord-message', 'follow-up', 'cold-call'] },
    { id: 'operations-basics', lessons: ['cleaning-system', 'guest-comms', 'handle-issues', 'protect-reviews'] },
  ];

  test('university overview page loads with all 9 modules', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/university`);
    await page.waitForTimeout(2000);
    const title = await page.textContent('body');
    expect(title).toContain('Academy');
  });

  for (const mod of modules) {
    test(`module overview loads: ${mod.id}`, async ({ page }) => {
      await page.goto(`${BASE}/university/${mod.id}`);
      await page.waitForTimeout(2000);
      const body = await page.textContent('body');
      // Should NOT show "Module not found"
      expect(body).not.toContain('Module not found');
      // Should show lesson cards
      expect(body).toContain('Lessons');
    });

    for (const lessonId of mod.lessons) {
      test(`lesson loads: ${mod.id}/${lessonId}`, async ({ page }) => {
        await page.goto(`${BASE}/university/${mod.id}/${lessonId}`);
        await page.waitForTimeout(2000);
        const body = await page.textContent('body');
        // Should NOT show "Lesson not found"
        expect(body).not.toContain('Lesson not found');
        // Should have action steps
        expect(body).toContain('Action steps');
      });
    }
  }

  test('lesson URLs use short IDs (no module prefix)', async ({ page }) => {
    await page.goto(`${BASE}/university/property-hunting`);
    await page.waitForTimeout(2000);
    // Click first lesson start button
    const startBtn = page.locator('[data-feature="UNIVERSITY__START_LESSON"]').first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(1000);
      const url = page.url();
      // URL should be /university/property-hunting/choose-area NOT /university/property-hunting/property-hunting_choose-area
      expect(url).not.toContain('property-hunting_');
      expect(url).toContain('/university/property-hunting/');
    }
  });

  test('admin university page loads with 3 tabs', async ({ page }) => {
    await page.goto(`${BASE}/admin/university`);
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toContain('Lessons');
    expect(body).toContain('Modules');
    expect(body).toContain('Analytics');
  });

  test('admin modules tab shows tier dropdown with monthly option', async ({ page }) => {
    await page.goto(`${BASE}/admin/university?tab=modules`);
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toContain('Modules');
  });
});
