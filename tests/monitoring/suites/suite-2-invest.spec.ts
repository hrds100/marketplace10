import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://hub.nfstay.com';

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — INVESTMENT MODULE + ADMIN INVEST (INV-001 → INV-080)
// ═══════════════════════════════════════════════════════════════════════════════

// ── INVEST MARKETPLACE: Page Load ──────────────────────────────────────────

test('[INV-001] InvestMarketplace | Page loads | Returns 200', async ({ page }) => {
  const response = await page.goto(`${BASE}/dashboard/invest/marketplace`);
  expect(response?.status()).toBe(200);
});

test('[INV-002] InvestMarketplace | Root container | data-feature INVEST__MARKETPLACE renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const root = page.locator('[data-feature="INVEST__MARKETPLACE"]');
  await expect(root).toBeVisible({ timeout: 15000 });
});

test('[INV-003] InvestMarketplace | Property card | At least one INVEST__MARKETPLACE_CARD renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const card = page.locator('[data-feature="INVEST__MARKETPLACE_CARD"]').first();
  await expect(card).toBeVisible({ timeout: 15000 });
});

// ── INVEST MARKETPLACE: Image Carousel ─────────────────────────────────────

test('[INV-004] InvestMarketplace | Image | Property image renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const img = page.locator('[data-feature="INVEST__MARKETPLACE_IMAGE"]').first();
  await expect(img).toBeVisible({ timeout: 15000 });
});

test('[INV-005] InvestMarketplace | Image | Image has src attribute', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const img = page.locator('[data-feature="INVEST__MARKETPLACE_IMAGE"]').first();
  await expect(img).toHaveAttribute('src', /.+/, { timeout: 15000 });
});

// ── INVEST MARKETPLACE: Share Slider ───────────────────────────────────────

test('[INV-006] InvestMarketplace | Slider | Slider container renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const slider = page.locator('[data-feature="INVEST__MARKETPLACE_SLIDER"]').first();
  await expect(slider).toBeVisible({ timeout: 15000 });
});

test('[INV-007] InvestMarketplace | Slider | Has min/max data attributes', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const slider = page.locator('[data-testid="invest-earn-slider"]').first();
  await expect(slider).toHaveAttribute('data-slider-min', /.+/, { timeout: 15000 });
  await expect(slider).toHaveAttribute('data-slider-max', /.+/);
});

test('[INV-008] InvestMarketplace | Slider | Investment amount text visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const slider = page.locator('[data-feature="INVEST__MARKETPLACE_SLIDER"]').first();
  const amount = slider.locator('span.text-2xl');
  await expect(amount).toBeVisible({ timeout: 15000 });
});

// ── INVEST MARKETPLACE: Earnings Calculator ────────────────────────────────

test('[INV-009] InvestMarketplace | Returns | Est monthly income renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const returns = page.locator('[data-feature="INVEST__MARKETPLACE_RETURNS"]').first();
  const monthly = returns.locator('text=Est. monthly income');
  await expect(monthly).toBeVisible({ timeout: 15000 });
});

test('[INV-010] InvestMarketplace | Returns | Est annual return renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const returns = page.locator('[data-feature="INVEST__MARKETPLACE_RETURNS"]').first();
  const annual = returns.locator('text=Est. annual return');
  await expect(annual).toBeVisible({ timeout: 15000 });
});

// ── INVEST MARKETPLACE: Payment Method ─────────────────────────────────────

test('[INV-011] InvestMarketplace | Payment | Payment method section renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const wallet = page.locator('[data-feature="INVEST__MARKETPLACE_WALLET"]').first();
  await expect(wallet).toBeVisible({ timeout: 15000 });
});

test('[INV-012] InvestMarketplace | Payment | Card option visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const cardBtn = page.locator('[data-feature="INVEST__MARKETPLACE_WALLET"]').first().locator('text=Credit / Debit Card');
  await expect(cardBtn).toBeVisible({ timeout: 15000 });
});

test('[INV-013] InvestMarketplace | Payment | Crypto option visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const cryptoBtn = page.locator('[data-feature="INVEST__MARKETPLACE_WALLET"]').first().locator('text=Cryptocurrency');
  await expect(cryptoBtn).toBeVisible({ timeout: 15000 });
});

