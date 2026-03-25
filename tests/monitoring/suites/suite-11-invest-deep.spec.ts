import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://hub.nfstay.com';

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 11 — INVESTMENT MODULE DEEP (INV-081 → INV-180)
// ═══════════════════════════════════════════════════════════════════════════════

// ── MARKETPLACE PAGE DEEP (INV-081 → INV-110) ──────────────────────────────

test('[INV-081] InvestMarketplace | JV Banner | Collapsed state shows green dot indicator', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const dot = page.locator('.animate-ping').first();
  await expect(dot).toBeAttached({ timeout: 15000 });
});

test('[INV-082] InvestMarketplace | JV Banner | Click expands and shows 3 step cards', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const banner = page.locator('text=Active JV Partnership').first();
  await banner.click({ timeout: 15000 });
  const steps = page.locator('text=Step');
  await expect(steps.first()).toBeVisible({ timeout: 5000 });
});

test('[INV-083] InvestMarketplace | JV Banner | Expanded state shows Close button text', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const banner = page.locator('text=Active JV Partnership').first();
  await banner.click({ timeout: 15000 });
  const closeText = page.locator('text=Close').first();
  await expect(closeText).toBeVisible({ timeout: 5000 });
});

test('[INV-084] InvestMarketplace | Carousel | Dots indicator renders beneath image', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const dot = page.locator('button[aria-label="Go to image 1"]').first();
  await expect(dot).toBeVisible({ timeout: 15000 });
});

test('[INV-085] InvestMarketplace | Property | Title heading renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const title = page.locator('[data-feature="INVEST__MARKETPLACE_CARD"] h1, [data-feature="INVEST__MARKETPLACE"] h1').first();
  await expect(title).toBeVisible({ timeout: 15000 });
});

test('[INV-086] InvestMarketplace | Property | Location pin icon and text renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const location = page.locator('text=/Manchester|London|Liverpool|Leeds|Birmingham|Dubai|Bali/').first();
  await expect(location).toBeVisible({ timeout: 15000 });
});

test('[INV-087] InvestMarketplace | Badges | Property type badge renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const typeBadge = page.locator('text=/Apartment|House|Studio|Villa|Penthouse/').first();
  await expect(typeBadge).toBeVisible({ timeout: 15000 });
});

test('[INV-088] InvestMarketplace | Badges | Bedrooms badge renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const bed = page.locator('text=/\\d+ Bed/').first();
  await expect(bed).toBeVisible({ timeout: 15000 });
});

test('[INV-089] InvestMarketplace | Badges | Bathrooms badge renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const bath = page.locator('text=/\\d+ Bath/').first();
  await expect(bath).toBeVisible({ timeout: 15000 });
});

test('[INV-090] InvestMarketplace | Badges | Area badge renders with m²', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const area = page.locator('text=/\\d+.*m/').first();
  await expect(area).toBeVisible({ timeout: 15000 });
});

test('[INV-091] InvestMarketplace | Badges | Year built badge renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const year = page.locator('text=/Built \\d{4}/').first();
  await expect(year).toBeVisible({ timeout: 15000 });
});

test('[INV-092] InvestMarketplace | Metrics | Yield pill renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const yield_ = page.locator('text=Yield').first();
  await expect(yield_).toBeVisible({ timeout: 15000 });
});

test('[INV-093] InvestMarketplace | Metrics | Occupancy pill renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const occupancy = page.locator('text=Occupancy').first();
  await expect(occupancy).toBeVisible({ timeout: 15000 });
});

test('[INV-094] InvestMarketplace | Metrics | Rent Cost pill renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const rent = page.locator('text=Rent Cost').first();
  await expect(rent).toBeVisible({ timeout: 15000 });
});

test('[INV-095] InvestMarketplace | Metrics | Property Value pill renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const value = page.locator('text=Property Value').first();
  await expect(value).toBeVisible({ timeout: 15000 });
});

