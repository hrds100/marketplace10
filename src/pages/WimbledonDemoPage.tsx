/**
 * WimbledonDemoPage — standalone investor-demo clone for hub.nfstay.com/wimbledon
 *
 * Self-contained. No blockchain, no wallet, no auth, no Supabase, no polling.
 * Visually mirrors src/pages/invest/InvestMarketplacePage.tsx (Version1) layout —
 * DO NOT import from that file (frozen zone).
 *
 * Feature tag: DEMO (see feature-map.json entry `DEMO`).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  MapPin,
  TrendingUp,
  DollarSign,
  BarChart3,
  FileText,
  CheckCircle2,
  Shield,
  Star,
  Home,
  ChevronDown,
  Users,
  CreditCard,
  Coins,
  Lock,
  Copy,
  Check,
  ArrowRight,
  CircleDot,
  PieChart,
  Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Hardcoded demo data — no Supabase, no blockchain
// ---------------------------------------------------------------------------

const PROPERTY = {
  title: 'Britannia Point — Wimbledon',
  location: 'United Kingdom',
  pricePerAllocation: 1,
  totalAllocations: 149136,
  sold: 51636, // renders ~34.6% on the progress bar
  remaining: 97500,
  owners: 1,
  sliderDefault: 500,
  sliderMin: 500,
  sliderMax: 5000,
  sliderStep: 100,
  tags: ['Serviced Accommodation', '13 Units', '360 m²', 'Open for Partnership'],
  images: [
    '/wimbledon/hero.jpg',
    '/wimbledon/interior-1.jpg',
    '/wimbledon/interior-2.jpg',
    '/wimbledon/interior-3.jpg',
    '/wimbledon/interior-4.jpg',
  ],
  stats: {
    yield: '115.6%',
    occupancy: '80%',
    rentCost: '£3,500',
    dealValue: '£149k',
  },
  aboutHeading: 'Britannia Point — 13-Unit Serviced Accommodation Portfolio',
  aboutDescription:
    'A 13-unit rent-to-rent serviced accommodation portfolio in Wimbledon, operated at an 80% occupancy target and projected to break even within 12 months. The headline 115.6% annual yield is calculated on the operator capital deployed, not the asset value.',
  highlights: [
    '13-unit portfolio',
    'Rent 2 Rent model',
    '80% occupancy target',
    '12-month breakeven',
  ],
  financials: {
    transaction: [
      { label: 'Setup Capital', value: '£149,000' },
      { label: 'Furniture & Fit-out', value: '£42,000' },
      { label: 'Deposit (3 months rent)', value: '£10,500' },
      { label: 'Legal & Onboarding', value: '£3,800' },
    ],
    rental: [
      { label: 'Monthly Rent Paid to Landlord', value: '£3,500' },
      { label: 'Target Nightly Rate', value: '£168' },
      { label: 'Target Occupancy', value: '80%' },
      { label: 'Projected Monthly Net', value: '£14,360' },
    ],
  },
  presetAmounts: [500, 1000, 2500, 5000],
  monthlyYieldPct: 9.63, // 115.6% / 12
  projectionYears: 5,
  documents: [
    'Investment Memorandum',
    'Financial Projections',
    'Title Deed',
  ],
  ctaLabel: 'Secure Your Allocations',
  ctaFooter: 'Protected by smart contract on BNB Chain',
};

const RECENT_ACTIVITY: Array<{
  event: string;
  price: string;
  from: string;
  to: string;
  date: string;
}> = [
  { event: 'Purchase', price: '$1', from: 'Market', to: '0x7a2b...F4e9', date: 'Apr 15, 2026' },
  { event: 'Purchase', price: '$1', from: 'Market', to: '0x14cD...b1A2', date: 'Apr 14, 2026' },
  { event: 'Purchase', price: '$1', from: 'Market', to: '0x9e0F...3DcA', date: 'Apr 13, 2026' },
  { event: 'Purchase', price: '$1', from: 'Market', to: '0x3b77...8F91', date: 'Apr 12, 2026' },
  { event: 'Purchase', price: '$1', from: 'Market', to: '0xBd21...4e60', date: 'Apr 11, 2026' },
  { event: 'Purchase', price: '$1', from: 'Market', to: '0x58aE...0C3f', date: 'Apr 9, 2026' },
  { event: 'Purchase', price: '$1', from: 'Market', to: '0xE472...91bD', date: 'Apr 8, 2026' },
  { event: 'Purchase', price: '$1', from: 'Market', to: '0x2F8a...Cc57', date: 'Apr 6, 2026' },
  { event: 'Purchase', price: '$1', from: 'Market', to: '0x1a09...73E2', date: 'Apr 5, 2026' },
  { event: 'Purchase', price: '$1', from: 'Market', to: '0x6cF4...0aBd', date: 'Apr 3, 2026' },
];

const REFERRAL_URL = 'https://hub.nfstay.com/wimbledon?ref=YOURCODE';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WimbledonDemoPage() {
  const [currentImage, setCurrentImage] = useState(0);
  const [investAmount, setInvestAmount] = useState(PROPERTY.sliderDefault);
  const [calcAmount, setCalcAmount] = useState(PROPERTY.sliderDefault);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');
  const [tsaAgreed, setTsaAgreed] = useState(true);
  const [financialsOpen, setFinancialsOpen] = useState(false);
  const [samcartOpen, setSamcartOpen] = useState(false);
  const [samcartUrl, setSamcartUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  // Auto-rotate hero carousel (same 4s cadence as Pembroke)
  useEffect(() => {
    const id = window.setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % PROPERTY.images.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  // Track mobile for Sheet side (right on desktop, bottom on mobile)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fundedPercent = useMemo(() => {
    return (PROPERTY.sold / PROPERTY.totalAllocations) * 100;
  }, []);

  const handleSecureAllocations = useCallback(() => {
    const url = `https://stay.samcart.com/products/1/?amount=${investAmount}&property=britannia-point-wimbledon`;
    setSamcartUrl(url);
    setSamcartOpen(true);
  }, [investAmount]);

  const handleCopyReferral = useCallback(() => {
    try {
      navigator.clipboard.writeText(REFERRAL_URL);
    } catch {
      // Clipboard API may be unavailable in some browsers — still flip the UI
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div
      data-feature="DEMO__WIMBLEDON"
      className="min-h-screen bg-[#F3F3EE] font-sans text-[#1A1A1A] antialiased"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Top banner — investor demo hint */}
        <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-[#1E9A80]/20 bg-[#ECFDF5] px-4 py-3">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-[#1E9A80]" />
          <p className="text-sm text-[#1A1A1A]">
            <span className="font-semibold">Investor preview</span>
            <span className="text-[#6B7280]">
              {' '}· Britannia Point, Wimbledon. Explore the partnership structure below.
            </span>
          </p>
        </div>

        {/* Two-column hero + allocation card */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT — Images, title, tags, stat bar */}
          <div className="space-y-5 lg:col-span-7">
            {/* Main hero image */}
            <div className="relative overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] shadow-[0_4px_24px_-2px_rgba(0,0,0,0.08)]">
              <div className="relative aspect-[3/2] w-full bg-[#F3F3EE]">
                {PROPERTY.images.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt={`${PROPERTY.title} — photo ${i + 1}`}
                    data-testid={`wimbledon-image-${i}`}
                    className={cn(
                      'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
                      currentImage === i ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                ))}
                {/* Dot pager */}
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                  {PROPERTY.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={cn(
                        'h-2 rounded-full transition-all',
                        currentImage === i ? 'w-6 bg-white' : 'w-2 bg-white/60 hover:bg-white/80',
                      )}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile thumbnail strip */}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 md:hidden">
              {PROPERTY.images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setCurrentImage(i)}
                  className={cn(
                    'h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                    currentImage === i
                      ? 'border-[#1E9A80]'
                      : 'border-transparent opacity-70',
                  )}
                  aria-label={`Show image ${i + 1}`}
                >
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>

            {/* Title + location */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {PROPERTY.title}
              </h1>
              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-[#6B7280]">
                <MapPin className="h-3.5 w-3.5" />
                {PROPERTY.location}
              </div>
            </div>

            {/* Tag pills */}
            <div className="flex flex-wrap gap-2">
              {PROPERTY.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className={cn(
                    'gap-1 rounded-full px-3 py-1 text-xs font-medium',
                    tag === 'Open for Partnership'
                      ? 'bg-[#ECFDF5] text-[#1E9A80] hover:bg-[#ECFDF5]'
                      : 'bg-white/80 text-[#1A1A1A] hover:bg-white',
                  )}
                >
                  {tag === 'Open for Partnership' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1E9A80]" />
                  )}
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Stat bar (4 stats) */}
            <div
              data-testid="wimbledon-stat-bar"
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              <StatPill
                icon={TrendingUp}
                label="Yield"
                value={PROPERTY.stats.yield}
              />
              <StatPill
                icon={BarChart3}
                label="Occupancy"
                value={PROPERTY.stats.occupancy}
              />
              <StatPill
                icon={DollarSign}
                label="Rent Cost"
                value={PROPERTY.stats.rentCost}
              />
              <StatPill
                icon={Star}
                label="Deal Value"
                value={PROPERTY.stats.dealValue}
              />
            </div>
          </div>

          {/* RIGHT — Allocation card (sticky on desktop, stacked on mobile) */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-6">
              <Card
                data-testid="wimbledon-allocation-card"
                className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_4px_24px_-2px_rgba(0,0,0,0.08)]"
              >
                <CardContent className="space-y-4 pt-5">
                  {/* Allocation price */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">Allocation Price</span>
                    <span className="text-xl font-bold text-[#1A1A1A]">
                      ${PROPERTY.pricePerAllocation}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <Progress
                      value={fundedPercent}
                      data-testid="wimbledon-progress"
                      aria-valuenow={Math.round(fundedPercent * 10) / 10}
                      className="h-2.5 bg-[#F3F3EE] [&>div]:bg-[#1E9A80]"
                    />
                    <p className="text-xs text-[#6B7280]">
                      {PROPERTY.sold.toLocaleString()} allocations sold ·{' '}
                      {PROPERTY.remaining.toLocaleString()} remaining
                    </p>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <StatCell label="Owners" value={PROPERTY.owners.toLocaleString()} />
                    <StatCell
                      label="Allocations"
                      value={PROPERTY.totalAllocations.toLocaleString()}
                    />
                    <StatCell
                      label="Remaining"
                      value={PROPERTY.remaining.toLocaleString()}
                    />
                  </div>

                  {/* Slider panel */}
                  <div className="space-y-4 rounded-2xl border border-[#1E9A80]/20 bg-[#ECFDF5]/60 p-4">
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        See how much you can secure
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
                        Move the slider to preview the amount you'll send through checkout.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-2xl font-bold tabular-nums text-[#1E9A80]">
                          ${investAmount.toLocaleString()}
                        </span>
                        <span className="text-xs text-[#6B7280]">
                          {investAmount} allocation{investAmount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Slider
                        min={PROPERTY.sliderMin}
                        max={PROPERTY.sliderMax}
                        step={PROPERTY.sliderStep}
                        value={[investAmount]}
                        onValueChange={(v) => {
                          const next = v[0] ?? PROPERTY.sliderMin;
                          const aligned =
                            Math.round(next / PROPERTY.sliderStep) * PROPERTY.sliderStep;
                          setInvestAmount(
                            Math.min(
                              PROPERTY.sliderMax,
                              Math.max(PROPERTY.sliderMin, aligned),
                            ),
                          );
                        }}
                        data-testid="wimbledon-allocation-slider"
                        className="w-full py-2 [&_[class*=bg-primary]]:bg-[#1E9A80]"
                        aria-label="Select allocation amount"
                      />
                      <div className="flex justify-between text-[10px] text-[#9CA3AF]">
                        <span>${PROPERTY.sliderMin.toLocaleString()}</span>
                        <span>${PROPERTY.sliderMax.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment method */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-all',
                          paymentMethod === 'card'
                            ? 'border-[#1E9A80] bg-[#ECFDF5]/60 ring-1 ring-[#1E9A80]/20'
                            : 'border-[#E5E7EB] hover:bg-[#F3F3EE]',
                        )}
                      >
                        <CreditCard className="h-4 w-4 flex-shrink-0 text-[#1E9A80]" />
                        <span className="text-sm font-medium">Credit/Debit Card</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('crypto')}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-all',
                          paymentMethod === 'crypto'
                            ? 'border-[#1E9A80] bg-[#ECFDF5]/60 ring-1 ring-[#1E9A80]/20'
                            : 'border-[#E5E7EB] hover:bg-[#F3F3EE]',
                        )}
                      >
                        <Coins className="h-4 w-4 flex-shrink-0 text-[#1E9A80]" />
                        <span className="text-sm font-medium">Cryptocurrency</span>
                      </button>
                    </div>
                  </div>

                  {/* TSA */}
                  <label className="group flex cursor-pointer items-start gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={tsaAgreed}
                      onClick={() => setTsaAgreed(!tsaAgreed)}
                      className={cn(
                        'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200',
                        tsaAgreed
                          ? 'border-[#1E9A80] bg-[#1E9A80]'
                          : 'border-[#9CA3AF]/50 bg-white group-hover:border-[#1E9A80]/50',
                      )}
                    >
                      {tsaAgreed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </button>
                    <span className="text-xs leading-relaxed text-[#6B7280]">
                      I agree to the{' '}
                      <span className="font-medium text-[#1E9A80] underline">
                        Token Sale Agreement
                      </span>{' '}
                      and terms of partnership.
                    </span>
                  </label>

                  {/* CTA */}
                  <Button
                    type="button"
                    data-testid="wimbledon-secure-cta"
                    onClick={handleSecureAllocations}
                    disabled={!tsaAgreed}
                    className="w-full gap-2 bg-[#1E9A80] text-base font-semibold text-white shadow-[0_4px_16px_rgba(30,154,128,0.35)] hover:bg-[#1E9A80]/90 disabled:opacity-60"
                    size="lg"
                  >
                    <Shield className="h-4 w-4" />
                    {PROPERTY.ctaLabel}
                  </Button>

                  {/* Trust badge */}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#6B7280]">
                    <Lock className="h-3 w-3" />
                    {PROPERTY.ctaFooter}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Below-the-fold sections */}
        <div className="mt-8 space-y-6">
          {/* About this property */}
          <Card className="rounded-2xl border border-[#E5E7EB] bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                {PROPERTY.aboutHeading}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="leading-relaxed text-[#6B7280]">
                {PROPERTY.aboutDescription}
              </p>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-[#1A1A1A]">Highlights</h4>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {PROPERTY.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#1E9A80]" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Financial breakdown — collapsible */}
          <Card className="rounded-2xl border border-[#E5E7EB] bg-white">
            <button
              type="button"
              onClick={() => setFinancialsOpen(!financialsOpen)}
              data-testid="wimbledon-financials-toggle"
              className="flex w-full items-center justify-between px-6 py-4 text-left"
            >
              <span className="text-base font-semibold text-[#1A1A1A]">
                Financial Breakdown
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-[#6B7280] transition-transform duration-200',
                  financialsOpen && 'rotate-180',
                )}
              />
            </button>
            <div
              className={cn(
                'overflow-hidden px-6 transition-all duration-200 ease-out',
                financialsOpen ? 'max-h-[800px] pb-5 opacity-100' : 'max-h-0 opacity-0',
              )}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FinancialList
                  title="Transaction"
                  rows={PROPERTY.financials.transaction}
                />
                <FinancialList title="Rental" rows={PROPERTY.financials.rental} />
              </div>
            </div>
          </Card>

          {/* Profit calculator */}
          <Card className="rounded-2xl border border-[#E5E7EB] bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PieChart className="h-5 w-5 text-[#1E9A80]" />
                How much can you earn?
              </CardTitle>
              <p className="mt-1 text-sm text-[#6B7280]">
                See your projected returns based on historical performance.
              </p>
            </CardHeader>
            <CardContent>
              <ProfitCalculator
                amount={calcAmount}
                setAmount={setCalcAmount}
                presetAmounts={PROPERTY.presetAmounts}
                monthlyYieldPct={PROPERTY.monthlyYieldPct}
                years={PROPERTY.projectionYears}
              />
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="rounded-2xl border border-[#E5E7EB] bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CircleDot className="h-5 w-5 text-[#1E9A80]" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-[#6B7280]">
                      <th className="pb-2 pr-4 font-medium">Event</th>
                      <th className="pb-2 pr-4 font-medium">Price</th>
                      <th className="pb-2 pr-4 font-medium">From</th>
                      <th className="pb-2 pr-4 font-medium">To</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RECENT_ACTIVITY.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-[#E5E7EB]/70 last:border-0"
                      >
                        <td className="py-2.5 pr-4">
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-[#ECFDF5] text-[11px] font-semibold text-[#1E9A80] hover:bg-[#ECFDF5]"
                          >
                            {row.event}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 font-medium">{row.price}</td>
                        <td className="py-2.5 pr-4 text-[#6B7280]">{row.from}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs">{row.to}</td>
                        <td className="py-2.5 text-[#6B7280]">{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <ul className="space-y-2 md:hidden">
                {RECENT_ACTIVITY.map((row, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#F3F3EE]/40 px-3 py-2.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-[#ECFDF5] text-[10px] font-semibold text-[#1E9A80] hover:bg-[#ECFDF5]"
                        >
                          {row.event}
                        </Badge>
                        <span className="text-sm font-medium">{row.price}</span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-[#6B7280]">
                        {row.to}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#9CA3AF]">{row.date}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="rounded-2xl border border-[#E5E7EB] bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-[#1E9A80]" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PROPERTY.documents.map((doc) => (
                  <div
                    key={doc}
                    className="flex items-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-4 w-4 flex-shrink-0 text-[#6B7280]" />
                      <span className="truncate text-sm font-medium">{doc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs italic text-[#6B7280]">
                Full documents available to partners only.
              </p>
            </CardContent>
          </Card>

          {/* Work with us */}
          <Card className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Left — copy */}
                <div className="flex flex-col justify-center p-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF5]">
                    <Users className="h-5 w-5 text-[#1E9A80]" />
                  </div>
                  <h3 className="mb-1 text-lg font-bold">Work With Us</h3>
                  <p className="text-sm leading-relaxed text-[#6B7280]">
                    Share your link and earn when your network partners on Britannia Point.
                    Commission is paid the moment an allocation settles.
                  </p>
                </div>

                {/* Right — link + copy button */}
                <div className="flex flex-col justify-center gap-3 border-t border-[#E5E7EB] bg-[#F3F3EE]/40 p-6 lg:border-l lg:border-t-0">
                  <p className="text-xs font-medium text-[#6B7280]">Your referral link</p>
                  <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5">
                    <p className="flex-1 truncate font-mono text-xs text-[#6B7280]">
                      {REFERRAL_URL}
                    </p>
                    <Button
                      size="sm"
                      data-testid="wimbledon-copy-link"
                      onClick={handleCopyReferral}
                      className={cn(
                        'flex-shrink-0 gap-1.5 text-xs font-medium transition-all',
                        copied
                          ? 'bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90'
                          : 'bg-[#ECFDF5] text-[#1E9A80] hover:bg-[#1E9A80] hover:text-white',
                      )}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">
                    Commission is tracked automatically through your referral code.
                  </p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    This is an investor-preview page. Replace <code>YOURCODE</code> with your
                    affiliate code before sharing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer signoff */}
          <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-[#9CA3AF]">
            <Home className="h-3.5 w-3.5" />
            Britannia Point — investor preview · nfstay partnership marketplace
          </div>
        </div>
      </div>

      {/* SamCart drawer */}
      <Sheet
        open={samcartOpen}
        onOpenChange={(open) => {
          setSamcartOpen(open);
          if (!open) setSamcartUrl('');
        }}
      >
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          data-testid="wimbledon-samcart-sheet"
          className={cn(
            'z-[200] p-0 shadow-2xl [&>button]:z-[210]',
            isMobile
              ? 'h-[90vh] rounded-t-2xl'
              : 'w-full border-l sm:max-w-[540px]',
          )}
        >
          <SheetHeader className="border-b border-[#E5E7EB] px-4 py-3">
            <SheetTitle className="text-base">Complete your payment</SheetTitle>
          </SheetHeader>
          {samcartUrl && (
            <div
              className="relative"
              style={{ height: 'calc(100% - 57px)' }}
            >
              <iframe
                key={samcartUrl}
                data-testid="wimbledon-samcart-iframe"
                src={samcartUrl}
                title="SamCart Checkout"
                allow="payment *; clipboard-read; clipboard-write"
                className="h-full w-full border-0"
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
      <Icon className="h-4 w-4 text-[#1E9A80]" />
      <div>
        <p className="text-[11px] text-[#6B7280]">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F3F3EE] p-2">
      <p className="text-[10px] text-[#6B7280]">{label}</p>
      <p className="text-sm font-bold text-[#1A1A1A]">{value}</p>
    </div>
  );
}

function FinancialList({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-[#1A1A1A]">{title}</h4>
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex justify-between border-b border-[#E5E7EB]/50 py-1.5 text-sm last:border-0"
        >
          <span className="text-[#6B7280]">{row.label}</span>
          <span className="font-medium text-[#1A1A1A]">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function ProfitCalculator({
  amount,
  setAmount,
  presetAmounts,
  monthlyYieldPct,
  years,
}: {
  amount: number;
  setAmount: (v: number) => void;
  presetAmounts: number[];
  monthlyYieldPct: number;
  years: number;
}) {
  // Simple linear projection matching the $500 spec figures:
  //   yearValue(n) = amount + amount * (monthlyYield/100 * 12) * n
  //   For amount=500, monthlyYield=9.63%: Y1=1077.8 → ~1.1k; Y5=3389 → ~3.4k
  const annualYieldPct = monthlyYieldPct * 12; // 115.56%
  const yearlyIncome = amount * (annualYieldPct / 100);
  const projections = Array.from({ length: years }, (_, i) => {
    const year = i + 1;
    const value = amount + yearlyIncome * year;
    return { year, value: Math.round(value) };
  });
  const y5 = projections[projections.length - 1]?.value ?? amount;
  const totalReturnPct = amount > 0 ? (((y5 - amount) / amount) * 100).toFixed(1) : '0.0';
  const totalGain = y5 - amount;
  const monthlyIncome = (amount * (monthlyYieldPct / 100)).toFixed(2);
  const yearlyDisplay = yearlyIncome.toFixed(2);
  const maxValue = y5;

  return (
    <div className="space-y-6">
      {/* Amount input + preset pills */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex w-44 items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F3F3EE]/50 px-4 py-2.5 focus-within:border-[#1E9A80] focus-within:ring-2 focus-within:ring-[#1E9A80]/20">
            <span className="text-base font-semibold text-[#6B7280]">$</span>
            <input
              type="number"
              min={0}
              value={amount || ''}
              data-testid="wimbledon-calc-input"
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setAmount(isNaN(v) ? 0 : Math.max(0, v));
              }}
              className="w-full bg-transparent text-base font-bold outline-none"
              placeholder="500"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presetAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(amt)}
                data-testid={`wimbledon-calc-preset-${amt}`}
                className={cn(
                  'rounded-lg px-3 py-2 text-xs font-medium transition-all',
                  amount === amt
                    ? 'bg-[#1E9A80] text-white'
                    : 'bg-[#F3F3EE] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#1A1A1A]',
                )}
              >
                ${amt >= 1000 ? `${amt / 1000}k` : amt}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-[#6B7280]">
          = {amount.toLocaleString()} allocation{amount !== 1 ? 's' : ''} at $1/allocation
        </p>
      </div>

      {/* Projection bars + total return */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Bars */}
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F3F3EE]/30 p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold">5-Year Projection</p>
            <span className="text-[10px] text-[#6B7280]">
              {monthlyYieldPct}%/mo · {annualYieldPct.toFixed(1)}%/yr
            </span>
          </div>
          <div
            className="space-y-2"
            data-testid="wimbledon-projection-bars"
          >
            {[
              { year: 0, value: amount, label: 'Today' },
              ...projections.map((p) => ({ ...p, label: `Year ${p.year}` })),
            ].map((p) => {
              const widthPct = maxValue > 0 ? (p.value / maxValue) * 100 : 0;
              const gain = p.value - amount;
              return (
                <div key={p.label} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-right text-[11px] font-medium text-[#6B7280]">
                    {p.label}
                  </span>
                  <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-[#F3F3EE]">
                    <div
                      className={cn(
                        'flex h-full items-center rounded-lg px-3 transition-all duration-700',
                        p.year === 0
                          ? 'bg-[#9CA3AF]/30'
                          : 'bg-gradient-to-r from-[#1E9A80] to-[#1E9A80]/70',
                      )}
                      style={{ width: `${Math.max(widthPct, 8)}%` }}
                    >
                      <span
                        className={cn(
                          'whitespace-nowrap text-[11px] font-bold',
                          p.year === 0 ? 'text-[#6B7280]' : 'text-white',
                        )}
                        data-testid={`wimbledon-bar-year-${p.year}`}
                      >
                        ${(p.value / 1000).toFixed(1)}k
                      </span>
                    </div>
                    {gain > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[#1E9A80]">
                        +${(gain / 1000).toFixed(1)}k
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Results panel */}
        <div className="space-y-3 lg:col-span-2">
          <div
            data-testid="wimbledon-total-return"
            className="rounded-xl border border-[#1E9A80]/20 bg-[#ECFDF5]/60 p-4"
          >
            <p className="mb-1 text-xs text-[#6B7280]">Total Return (5 Years)</p>
            <p className="text-2xl font-bold text-[#1E9A80]">{totalReturnPct}%</p>
            <p className="mt-1 text-xs text-[#6B7280]">
              ${amount.toLocaleString()} → ${y5.toLocaleString()}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-[#E5E7EB] p-3">
              <p className="mb-0.5 text-[11px] text-[#6B7280]">Monthly</p>
              <p className="text-base font-bold">${monthlyIncome}</p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] p-3">
              <p className="mb-0.5 text-[11px] text-[#6B7280]">Yearly</p>
              <p className="text-base font-bold">${yearlyDisplay}</p>
            </div>
          </div>
          <div
            data-testid="wimbledon-year5-value"
            className="rounded-xl bg-[#F3F3EE] p-3.5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-0.5 text-[11px] text-[#6B7280]">Year 5 Value</p>
                <p className="text-lg font-bold text-[#1E9A80]">
                  ${y5.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="mb-0.5 text-[11px] text-[#6B7280]">Total Gain</p>
                <p className="text-sm font-bold text-[#1E9A80]">
                  +${totalGain.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-[#6B7280]">
            Based on {monthlyYieldPct}% monthly yield ({annualYieldPct.toFixed(1)}% annual).
            Past performance does not guarantee future results.
          </p>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
        <ArrowRight className="h-3 w-3" />
        All figures shown are projections for the investor-preview and are not a guarantee of return.
      </p>
    </div>
  );
}