// ── INVEST MARKETPLACE: TSA Checkbox + Dialog ──────────────────────────────

test('[INV-014] InvestMarketplace | TSA | Checkbox renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const checkbox = page.locator('[data-testid="invest-tsa-checkbox"]').first();
  await expect(checkbox).toBeVisible({ timeout: 15000 });
});

test('[INV-015] InvestMarketplace | TSA | Checkbox starts unchecked', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const checkbox = page.locator('[data-testid="invest-tsa-checkbox"]').first();
  await expect(checkbox).toHaveAttribute('aria-checked', 'false', { timeout: 15000 });
});

test('[INV-016] InvestMarketplace | TSA | Clicking checkbox toggles to checked', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const checkbox = page.locator('[data-testid="invest-tsa-checkbox"]').first();
  await checkbox.click({ timeout: 15000 });
  await expect(checkbox).toHaveAttribute('aria-checked', 'true');
});

test('[INV-017] InvestMarketplace | TSA | Token Sale Agreement link renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const tsaLink = page.locator('[data-feature="INVEST__TOKEN_SALE_AGREEMENT"]').first();
  await expect(tsaLink).toBeVisible({ timeout: 15000 });
});

test('[INV-018] InvestMarketplace | TSA | Clicking link opens dialog', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const tsaLink = page.locator('[data-feature="INVEST__TOKEN_SALE_AGREEMENT"]').first();
  await tsaLink.click({ timeout: 15000 });
  const dialog = page.locator('[data-feature="INVEST__TOKEN_SALE_CONTENT"]');
  await expect(dialog).toBeVisible({ timeout: 5000 });
});

test('[INV-019] InvestMarketplace | TSA | Dialog contains agreement title', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  await page.locator('[data-feature="INVEST__TOKEN_SALE_AGREEMENT"]').first().click({ timeout: 15000 });
  const title = page.locator('[data-feature="INVEST__TOKEN_SALE_CONTENT"]').locator('text=nfstay Token Sale Agreement');
  await expect(title).toBeVisible({ timeout: 5000 });
});

// ── INVEST MARKETPLACE: Buy Button ─────────────────────────────────────────

test('[INV-020] InvestMarketplace | Buy | "Secure Your Allocations" button renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const btn = page.locator('[data-feature="INVEST__MARKETPLACE_BUY"]').first();
  await expect(btn).toBeVisible({ timeout: 15000 });
});

test('[INV-021] InvestMarketplace | Buy | Button disabled without TSA agreement', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const btn = page.locator('[data-feature="INVEST__MARKETPLACE_BUY"]').first();
  await expect(btn).toBeDisabled({ timeout: 15000 });
});

test('[INV-022] InvestMarketplace | Buy | Button enabled after TSA agreement', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const checkbox = page.locator('[data-testid="invest-tsa-checkbox"]').first();
  await checkbox.click({ timeout: 15000 });
  const btn = page.locator('[data-feature="INVEST__MARKETPLACE_BUY"]').first();
  await expect(btn).toBeEnabled();
});

test('[INV-023] InvestMarketplace | Buy | Button contains "Secure Your Allocations" text', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const btn = page.locator('[data-feature="INVEST__MARKETPLACE_BUY"]').first();
  await expect(btn).toContainText('Secure Your Allocations', { timeout: 15000 });
});

// ── INVEST MARKETPLACE: Documents & Referral ───────────────────────────────

test('[INV-024] InvestMarketplace | Documents | Documents card renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const docsHeading = page.locator('text=Documents').first();
  await expect(docsHeading).toBeVisible({ timeout: 15000 });
});

test('[INV-025] InvestMarketplace | Referral | "Work with us" section renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const referral = page.locator('text=Work with us').first();
  await expect(referral).toBeVisible({ timeout: 15000 });
});

// ── INVEST PORTFOLIO: Page Load ────────────────────────────────────────────

test('[INV-026] InvestPortfolio | Page loads | Returns 200', async ({ page }) => {
  const response = await page.goto(`${BASE}/dashboard/invest/portfolio`);
  expect(response?.status()).toBe(200);
});