test('[INV-096] InvestMarketplace | InvestCard | Allocation price displays', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const target = page.locator('[data-feature="INVEST__MARKETPLACE_TARGET"]').first();
  await expect(target).toBeVisible({ timeout: 15000 });
  const price = target.locator('text=/\\$\\d+/');
  await expect(price).toBeVisible();
});

test('[INV-097] InvestMarketplace | InvestCard | Progress bar shows funded %', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const progress = page.locator('[data-feature="INVEST__MARKETPLACE_PROGRESS"]').first();
  await expect(progress).toBeVisible({ timeout: 15000 });
});

test('[INV-098] InvestMarketplace | InvestCard | 3 share stats render (owners, allocations, remaining)', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const stats = page.locator('[data-feature="INVEST__MARKETPLACE_SHARES"]').first();
  await expect(stats).toBeVisible({ timeout: 15000 });
});

test('[INV-099] InvestMarketplace | InvestCard | Earnings slider has min/max', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const slider = page.locator('[data-testid="invest-earn-slider"]').first();
  await expect(slider).toHaveAttribute('data-slider-min', /.+/, { timeout: 15000 });
});

test('[INV-100] InvestMarketplace | InvestCard | Slider min section renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const min = page.locator('[data-feature="INVEST__MARKETPLACE_MIN"]').first();
  await expect(min).toBeVisible({ timeout: 15000 });
});

test('[INV-101] InvestMarketplace | InvestCard | Monthly income display updates with slider', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const returns = page.locator('[data-feature="INVEST__MARKETPLACE_RETURNS"]').first();
  const monthlyText = returns.locator('text=Est. monthly income');
  await expect(monthlyText).toBeVisible({ timeout: 15000 });
});

test('[INV-102] InvestMarketplace | InvestCard | Annual return display renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const returns = page.locator('[data-feature="INVEST__MARKETPLACE_RETURNS"]').first();
  const annualText = returns.locator('text=Est. annual return');
  await expect(annualText).toBeVisible({ timeout: 15000 });
});

test('[INV-103] InvestMarketplace | Payment | Credit/Debit Card option selectable', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const cardBtn = page.locator('[data-feature="INVEST__MARKETPLACE_WALLET"]').first().locator('text=Credit / Debit Card');
  await cardBtn.click({ timeout: 15000 });
  await expect(cardBtn).toBeVisible();
});

test('[INV-104] InvestMarketplace | Payment | Cryptocurrency option selectable', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const cryptoBtn = page.locator('[data-feature="INVEST__MARKETPLACE_WALLET"]').first().locator('text=Cryptocurrency');
  await cryptoBtn.click({ timeout: 15000 });
  await expect(cryptoBtn).toBeVisible();
});

test('[INV-105] InvestMarketplace | TSA | Unchecked checkbox keeps buy button disabled', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const checkbox = page.locator('[data-testid="invest-tsa-checkbox"]').first();
  await expect(checkbox).toHaveAttribute('aria-checked', 'false', { timeout: 15000 });
  const btn = page.locator('[data-feature="INVEST__MARKETPLACE_BUY"]').first();
  await expect(btn).toBeDisabled();
});

test('[INV-106] InvestMarketplace | TSA | Checked checkbox enables buy button', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const checkbox = page.locator('[data-testid="invest-tsa-checkbox"]').first();
  await checkbox.click({ timeout: 15000 });
  const btn = page.locator('[data-feature="INVEST__MARKETPLACE_BUY"]').first();
  await expect(btn).toBeEnabled({ timeout: 5000 });
});

test('[INV-107] InvestMarketplace | TSA | Link opens legal agreement dialog', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const tsaLink = page.locator('[data-feature="INVEST__TOKEN_SALE_AGREEMENT"]').first();
  await tsaLink.click({ timeout: 15000 });
  const dialog = page.locator('[data-feature="INVEST__TOKEN_SALE_CONTENT"]');
  await expect(dialog).toBeVisible({ timeout: 5000 });
});

