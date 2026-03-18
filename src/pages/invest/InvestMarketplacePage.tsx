import { useState, useEffect, useCallback } from 'react';
import { mockProperties } from '@/data/investMockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  TrendingUp,
  DollarSign,
  BarChart3,
  FileText,
  Download,
  CheckCircle2,
  Shield,
  Star,
  Percent,
  PieChart,
  Home,
  Minus,
  Plus,
  ChevronDown,
  ChevronUp,
  Users,
  Vote,
  Bell,
  Wrench,
  CreditCard,
  Coins,
  Lock,
  Copy,
  Check,
  ArrowRight,
  CircleDot,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants & Mock Data
// ---------------------------------------------------------------------------

const property = mockProperties[0];
const fundedPercent = Math.round((property.sharesSold / property.totalShares) * 100);
const sharesRemaining = property.totalShares - property.sharesSold;

const mockActivity = [
  { event: 'Purchase', price: '$500', from: 'Market', to: '0x8f3a...e2c1', date: 'Mar 15, 2026' },
  { event: 'Purchase', price: '$1,200', from: 'Market', to: '0x2b7c...f9a3', date: 'Mar 14, 2026' },
  { event: 'Purchase', price: '$300', from: 'Market', to: '0x9c2f...a1d7', date: 'Mar 12, 2026' },
  { event: 'Purchase', price: '$800', from: 'Market', to: '0x1d4e...b8f2', date: 'Mar 10, 2026' },
  { event: 'Purchase', price: '$2,000', from: 'Market', to: '0x4a6b...c3e9', date: 'Mar 8, 2026' },
];

const jvSteps = [
  {
    step: 1,
    icon: FileText,
    title: 'A decision is proposed',
    desc: 'You, another partner, or the management team can propose something — like replacing a bed, upgrading furniture, increasing rent, or changing management.',
  },
  {
    step: 2,
    icon: Bell,
    title: 'You get notified',
    desc: 'All partners receive a WhatsApp and email notification with a link back to the platform when a new proposal is created.',
  },
  {
    step: 3,
    icon: Vote,
    title: 'You decide',
    desc: 'You review the proposal, understand what is being suggested, and cast your vote. Once the voting period ends, the majority decision is applied.',
  },
];

const jvExamples = [
  'Replace a bed or sofa',
  'Increase rent',
  'Upgrade furniture',
  'Change management',
  'Change booking strategy or platform',
];

// ---------------------------------------------------------------------------
// Invest Modal (fallback)
// ---------------------------------------------------------------------------

function InvestModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [shares, setShares] = useState(1);
  const [confirmed, setConfirmed] = useState(false);

  const total = shares * property.pricePerShare;
  const monthlyIncome = ((property.monthlyRent / property.totalShares) * shares).toFixed(2);
  const annualReturn = (shares * property.pricePerShare * (property.annualYield / 100)).toFixed(2);

  const handleClose = (v: boolean) => {
    if (!v) {
      setShares(1);
      setConfirmed(false);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {confirmed ? 'Investment Confirmed' : 'Invest in ' + property.title}
          </DialogTitle>
        </DialogHeader>

        {confirmed ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="h-16 w-16 text-primary" />
            <p className="text-center text-lg font-semibold">
              You secured {shares} share{shares > 1 ? 's' : ''}!
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Total: ${total.toLocaleString()} &middot; Est. monthly income: ${monthlyIncome}
            </p>
            <Button className="mt-2 w-full" onClick={() => handleClose(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-5 py-2">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 dark:bg-muted/30">
                <span className="text-sm text-muted-foreground">Share price</span>
                <span className="text-lg font-bold">${property.pricePerShare}</span>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Number of shares</label>
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9"
                    disabled={shares <= 1}
                    onClick={() => setShares((s) => Math.max(1, s - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={shares}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) setShares(Math.max(1, Math.min(50, v)));
                    }}
                    className="h-9 w-20 rounded-md border bg-background text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9"
                    disabled={shares >= 50}
                    onClick={() => setShares((s) => Math.min(50, s + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">max 50</span>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total cost</span>
                  <span className="font-semibold">${total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. monthly income</span>
                  <span className="font-semibold text-primary">${monthlyIncome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. annual return</span>
                  <span className="font-semibold text-primary">${annualReturn}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Annual yield</span>
                  <span className="font-semibold">{property.annualYield}%</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button className="gap-2" onClick={() => setConfirmed(true)}>
                <Shield className="h-4 w-4" />
                Confirm Investment
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Shared Sub-Components
// ---------------------------------------------------------------------------

function VersionSwitcher({
  version,
  setVersion,
}: {
  version: 1 | 2;
  setVersion: (v: 1 | 2) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border bg-background/90 p-1 shadow-sm backdrop-blur-sm w-fit ml-auto mb-4">
      {([1, 2] as const).map((v) => (
        <button
          key={v}
          onClick={() => setVersion(v)}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold transition-all',
            version === v
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function ImageCarousel({
  currentImage,
  setCurrentImage,
  aspectClass = 'aspect-[3/2]',
  overlay = false,
}: {
  currentImage: number;
  setCurrentImage: (i: number) => void;
  aspectClass?: string;
  overlay?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className={cn(aspectClass, 'relative w-full')}>
        <img
          src={property.images[currentImage]}
          alt={`${property.title} - ${currentImage + 1}`}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
        />
        {overlay && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 pt-16">
            <h1 className="text-2xl font-bold text-white">{property.title}</h1>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
              <MapPin className="h-3.5 w-3.5" />
              {property.location}
            </div>
          </div>
        )}
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {property.images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentImage(i)}
            className={cn(
              'h-2 rounded-full transition-all',
              currentImage === i
                ? 'w-6 bg-white'
                : 'w-2 bg-white/50 hover:bg-white/70'
            )}
            aria-label={`Go to image ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function PropertyBadges() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary" className="gap-1">
        <Home className="h-3 w-3" />
        {property.type}
      </Badge>
      <Badge variant="secondary" className="gap-1">
        <Bed className="h-3 w-3" />
        {property.bedrooms} Bed
      </Badge>
      <Badge variant="secondary" className="gap-1">
        <Bath className="h-3 w-3" />
        {property.bathrooms} Bath
      </Badge>
      <Badge variant="secondary" className="gap-1">
        <Maximize2 className="h-3 w-3" />
        {property.area} m&sup2;
      </Badge>
      <Badge variant="secondary" className="gap-1">
        <Calendar className="h-3 w-3" />
        Built {property.yearBuilt}
      </Badge>
      <Badge
        className={cn(
          'gap-1',
          property.status === 'open'
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {property.status === 'open' ? 'Open for Investment' : 'Fully Funded'}
      </Badge>
    </div>
  );
}

function MetricPills() {
  const metrics = [
    { icon: TrendingUp, label: 'Yield', value: `${property.annualYield}%` },
    { icon: BarChart3, label: 'Occupancy', value: `${property.occupancyRate}%` },
    { icon: DollarSign, label: 'Monthly Rent', value: `$${property.monthlyRent.toLocaleString()}` },
    { icon: Star, label: 'Property Value', value: `$${(property.propertyValue / 1000).toFixed(0)}k` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-4 py-3 dark:bg-muted/30"
        >
          <m.icon className="h-4 w-4 text-primary" />
          <div>
            <p className="text-[11px] text-muted-foreground">{m.label}</p>
            <p className="text-sm font-bold">{m.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function InvestCardContent({
  investAmount,
  setInvestAmount,
  paymentMethod,
  setPaymentMethod,
  tsaAgreed,
  setTsaAgreed,
  onInvest,
  compact = false,
}: {
  investAmount: number;
  setInvestAmount: (v: number) => void;
  paymentMethod: 'card' | 'crypto';
  setPaymentMethod: (v: 'card' | 'crypto') => void;
  tsaAgreed: boolean;
  setTsaAgreed: (v: boolean) => void;
  onInvest: () => void;
  compact?: boolean;
}) {
  const shares = Math.floor(investAmount / property.pricePerShare);
  const monthlyIncome = ((property.monthlyRent / property.totalShares) * shares).toFixed(2);
  const annualReturn = (shares * property.pricePerShare * (property.annualYield / 100)).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Share price */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Share price</span>
        <span className="text-xl font-bold">${property.pricePerShare}</span>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <Progress value={fundedPercent} className="h-2.5" />
        <p className="text-xs text-muted-foreground">
          {fundedPercent}% funded &middot; {sharesRemaining} remaining
        </p>
      </div>

      {/* Dollar input */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Investment amount</label>
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-primary">
          <span className="text-sm font-semibold text-muted-foreground">$</span>
          <input
            type="number"
            min={0}
            value={investAmount || ''}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setInvestAmount(isNaN(v) ? 0 : Math.max(0, v));
            }}
            placeholder="500"
            className="flex-1 bg-transparent text-lg font-semibold outline-none"
          />
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            = {shares} share{shares !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Live preview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-[11px] text-muted-foreground">Est. monthly income</p>
          <p className="text-sm font-bold text-primary">${monthlyIncome}</p>
        </div>
        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-[11px] text-muted-foreground">Est. annual return</p>
          <p className="text-sm font-bold text-primary">${annualReturn}</p>
        </div>
      </div>

      {/* Payment method */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Payment method</label>
        <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2')}>
          <button
            onClick={() => setPaymentMethod('card')}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all',
              paymentMethod === 'card'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <CreditCard className="h-4 w-4" />
            <div>
              <p className="text-sm font-medium">Card</p>
              <p className="text-[10px] text-muted-foreground">Visa / MC</p>
            </div>
          </button>
          <button
            onClick={() => setPaymentMethod('crypto')}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all',
              paymentMethod === 'crypto'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <Coins className="h-4 w-4" />
            <div>
              <p className="text-sm font-medium">Crypto</p>
              <p className="text-[10px] text-muted-foreground">USDC / BNB</p>
            </div>
          </button>
        </div>
      </div>

      {/* TSA */}
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={tsaAgreed}
          onChange={(e) => setTsaAgreed(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-xs text-muted-foreground">
          I agree to the{' '}
          <a href="#" className="text-primary underline hover:no-underline">
            Token Sale Agreement
          </a>{' '}
          and terms of investment.
        </span>
      </label>

      {/* CTA */}
      <Button
        className="w-full gap-2"
        size="lg"
        disabled={!tsaAgreed || shares < 1}
        onClick={onInvest}
      >
        <Shield className="h-4 w-4" />
        Secure Your Shares
      </Button>

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        Protected by smart contract on BNB Chain
      </div>
    </div>
  );
}

function DescriptionHighlights() {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>About This Property</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="leading-relaxed text-muted-foreground">{property.description}</p>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Highlights</h4>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {property.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfitCalculator({
  initialCalcAmount,
  setInitialCalcAmount,
}: {
  initialCalcAmount: number;
  setInitialCalcAmount: (v: number) => void;
}) {
  const appreciationRate = 5.2;
  const dividendYield = property.annualYield;
  const holdingYears = 5;
  const totalAnnualRate = appreciationRate + dividendYield;

  const projections = Array.from({ length: holdingYears }, (_, i) => {
    const year = i + 1;
    const value = initialCalcAmount * Math.pow(1 + totalAnnualRate / 100, year);
    return { year, value: Math.round(value) };
  });

  const maxValue = projections[projections.length - 1]?.value ?? initialCalcAmount;
  const totalROI = maxValue > 0 ? (((maxValue - initialCalcAmount) / initialCalcAmount) * 100).toFixed(1) : '0';
  const sharesCalc = Math.floor(initialCalcAmount / property.pricePerShare);
  const monthlyIncome = ((property.monthlyRent / property.totalShares) * sharesCalc).toFixed(2);
  const yearlyIncome = (sharesCalc * property.pricePerShare * (dividendYield / 100)).toFixed(2);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          How much can you earn?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Initial Amount</label>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-primary">
            <span className="text-sm font-semibold text-muted-foreground">$</span>
            <input
              type="number"
              min={0}
              value={initialCalcAmount || ''}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setInitialCalcAmount(isNaN(v) ? 0 : Math.max(0, v));
              }}
              className="flex-1 bg-transparent text-lg font-semibold outline-none"
            />
          </div>
        </div>

        {/* Rates */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center dark:bg-muted/30">
            <p className="text-[11px] text-muted-foreground">Appreciation</p>
            <p className="text-sm font-bold">{appreciationRate}%</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center dark:bg-muted/30">
            <p className="text-[11px] text-muted-foreground">Dividend Yield</p>
            <p className="text-sm font-bold">{dividendYield}%</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center dark:bg-muted/30">
            <p className="text-[11px] text-muted-foreground">Hold Period</p>
            <p className="text-sm font-bold">{holdingYears} years</p>
          </div>
        </div>

        {/* CSS Bar Chart */}
        <div>
          <p className="mb-3 text-sm font-medium">Year-by-Year Projection</p>
          <div className="flex items-end justify-between gap-3" style={{ height: 160 }}>
            {projections.map((p) => {
              const heightPct = maxValue > 0 ? (p.value / maxValue) * 100 : 0;
              return (
                <div key={p.year} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-primary">
                    ${(p.value / 1000).toFixed(1)}k
                  </span>
                  <div
                    className="w-full rounded-t bg-primary transition-all"
                    style={{ height: `${heightPct}%`, minHeight: 8 }}
                  />
                  <span className="text-[11px] text-muted-foreground">Y{p.year}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-[11px] text-muted-foreground">ROI</p>
            <p className="text-sm font-bold text-primary">{totalROI}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] text-muted-foreground">Monthly Income</p>
            <p className="text-sm font-bold">${monthlyIncome}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] text-muted-foreground">Yearly Income</p>
            <p className="text-sm font-bold">${yearlyIncome}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] text-muted-foreground">Total Value (5Y)</p>
            <p className="text-sm font-bold text-primary">${maxValue.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivityTable() {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDot className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Event</th>
                <th className="pb-2 pr-4 font-medium">Price</th>
                <th className="pb-2 pr-4 font-medium">From</th>
                <th className="pb-2 pr-4 font-medium">To</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {mockActivity.map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 pr-4">
                    <Badge variant="secondary" className="text-xs">
                      {row.event}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 font-medium">{row.price}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.from}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs">{row.to}</td>
                  <td className="py-2.5 text-muted-foreground">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentsSection() {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {property.documents.map((doc) => (
          <div
            key={doc}
            className="flex items-center justify-between rounded-lg border px-4 py-3 transition hover:bg-muted/50 dark:hover:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{doc}</span>
            </div>
            <Button size="sm" variant="ghost" className="gap-1 text-xs">
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        ))}
        <p className="pt-1 text-xs text-muted-foreground italic">
          Full documents available to partners only.
        </p>
      </CardContent>
    </Card>
  );
}

function AgentReferralLink() {
  const [copied, setCopied] = useState(false);
  const referralUrl = `https://hub.nfstay.com/invest?ref=YOUR_WALLET&property=${property.id}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [referralUrl]);

  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center gap-3 p-4">
        <Users className="h-5 w-5 flex-shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Agent Referral Link</p>
          <p className="truncate text-xs text-muted-foreground">{referralUrl}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-primary" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// VERSION 1 — Hero Invest Split
// ---------------------------------------------------------------------------

function Version1({
  jvExpanded,
  setJvExpanded,
  currentImage,
  setCurrentImage,
  investAmount,
  setInvestAmount,
  paymentMethod,
  setPaymentMethod,
  tsaAgreed,
  setTsaAgreed,
  onInvest,
  initialCalcAmount,
  setInitialCalcAmount,
}: {
  jvExpanded: boolean;
  setJvExpanded: (v: boolean) => void;
  currentImage: number;
  setCurrentImage: (i: number) => void;
  investAmount: number;
  setInvestAmount: (v: number) => void;
  paymentMethod: 'card' | 'crypto';
  setPaymentMethod: (v: 'card' | 'crypto') => void;
  tsaAgreed: boolean;
  setTsaAgreed: (v: boolean) => void;
  onInvest: () => void;
  initialCalcAmount: number;
  setInitialCalcAmount: (v: number) => void;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* JV Banner */}
      <div
        className={cn(
          'mb-8 rounded-2xl border transition-all duration-300',
          'border-primary/30 bg-primary/[0.02]',
          jvExpanded
            ? 'shadow-[0_0_20px_rgba(56,161,105,0.15)]'
            : 'shadow-[0_0_10px_rgba(56,161,105,0.08)] hover:shadow-[0_0_20px_rgba(56,161,105,0.18)]'
        )}
      >
        <button
          onClick={() => setJvExpanded(!jvExpanded)}
          className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-primary/[0.02] rounded-2xl"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-2 ring-primary/20">
            <Users className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Active JV Partnership</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You are part of the decision-making. Tap to see how it works.
            </p>
          </div>
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
              'bg-primary/10 text-primary',
              'group-hover:bg-primary/15 group-hover:ring-1 group-hover:ring-primary/30'
            )}
          >
            <span>See how it works</span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-300',
                jvExpanded && 'rotate-180'
              )}
            />
          </div>
        </button>

        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-out',
            jvExpanded ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="px-5 pb-6 pt-1">
            {/* Separator */}
            <div className="mb-5 h-px bg-border/60" />

            {/* Your Role + How It Works layout */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">

              {/* YOUR ROLE — standalone card */}
              <div className="lg:col-span-3">
                <div className="h-full rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 mb-3">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold mb-1.5">Your Role</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    When you invest in this property, you become part of the partnership and take part in important decisions.
                  </p>
                </div>
              </div>

              {/* HOW IT WORKS — 3 step cards */}
              <div className="lg:col-span-9">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  How it works
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {jvSteps.map((s) => (
                    <div key={s.step} className="rounded-xl border bg-background p-4 relative">
                      {/* Step number */}
                      <div className="absolute -top-2.5 left-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {s.step}
                      </div>
                      <div className="flex items-center gap-2 mb-2 mt-1">
                        <s.icon className="h-4 w-4 text-primary flex-shrink-0" />
                        <p className="text-sm font-semibold">{s.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Examples + Management note */}
            <div className="mt-5 rounded-xl bg-muted/40 dark:bg-muted/20 px-4 py-3.5">
              <p className="text-xs font-semibold text-foreground mb-2">
                Examples of decisions you may vote on
              </p>
              <div className="flex flex-wrap gap-2">
                {jvExamples.map((ex) => (
                  <span
                    key={ex}
                    className="inline-flex items-center gap-1 rounded-full bg-background border px-3 py-1 text-[11px] text-muted-foreground"
                  >
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    {ex}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
                Management starts with NFsTay. If the majority votes to change it, it changes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT */}
        <div className="space-y-5 lg:col-span-7">
          <ImageCarousel
            currentImage={currentImage}
            setCurrentImage={setCurrentImage}
            aspectClass="aspect-[3/2]"
          />

          <div>
            <h1 className="text-2xl font-bold">{property.title}</h1>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {property.location}
            </div>
          </div>

          <PropertyBadges />
          <MetricPills />
        </div>

        {/* RIGHT — Sticky Invest Card */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            <Card className="rounded-2xl shadow-lg">
              <CardContent className="pt-5">
                <InvestCardContent
                  investAmount={investAmount}
                  setInvestAmount={setInvestAmount}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  tsaAgreed={tsaAgreed}
                  setTsaAgreed={setTsaAgreed}
                  onInvest={onInvest}
                  compact
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Full-width sections below */}
      <div className="mt-8 space-y-6">
        <DescriptionHighlights />
        <ProfitCalculator
          initialCalcAmount={initialCalcAmount}
          setInitialCalcAmount={setInitialCalcAmount}
        />
        <RecentActivityTable />
        <DocumentsSection />
        <AgentReferralLink />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 2 — JV-First Narrative Flow
// ---------------------------------------------------------------------------

function Version2({
  currentImage,
  setCurrentImage,
  investAmount,
  setInvestAmount,
  paymentMethod,
  setPaymentMethod,
  tsaAgreed,
  setTsaAgreed,
  onInvest,
  initialCalcAmount,
  setInitialCalcAmount,
}: {
  currentImage: number;
  setCurrentImage: (i: number) => void;
  investAmount: number;
  setInvestAmount: (v: number) => void;
  paymentMethod: 'card' | 'crypto';
  setPaymentMethod: (v: 'card' | 'crypto') => void;
  tsaAgreed: boolean;
  setTsaAgreed: (v: boolean) => void;
  onInvest: () => void;
  initialCalcAmount: number;
  setInitialCalcAmount: (v: number) => void;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* SECTION 1: JV Hero — always open */}
      <div className="mb-10 rounded-2xl border-l-4 border-primary bg-primary/[0.03] p-6 sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Join a Real Estate Partnership</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          This isn't passive investing. You become an active partner with voting rights on
          every major property decision.
        </p>

        {/* Your Role + How It Works */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Your Role */}
          <div className="lg:col-span-3">
            <div className="h-full rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 mb-3">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold mb-1.5">Your Role</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When you invest in this property, you become part of the partnership and take part in important decisions.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="lg:col-span-9">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              How it works
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {jvSteps.map((s) => (
                <div key={s.step} className="rounded-xl border bg-background p-4 relative">
                  <div className="absolute -top-2.5 left-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {s.step}
                  </div>
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    <s.icon className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-semibold">{s.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Examples + Management note */}
        <div className="mt-5 rounded-xl bg-muted/40 dark:bg-muted/20 px-4 py-3.5">
          <p className="text-xs font-semibold text-foreground mb-2">
            Examples of decisions you may vote on
          </p>
          <div className="flex flex-wrap gap-2">
            {jvExamples.map((ex) => (
              <span
                key={ex}
                className="inline-flex items-center gap-1 rounded-full bg-background border px-3 py-1 text-[11px] text-muted-foreground"
              >
                <CheckCircle2 className="h-3 w-3 text-primary" />
                {ex}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
            Management starts with NFsTay. If the majority votes to change it, it changes.
          </p>
        </div>
      </div>

      {/* SECTION 2: Property Showcase */}
      <div className="mb-10 space-y-4">
        <ImageCarousel
          currentImage={currentImage}
          setCurrentImage={setCurrentImage}
          aspectClass="aspect-[16/9]"
          overlay
        />
        <PropertyBadges />
        <MetricPills />
      </div>

      {/* SECTION 3: Invest Card — centered, not sticky */}
      <div className="mx-auto mb-10 max-w-lg">
        <Card className="rounded-2xl shadow-lg">
          <CardContent className="pt-5">
            <InvestCardContent
              investAmount={investAmount}
              setInvestAmount={setInvestAmount}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              tsaAgreed={tsaAgreed}
              setTsaAgreed={setTsaAgreed}
              onInvest={onInvest}
            />
          </CardContent>
        </Card>
      </div>

      {/* SECTION 4-8 */}
      <div className="space-y-6">
        <DescriptionHighlights />
        <ProfitCalculator
          initialCalcAmount={initialCalcAmount}
          setInitialCalcAmount={setInitialCalcAmount}
        />
        <RecentActivityTable />
        <DocumentsSection />
        <AgentReferralLink />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InvestMarketplacePage() {
  const version = 1 as const;
  const [jvExpanded, setJvExpanded] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [investAmount, setInvestAmount] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');
  const [tsaAgreed, setTsaAgreed] = useState(false);
  const [investOpen, setInvestOpen] = useState(false);
  const [initialCalcAmount, setInitialCalcAmount] = useState(1000);

  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % property.images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleInvest = () => {
    const shares = Math.floor(investAmount / property.pricePerShare);
    if (shares < 1) return;
    setInvestOpen(true);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Version1
        jvExpanded={jvExpanded}
        setJvExpanded={setJvExpanded}
        currentImage={currentImage}
        setCurrentImage={setCurrentImage}
        investAmount={investAmount}
        setInvestAmount={setInvestAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        tsaAgreed={tsaAgreed}
        setTsaAgreed={setTsaAgreed}
        onInvest={handleInvest}
        initialCalcAmount={initialCalcAmount}
        setInitialCalcAmount={setInitialCalcAmount}
      />

      <InvestModal open={investOpen} onOpenChange={setInvestOpen} />
    </div>
  );
}