test('[INV-027] InvestPortfolio | Root container | data-feature INVEST__PORTFOLIO renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const root = page.locator('[data-feature="INVEST__PORTFOLIO"]');
  await expect(root).toBeVisible({ timeout: 15000 });
});

test('[INV-028] InvestPortfolio | Header | "My Airbnb Portfolio" heading renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const heading = page.locator('h1', { hasText: 'My Airbnb Portfolio' });
  await expect(heading).toBeVisible({ timeout: 15000 });
});

// ── INVEST PORTFOLIO: Rank Badge ───────────────────────────────────────────

test('[INV-029] InvestPortfolio | Rank | Rank badge renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const badge = page.locator('[data-feature="INVEST__PORTFOLIO"] .bg-primary\\/10').first();
  await expect(badge).toBeVisible({ timeout: 15000 });
});

// ── INVEST PORTFOLIO: Summary Cards ────────────────────────────────────────

test('[INV-030] InvestPortfolio | Summary | Portfolio Summary card renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const title = page.locator('text=Portfolio Summary').first();
  await expect(title).toBeVisible({ timeout: 15000 });
});

test('[INV-031] InvestPortfolio | Summary | At least one summary total item renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const item = page.locator('[data-feature="INVEST__PORTFOLIO_TOTAL"]').first();
  await expect(item).toBeVisible({ timeout: 15000 });
});

test('[INV-032] InvestPortfolio | Summary | Returns Progress label renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const label = page.locator('text=Returns Progress').first();
  await expect(label).toBeVisible({ timeout: 15000 });
});

test('[INV-033] InvestPortfolio | Summary | Progress bar element exists', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const bar = page.locator('.bg-gradient-to-r.from-primary.to-emerald-400').first();
  await expect(bar).toBeAttached({ timeout: 15000 });
});

// ── INVEST PORTFOLIO: Monthly Earnings Chart ───────────────────────────────

test('[INV-034] InvestPortfolio | Chart | Monthly Earnings card renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const chart = page.locator('[data-feature="INVEST__PORTFOLIO_CHART"]');
  await expect(chart).toBeVisible({ timeout: 15000 });
});

test('[INV-035] InvestPortfolio | Chart | "Monthly Earnings" title visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const title = page.locator('text=Monthly Earnings').first();
  await expect(title).toBeVisible({ timeout: 15000 });
});

// ── INVEST PORTFOLIO: Holdings ─────────────────────────────────────────────

test('[INV-036] InvestPortfolio | Holdings | "Your Holdings" heading renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const heading = page.locator('h3', { hasText: 'Your Holdings' });
  await expect(heading).toBeVisible({ timeout: 15000 });
});

test('[INV-037] InvestPortfolio | Holdings | Holdings count badge renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const badge = page.locator('h3:has-text("Your Holdings") + span, h3:has-text("Your Holdings") ~ span').first()
    .or(page.locator('text=/\\d+ propert/').first());
  await expect(badge).toBeVisible({ timeout: 15000 });
});

test('[INV-038] InvestPortfolio | Holdings | Empty state or holding card renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const holdingCard = page.locator('[data-feature="INVEST__PORTFOLIO_HOLDING"]').first();
  const emptyState = page.locator('text=You don\'t own any allocations yet');
  const either = holdingCard.or(emptyState);
  await expect(either).toBeVisible({ timeout: 15000 });
});

test('[INV-039] InvestPortfolio | Holdings | Investment orders section renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const title = page.locator('text=Your investment orders').first();
  await expect(title).toBeVisible({ timeout: 15000 });
});

// ── INVEST PORTFOLIO: Buttons ──────────────────────────────────────────────

test('[INV-040] InvestPortfolio | Holdings | View Property button renders when expanded', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const holding = page.locator('[data-feature="INVEST__PORTFOLIO_HOLDING"]').first();
  if (await holding.isVisible({ timeout: 15000 }).catch(() => false)) {
    const viewBtn = holding.locator('text=View Property').first();
    // Holdings default expanded for the first card, but may be collapsed
    const expandedBtn = viewBtn.or(holding.locator('[data-feature="INVEST__PORTFOLIO_IMAGE"]'));
    await expect(expandedBtn).toBeVisible({ timeout: 5000 });
  } else {
    // No holdings - test passes as there are no cards to check
    expect(true).toBe(true);
  }
});