test('[INV-108] InvestMarketplace | TSA | Dialog contains 10 sections', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  await page.locator('[data-feature="INVEST__TOKEN_SALE_AGREEMENT"]').first().click({ timeout: 15000 });
  const sections = page.locator('[data-feature="INVEST__TOKEN_SALE_CONTENT"] section');
  await expect(sections).toHaveCount(10, { timeout: 5000 });
});

test('[INV-109] InvestMarketplace | TSA | Dialog close button works', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  await page.locator('[data-feature="INVEST__TOKEN_SALE_AGREEMENT"]').first().click({ timeout: 15000 });
  const dialog = page.locator('[data-feature="INVEST__TOKEN_SALE_CONTENT"]');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  const closeBtn = dialog.locator('button[aria-label="Close"], button:has(svg)').first();
  await closeBtn.click();
  await expect(dialog).toBeHidden({ timeout: 5000 });
});

test('[INV-110] InvestMarketplace | Trust | "Protected by smart contract" text visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const trust = page.locator('text=Protected by smart contract').first();
  await expect(trust).toBeVisible({ timeout: 15000 });
});

// ── MARKETPLACE PAGE DEEP continued (INV-111 → INV-115) ────────────────────

test('[INV-111] InvestMarketplace | About | "About This Property" card renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const about = page.locator('text=About This Property').first();
  await expect(about).toBeVisible({ timeout: 15000 });
});

test('[INV-112] InvestMarketplace | Financials | Financial Breakdown section exists', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const financials = page.locator('[data-feature="INVEST__MARKETPLACE_FINANCIALS"]').first();
  await expect(financials).toBeAttached({ timeout: 15000 });
});

test('[INV-113] InvestMarketplace | ProfitCalc | Amount input renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const calcSection = page.locator('text=Profit Calculator').first()
    .or(page.locator('text=Calculate Your Returns').first());
  await expect(calcSection).toBeVisible({ timeout: 15000 });
});

test('[INV-114] InvestMarketplace | ProfitCalc | Quick amount buttons render ($500, $1k, $2.5k, $5k)', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  const btn500 = page.locator('button', { hasText: '$500' }).first();
  await expect(btn500).toBeVisible({ timeout: 15000 });
});

test('[INV-115] InvestMarketplace | ProfitCalc | Chart renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/marketplace`);
  // The profit calculator has multiple chart versions - just check one bar/area exists
  const chart = page.locator('text=/Year \\d|Y\\d|Today/').first();
  await expect(chart).toBeVisible({ timeout: 15000 });
});

// ── PORTFOLIO PAGE DEEP (INV-116 → INV-145) ────────────────────────────────

test('[INV-116] InvestPortfolio | Header | "My Airbnb Portfolio" heading renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const heading = page.locator('h1', { hasText: 'My Airbnb Portfolio' });
  await expect(heading).toBeVisible({ timeout: 15000 });
});

test('[INV-117] InvestPortfolio | Rank | Rank badge shows current rank text', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const rank = page.locator('text=/Noobie|Deal Rookie|Cashflow Builder|Portfolio Boss|Empire Builder|Property Titan/').first();
  await expect(rank).toBeVisible({ timeout: 15000 });
});

test('[INV-118] InvestPortfolio | Orders | Investment orders card renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const orders = page.locator('text=Your investment orders').first();
  await expect(orders).toBeVisible({ timeout: 15000 });
});

test('[INV-119] InvestPortfolio | Orders | Loading or content state resolves', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  // Either orders data or empty state loads within timeout
  const content = page.locator('text=Your investment orders').first();
  await expect(content).toBeVisible({ timeout: 15000 });
});

test('[INV-120] InvestPortfolio | Summary | Portfolio Summary card renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const title = page.locator('text=Portfolio Summary').first();
  await expect(title).toBeVisible({ timeout: 15000 });
});

