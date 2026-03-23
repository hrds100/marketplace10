import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useInvestProperties, useMyAffiliateProfile } from '@/hooks/useInvestData';
import { useBlockchain } from '@/hooks/useBlockchain';
import { useAuth } from '@/hooks/useAuth';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  Loader2,
} from 'lucide-react';
import { SUBGRAPHS } from '@/lib/particle';

// ---------------------------------------------------------------------------
// Shared property interface used by all sub-components
// ---------------------------------------------------------------------------

interface PropertyData {
  id: number;
  title: string;
  location: string;
  country: string;
  image: string;
  images: string[];
  pricePerShare: number;
  totalShares: number;
  sharesSold: number;
  monthlyRent: number;
  annualYield: number;
  occupancyRate: number;
  propertyValue: number;
  type: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  yearBuilt: number;
  status: string;
  description: string;
  highlights: string[];
  documents: string[];
  propertyDocs: { name: string; url: string; path?: string }[];
  appreciationRate: number;
  blockchain_property_id?: number;
  rentCost?: number;
}

// ---------------------------------------------------------------------------
// Blockchain indicator dot
// ---------------------------------------------------------------------------

function BlockchainDot({ tooltip }: { tooltip?: string }) {
  return (
    <span className="relative inline-flex ml-1" title={tooltip || 'From blockchain'}>
      <span className="h-1 w-1 rounded-full bg-green-500" />
      <span className="absolute h-1 w-1 rounded-full bg-green-500 animate-ping opacity-50" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Constants & Mock Data
// ---------------------------------------------------------------------------

// Activity type for real data from The Graph
interface Activity {
  event: string;
  price: string;
  shares: string;
  from: string;
  to: string;
  date: string;
  txHash: string;
}

async function fetchRecentPurchases(): Promise<Activity[]> {
  const res = await fetch(SUBGRAPHS.MARKETPLACE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `{
        primarySharesBoughts(first: 10, orderBy: blockTimestamp, orderDirection: desc) {
          _buyer
          _propertyId
          _sharesBought
          _amount
          blockTimestamp
          transactionHash
        }
      }`,
    }),
  });
  const data = await res.json();
  return (data.data?.primarySharesBoughts || []).map((p: any) => ({
    event: 'Purchase',
    price: `$${(parseInt(p._amount) / 1e18).toFixed(0)}`,
    shares: p._sharesBought,
    from: 'Market',
    to: `${p._buyer.slice(0, 6)}...${p._buyer.slice(-4)}`,
    date: new Date(parseInt(p.blockTimestamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    txHash: p.transactionHash,
  }));
}

const jvSteps = [
  {
    step: 1,
    icon: FileText,
    title: 'A decision is proposed',
    desc: 'You, another partner, or the management team can propose something, like replacing a bed, upgrading furniture, increasing the Airbnb nightly rate, changing the management company, or even proposing yourself as the new manager.',
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

interface InvestModalProperty {
  id: number;
  title: string;
  pricePerShare: number;
  totalShares: number;
  monthlyRent: number;
  annualYield: number;
  blockchain_property_id?: number;
}

function InvestModal({
  open,
  onOpenChange,
  property,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  property: InvestModalProperty;
}) {
  const [shares, setShares] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const { buyShares, loading: blockchainLoading } = useBlockchain();

  const total = shares * property.pricePerShare;
  const monthlyIncome = (total * (property.annualYield / 100)).toFixed(2);
  const annualReturn = (parseFloat(monthlyIncome) * 12).toFixed(2);

  const handleClose = (v: boolean) => {
    if (!v) {
      setShares(1);
    }
    onOpenChange(v);
  };

  return (
    <>
    {/* Congratulations overlay — separate from invest dialog so it survives dialog close */}
    {confirmed && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        {/* Confetti */}
        <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="absolute animate-confetti-particle" style={{
              left: `${Math.random() * 100}%`, top: '-10px',
              width: `${6 + Math.random() * 8}px`, height: `${6 + Math.random() * 8}px`,
              backgroundColor: ['#00D084', '#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#3B82F6'][i % 6],
              animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 2}s`,
            }} />
          ))}
        </div>
        <div className="w-full max-w-sm mx-4 bg-white rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
          {/* Gradient header */}
          <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 min-h-[130px] overflow-hidden">
            <div className="absolute w-[300px] h-[300px] opacity-15 -top-[100px] -left-[140px] rounded-full bg-white/30" />
            <div className="absolute w-[200px] h-[200px] opacity-10 -bottom-[80px] -right-[60px] rounded-full bg-white/30" />
            <div className="absolute top-5 left-8 text-2xl animate-bounce">🎉</div>
            <div className="absolute top-4 right-10 text-2xl animate-bounce" style={{ animationDelay: '0.3s' }}>🎊</div>
            <div className="absolute bottom-5 left-1/3 text-xl animate-bounce" style={{ animationDelay: '0.6s' }}>✨</div>
            <div className="absolute top-6 left-1/2 text-lg animate-bounce" style={{ animationDelay: '0.9s' }}>🥳</div>
          </div>
          {/* Icon circle */}
          <div className="flex justify-center -mt-12 relative z-10">
            <div className="w-24 h-24 rounded-full backdrop-blur-lg bg-white/30 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg">
                <span className="text-4xl">🏠</span>
              </div>
            </div>
          </div>
          {/* Content */}
          <div className="px-8 pb-8 pt-2 flex flex-col items-center text-center gap-3">
            <h1 className="text-2xl font-bold">Congratulations!</h1>
            <p className="text-muted-foreground">
              You secured <strong className="text-foreground">{shares} allocation{shares > 1 ? 's' : ''}</strong> in {property.title}!
            </p>
            <div className="rounded-xl bg-muted/50 p-4 w-full space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total invested</span>
                <span className="font-bold">${total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. monthly income</span>
                <span className="font-bold text-emerald-600">${monthlyIncome}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              We're thrilled to welcome you as our Partner!
            </p>
            <Button
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full h-11 font-semibold mt-2"
              onClick={() => {
                setConfirmed(false);
                window.location.href = '/dashboard/invest/portfolio';
              }}
            >
              View Portfolio
            </Button>
          </div>
        </div>
      </div>
    )}

    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {'Invest in ' + property.title}
          </DialogTitle>
        </DialogHeader>

        <>
            <div className="space-y-5 py-2">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 dark:bg-muted/30">
                <span className="text-sm text-muted-foreground">Allocation price</span>
                <span className="text-lg font-bold">${property.pricePerShare}</span>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Number of allocations</label>
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
              <Button
                className="gap-2"
                disabled={blockchainLoading}
                onClick={async () => {
                  try {
                    await buyShares(property.blockchain_property_id || property.id, shares, total);
                    // Close invest dialog, then show congratulations overlay
                    onOpenChange(false);
                    setConfirmed(true); import('@/lib/celebration').then(m => m.playCelebrationSound());
                    // Refetch activity + blockchain stats — fire at 3s, 8s, 15s for Graph indexing
                    [3000, 8000, 15000].forEach(delay => {
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('invest-purchase-complete'));
                      }, delay);
                    });
                  } catch (err: any) {
                    const msg = err?.message || 'Transaction failed. Please try again.';
                    console.error('[Marketplace] Buy failed:', err);
                    toast.error(msg);
                  }
                }}
              >
                <Shield className="h-4 w-4" />
                {blockchainLoading ? 'Processing on-chain...' : 'Confirm Investment'}
              </Button>
            </DialogFooter>
          </>
      </DialogContent>
    </Dialog>
    </>
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
  property,
  currentImage,
  setCurrentImage,
  aspectClass = 'aspect-[3/2]',
  overlay = false,
}: {
  property: PropertyData;
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

function PropertyBadges({ property }: { property: PropertyData }) {
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

function MetricPills({ property }: { property: PropertyData }) {
  const metrics = [
    { icon: TrendingUp, label: 'Yield', value: `${property.annualYield}%` },
    { icon: BarChart3, label: 'Occupancy', value: `${property.occupancyRate}%` },
    { icon: DollarSign, label: 'Rent Cost', value: `\u00A3${(property as any).rentCost?.toLocaleString() || '3,500'}` },
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
  property,
  fundedPercent,
  sharesRemaining,
  investAmount,
  setInvestAmount,
  paymentMethod,
  setPaymentMethod,
  tsaAgreed,
  setTsaAgreed,
  onInvest,
  compact = false,
  totalOwners = 0,
}: {
  property: PropertyData;
  fundedPercent: number;
  sharesRemaining: number;
  investAmount: number;
  setInvestAmount: (v: number) => void;
  paymentMethod: 'card' | 'crypto';
  setPaymentMethod: (v: 'card' | 'crypto') => void;
  tsaAgreed: boolean;
  setTsaAgreed: (v: boolean) => void;
  onInvest: () => void;
  compact?: boolean;
  totalOwners?: number;
}) {
  const shares = Math.floor(investAmount / property.pricePerShare);
  const investTotal = shares * property.pricePerShare;
  const monthlyIncome = (investTotal * (property.annualYield / 100)).toFixed(2);
  const annualReturn = (parseFloat(monthlyIncome) * 12).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Allocation price */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Allocation price</span>
        <span className="text-xl font-bold">${property.pricePerShare}</span>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <Progress value={fundedPercent} className="h-2.5" />
        <p className="text-xs text-muted-foreground">
          {property.sharesSold.toLocaleString()} allocations sold<BlockchainDot tooltip="Allocations sold from blockchain" /> &middot; {sharesRemaining.toLocaleString()} remaining
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Owners<BlockchainDot tooltip="Owner count from blockchain" /></p>
          <p className="text-sm font-bold">{totalOwners}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Total Allocations<BlockchainDot tooltip="Deal price at $1/allocation from blockchain" /></p>
          <p className="text-sm font-bold">{property.totalShares.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Remaining<BlockchainDot tooltip="From marketplace contract" /></p>
          <p className="text-sm font-bold">{sharesRemaining.toLocaleString()}</p>
        </div>
      </div>

      {/* Dollar input */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Contribution amount</label>
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
            = {shares} allocation{shares !== 1 ? 's' : ''}
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
              'flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-all',
              paymentMethod === 'card'
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <img src="/images/payment/visa.svg" alt="Visa" className="h-5 w-auto" />
              <img src="/images/payment/mc.svg" alt="Mastercard" className="h-5 w-auto" />
            </div>
            <div>
              <p className="text-sm font-medium">Credit / Debit Card</p>
            </div>
          </button>
          <button
            onClick={() => setPaymentMethod('crypto')}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-all',
              paymentMethod === 'crypto'
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <img src="/images/payment/usdc.svg" alt="USDC" className="h-5 w-5 rounded-full" />
              <img src="/images/payment/bnb.webp" alt="BNB" className="h-5 w-5 rounded-full" />
            </div>
            <div>
              <p className="text-sm font-medium">Cryptocurrency</p>
            </div>
          </button>
        </div>
      </div>

      {/* TSA */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <button
          type="button"
          role="checkbox"
          aria-checked={tsaAgreed}
          onClick={() => setTsaAgreed(!tsaAgreed)}
          className={cn(
            'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200',
            tsaAgreed
              ? 'border-primary bg-primary'
              : 'border-muted-foreground/30 bg-background hover:border-primary/50 group-hover:border-primary/50'
          )}
        >
          {tsaAgreed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </button>
        <span className="text-xs text-muted-foreground leading-relaxed">
          I agree to the{' '}
          <a href="#" className="text-primary font-medium underline decoration-primary/30 hover:decoration-primary transition-colors">
            Token Sale Agreement
          </a>{' '}
          and terms of partnership.
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
        Secure Your Allocations
      </Button>

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        Protected by smart contract on BNB Chain
      </div>
    </div>
  );
}

function DescriptionHighlights({ property }: { property: PropertyData }) {
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
  property,
  initialCalcAmount,
  setInitialCalcAmount,
}: {
  property: PropertyData;
  initialCalcAmount: number;
  setInitialCalcAmount: (v: number) => void;
}) {
  const [chartVersion, setChartVersion] = useState(1);
  const monthlyYield = property.annualYield; // DB field stores monthly yield % (e.g. 9.63)
  const annualizedYield = monthlyYield * 12; // e.g. 115.56%
  const holdingYears = 6;

  // Legacy-style linear projection (not compound)
  const sharesCalc = Math.floor(initialCalcAmount / property.pricePerShare);
  const calcInvestTotal = sharesCalc * property.pricePerShare;
  const monthlyIncome = (calcInvestTotal * (monthlyYield / 100)).toFixed(2);
  const yearlyIncome = (parseFloat(monthlyIncome) * 12).toFixed(2);

  const projections = Array.from({ length: holdingYears }, (_, i) => {
    const year = i + 1;
    const value = calcInvestTotal + (parseFloat(yearlyIncome) * year);
    return { year, value: Math.round(value) };
  });

  const maxValue = projections[projections.length - 1]?.value ?? calcInvestTotal;
  const totalROI = calcInvestTotal > 0 ? ((annualizedYield * holdingYears)).toFixed(1) : '0';
  const totalGain = maxValue - calcInvestTotal;

  const quickAmounts = [500, 1000, 2500, 5000];

  // Chart version renderers
  function ChartV1() {
    // Stacked horizontal bars — each year as a full-width row
    return (
      <div className="space-y-2">
        {[{ year: 0, value: initialCalcAmount, label: 'Today' }, ...projections.map(p => ({ ...p, label: `Year ${p.year}` }))].map((p) => {
          const widthPct = maxValue > 0 ? (p.value / maxValue) * 100 : 0;
          const gain = p.value - initialCalcAmount;
          return (
            <div key={p.label} className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground w-12 text-right shrink-0">{p.label}</span>
              <div className="flex-1 h-8 rounded-lg bg-muted/30 dark:bg-muted/20 overflow-hidden relative">
                <div
                  className={cn('h-full rounded-lg transition-all duration-700 flex items-center px-3', p.year === 0 ? 'bg-muted-foreground/20' : 'bg-gradient-to-r from-primary to-primary/70')}
                  style={{ width: `${Math.max(widthPct, 8)}%` }}
                >
                  <span className={cn('text-[11px] font-bold whitespace-nowrap', p.year === 0 ? 'text-muted-foreground' : 'text-white')}>
                    ${(p.value / 1000).toFixed(1)}k
                  </span>
                </div>
                {gain > 0 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-primary font-medium">
                    +${(gain / 1000).toFixed(1)}k
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function ChartV2() {
    // Area-style stepped line using CSS
    const points = [{ year: 0, value: initialCalcAmount }, ...projections];
    return (
      <div className="relative rounded-xl bg-gradient-to-b from-primary/5 to-transparent border p-4" style={{ height: 200 }}>
        <div className="absolute inset-x-4 bottom-8 top-4 flex items-end">
          {points.map((p, i) => {
            const heightPct = maxValue > 0 ? (p.value / maxValue) * 100 : 10;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                <div className="absolute -top-1 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity bg-background rounded px-1.5 py-0.5 shadow-sm z-10">
                  ${p.value.toLocaleString()}
                </div>
                <div className="w-full bg-primary/15 relative" style={{ height: `${heightPct}%`, minHeight: 4 }}>
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background z-10" />
                </div>
              </div>
            );
          })}
        </div>
        <div className="absolute inset-x-4 bottom-2 flex">
          {points.map((p, i) => (
            <span key={i} className="flex-1 text-center text-[10px] font-medium text-muted-foreground">
              {p.year === 0 ? 'Now' : `Y${p.year}`}
            </span>
          ))}
        </div>
      </div>
    );
  }

  function ChartV3() {
    // Big number cards — each year as a card in a row
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[{ year: 0, value: initialCalcAmount }, ...projections].map((p) => {
          const gain = p.value - initialCalcAmount;
          const gainPct = initialCalcAmount > 0 ? ((gain / initialCalcAmount) * 100).toFixed(0) : '0';
          return (
            <div key={p.year} className={cn('rounded-xl p-3 text-center transition-all', p.year === 0 ? 'bg-muted/40 dark:bg-muted/20' : 'border border-primary/15 bg-primary/[0.03]')}>
              <p className="text-[10px] font-medium text-muted-foreground mb-1">{p.year === 0 ? 'Today' : `Year ${p.year}`}</p>
              <p className={cn('text-sm font-bold', p.year === 0 ? 'text-foreground' : 'text-primary')}>${(p.value / 1000).toFixed(1)}k</p>
              {gain > 0 && <p className="text-[9px] text-primary mt-0.5">+{gainPct}%</p>}
            </div>
          );
        })}
      </div>
    );
  }

  function ChartV4() {
    // Single hero comparison: Today vs Year 5 with arrow
    return (
      <div className="flex items-center justify-center gap-6 py-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">You invest</p>
          <p className="text-3xl font-bold">${(initialCalcAmount / 1000).toFixed(1)}k</p>
          <p className="text-xs text-muted-foreground mt-1">Today</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ArrowRight className="h-6 w-6 text-primary" />
          <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">5 years</span>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">You could have</p>
          <p className="text-3xl font-bold text-primary">${(maxValue / 1000).toFixed(1)}k</p>
          <p className="text-xs text-primary mt-1 font-semibold">+{totalROI}% return</p>
        </div>
      </div>
    );
  }

  function ChartV5() {
    // Timeline with connecting line and milestone dots
    return (
      <div className="relative py-2">
        {/* Connecting line */}
        <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-gradient-to-r from-muted-foreground/20 via-primary/50 to-primary" />
        <div className="flex justify-between relative">
          {[{ year: 0, value: initialCalcAmount }, ...projections].map((p, i) => {
            const gain = p.value - initialCalcAmount;
            return (
              <div key={p.year} className="flex flex-col items-center relative z-10">
                <div className={cn('text-center mb-2', i === 0 ? '' : 'text-primary')}>
                  <p className="text-xs font-bold">${(p.value / 1000).toFixed(1)}k</p>
                  {gain > 0 && <p className="text-[9px] text-primary">+${(gain / 1000).toFixed(1)}k</p>}
                </div>
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 border-background',
                  i === 0 ? 'bg-muted-foreground/30' : 'bg-primary',
                  i === projections.length ? 'ring-4 ring-primary/20' : ''
                )} />
                <p className="text-[10px] font-medium text-muted-foreground mt-2">{p.year === 0 ? 'Now' : `Y${p.year}`}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChart className="h-5 w-5 text-primary" />
          How much can you earn?
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          See your projected returns based on historical performance.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount input — compact with quick-select pills */}
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-xl border bg-muted/30 px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary w-44">
              <span className="text-base font-semibold text-muted-foreground">$</span>
              <input
                type="number"
                min={0}
                value={initialCalcAmount || ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setInitialCalcAmount(isNaN(v) ? 0 : Math.max(0, v));
                }}
                className="w-full bg-transparent text-base font-bold outline-none"
                placeholder="1,000"
              />
            </div>
            <div className="flex gap-1.5">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setInitialCalcAmount(amt)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-xs font-medium transition-all',
                    initialCalcAmount === amt
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground dark:bg-muted/30'
                  )}
                >
                  ${amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            = {sharesCalc} allocation{sharesCalc !== 1 ? 's' : ''} at ${property.pricePerShare}/allocation
          </p>
        </div>

        {/* Chart + Results side by side */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {/* Left — Chart (3 cols) */}
          <div className="lg:col-span-3 rounded-xl border bg-muted/10 dark:bg-muted/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold">6-Year Projection</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {monthlyYield}%/mo &middot; {annualizedYield.toFixed(1)}%/yr
                </span>
              </div>
            </div>

            {/* Versioned chart */}
            {chartVersion === 1 && <ChartV1 />}
            {chartVersion === 2 && <ChartV2 />}
            {chartVersion === 3 && <ChartV3 />}
            {chartVersion === 4 && <ChartV4 />}
            {chartVersion === 5 && <ChartV5 />}

            {/* Version arrows */}
            <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-border/40">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setChartVersion(v)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    chartVersion === v
                      ? 'bg-primary w-5'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                  aria-label={`Chart style ${v}`}
                />
              ))}
            </div>
          </div>

          {/* Right — Results (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Return (6 Years)</p>
              <p className="text-2xl font-bold text-primary">{totalROI}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                ${initialCalcAmount.toLocaleString()} &rarr; ${maxValue.toLocaleString()}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border p-3">
                <p className="text-[11px] text-muted-foreground mb-0.5">Monthly</p>
                <p className="text-base font-bold">${monthlyIncome}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-[11px] text-muted-foreground mb-0.5">Yearly</p>
                <p className="text-base font-bold">${yearlyIncome}</p>
              </div>
            </div>
            <div className="rounded-xl bg-muted/50 dark:bg-muted/30 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Year 6 Value</p>
                  <p className="text-lg font-bold text-primary">${maxValue.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Total Gain</p>
                  <p className="text-sm font-bold text-primary">+${totalGain.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Based on {monthlyYield}% monthly yield ({annualizedYield.toFixed(1)}% annual). Past performance does not guarantee future results.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivityTable() {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const loadActivity = useCallback(() => {
    fetchRecentPurchases()
      .then(setActivity)
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, []);

  useEffect(() => {
    loadActivity();
    // Refresh when a purchase completes
    const handler = () => loadActivity();
    window.addEventListener('invest-purchase-complete', handler);
    return () => window.removeEventListener('invest-purchase-complete', handler);
  }, [loadActivity]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDot className="h-5 w-5 text-primary" />
          Recent Activity
          <BlockchainDot tooltip="Live on-chain data" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activityLoading ? (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading activity...</span>
          </div>
        ) : activity.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No recent activity found.</p>
        ) : (
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
                {activity.map((row, i) => (
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
        )}
      </CardContent>
    </Card>
  );
}

function DocumentsSection({ property }: { property: PropertyData }) {
  // Prefer new property_docs (has URLs); fall back to legacy documents[] (names only)
  const hasDocs = property.propertyDocs && property.propertyDocs.length > 0;
  const legacyDocs = property.documents || [];

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {hasDocs
            ? property.propertyDocs.map((doc) => (
                <a
                  key={doc.path || doc.url}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center rounded-lg border px-4 py-3 hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{doc.name}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </a>
              ))
            : legacyDocs.map((doc) => (
                <div
                  key={doc}
                  className="flex items-center rounded-lg border px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{doc}</span>
                  </div>
                </div>
              ))}
        </div>
        <p className="text-xs text-muted-foreground italic">
          Full documents available to partners only.
        </p>
      </CardContent>
    </Card>
  );
}

function AgentReferralLink({ property }: { property: PropertyData }) {
  const [copied, setCopied] = useState(false);
  const { data: affProfile, isLoading: affLoading } = useMyAffiliateProfile();
  const referralUrl = affProfile?.referral_code
    ? `https://hub.nfstay.com/invest?ref=${affProfile.referral_code}&property=${property.id}`
    : null;

  const handleCopy = useCallback(() => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [referralUrl]);

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left — CTA copy */}
          <div className="p-6 flex flex-col justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-3">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-1">Work with us</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Share your personal link with friends and earn instant commission on every partnership they join.
            </p>
          </div>

          {/* Right — Link + copy */}
          <div className="p-6 bg-muted/30 dark:bg-muted/15 border-t lg:border-t-0 lg:border-l border-border/50 flex flex-col justify-center gap-3">
            <p className="text-xs font-medium text-muted-foreground">Your referral link</p>
            {affLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : referralUrl ? (
              <>
                <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5">
                  <p className="truncate text-xs text-muted-foreground flex-1 font-mono">{referralUrl}</p>
                  <Button
                    size="sm"
                    className={cn(
                      "gap-1.5 text-xs transition-all flex-shrink-0",
                      copied
                        ? "bg-primary text-white"
                        : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                    )}
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Commission is tracked automatically via your referral code.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Set up your{' '}
                <a href="/affiliates" className="underline text-primary hover:text-primary/80">
                  affiliate profile
                </a>{' '}
                to get your referral link.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// VERSION 1 — Hero Invest Split
// ---------------------------------------------------------------------------

function Version1({
  property,
  fundedPercent,
  sharesRemaining,
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
  totalOwners,
}: {
  property: PropertyData;
  fundedPercent: number;
  sharesRemaining: number;
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
  totalOwners: number;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* JV Banner */}
      <div className="relative mb-8">
        {/* Pointing finger — outside the box, bounces left-right */}
        {!jvExpanded && (
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none hidden lg:block">
            <span
              className="text-2xl block"
              style={{ animation: 'jv-finger 1.2s ease-in-out infinite' }}
              aria-hidden="true"
            >
              👉
            </span>
            <style>{`
              @keyframes jv-finger {
                0%, 100% { transform: translateX(0px); }
                50% { transform: translateX(8px); }
              }
            `}</style>
          </div>
        )}

        <div
          className={cn(
            'rounded-2xl border transition-all duration-500',
            jvExpanded
              ? 'border-primary/20 bg-primary/[0.02] shadow-sm'
              : 'border-primary/30 bg-primary/[0.02] shadow-[0_0_10px_rgba(56,161,105,0.08)] hover:shadow-[0_0_20px_rgba(56,161,105,0.18)]'
          )}
        >
          <button
            onClick={() => setJvExpanded(!jvExpanded)}
            className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-primary/[0.02] rounded-2xl"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-2 ring-primary/20 flex-shrink-0">
              <Users className="h-4 w-4 text-primary" />
              {/* Ripple ping — only when collapsed */}
              {!jvExpanded && (
                <>
                  <span className="absolute inset-0 rounded-xl bg-primary/20 animate-ping" />
                  <span className="absolute -inset-1 rounded-xl bg-primary/10 animate-[ping_1.5s_ease-in-out_infinite_0.5s]" />
                </>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold">Active JV Partnership</p>
                {!jvExpanded && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {jvExpanded ? 'How your partnership works.' : 'You are part of the decision-making. Click to see how it works.'}
              </p>
            </div>
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all flex-shrink-0',
                jvExpanded
                  ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                  : 'bg-primary text-white shadow-sm shadow-primary/25 group-hover:shadow-md group-hover:shadow-primary/30'
              )}
            >
              <span>{jvExpanded ? 'Close' : 'Click here to learn more'}</span>
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
                  <p className="text-base font-semibold mb-1.5">Your Role</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
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
                      <p className="text-[13px] text-muted-foreground leading-relaxed">
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
                Management starts with nfstay. If the majority votes to change it, it changes.
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT */}
        <div className="space-y-5 lg:col-span-7">
          <ImageCarousel
            property={property}
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

          <PropertyBadges property={property} />
          <MetricPills property={property} />
        </div>

        {/* RIGHT — Sticky Invest Card */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            <Card className="rounded-2xl shadow-lg">
              <CardContent className="pt-5">
                <InvestCardContent
                  property={property}
                  fundedPercent={fundedPercent}
                  sharesRemaining={sharesRemaining}
                  investAmount={investAmount}
                  setInvestAmount={setInvestAmount}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  tsaAgreed={tsaAgreed}
                  setTsaAgreed={setTsaAgreed}
                  onInvest={onInvest}
                  compact
                  totalOwners={totalOwners}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Full-width sections below */}
      <div className="mt-8 space-y-6">
        <DescriptionHighlights property={property} />
        <ProfitCalculator
          property={property}
          initialCalcAmount={initialCalcAmount}
          setInitialCalcAmount={setInitialCalcAmount}
        />
        <RecentActivityTable />
        <DocumentsSection property={property} />
        <AgentReferralLink property={property} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 2 — JV-First Narrative Flow
// ---------------------------------------------------------------------------

function Version2({
  property,
  fundedPercent,
  sharesRemaining,
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
  totalOwners,
}: {
  property: PropertyData;
  fundedPercent: number;
  sharesRemaining: number;
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
  totalOwners: number;
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
            Management starts with nfstay. If the majority votes to change it, it changes.
          </p>
        </div>
      </div>

      {/* SECTION 2: Property Showcase */}
      <div className="mb-10 space-y-4">
        <ImageCarousel
          property={property}
          currentImage={currentImage}
          setCurrentImage={setCurrentImage}
          aspectClass="aspect-[16/9]"
          overlay
        />
        <PropertyBadges property={property} />
        <MetricPills property={property} />
      </div>

      {/* SECTION 3: Invest Card — centered, not sticky */}
      <div className="mx-auto mb-10 max-w-lg">
        <Card className="rounded-2xl shadow-lg">
          <CardContent className="pt-5">
            <InvestCardContent
              property={property}
              fundedPercent={fundedPercent}
              sharesRemaining={sharesRemaining}
              investAmount={investAmount}
              setInvestAmount={setInvestAmount}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              tsaAgreed={tsaAgreed}
              setTsaAgreed={setTsaAgreed}
              onInvest={onInvest}
              totalOwners={totalOwners}
            />
          </CardContent>
        </Card>
      </div>

      {/* SECTION 4-8 */}
      <div className="space-y-6">
        <DescriptionHighlights property={property} />
        <ProfitCalculator
          property={property}
          initialCalcAmount={initialCalcAmount}
          setInitialCalcAmount={setInitialCalcAmount}
        />
        <RecentActivityTable />
        <DocumentsSection property={property} />
        <AgentReferralLink property={property} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InvestMarketplacePage() {
  const { user } = useAuth();
  const { data: allProperties, isLoading } = useInvestProperties();
  const dbProperty = allProperties?.[0] || null;

  // Map Supabase property to the shape used by sub-components
  const property = dbProperty ? {
    id: dbProperty.id,
    blockchain_property_id: (dbProperty as any).blockchain_property_id as number | undefined,
    title: dbProperty.title || '',
    location: dbProperty.location || '',
    country: dbProperty.country || '',
    image: dbProperty.image || '',
    images: dbProperty.images?.length ? dbProperty.images : [dbProperty.image || ''],
    pricePerShare: dbProperty.price_per_share || 0,
    totalShares: dbProperty.total_shares || 1,
    sharesSold: dbProperty.shares_sold || 0,
    annualYield: dbProperty.annual_yield || 0,
    monthlyRent: dbProperty.monthly_rent || 0,
    propertyValue: dbProperty.property_value || 0,
    status: dbProperty.status || 'open',
    type: dbProperty.type || '',
    bedrooms: dbProperty.bedrooms || 0,
    bathrooms: dbProperty.bathrooms || 0,
    area: dbProperty.area || 0,
    description: dbProperty.description || '',
    highlights: dbProperty.highlights || [],
    documents: dbProperty.documents || [],
    propertyDocs: (dbProperty as any).property_docs || [],
    appreciationRate: (dbProperty as any).appreciation_rate ?? 5.2,
    occupancyRate: dbProperty.occupancy_rate || 0,
    yearBuilt: dbProperty.year_built || 0,
    rentCost: (dbProperty as any).rent_cost || 0,
  } : null;

  // Fetch blockchain stats: Owners, Total Shares, APR (aprBips), Shares Remaining
  const [totalOwners, setTotalOwners] = useState(0);
  const [bcTotalShares, setBcTotalShares] = useState(0);
  const [bcSharesRemaining, setBcSharesRemaining] = useState(0);
  const [bcAprBips, setBcAprBips] = useState(0);
  useEffect(() => {
    async function fetchBlockchainStats() {
      try {
        const ethers = await import('ethers');
        const provider = new ethers.providers.JsonRpcProvider('https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T');
        // RWA Token: owners, totalShares, aprBips (yield in basis points)
        const rwa = new ethers.Contract('0xA588E7dC42a956cc6c412925dE99240cc329157b', [
          'function getProperty(uint256) view returns (tuple(uint256 totalShares, uint256 totalOwners, uint256 pricePerShare, uint256 aprBips, string uri))',
        ], provider);
        const prop = await rwa.getProperty(1);
        setTotalOwners(prop.totalOwners.toNumber());
        setBcTotalShares(prop.totalShares.toNumber());
        setBcAprBips(prop.aprBips.toNumber()); // yield in basis points (e.g. 3000 = 30%)

        // Marketplace: shares remaining
        const mktIface = new ethers.utils.Interface([
          'function getPrimarySale(uint256) view returns (tuple(uint256 totalShares, uint256 sharesRemaining, uint8 status, uint256 pricePerShare))',
        ]);
        const calldata = mktIface.encodeFunctionData('getPrimarySale', [1]);
        const raw = await provider.call({ to: '0xDD22fDC50062F49a460E5a6bADF96Cbec85ac128', data: calldata });
        const hex = raw.slice(2);
        const remaining = parseInt(hex.slice(64, 128), 16);
        setBcSharesRemaining(remaining);
      } catch { /* silent */ }
    }
    fetchBlockchainStats();
    // Refresh after purchase
    const handler = () => fetchBlockchainStats();
    window.addEventListener('invest-purchase-complete', handler);
    return () => window.removeEventListener('invest-purchase-complete', handler);
  }, []);

  const displayTotalShares = bcTotalShares || (property?.totalShares ?? 0);
  const displaySharesRemaining = bcSharesRemaining || (property ? property.totalShares - property.sharesSold : 0);
  const displaySharesSold = displayTotalShares - displaySharesRemaining;
  const fundedPercent = displayTotalShares > 0 ? Math.round((displaySharesSold / displayTotalShares) * 100) : 0;
  const sharesRemaining = displaySharesRemaining;

  // If admin hasn't set annual_yield, fall back to blockchain aprBips
  if (property && property.annualYield === 0 && bcAprBips > 0) {
    property.annualYield = (bcAprBips / 10000) * 100;
  }

  const version = 1 as const;
  const [jvExpanded, setJvExpanded] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [investAmount, setInvestAmount] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');
  const [tsaAgreed, setTsaAgreed] = useState(false);
  const [investOpen, setInvestOpen] = useState(false);
  const [samcartOpen, setSamcartOpen] = useState(false);
  const [samcartUrl, setSamcartUrl] = useState('');
  const [initialCalcAmount, setInitialCalcAmount] = useState(1000);

  // Auto-rotate carousel
  useEffect(() => {
    if (!property) return;
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % property.images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [property]);

  // SamCart "Pembroke Place" product (ID 1003039, pay-what-you-want, min $500)
  const SAMCART_PRODUCT_SLUG = '1';

  const handleInvest = () => {
    if (!property) return;
    const shares = Math.floor(investAmount / property.pricePerShare);
    if (shares < 1) return;

    if (paymentMethod === 'card') {
      const firstName = encodeURIComponent(
        user?.user_metadata?.full_name || user?.user_metadata?.name || ''
      );
      const userEmail = encodeURIComponent(user?.email || '');

      // Wallet address goes in last_name ("DON'T EDIT - Wallet ID" on SamCart)
      let walletAddr = '';
      try { walletAddr = (window as any).__particle_wallet_address || ''; } catch { /* no wallet */ }

      // Encode propertyId + agent + wallet in last_name so webhook can parse it
      const walletPayload = encodeURIComponent(JSON.stringify({
        propertyId: property.id,
        agentWallet: '0x0000000000000000000000000000000000000000',
        recipient: walletAddr,
      }));

      // Phone number stays clean (user's real phone from profile, or empty)
      const userPhone = encodeURIComponent(
        user?.user_metadata?.whatsapp || user?.user_metadata?.phone || ''
      );

      const url = `https://stay.samcart.com/products/${SAMCART_PRODUCT_SLUG}/?first_name=${firstName}&last_name=${walletPayload}&email=${userEmail}&phone_number=${userPhone}`;
      setSamcartUrl(url);
      setSamcartOpen(true);
      return;
    }

    setInvestOpen(true);
  };

  // Empty state when no property exists
  if (!isLoading && !property) {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground flex items-center justify-center">
        <div className="text-center space-y-3">
          <Home className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <p className="text-lg text-muted-foreground">No properties available yet</p>
          <p className="text-sm text-muted-foreground">Check back soon for new investment opportunities.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (!property) {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Loading property...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Version1
        property={property}
        fundedPercent={fundedPercent}
        sharesRemaining={sharesRemaining}
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
        totalOwners={totalOwners}
      />

      <InvestModal open={investOpen} onOpenChange={setInvestOpen} property={property} />

      {/* SamCart card-payment iframe (same drawer approach as legacy app.nfstay.com) */}
      <Sheet open={samcartOpen} onOpenChange={(open) => { setSamcartOpen(open); if (!open) setSamcartUrl(''); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 [&>button]:z-50">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-base">Complete Payment</SheetTitle>
          </SheetHeader>
          {samcartUrl && (
            <iframe
              src={samcartUrl}
              className="w-full border-none"
              style={{ height: 'calc(100vh - 57px)' }}
              allow="payment"
              title="SamCart Checkout"
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