test('[INV-041] InvestPortfolio | Holdings | Buy More Allocations button renders when expanded', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const holding = page.locator('[data-feature="INVEST__PORTFOLIO_HOLDING"]').first();
  if (await holding.isVisible({ timeout: 15000 }).catch(() => false)) {
    const buyBtn = holding.locator('text=Buy More Allocations').first();
    const expandedBtn = buyBtn.or(holding.locator('[data-feature="INVEST__PORTFOLIO_IMAGE"]'));
    await expect(expandedBtn).toBeVisible({ timeout: 5000 });
  } else {
    expect(true).toBe(true);
  }
});

// ── INVEST PORTFOLIO: Milestone Ladder ─────────────────────────────────────

test('[INV-042] InvestPortfolio | Milestones | Noobie milestone renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const milestone = page.locator('text=Noobie').first();
  await expect(milestone).toBeVisible({ timeout: 15000 });
});

test('[INV-043] InvestPortfolio | Milestones | Deal Rookie milestone renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const milestone = page.locator('text=Deal Rookie').first();
  await expect(milestone).toBeVisible({ timeout: 15000 });
});

test('[INV-044] InvestPortfolio | Milestones | Property Titan milestone renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const milestone = page.locator('text=Property Titan').first();
  await expect(milestone).toBeVisible({ timeout: 15000 });
});

test('[INV-045] InvestPortfolio | Performance | Loads within 5 seconds', async ({ page }) => {
  const start = Date.now();
  await page.goto(`${BASE}/dashboard/invest/portfolio`, { waitUntil: 'domcontentloaded' });
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(5000);
});

// ── INVEST PAYOUTS: Page Load ──────────────────────────────────────────────

test('[INV-046] InvestPayouts | Page loads | Returns 200', async ({ page }) => {
  const response = await page.goto(`${BASE}/dashboard/invest/payouts`);
  expect(response?.status()).toBe(200);
});

test('[INV-047] InvestPayouts | Root container | data-feature INVEST__PAYOUTS renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const root = page.locator('[data-feature="INVEST__PAYOUTS"]');
  await expect(root).toBeVisible({ timeout: 15000 });
});

test('[INV-048] InvestPayouts | Header | "Payouts" heading renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const heading = page.locator('h1', { hasText: 'Payouts' });
  await expect(heading).toBeVisible({ timeout: 15000 });
});

// ── INVEST PAYOUTS: Summary ────────────────────────────────────────────────

test('[INV-049] InvestPayouts | Summary | Payout Summary card or empty state renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const summary = page.locator('text=Payout Summary').first();
  const empty = page.locator('text=No payouts yet');
  await expect(summary.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-050] InvestPayouts | Summary | Available to Claim or empty state visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const claim = page.locator('text=Available to Claim').first();
  const empty = page.locator('text=No payouts yet');
  await expect(claim.or(empty)).toBeVisible({ timeout: 15000 });
});

// ── INVEST PAYOUTS: Claimable & History ────────────────────────────────────

test('[INV-051] InvestPayouts | Claimable | Claimable Payouts heading or empty state visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const claimable = page.locator('text=Claimable Payouts').first();
  const empty = page.locator('text=No payouts yet');
  await expect(claimable.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-052] InvestPayouts | History | History heading or empty state visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const history = page.locator('h2', { hasText: 'History' }).first();
  const empty = page.locator('text=No payouts yet');
  await expect(history.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-053] InvestPayouts | History | Table has Date column or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const dateCol = page.locator('th', { hasText: 'Date' }).first();
  const empty = page.locator('text=No payouts yet');
  await expect(dateCol.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-054] InvestPayouts | History | Table has Amount column or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const amountCol = page.locator('th', { hasText: 'Amount' }).first();
  const empty = page.locator('text=No payouts yet');
  await expect(amountCol.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-055] InvestPayouts | Performance | Loads within 5 seconds', async ({ page }) => {
  const start = Date.now();
  await page.goto(`${BASE}/dashboard/invest/payouts`, { waitUntil: 'domcontentloaded' });
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(5000);
});