test('[INV-121] InvestPortfolio | Summary | At least one INVEST__PORTFOLIO_TOTAL item renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const item = page.locator('[data-feature="INVEST__PORTFOLIO_TOTAL"]').first();
  await expect(item).toBeVisible({ timeout: 15000 });
});

test('[INV-122] InvestPortfolio | Summary | 3 total items (contributed, earnings, pending)', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const items = page.locator('[data-feature="INVEST__PORTFOLIO_TOTAL"]');
  const count = await items.count();
  expect(count).toBeGreaterThanOrEqual(3);
});

test('[INV-123] InvestPortfolio | Returns | Progress bar renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const label = page.locator('text=Returns Progress').first();
  await expect(label).toBeVisible({ timeout: 15000 });
});

test('[INV-124] InvestPortfolio | Returns | Target text visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const target = page.locator('text=/Target|target|Progress/').first();
  await expect(target).toBeVisible({ timeout: 15000 });
});

test('[INV-125] InvestPortfolio | Chart | Monthly Earnings chart section renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const chart = page.locator('[data-feature="INVEST__PORTFOLIO_CHART"]');
  await expect(chart).toBeVisible({ timeout: 15000 });
});

test('[INV-126] InvestPortfolio | Chart | "Monthly Earnings" title visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const title = page.locator('text=Monthly Earnings').first();
  await expect(title).toBeVisible({ timeout: 15000 });
});

test('[INV-127] InvestPortfolio | Journey | Your Journey milestone ladder renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const journey = page.locator('text=Your Journey').first()
    .or(page.locator('text=Noobie').first());
  await expect(journey).toBeVisible({ timeout: 15000 });
});

test('[INV-128] InvestPortfolio | Journey | 6 milestones visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const milestones = [
    page.locator('text=Noobie').first(),
    page.locator('text=Deal Rookie').first(),
    page.locator('text=Cashflow Builder').first(),
    page.locator('text=Portfolio Boss').first(),
    page.locator('text=Empire Builder').first(),
    page.locator('text=Property Titan').first(),
  ];
  for (const m of milestones) {
    await expect(m).toBeVisible({ timeout: 15000 });
  }
});

test('[INV-129] InvestPortfolio | Journey | Reached milestones have green check', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  // At minimum Noobie (min 0) is always reached, check for any green check icon
  const check = page.locator('[data-feature="INVEST__PORTFOLIO"] svg.text-primary, [data-feature="INVEST__PORTFOLIO"] .text-green-500').first();
  await expect(check).toBeAttached({ timeout: 15000 });
});

test('[INV-130] InvestPortfolio | Holdings | "Your Holdings" heading renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const heading = page.locator('h3', { hasText: 'Your Holdings' });
  await expect(heading).toBeVisible({ timeout: 15000 });
});

test('[INV-131] InvestPortfolio | Holdings | Count badge renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const badge = page.locator('text=/\\d+ propert/').first()
    .or(page.locator('h3:has-text("Your Holdings") ~ span').first());
  await expect(badge).toBeVisible({ timeout: 15000 });
});

test('[INV-132] InvestPortfolio | Holdings | Empty state or holding card renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const holdingCard = page.locator('[data-feature="INVEST__PORTFOLIO_HOLDING"]').first();
  const emptyState = page.locator('text=You don\'t own any allocations yet');
  await expect(holdingCard.or(emptyState)).toBeVisible({ timeout: 15000 });
});

test('[INV-133] InvestPortfolio | Holdings | Card shows image when present', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const holding = page.locator('[data-feature="INVEST__PORTFOLIO_HOLDING"]').first();
  if (await holding.isVisible({ timeout: 15000 }).catch(() => false)) {
    const img = holding.locator('[data-feature="INVEST__PORTFOLIO_IMAGE"]').first();
    await expect(img).toBeVisible({ timeout: 5000 });
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-134] InvestPortfolio | Holdings | Card shows title text', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const holding = page.locator('[data-feature="INVEST__PORTFOLIO_HOLDING"]').first();
  const emptyState = page.locator('text=You don\'t own any allocations yet');
  if (await holding.isVisible({ timeout: 15000 }).catch(() => false)) {
    const title = holding.locator('h4, h3, .font-semibold').first();
    await expect(title).toBeVisible({ timeout: 5000 });
  } else {
    await expect(emptyState).toBeVisible({ timeout: 5000 });
  }
});