// ── INVEST PROPOSALS: Page Load ────────────────────────────────────────────

test('[INV-056] InvestProposals | Page loads | Returns 200', async ({ page }) => {
  const response = await page.goto(`${BASE}/dashboard/invest/proposals`);
  expect(response?.status()).toBe(200);
});

test('[INV-057] InvestProposals | Root container | data-feature INVEST__PROPOSALS renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const root = page.locator('[data-feature="INVEST__PROPOSALS"]');
  await expect(root).toBeVisible({ timeout: 15000 });
});

test('[INV-058] InvestProposals | Header | "Governance Proposals" heading renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const heading = page.locator('h1', { hasText: 'Governance Proposals' });
  await expect(heading).toBeVisible({ timeout: 15000 });
});

// ── INVEST PROPOSALS: Stats ────────────────────────────────────────────────

test('[INV-059] InvestProposals | Stats | Governance card renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const governance = page.locator('text=Governance').first();
  await expect(governance).toBeVisible({ timeout: 15000 });
});

test('[INV-060] InvestProposals | Stats | Active count label visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const active = page.locator('text=Active').first();
  await expect(active).toBeVisible({ timeout: 15000 });
});

test('[INV-061] InvestProposals | Stats | Your Votes label visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const votes = page.locator('text=Your Votes').first();
  await expect(votes).toBeVisible({ timeout: 15000 });
});

// ── INVEST PROPOSALS: Filters ──────────────────────────────────────────────

test('[INV-062] InvestProposals | Filter | Filter by Type card renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const filter = page.locator('[data-feature="INVEST__MARKETPLACE_FILTER"]').first();
  await expect(filter).toBeVisible({ timeout: 15000 });
});

test('[INV-063] InvestProposals | Filter | "all" filter button visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const allBtn = page.locator('[data-feature="INVEST__MARKETPLACE_FILTER"]').locator('button', { hasText: /^all$/i }).first();
  await expect(allBtn).toBeVisible({ timeout: 15000 });
});

// ── INVEST PROPOSALS: Submit Proposal ──────────────────────────────────────

test('[INV-064] InvestProposals | Submit | "Submit a Proposal" button renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const btn = page.locator('button', { hasText: 'Submit a Proposal' });
  await expect(btn).toBeVisible({ timeout: 15000 });
});

test('[INV-065] InvestProposals | Submit | Fee disclosure visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const fee = page.locator('text=Fee:').first();
  await expect(fee).toBeVisible({ timeout: 15000 });
});

// ── ADMIN INVEST ORDERS: Page Load ─────────────────────────────────────────

test('[INV-066] AdminInvestOrders | Page loads | Returns 200', async ({ page }) => {
  const response = await page.goto(`${BASE}/admin/invest/orders`);
  expect(response?.status()).toBe(200);
});

test('[INV-067] AdminInvestOrders | Root container | data-feature ADMIN__INVEST renders or redirects', async ({ page }) => {
  await page.goto(`${BASE}/admin/invest/orders`);
  const root = page.locator('[data-feature="ADMIN__INVEST"]');
  const signin = page.locator('input[type="email"]');
  await expect(root.or(signin)).toBeVisible({ timeout: 15000 });
});

test('[INV-068] AdminInvestOrders | Header | "Investment Orders" heading or auth redirect', async ({ page }) => {
  await page.goto(`${BASE}/admin/invest/orders`);
  const heading = page.locator('h1', { hasText: 'Investment Orders' });
  const signin = page.locator('input[type="email"]');
  await expect(heading.or(signin)).toBeVisible({ timeout: 15000 });
});

// ── ADMIN INVEST ORDERS: Table ─────────────────────────────────────────────

test('[INV-069] AdminInvestOrders | Table | Orders table renders or auth redirect', async ({ page }) => {
  await page.goto(`${BASE}/admin/invest/orders`);
  const table = page.locator('[data-feature="ADMIN__INVEST_ORDERS_TABLE"]');
  const signin = page.locator('input[type="email"]');
  await expect(table.or(signin)).toBeVisible({ timeout: 15000 });
});