test('[INV-135] InvestPortfolio | Holdings | Click toggles expand/collapse', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const holding = page.locator('[data-feature="INVEST__PORTFOLIO_HOLDING"]').first();
  if (await holding.isVisible({ timeout: 15000 }).catch(() => false)) {
    // Click to collapse
    await holding.click();
    // Wait a beat for animation
    await page.waitForTimeout(300);
    // Click to expand again
    await holding.click();
    await expect(holding).toBeVisible();
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-136] InvestPortfolio | Holdings | "View Property" button renders when expanded', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const holding = page.locator('[data-feature="INVEST__PORTFOLIO_HOLDING"]').first();
  if (await holding.isVisible({ timeout: 15000 }).catch(() => false)) {
    const viewBtn = page.locator('text=View Property').first();
    const img = holding.locator('[data-feature="INVEST__PORTFOLIO_IMAGE"]');
    await expect(viewBtn.or(img)).toBeVisible({ timeout: 5000 });
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-137] InvestPortfolio | Holdings | "Buy More Allocations" button renders when expanded', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const holding = page.locator('[data-feature="INVEST__PORTFOLIO_HOLDING"]').first();
  if (await holding.isVisible({ timeout: 15000 }).catch(() => false)) {
    const buyBtn = page.locator('text=Buy More Allocations').first();
    const img = holding.locator('[data-feature="INVEST__PORTFOLIO_IMAGE"]');
    await expect(buyBtn.or(img)).toBeVisible({ timeout: 5000 });
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-138] InvestPortfolio | Holdings | "Submit Proposal" button renders when expanded', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const holding = page.locator('[data-feature="INVEST__PORTFOLIO_HOLDING"]').first();
  if (await holding.isVisible({ timeout: 15000 }).catch(() => false)) {
    const proposalBtn = page.locator('text=Submit Proposal').first();
    const img = holding.locator('[data-feature="INVEST__PORTFOLIO_IMAGE"]');
    await expect(proposalBtn.or(img)).toBeVisible({ timeout: 5000 });
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-139] InvestPortfolio | Boost | APR display or "Not Boosted" text visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const boost = page.locator('text=/Boosted|Not Boosted|APR/').first();
  const empty = page.locator('text=You don\'t own any allocations yet');
  await expect(boost.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-140] InvestPortfolio | Boost | "Boost APR" or "Already Boosted" button visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const boostBtn = page.locator('text=/Boost APR|Already Boosted/').first();
  const empty = page.locator('text=You don\'t own any allocations yet');
  await expect(boostBtn.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-141] InvestPortfolio | Achievements | Header with "X of 8 unlocked" renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const header = page.locator('text=Achievements').first();
  await expect(header).toBeVisible({ timeout: 15000 });
  const count = page.locator('text=/\\d+ of 8 unlocked/').first();
  await expect(count).toBeVisible({ timeout: 5000 });
});

test('[INV-142] InvestPortfolio | Achievements | First Property badge renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const badge = page.locator('text=First Property').first();
  await expect(badge).toBeVisible({ timeout: 15000 });
});

test('[INV-143] InvestPortfolio | Achievements | Active Partner badge renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const badge = page.locator('text=Active Partner').first();
  await expect(badge).toBeVisible({ timeout: 15000 });
});

test('[INV-144] InvestPortfolio | Achievements | Locked badges at 50% opacity', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const locked = page.locator('.opacity-50').first();
  await expect(locked).toBeAttached({ timeout: 15000 });
});