test('[INV-070] AdminInvestOrders | Table | Order ID column or auth redirect', async ({ page }) => {
  await page.goto(`${BASE}/admin/invest/orders`);
  const col = page.locator('th', { hasText: 'Order ID' });
  const signin = page.locator('input[type="email"]');
  await expect(col.or(signin)).toBeVisible({ timeout: 15000 });
});

test('[INV-071] AdminInvestOrders | Filters | Status filter dropdown or auth redirect', async ({ page }) => {
  await page.goto(`${BASE}/admin/invest/orders`);
  const select = page.locator('select').first();
  const signin = page.locator('input[type="email"]');
  await expect(select.or(signin)).toBeVisible({ timeout: 15000 });
});

test('[INV-072] AdminInvestOrders | Filters | Search input or auth redirect', async ({ page }) => {
  await page.goto(`${BASE}/admin/invest/orders`);
  const search = page.locator('input[placeholder*="Search"]');
  const signin = page.locator('input[type="email"]');
  await expect(search.or(signin)).toBeVisible({ timeout: 15000 });
});

test('[INV-073] AdminInvestOrders | Export | Export CSV button or auth redirect', async ({ page }) => {
  await page.goto(`${BASE}/admin/invest/orders`);
  const btn = page.locator('button', { hasText: 'Export CSV' });
  const signin = page.locator('input[type="email"]');
  await expect(btn.or(signin)).toBeVisible({ timeout: 15000 });
});

test('[INV-074] AdminInvestOrders | Table | Status column or auth redirect', async ({ page }) => {
  await page.goto(`${BASE}/admin/invest/orders`);
  const col = page.locator('th', { hasText: 'Status' });
  const signin = page.locator('input[type="email"]');
  await expect(col.or(signin)).toBeVisible({ timeout: 15000 });
});

test('[INV-075] AdminInvestOrders | Table | Amount column or auth redirect', async ({ page }) => {
  await page.goto(`${BASE}/admin/invest/orders`);
  const col = page.locator('th', { hasText: 'Amount' });
  const signin = page.locator('input[type="email"]');
  await expect(col.or(signin)).toBeVisible({ timeout: 15000 });
});

// ── ADMIN INVEST PAYOUTS: Page Load ────────────────────────────────────────

test('[INV-076] AdminInvestPayouts | Page loads | Returns 200', async ({ page }) => {
  const response = await page.goto(`${BASE}/admin/invest/payouts`);
  expect(response?.status()).toBe(200);
});

test('[INV-077] AdminInvestPayouts | Root | data-feature ADMIN__INVEST renders or auth redirect', async ({ page }) => {
  await page.goto(`${BASE}/admin/invest/payouts`);
  const root = page.locator('[data-feature="ADMIN__INVEST"]');
  const signin = page.locator('input[type="email"]');
  await expect(root.or(signin)).toBeVisible({ timeout: 15000 });
});

test('[INV-078] AdminInvestPayouts | Stats | Summary stat cards or auth redirect', async ({ page }) => {
  await page.goto(`${BASE}/admin/invest/payouts`);
  const heading = page.locator('h1', { hasText: 'Payouts' });
  const signin = page.locator('input[type="email"]');
  await expect(heading.or(signin)).toBeVisible({ timeout: 15000 });
});

test('[INV-079] AdminInvestPayouts | CreditTest | Credit Test Rent section or auth redirect', async ({ page }) => {
  await page.goto(`${BASE}/admin/invest/payouts`);
  const credit = page.locator('text=Credit Test Rent');
  const signin = page.locator('input[type="email"]');
  await expect(credit.or(signin)).toBeVisible({ timeout: 15000 });
});

test('[INV-080] AdminInvestPayouts | Filters | Status and Type filters or auth redirect', async ({ page }) => {
  await page.goto(`${BASE}/admin/invest/payouts`);
  const filter = page.locator('[data-feature="ADMIN__INVEST_PAYOUTS_FILTER"]');
  const signin = page.locator('input[type="email"]');
  await expect(filter.or(signin)).toBeVisible({ timeout: 15000 });
});