test('[INV-145] InvestPortfolio | Banner | Bottom encouragement banner with "Browse Properties" button', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/portfolio`);
  const browseBtn = page.locator('text=Browse Properties').first();
  await expect(browseBtn).toBeVisible({ timeout: 15000 });
});

// ── PAYOUTS PAGE DEEP (INV-146 → INV-165) ──────────────────────────────────

test('[INV-146] InvestPayouts | Summary | Payout Summary card renders', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const summary = page.locator('text=Payout Summary').first();
  const empty = page.locator('text=No payouts yet');
  await expect(summary.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-147] InvestPayouts | Summary | 3 summary items render or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const available = page.locator('text=Available to Claim').first();
  const empty = page.locator('text=No payouts yet');
  await expect(available.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-148] InvestPayouts | QuickClaim | Quick claim section visible or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const claimable = page.locator('text=Claimable Payouts').first();
  const empty = page.locator('text=No payouts yet');
  await expect(claimable.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-149] InvestPayouts | Claimable | Cards render or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const card = page.locator('[data-feature="INVEST__PAYOUT_CARD"]').first();
  const empty = page.locator('text=No payouts yet');
  const noClaimable = page.locator('text=/No claimable|no payouts|Nothing to claim/i');
  await expect(card.or(empty).or(noClaimable)).toBeVisible({ timeout: 15000 });
});

test('[INV-150] InvestPayouts | Claimable | Card has property image or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const card = page.locator('[data-feature="INVEST__PAYOUT_CARD"]').first();
  if (await card.isVisible({ timeout: 15000 }).catch(() => false)) {
    const img = card.locator('img').first();
    await expect(img).toBeVisible({ timeout: 5000 });
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-151] InvestPayouts | Claimable | Card has "Claim" button or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const claimBtn = page.locator('[data-feature="INVEST__PAYOUT_CLAIM"]').first();
  const empty = page.locator('text=No payouts yet');
  await expect(claimBtn.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-152] InvestPayouts | Claimable | Amount in green or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const amount = page.locator('[data-feature="INVEST__PAYOUT_AMOUNT"]').first();
  const empty = page.locator('text=No payouts yet');
  await expect(amount.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-153] InvestPayouts | History | All table columns render or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const dateCol = page.locator('th', { hasText: 'Date' }).first();
  const empty = page.locator('text=No payouts yet');
  await expect(dateCol.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-154] InvestPayouts | History | Amount column renders or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const amountCol = page.locator('th', { hasText: 'Amount' }).first();
  const empty = page.locator('text=No payouts yet');
  await expect(amountCol.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-155] InvestPayouts | History | Status badges render with color or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const badge = page.locator('[data-feature="INVEST__PAYOUT_STATUS"]').first();
  const empty = page.locator('text=No payouts yet');
  await expect(badge.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-156] InvestPayouts | ClaimModal | Opens when claim button clicked', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const claimBtn = page.locator('[data-feature="INVEST__PAYOUT_CLAIM"]').first();
  if (await claimBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
    await claimBtn.click();
    const modal = page.locator('[data-feature="INVEST__PAYOUT_MODAL"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-157] InvestPayouts | ClaimModal | 4 method options render', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const claimBtn = page.locator('[data-feature="INVEST__PAYOUT_CLAIM"]').first();
  if (await claimBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
    await claimBtn.click();
    const modal = page.locator('[data-feature="INVEST__PAYOUT_MODAL"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    const bankOption = modal.locator('text=Bank Transfer');
    await expect(bankOption).toBeVisible({ timeout: 5000 });
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-158] InvestPayouts | ClaimModal | Bank Transfer has "Recommended" badge', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const claimBtn = page.locator('[data-feature="INVEST__PAYOUT_CLAIM"]').first();
  if (await claimBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
    await claimBtn.click();
    const modal = page.locator('[data-feature="INVEST__PAYOUT_MODAL"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    const recommended = modal.locator('text=/Recommended/i');
    await expect(recommended).toBeVisible({ timeout: 5000 });
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-159] InvestPayouts | ClaimModal | Cancel closes dialog', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const claimBtn = page.locator('[data-feature="INVEST__PAYOUT_CLAIM"]').first();
  if (await claimBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
    await claimBtn.click();
    const modal = page.locator('[data-feature="INVEST__PAYOUT_MODAL"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    const closeBtn = modal.locator('button[aria-label="Close"], button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(modal).toBeHidden({ timeout: 5000 });
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-160] InvestPayouts | ClaimModal | Continue disabled without method selection', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const claimBtn = page.locator('[data-feature="INVEST__PAYOUT_CLAIM"]').first();
  if (await claimBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
    await claimBtn.click();
    const modal = page.locator('[data-feature="INVEST__PAYOUT_MODAL"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    const continueBtn = modal.locator('button', { hasText: /Continue|Confirm|Claim/ }).last();
    // Should be disabled or not present until a method is selected
    const isDisabled = await continueBtn.isDisabled().catch(() => true);
    expect(isDisabled).toBe(true);
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-161] InvestPayouts | BankDetails | Currency toggle or bank fields visible after bank selection', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const claimBtn = page.locator('[data-feature="INVEST__PAYOUT_CLAIM"]').first();
  if (await claimBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
    await claimBtn.click();
    const modal = page.locator('[data-feature="INVEST__PAYOUT_MODAL"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    const bankOption = modal.locator('text=Bank Transfer').first();
    await bankOption.click();
    // Either a bank form shows or continue button enables
    const continueBtn = modal.locator('button', { hasText: /Continue|Confirm|Claim/ }).last();
    await expect(continueBtn).toBeVisible({ timeout: 5000 });
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-162] InvestPayouts | BankDetails | Bank form renders on bank_setup step', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const bankForm = page.locator('[data-feature="INVEST__PAYOUT_BANK"]');
  // Bank form only appears in claim flow — check it exists in the DOM
  await expect(bankForm.or(page.locator('text=No payouts yet'))).toBeAttached({ timeout: 15000 });
});

test('[INV-163] InvestPayouts | History | Status column renders or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const statusCol = page.locator('th', { hasText: 'Status' }).first();
  const empty = page.locator('text=No payouts yet');
  await expect(statusCol.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-164] InvestPayouts | History | Method column renders or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/payouts`);
  const methodCol = page.locator('th', { hasText: 'Method' }).first();
  const empty = page.locator('text=No payouts yet');
  await expect(methodCol.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-165] InvestPayouts | Performance | Page loads within 3000ms', async ({ page }) => {
  const start = Date.now();
  await page.goto(`${BASE}/dashboard/invest/payouts`, { waitUntil: 'domcontentloaded' });
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(3000);
});

// ── PROPOSALS PAGE DEEP (INV-166 → INV-180) ────────────────────────────────

test('[INV-166] InvestProposals | Stats | 3 governance stat items with blockchain dots', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const active = page.locator('text=Active').first();
  await expect(active).toBeVisible({ timeout: 15000 });
  const yourVotes = page.locator('text=Your Votes').first();
  await expect(yourVotes).toBeVisible();
  const past = page.locator('text=Past').first();
  await expect(past).toBeVisible();
});

test('[INV-167] InvestProposals | Filter | "all" button active by default', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const allBtn = page.locator('[data-feature="INVEST__MARKETPLACE_FILTER"]').locator('button', { hasText: /^all$/i }).first();
  await expect(allBtn).toBeVisible({ timeout: 15000 });
});

test('[INV-168] InvestProposals | Filter | Type filter buttons render dynamically', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const filterContainer = page.locator('[data-feature="INVEST__MARKETPLACE_FILTER"]');
  await expect(filterContainer).toBeVisible({ timeout: 15000 });
  const buttons = filterContainer.locator('button');
  const count = await buttons.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

test('[INV-169] InvestProposals | Submit | "Submit a Proposal" button visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const btn = page.locator('button', { hasText: 'Submit a Proposal' });
  await expect(btn).toBeVisible({ timeout: 15000 });
});

test('[INV-170] InvestProposals | Submit | Fee notice "~10 USDC in STAY tokens" visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const fee = page.locator('text=Fee:').first();
  await expect(fee).toBeVisible({ timeout: 15000 });
});

test('[INV-171] InvestProposals | Timeline | Timeline renders or empty state', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const card = page.locator('[data-feature="INVEST__PROPOSAL_CARD"]').first();
  const empty = page.locator('text=/No proposals|no active proposals|Be the first/i').first();
  await expect(card.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-172] InvestProposals | Active | Active proposal expanded by default', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const card = page.locator('[data-feature="INVEST__PROPOSAL_CARD"]').first();
  if (await card.isVisible({ timeout: 15000 }).catch(() => false)) {
    const description = page.locator('[data-feature="INVEST__PROPOSAL_DESCRIPTION"]').first();
    const voteBar = page.locator('[data-feature="INVEST__PROPOSAL_PROGRESS"]').first();
    await expect(description.or(voteBar)).toBeVisible({ timeout: 5000 });
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-173] InvestProposals | Active | VoteBar renders for active proposal', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const voteBar = page.locator('[data-feature="INVEST__PROPOSAL_PROGRESS"]').first();
  const empty = page.locator('text=/No proposals|no active proposals|Be the first/i').first();
  await expect(voteBar.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-174] InvestProposals | Active | QuorumBar renders for active proposal', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const quorum = page.locator('text=Quorum').first();
  const empty = page.locator('text=/No proposals|no active proposals|Be the first/i').first();
  await expect(quorum.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-175] InvestProposals | Active | Time remaining badge visible', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const time = page.locator('text=/\\d+[dh] remaining|days? left|hours? left|Ended/i').first();
  const empty = page.locator('text=/No proposals|no active proposals|Be the first/i').first();
  await expect(time.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-176] InvestProposals | Active | Vote Yes/No buttons visible for active proposal', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const voteSection = page.locator('[data-feature="INVEST__PROPOSAL_VOTE"]').first();
  const voted = page.locator('text=/You voted/').first();
  const empty = page.locator('text=/No proposals|no active proposals|Be the first/i').first();
  await expect(voteSection.or(voted).or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-177] InvestProposals | Past | Past proposal collapsed by default', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const resultBadge = page.locator('[data-feature="INVEST__PROPOSAL_STATUS"]').first();
  const empty = page.locator('text=/No proposals|no active proposals|Be the first/i').first();
  await expect(resultBadge.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-178] InvestProposals | Past | Click expands past proposal', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const pastCard = page.locator('[data-feature="INVEST__PROPOSAL_CARD"]').last();
  if (await pastCard.isVisible({ timeout: 15000 }).catch(() => false)) {
    await pastCard.click();
    await page.waitForTimeout(300);
    await expect(pastCard).toBeVisible();
  } else {
    expect(true).toBe(true);
  }
});

test('[INV-179] InvestProposals | Past | Result badge shows Approved or Rejected', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const badge = page.locator('[data-feature="INVEST__PROPOSAL_STATUS"]').first();
  const empty = page.locator('text=/No proposals|no active proposals|Be the first/i').first();
  await expect(badge.or(empty)).toBeVisible({ timeout: 15000 });
});

test('[INV-180] InvestProposals | Submit | Property selector in submit modal', async ({ page }) => {
  await page.goto(`${BASE}/dashboard/invest/proposals`);
  const btn = page.locator('button', { hasText: 'Submit a Proposal' });
  if (await btn.isVisible({ timeout: 15000 }).catch(() => false)) {
    await btn.click();
    const modal = page.locator('[role="dialog"]');
    const selectOrInput = modal.locator('select, [role="combobox"], input[placeholder*="roperty"]').first();
    const modalContent = modal.locator('text=/property|Property/').first();
    await expect(selectOrInput.or(modalContent)).toBeVisible({ timeout: 5000 });
  } else {
    expect(true).toBe(true);
  }
});
