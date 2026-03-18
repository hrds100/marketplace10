import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Shield,
  Star,
  Percent,
  PieChart,
  Home,
  Minus,
  Plus,
} from 'lucide-react';

const property = mockProperties[0];
const fundedPercent = Math.round((property.sharesSold / property.totalShares) * 100);
const sharesRemaining = property.totalShares - property.sharesSold;

// ---------------------------------------------------------------------------
// Invest Modal
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
              {/* Share price */}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 dark:bg-muted/30">
                <span className="text-sm text-muted-foreground">Share price</span>
                <span className="text-lg font-bold">${property.pricePerShare}</span>
              </div>

              {/* Number selector */}
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

              {/* Summary */}
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
// Shared sub-components
// ---------------------------------------------------------------------------

function ImageGallery({ className }: { className?: string }) {
  const [idx, setIdx] = useState(0);
  const imgs = property.images;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative overflow-hidden rounded-2xl">
        <img
          src={imgs[idx]}
          alt={property.title}
          className="h-[360px] w-full object-cover transition-all duration-500"
        />
        <button
          onClick={() => setIdx((i) => (i - 1 + imgs.length) % imgs.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/60"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setIdx((i) => (i + 1) % imgs.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/60"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-sm">
          {idx + 1} / {imgs.length}
        </div>
      </div>
      <div className="flex gap-2">
        {imgs.map((img, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={cn(
              'h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition',
              i === idx
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-transparent opacity-70 hover:opacity-100'
            )}
          >
            <img src={img} alt="" className="h-full w-full object-cover" />
          </button>
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

function HighlightsList() {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {property.highlights.map((h) => (
        <li key={h} className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
          <span>{h}</span>
        </li>
      ))}
    </ul>
  );
}

function DocumentsList() {
  return (
    <ul className="space-y-2">
      {property.documents.map((doc) => (
        <li
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
        </li>
      ))}
    </ul>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="rounded-2xl shadow-sm transition hover:shadow-md">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ROISlider({
  shares: s,
  setShares: setS,
}: {
  shares: number;
  setShares: (v: number) => void;
}) {
  const total = s * property.pricePerShare;
  const monthly = ((property.monthlyRent / property.totalShares) * s).toFixed(2);
  const annual = (s * property.pricePerShare * (property.annualYield / 100)).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Shares</label>
        <span className="text-sm font-bold text-primary">{s}</span>
      </div>
      <input
        type="range"
        min={1}
        max={Math.min(50, sharesRemaining)}
        value={s}
        onChange={(e) => setS(parseInt(e.target.value, 10))}
        className="w-full accent-primary"
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 p-3 dark:bg-muted/30">
          <p className="text-xs text-muted-foreground">Total cost</p>
          <p className="text-sm font-bold">${total.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 dark:bg-muted/30">
          <p className="text-xs text-muted-foreground">Monthly income</p>
          <p className="text-sm font-bold text-primary">${monthly}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 dark:bg-muted/30">
          <p className="text-xs text-muted-foreground">Annual return</p>
          <p className="text-sm font-bold text-primary">${annual}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 dark:bg-muted/30">
          <p className="text-xs text-muted-foreground">Yield</p>
          <p className="text-sm font-bold">{property.annualYield}%</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 1 — Final: Compact Sidebar (polished pick)
// ---------------------------------------------------------------------------

function Version1({ onInvest }: { onInvest: () => void }) {
  const [sliderShares, setSliderShares] = useState(5);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left panel — 35% */}
      <div className="lg:col-span-4">
        <div className="sticky top-6 space-y-5">
          <div className="overflow-hidden rounded-2xl">
            <img
              src={property.images[0]}
              alt={property.title}
              className="h-56 w-full object-cover"
            />
          </div>

          <div>
            <h1 className="text-xl font-bold">{property.title}</h1>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {property.location}
            </div>
          </div>

          <PropertyBadges />

          <Card className="rounded-2xl shadow-md">
            <CardContent className="space-y-4 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Share price</span>
                <span className="text-xl font-bold">${property.pricePerShare}</span>
              </div>
              <div className="space-y-1.5">
                <Progress value={fundedPercent} className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  {fundedPercent}% funded &middot; {sharesRemaining} left
                </p>
              </div>
              <ROISlider shares={sliderShares} setShares={setSliderShares} />
              <Button className="w-full gap-2" size="lg" onClick={onInvest}>
                <Shield className="h-4 w-4" />
                Invest Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right panel — 65% */}
      <div className="space-y-6 lg:col-span-8">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed text-muted-foreground">{property.description}</p>
          </CardContent>
        </Card>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricCard icon={TrendingUp} label="Annual Yield" value={`${property.annualYield}%`} />
          <MetricCard icon={BarChart3} label="Occupancy" value={`${property.occupancyRate}%`} />
          <MetricCard icon={DollarSign} label="Monthly Rent" value={`$${property.monthlyRent.toLocaleString()}`} />
          <MetricCard icon={PieChart} label="Total Shares" value={property.totalShares.toString()} />
          <MetricCard icon={Star} label="Property Value" value={`$${(property.propertyValue / 1000).toFixed(0)}k`} />
          <MetricCard icon={Percent} label="Funded" value={`${fundedPercent}%`} />
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <HighlightsList />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentsList />
          </CardContent>
        </Card>

        {/* Earnings chart placeholder */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Earnings Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="mx-auto mb-2 h-8 w-8" />
                <p className="text-sm">Earnings chart will appear here</p>
                <p className="text-xs">Projected {property.annualYield}% annual return</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 2 — Classic Split
// ---------------------------------------------------------------------------

function Version2({
  onInvest,
}: {
  onInvest: () => void;
}) {
  const [sliderShares, setSliderShares] = useState(5);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      {/* Left — 60% */}
      <div className="space-y-6 lg:col-span-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{property.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">
              {property.location}, {property.country}
            </span>
          </div>
        </div>

        <PropertyBadges />
        <ImageGallery />

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">About this property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="leading-relaxed text-muted-foreground">{property.description}</p>
            <HighlightsList />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentsList />
          </CardContent>
        </Card>
      </div>

      {/* Right — 40%, sticky */}
      <div className="lg:col-span-2">
        <div className="sticky top-6 space-y-6">
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Investment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Share price */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Share price</span>
                <span className="text-2xl font-bold">${property.pricePerShare}</span>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Funded</span>
                  <span className="font-semibold">{fundedPercent}%</span>
                </div>
                <Progress value={fundedPercent} className="h-3" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{property.sharesSold} sold</span>
                  <span>{sharesRemaining} remaining</span>
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 text-center dark:bg-muted/30">
                  <p className="text-xs text-muted-foreground">Annual Yield</p>
                  <p className="text-lg font-bold text-primary">{property.annualYield}%</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center dark:bg-muted/30">
                  <p className="text-xs text-muted-foreground">Occupancy</p>
                  <p className="text-lg font-bold">{property.occupancyRate}%</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center dark:bg-muted/30">
                  <p className="text-xs text-muted-foreground">Monthly Rent</p>
                  <p className="text-lg font-bold">${property.monthlyRent.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center dark:bg-muted/30">
                  <p className="text-xs text-muted-foreground">Property Value</p>
                  <p className="text-lg font-bold">${(property.propertyValue / 1000).toFixed(0)}k</p>
                </div>
              </div>

              {/* ROI calculator */}
              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-semibold">ROI Calculator</p>
                <ROISlider shares={sliderShares} setShares={setSliderShares} />
              </div>

              <Button className="w-full gap-2 text-base" size="lg" onClick={onInvest}>
                <DollarSign className="h-5 w-5" />
                Invest Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 3 — Full-Width Hero
// ---------------------------------------------------------------------------

function Version3({ onInvest }: { onInvest: () => void }) {
  const [sliderShares, setSliderShares] = useState(5);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative -mx-4 overflow-hidden rounded-2xl sm:-mx-6 lg:-mx-8">
        <img
          src={property.images[0]}
          alt={property.title}
          className="h-[420px] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 sm:p-8 lg:p-10">
          <Badge className="mb-3 bg-primary/90 text-primary-foreground">
            {property.status === 'open' ? 'Open for Investment' : 'Fully Funded'}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {property.title}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-white/80">
            <MapPin className="h-4 w-4" />
            <span>
              {property.location}, {property.country}
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal metrics bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
          <TrendingUp className="h-8 w-8 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Annual Yield</p>
            <p className="text-xl font-bold">{property.annualYield}%</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
          <PieChart className="h-8 w-8 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Shares Available</p>
            <p className="text-xl font-bold">{sharesRemaining}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
          <DollarSign className="h-8 w-8 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Property Value</p>
            <p className="text-xl font-bold">${(property.propertyValue / 1000).toFixed(0)}k</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Occupancy</p>
            <p className="text-xl font-bold">{property.occupancyRate}%</p>
          </div>
        </div>
      </div>

      {/* 2-column: description + invest card */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>About the Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PropertyBadges />
              <p className="leading-relaxed text-muted-foreground">{property.description}</p>
              <HighlightsList />
            </CardContent>
          </Card>

          {/* Thumbnail gallery */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {property.images.map((img, i) => (
              <div key={i} className="overflow-hidden rounded-xl">
                <img
                  src={img}
                  alt=""
                  className="h-28 w-full object-cover transition hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Compact invest card */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6 rounded-2xl shadow-md">
            <CardHeader className="pb-3">
              <CardTitle>Invest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Share price</span>
                <span className="text-2xl font-bold">${property.pricePerShare}</span>
              </div>
              <div className="space-y-1">
                <Progress value={fundedPercent} className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  {fundedPercent}% funded &middot; {sharesRemaining} shares left
                </p>
              </div>
              <ROISlider shares={sliderShares} setShares={setSliderShares} />
              <Button className="w-full gap-2" size="lg" onClick={onInvest}>
                <DollarSign className="h-5 w-5" />
                Secure Your Shares
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Documents */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentsList />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 4 — Dashboard Cards
// ---------------------------------------------------------------------------

function Version4({ onInvest }: { onInvest: () => void }) {
  const monthlyPerShare = (property.monthlyRent / property.totalShares).toFixed(2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{property.title}</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {property.location}, {property.country}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard icon={TrendingUp} label="Annual Yield" value={`${property.annualYield}%`} />
        <MetricCard icon={DollarSign} label="Share Price" value={`$${property.pricePerShare}`} />
        <MetricCard icon={PieChart} label="Funded" value={`${fundedPercent}%`} sub={`${sharesRemaining} left`} />
        <MetricCard
          icon={BarChart3}
          label="Monthly / Share"
          value={`$${monthlyPerShare}`}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <Card className="rounded-2xl">
            <CardContent className="space-y-4 pt-6">
              <PropertyBadges />
              <p className="leading-relaxed text-muted-foreground">{property.description}</p>
              <HighlightsList />
            </CardContent>
          </Card>
          <ImageGallery />
        </TabsContent>

        <TabsContent value="financials" className="mt-4 space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Return on Investment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Shares</th>
                      <th className="pb-2 font-medium">Investment</th>
                      <th className="pb-2 font-medium">Monthly Income</th>
                      <th className="pb-2 font-medium">Annual Return</th>
                      <th className="pb-2 font-medium">5-Year Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 5, 10, 25, 50].map((s) => {
                      const inv = s * property.pricePerShare;
                      const mo = ((property.monthlyRent / property.totalShares) * s).toFixed(2);
                      const yr = (inv * (property.annualYield / 100)).toFixed(2);
                      const fiveYr = (inv * (property.annualYield / 100) * 5).toFixed(2);
                      return (
                        <tr key={s} className="border-b last:border-0">
                          <td className="py-3 font-medium">{s}</td>
                          <td className="py-3">${inv.toLocaleString()}</td>
                          <td className="py-3 text-primary">${mo}</td>
                          <td className="py-3 text-primary">${yr}</td>
                          <td className="py-3 font-semibold text-primary">${fiveYr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Earnings Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-primary/5 p-4 text-center dark:bg-primary/10">
                  <p className="text-xs text-muted-foreground">Property Value</p>
                  <p className="text-xl font-bold">${property.propertyValue.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-primary/5 p-4 text-center dark:bg-primary/10">
                  <p className="text-xs text-muted-foreground">Monthly Rent</p>
                  <p className="text-xl font-bold">${property.monthlyRent.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-primary/5 p-4 text-center dark:bg-primary/10">
                  <p className="text-xs text-muted-foreground">Occupancy Rate</p>
                  <p className="text-xl font-bold">{property.occupancyRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card className="rounded-2xl">
            <CardContent className="pt-6">
              <DocumentsList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{property.title}</p>
            <p className="text-xs text-muted-foreground">
              ${property.pricePerShare}/share &middot; {property.annualYield}% yield &middot;{' '}
              {sharesRemaining} remaining
            </p>
          </div>
          <Button className="gap-2" onClick={onInvest}>
            <DollarSign className="h-4 w-4" />
            Invest Now
          </Button>
        </div>
      </div>
      {/* Spacer so content is not hidden by fixed bar */}
      <div className="h-20" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 5 — Compact Sidebar
// ---------------------------------------------------------------------------

function Version5({ onInvest }: { onInvest: () => void }) {
  const [sliderShares, setSliderShares] = useState(5);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left panel — 35% */}
      <div className="lg:col-span-4">
        <div className="sticky top-6 space-y-5">
          <div className="overflow-hidden rounded-2xl">
            <img
              src={property.images[0]}
              alt={property.title}
              className="h-56 w-full object-cover"
            />
          </div>

          <div>
            <h1 className="text-xl font-bold">{property.title}</h1>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {property.location}
            </div>
          </div>

          <PropertyBadges />

          <Card className="rounded-2xl shadow-md">
            <CardContent className="space-y-4 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Share price</span>
                <span className="text-xl font-bold">${property.pricePerShare}</span>
              </div>
              <div className="space-y-1.5">
                <Progress value={fundedPercent} className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  {fundedPercent}% funded &middot; {sharesRemaining} left
                </p>
              </div>
              <ROISlider shares={sliderShares} setShares={setSliderShares} />
              <Button className="w-full gap-2" size="lg" onClick={onInvest}>
                <Shield className="h-4 w-4" />
                Invest Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right panel — 65% */}
      <div className="space-y-6 lg:col-span-8">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed text-muted-foreground">{property.description}</p>
          </CardContent>
        </Card>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricCard icon={TrendingUp} label="Annual Yield" value={`${property.annualYield}%`} />
          <MetricCard icon={BarChart3} label="Occupancy" value={`${property.occupancyRate}%`} />
          <MetricCard icon={DollarSign} label="Monthly Rent" value={`$${property.monthlyRent.toLocaleString()}`} />
          <MetricCard icon={PieChart} label="Total Shares" value={property.totalShares.toString()} />
          <MetricCard icon={Star} label="Property Value" value={`$${(property.propertyValue / 1000).toFixed(0)}k`} />
          <MetricCard icon={Percent} label="Funded" value={`${fundedPercent}%`} />
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <HighlightsList />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentsList />
          </CardContent>
        </Card>

        {/* Earnings chart placeholder */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Earnings Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="mx-auto mb-2 h-8 w-8" />
                <p className="text-sm">Earnings chart will appear here</p>
                <p className="text-xs">Projected {property.annualYield}% annual return</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 6 — Story Flow
// ---------------------------------------------------------------------------

function Version6({ onInvest }: { onInvest: () => void }) {
  const [sliderShares, setSliderShares] = useState(5);

  return (
    <div className="space-y-16">
      {/* 1. Large image with title overlay */}
      <div className="relative -mx-4 overflow-hidden rounded-2xl sm:-mx-6 lg:-mx-8">
        <img
          src={property.images[0]}
          alt={property.title}
          className="h-[480px] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
          <Badge className="mb-4 bg-primary text-primary-foreground">
            {property.type} &middot; {property.status === 'open' ? 'Open' : 'Funded'}
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {property.title}
          </h1>
          <div className="mt-3 flex items-center gap-2 text-lg text-white/80">
            <MapPin className="h-5 w-5" />
            {property.location}, {property.country}
          </div>
        </div>
      </div>

      {/* 2. Why this property */}
      <section className="mx-auto max-w-3xl">
        <h2 className="mb-6 text-center text-2xl font-bold">Why this property</h2>
        <p className="mb-8 text-center leading-relaxed text-muted-foreground">
          {property.description}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {property.highlights.map((h, i) => {
            const icons = [Star, Shield, CheckCircle2, TrendingUp];
            const Icon = icons[i % icons.length];
            return (
              <Card key={h} className="rounded-2xl shadow-sm transition hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-medium">{h}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 3. The numbers */}
      <section className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center text-2xl font-bold">The numbers</h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">{property.annualYield}%</p>
            <p className="mt-1 text-sm text-muted-foreground">Annual Yield</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold">${property.pricePerShare}</p>
            <p className="mt-1 text-sm text-muted-foreground">Per Share</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold">{property.occupancyRate}%</p>
            <p className="mt-1 text-sm text-muted-foreground">Occupancy</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold">${(property.propertyValue / 1000).toFixed(0)}k</p>
            <p className="mt-1 text-sm text-muted-foreground">Property Value</p>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-md space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Funding progress</span>
            <span className="font-semibold">{fundedPercent}%</span>
          </div>
          <Progress value={fundedPercent} className="h-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{property.sharesSold} shares sold</span>
            <span>{sharesRemaining} remaining</span>
          </div>
        </div>
      </section>

      {/* 4. Your investment */}
      <section className="mx-auto max-w-lg">
        <h2 className="mb-6 text-center text-2xl font-bold">Your investment</h2>
        <Card className="rounded-2xl shadow-lg">
          <CardContent className="space-y-5 pt-6">
            <ROISlider shares={sliderShares} setShares={setSliderShares} />
            <Button className="w-full gap-2 text-base" size="lg" onClick={onInvest}>
              <DollarSign className="h-5 w-5" />
              Secure Your Shares
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* 5. Documents */}
      <section className="mx-auto max-w-2xl">
        <h2 className="mb-6 text-center text-2xl font-bold">Documents</h2>
        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            <DocumentsList />
          </CardContent>
        </Card>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-4xl">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {property.images.map((img, i) => (
            <div key={i} className="overflow-hidden rounded-xl">
              <img
                src={img}
                alt=""
                className="h-32 w-full object-cover transition hover:scale-105"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Sticky bottom invest button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 p-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{property.title}</p>
            <p className="text-xs text-muted-foreground">${property.pricePerShare}/share</p>
          </div>
          <Button className="flex-shrink-0 gap-2" onClick={onInvest}>
            <DollarSign className="h-4 w-4" />
            Invest Now
          </Button>
        </div>
      </div>
      <div className="h-16" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 7 — Bento Grid
// ---------------------------------------------------------------------------

function Version7({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{property.title}</h1>
      <div className="grid grid-cols-4 grid-rows-3 gap-3 auto-rows-[160px]">
        {/* Large image — spans 2x2 */}
        <div className="col-span-2 row-span-2 relative overflow-hidden rounded-2xl">
          <img src={property.images[0]} alt={property.title} className="h-full w-full object-cover" />
          <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur">
            <MapPin className="h-3 w-3" /> {property.location}
          </div>
        </div>

        {/* Yield card */}
        <div className="col-span-1 row-span-1 flex flex-col items-center justify-center rounded-2xl bg-primary/10 p-4">
          <p className="text-3xl font-bold text-primary">{property.annualYield}%</p>
          <p className="text-xs text-muted-foreground mt-1">Annual Yield</p>
        </div>

        {/* Share price card */}
        <div className="col-span-1 row-span-1 flex flex-col items-center justify-center rounded-2xl border bg-card p-4">
          <p className="text-3xl font-bold">${property.pricePerShare}</p>
          <p className="text-xs text-muted-foreground mt-1">Per Share</p>
        </div>

        {/* Progress card — spans 2 cols */}
        <div className="col-span-2 row-span-1 flex flex-col justify-center rounded-2xl border bg-card p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Funding Progress</span>
            <span className="font-bold">{fundedPercent}%</span>
          </div>
          <Progress value={fundedPercent} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">{sharesRemaining} shares remaining</p>
        </div>

        {/* Small image tiles */}
        {property.images.slice(1, 3).map((img, i) => (
          <div key={i} className="col-span-1 row-span-1 overflow-hidden rounded-2xl">
            <img src={img} alt="" className="h-full w-full object-cover" />
          </div>
        ))}

        {/* Occupancy */}
        <div className="col-span-1 row-span-1 flex flex-col items-center justify-center rounded-2xl bg-emerald-500/10 p-4">
          <p className="text-3xl font-bold text-emerald-500">{property.occupancyRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">Occupancy</p>
        </div>

        {/* CTA */}
        <div className="col-span-1 row-span-1 flex items-center justify-center rounded-2xl bg-primary p-4">
          <Button variant="secondary" className="gap-2 font-semibold" onClick={onInvest}>
            <DollarSign className="h-4 w-4" /> Invest Now
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 pt-6">
          <p className="leading-relaxed text-muted-foreground">{property.description}</p>
          <HighlightsList />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 8 — Glassmorphism
// ---------------------------------------------------------------------------

function Version8({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="min-h-screen rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-8 text-white">
      <h1 className="text-4xl font-bold tracking-tight mb-2">{property.title}</h1>
      <p className="text-white/60 flex items-center gap-1 mb-8">
        <MapPin className="h-4 w-4" /> {property.location}, {property.country}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hero image glass card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-white/10">
          <img src={property.images[0]} alt="" className="h-[380px] w-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Stats glass panel */}
        <div className="space-y-4">
          {[
            { label: 'Annual Yield', value: `${property.annualYield}%`, glow: 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]' },
            { label: 'Share Price', value: `$${property.pricePerShare}`, glow: 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' },
            { label: 'Occupancy', value: `${property.occupancyRate}%`, glow: 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]' },
            { label: 'Monthly Rent', value: `$${property.monthlyRent.toLocaleString()}`, glow: 'text-white' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-4">
              <p className="text-xs text-white/50">{item.label}</p>
              <p className={cn('text-2xl font-bold', item.glow)}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Funding bar */}
      <div className="mt-8 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-white/60">Funding</span>
          <span className="font-bold text-emerald-400">{fundedPercent}%</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all" style={{ width: `${fundedPercent}%` }} />
        </div>
        <p className="text-xs text-white/40 mt-2">{sharesRemaining} shares remaining of {property.totalShares}</p>
      </div>

      {/* Description */}
      <div className="mt-8 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
        <p className="text-white/70 leading-relaxed">{property.description}</p>
      </div>

      <div className="mt-8 flex justify-center">
        <Button size="lg" className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_30px_rgba(52,211,153,0.3)] rounded-xl px-10" onClick={onInvest}>
          <DollarSign className="h-5 w-5" /> Invest Now
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 9 — Neubrutalism
// ---------------------------------------------------------------------------

function Version9({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="space-y-6">
      <div className="border-2 border-black bg-yellow-300 p-6 shadow-[6px_6px_0px_black] rounded-lg">
        <h1 className="text-4xl font-black uppercase tracking-tight">{property.title}</h1>
        <p className="text-lg font-bold mt-1">{property.location}, {property.country}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border-2 border-black rounded-lg overflow-hidden shadow-[4px_4px_0px_black]">
          <img src={property.images[0]} alt={property.title} className="h-72 w-full object-cover" />
        </div>

        <div className="space-y-4">
          {[
            { label: 'YIELD', value: `${property.annualYield}%`, bg: 'bg-pink-300' },
            { label: 'SHARE PRICE', value: `$${property.pricePerShare}`, bg: 'bg-cyan-300' },
            { label: 'OCCUPANCY', value: `${property.occupancyRate}%`, bg: 'bg-lime-300' },
            { label: 'VALUE', value: `$${(property.propertyValue / 1000).toFixed(0)}k`, bg: 'bg-orange-300' },
          ].map((item) => (
            <div key={item.label} className={cn('border-2 border-black p-4 shadow-[4px_4px_0px_black] rounded-lg', item.bg)}>
              <p className="text-xs font-black uppercase tracking-widest">{item.label}</p>
              <p className="text-3xl font-black">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_black] rounded-lg">
        <h2 className="text-2xl font-black uppercase mb-3">FUNDED: {fundedPercent}%</h2>
        <div className="h-6 w-full border-2 border-black rounded-full overflow-hidden bg-white">
          <div className="h-full bg-yellow-300 transition-all" style={{ width: `${fundedPercent}%` }} />
        </div>
        <p className="text-sm font-bold mt-2">{property.sharesSold} sold / {sharesRemaining} left</p>
      </div>

      <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_black] rounded-lg">
        <h2 className="text-xl font-black uppercase mb-3">ABOUT</h2>
        <p className="font-medium leading-relaxed">{property.description}</p>
      </div>

      <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_black] rounded-lg">
        <h2 className="text-xl font-black uppercase mb-3">HIGHLIGHTS</h2>
        <ul className="space-y-2">
          {property.highlights.map((h) => (
            <li key={h} className="flex items-center gap-2 font-bold">
              <span className="inline-block h-3 w-3 rounded-full bg-yellow-300 border border-black" />
              {h}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={onInvest}
        className="w-full border-2 border-black bg-yellow-300 p-4 text-xl font-black uppercase shadow-[6px_6px_0px_black] rounded-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_black] transition-all"
      >
        INVEST NOW
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 10 — Dark Luxury
// ---------------------------------------------------------------------------

function Version10({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="min-h-screen rounded-3xl bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="text-center space-y-4 pt-8">
          <p className="text-amber-400/80 text-sm uppercase tracking-[0.3em] font-light">Private Investment Opportunity</p>
          <h1 className="text-5xl font-light tracking-tight">{property.title}</h1>
          <p className="text-white/40 text-lg">{property.location}, {property.country}</p>
          <div className="w-24 h-px bg-amber-400/40 mx-auto" />
        </div>

        <div className="relative overflow-hidden rounded-xl border border-amber-400/20">
          <img src={property.images[0]} alt="" className="h-[400px] w-full object-cover opacity-80" />
        </div>

        <div className="grid grid-cols-4 gap-px bg-amber-400/10 border border-amber-400/20 rounded-xl overflow-hidden">
          {[
            { label: 'Annual Yield', value: `${property.annualYield}%` },
            { label: 'Share Price', value: `$${property.pricePerShare}` },
            { label: 'Occupancy', value: `${property.occupancyRate}%` },
            { label: 'Property Value', value: `$${(property.propertyValue / 1000).toFixed(0)}k` },
          ].map((item) => (
            <div key={item.label} className="bg-slate-950 p-6 text-center">
              <p className="text-3xl font-light text-amber-400">{item.value}</p>
              <p className="text-xs text-white/30 mt-2 uppercase tracking-widest">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="border border-amber-400/10 rounded-xl p-8">
          <p className="text-white/50 leading-relaxed text-lg font-light">{property.description}</p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-white/30 uppercase tracking-widest text-xs">Funding Progress</span>
            <span className="text-amber-400 font-light">{fundedPercent}%</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${fundedPercent}%` }} />
          </div>
        </div>

        <div className="text-center pt-4">
          <button
            onClick={onInvest}
            className="border border-amber-400 text-amber-400 px-12 py-4 text-sm uppercase tracking-[0.2em] hover:bg-amber-400 hover:text-slate-950 transition-all duration-300 rounded-sm"
          >
            Invest Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 11 — Animated
// ---------------------------------------------------------------------------

function Version11({ onInvest }: { onInvest: () => void }) {
  const [sliderShares, setSliderShares] = useState(5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{property.title}</h1>
        <p className="text-muted-foreground flex items-center gap-1 mt-1">
          <MapPin className="h-4 w-4" /> {property.location}, {property.country}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Annual Yield', value: `${property.annualYield}%`, color: 'text-emerald-500' },
          { label: 'Share Price', value: `$${property.pricePerShare}`, color: 'text-primary' },
          { label: 'Occupancy', value: `${property.occupancyRate}%`, color: 'text-blue-500' },
          { label: 'Funded', value: `${fundedPercent}%`, color: 'text-amber-500' },
        ].map((item) => (
          <Card key={item.label} className="rounded-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-xl cursor-default">
            <CardContent className="p-5 text-center">
              <div className="relative">
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <p className={cn('text-3xl font-bold', item.color)}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl">
        <div className="relative h-80 overflow-hidden">
          <img src={property.images[0]} alt="" className="h-full w-full object-cover transition-transform duration-700 hover:scale-110" />
        </div>
        <CardContent className="p-6 space-y-4">
          <p className="leading-relaxed text-muted-foreground">{property.description}</p>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Funding</span>
              <span className="font-bold">{fundedPercent}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${fundedPercent}%` }} />
            </div>
          </div>

          <HighlightsList />

          <ROISlider shares={sliderShares} setShares={setSliderShares} />

          <Button
            size="lg"
            className="w-full gap-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            onClick={onInvest}
          >
            <DollarSign className="h-5 w-5" /> Invest Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 12 — Magazine
// ---------------------------------------------------------------------------

function Version12({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="space-y-10 font-serif">
      {/* Editorial header */}
      <div className="border-b-2 border-foreground pb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-2">Featured Investment</p>
        <h1 className="text-5xl font-bold leading-tight">{property.title}</h1>
        <p className="text-lg text-muted-foreground mt-2 italic">{property.location}, {property.country}</p>
      </div>

      {/* Two-column editorial */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-6">
          <div className="overflow-hidden rounded-sm">
            <img src={property.images[0]} alt="" className="h-[420px] w-full object-cover" />
          </div>
          <p className="text-lg leading-[1.8] text-muted-foreground first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:text-foreground">
            {property.description}
          </p>
          <HighlightsList />
        </div>

        <div className="lg:col-span-5 space-y-8">
          {/* Pull-quote style numbers */}
          <div className="border-l-4 border-primary pl-6 py-2">
            <p className="text-6xl font-bold">{property.annualYield}%</p>
            <p className="text-sm text-muted-foreground italic mt-1">Annual yield on investment</p>
          </div>

          <div className="border-l-4 border-muted pl-6 py-2">
            <p className="text-4xl font-bold">${property.pricePerShare}</p>
            <p className="text-sm text-muted-foreground italic mt-1">Per share entry point</p>
          </div>

          <div className="border-l-4 border-muted pl-6 py-2">
            <p className="text-4xl font-bold">{property.occupancyRate}%</p>
            <p className="text-sm text-muted-foreground italic mt-1">Average occupancy rate</p>
          </div>

          <div className="border-l-4 border-muted pl-6 py-2">
            <p className="text-4xl font-bold">${(property.propertyValue / 1000).toFixed(0)}k</p>
            <p className="text-sm text-muted-foreground italic mt-1">Total property valuation</p>
          </div>

          <div className="space-y-2 pt-4">
            <div className="flex justify-between text-sm">
              <span className="italic text-muted-foreground">Funding progress</span>
              <span className="font-bold">{fundedPercent}%</span>
            </div>
            <Progress value={fundedPercent} className="h-2" />
          </div>

          <Button size="lg" className="w-full gap-2 rounded-sm font-serif" onClick={onInvest}>
            <DollarSign className="h-5 w-5" /> Invest in This Property
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 13 — Terminal
// ---------------------------------------------------------------------------

function Version13({ onInvest }: { onInvest: () => void }) {
  const monthly = (property.monthlyRent / property.totalShares).toFixed(2);

  return (
    <div className="min-h-screen rounded-2xl bg-[#0a0e14] p-6 font-mono text-green-400">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-green-600">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          nfstay-terminal v2.0 -- property investment interface
        </div>

        <div className="border border-green-900/50 rounded-lg p-4 bg-green-950/20">
          <p className="text-green-600 text-xs mb-1">$ cat property.info</p>
          <p className="text-lg font-bold text-green-400">{property.title}</p>
          <p className="text-green-600 text-sm">{property.location}, {property.country}</p>
        </div>

        <div className="border border-green-900/50 rounded-lg p-4 bg-green-950/20">
          <p className="text-green-600 text-xs mb-2">$ show metrics --format table</p>
          <pre className="text-sm leading-relaxed">{`
+------------------+----------------+
| METRIC           | VALUE          |
+------------------+----------------+
| Annual Yield     | ${String(property.annualYield).padEnd(14)}% |
| Share Price      | $${String(property.pricePerShare).padEnd(13)} |
| Occupancy Rate   | ${String(property.occupancyRate).padEnd(14)}% |
| Monthly/Share    | $${String(monthly).padEnd(13)} |
| Property Value   | $${String((property.propertyValue / 1000).toFixed(0) + 'k').padEnd(13)} |
| Funded           | ${String(fundedPercent).padEnd(14)}% |
| Shares Remaining | ${String(sharesRemaining).padEnd(15)}|
+------------------+----------------+`}
          </pre>
        </div>

        <div className="border border-green-900/50 rounded-lg p-4 bg-green-950/20">
          <p className="text-green-600 text-xs mb-2">$ show funding --progress</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-4 bg-green-950 rounded overflow-hidden border border-green-900/50">
              <div className="h-full bg-green-500/60" style={{ width: `${fundedPercent}%` }} />
            </div>
            <span className="text-sm font-bold">{fundedPercent}%</span>
          </div>
          <p className="text-green-600 text-xs mt-1">[{property.sharesSold}/{property.totalShares}] shares sold</p>
        </div>

        <div className="border border-green-900/50 rounded-lg p-4 bg-green-950/20">
          <p className="text-green-600 text-xs mb-2">$ cat description.txt</p>
          <p className="text-green-400/80 text-sm leading-relaxed">{property.description}</p>
        </div>

        <div className="border border-green-900/50 rounded-lg p-4 bg-green-950/20">
          <p className="text-green-600 text-xs mb-2">$ ls highlights/</p>
          {property.highlights.map((h, i) => (
            <p key={h} className="text-sm">
              <span className="text-green-600">[{i}]</span> {h}
            </p>
          ))}
        </div>

        <button
          onClick={onInvest}
          className="w-full border border-green-500 text-green-400 p-3 rounded-lg font-mono text-sm hover:bg-green-500/10 transition-colors"
        >
          $ invest --confirm --property="{property.title}"
          <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-pulse" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 14 — Gamified
// ---------------------------------------------------------------------------

function Version14({ onInvest }: { onInvest: () => void }) {
  const xpFromInvest = Math.round(property.annualYield * 100);
  const tierLevel = fundedPercent > 75 ? 'GOLD' : fundedPercent > 50 ? 'SILVER' : 'BRONZE';
  const tierColor = tierLevel === 'GOLD' ? 'text-yellow-400' : tierLevel === 'SILVER' ? 'text-slate-300' : 'text-amber-600';

  return (
    <div className="space-y-6">
      {/* Quest header */}
      <Card className="rounded-2xl bg-gradient-to-r from-purple-500/10 via-primary/5 to-amber-500/10 border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">QUEST</Badge>
                <Badge className={cn('border', tierColor, tierLevel === 'GOLD' ? 'bg-yellow-400/10 border-yellow-400/30' : 'bg-slate-300/10 border-slate-300/30')}>
                  {tierLevel} TIER
                </Badge>
              </div>
              <h1 className="text-2xl font-bold">{property.title}</h1>
              <p className="text-sm text-muted-foreground">{property.location}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Reward</p>
              <p className="text-2xl font-bold text-amber-400">+{xpFromInvest} XP</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: '🏆', label: 'Yield', value: `${property.annualYield}%`, xp: '+50 XP' },
          { icon: '💰', label: 'Price/Share', value: `$${property.pricePerShare}`, xp: '+25 XP' },
          { icon: '🏠', label: 'Occupancy', value: `${property.occupancyRate}%`, xp: '+30 XP' },
          { icon: '📊', label: 'Value', value: `$${(property.propertyValue / 1000).toFixed(0)}k`, xp: '+40 XP' },
        ].map((item) => (
          <Card key={item.label} className="rounded-xl border-2 hover:border-primary/50 transition-all hover:scale-[1.02]">
            <CardContent className="p-4 text-center">
              <span className="text-2xl">{item.icon}</span>
              <p className="text-lg font-bold mt-1">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <Badge variant="outline" className="mt-2 text-[10px] text-amber-400 border-amber-400/30 bg-amber-400/5">{item.xp}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funding progress as XP bar */}
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold">Funding Quest Progress</p>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Level {Math.floor(fundedPercent / 10)}
            </Badge>
          </div>
          <div className="h-6 rounded-full bg-muted overflow-hidden relative">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 via-primary to-amber-500 transition-all" style={{ width: `${fundedPercent}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
              {fundedPercent}% / 100%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{sharesRemaining} shares to unlock next milestone</p>
        </CardContent>
      </Card>

      {/* Description as lore */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📜</span> Property Lore
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-muted-foreground">{property.description}</p>
        </CardContent>
      </Card>

      <Button size="lg" className="w-full gap-2 bg-gradient-to-r from-purple-500 to-amber-500 hover:from-purple-600 hover:to-amber-600 text-white" onClick={onInvest}>
        <Star className="h-5 w-5" /> Accept Quest & Invest (+{xpFromInvest} XP)
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 15 — Split/Swipe
// ---------------------------------------------------------------------------

function Version15({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="space-y-0">
      {/* Top half: dark */}
      <div className="bg-slate-900 text-white p-8 rounded-t-2xl">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <Badge className="bg-white/10 text-white border-white/20">Open for Investment</Badge>
            <h1 className="text-4xl font-bold tracking-tight">{property.title}</h1>
            <p className="text-white/60 flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {property.location}, {property.country}
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <p className="text-3xl font-bold text-emerald-400">{property.annualYield}%</p>
                <p className="text-xs text-white/40">Annual Yield</p>
              </div>
              <div>
                <p className="text-3xl font-bold">${property.pricePerShare}</p>
                <p className="text-xs text-white/40">Per Share</p>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl -rotate-2 shadow-2xl transform hover:rotate-0 transition-transform duration-500">
            <img src={property.images[0]} alt="" className="h-64 w-full object-cover" />
          </div>
        </div>
      </div>

      {/* Bottom half: light */}
      <div className="bg-background p-8 rounded-b-2xl border border-t-0">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <p className="leading-relaxed text-muted-foreground">{property.description}</p>
            <HighlightsList />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Occupancy', value: `${property.occupancyRate}%` },
                { label: 'Monthly Rent', value: `$${property.monthlyRent.toLocaleString()}` },
                { label: 'Funded', value: `${fundedPercent}%` },
                { label: 'Remaining', value: `${sharesRemaining} shares` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border p-4 text-center hover:-translate-y-1 transition-transform">
                  <p className="text-xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Progress value={fundedPercent} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">{fundedPercent}% funded</p>
            </div>

            <Button size="lg" className="w-full gap-2" onClick={onInvest}>
              <DollarSign className="h-5 w-5" /> Invest Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 16 — Apple
// ---------------------------------------------------------------------------

function Version16({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="space-y-20 py-12">
      {/* Hero — massive centered type */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground tracking-wider uppercase">Investment Opportunity</p>
        <h1 className="text-6xl font-semibold tracking-tight leading-[1.1]">{property.title}</h1>
        <p className="text-xl text-muted-foreground">{property.location}, {property.country}</p>
        <div className="flex justify-center gap-3 pt-4">
          <Button size="lg" className="rounded-full px-8 gap-2" onClick={onInvest}>
            <DollarSign className="h-4 w-4" /> Invest Now
          </Button>
          <Button size="lg" variant="outline" className="rounded-full px-8">
            Learn More
          </Button>
        </div>
      </div>

      {/* Full-width image */}
      <div className="overflow-hidden rounded-3xl mx-auto max-w-5xl">
        <img src={property.images[0]} alt="" className="w-full h-[500px] object-cover" />
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
        {[
          { value: `${property.annualYield}%`, label: 'Annual Yield' },
          { value: `$${property.pricePerShare}`, label: 'Per Share' },
          { value: `${property.occupancyRate}%`, label: 'Occupancy' },
          { value: `$${(property.propertyValue / 1000).toFixed(0)}k`, label: 'Property Value' },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-5xl font-semibold tracking-tight">{item.value}</p>
            <p className="text-sm text-muted-foreground mt-2">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Description — centered, wide */}
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h2 className="text-3xl font-semibold tracking-tight">About this property</h2>
        <p className="text-lg text-muted-foreground leading-relaxed">{property.description}</p>
      </div>

      {/* Highlights as pills */}
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap justify-center gap-3">
          {property.highlights.map((h) => (
            <span key={h} className="rounded-full bg-muted px-5 py-2.5 text-sm font-medium">
              {h}
            </span>
          ))}
        </div>
      </div>

      {/* Funding — minimal */}
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Funding</span>
          <span className="font-medium">{fundedPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${fundedPercent}%` }} />
        </div>
        <p className="text-center text-xs text-muted-foreground">{sharesRemaining} shares remaining</p>
      </div>

      {/* Final CTA */}
      <div className="text-center">
        <Button size="lg" className="rounded-full px-12 py-6 text-lg gap-2" onClick={onInvest}>
          <DollarSign className="h-5 w-5" /> Invest Now
        </Button>
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// VERSION 17 — Spacious & Breathing
// ---------------------------------------------------------------------------

function Version17({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="space-y-12 p-12">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tight">{property.title}</h1>
        <p className="text-xl text-muted-foreground flex items-center justify-center gap-2">
          <MapPin className="h-5 w-5" /> {property.location}, {property.country}
        </p>
      </div>
      <div className="overflow-hidden rounded-3xl shadow-lg">
        <img src={property.images[0]} alt={property.title} className="h-[480px] w-full object-cover" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Share Price', value: `$${property.pricePerShare}` },
          { label: 'Annual Yield', value: `${property.annualYield}%` },
          { label: 'Monthly Rent', value: `$${property.monthlyRent.toLocaleString()}` },
          { label: 'Occupancy', value: `${property.occupancyRate}%` },
        ].map((m) => (
          <Card key={m.label} className="rounded-3xl shadow-lg">
            <CardContent className="p-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">{m.label}</p>
              <p className="text-4xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-3xl shadow-lg">
        <CardContent className="p-12 space-y-6">
          <h2 className="text-2xl font-semibold">About This Property</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">{property.description}</p>
          <HighlightsList />
        </CardContent>
      </Card>
      <div className="max-w-xl mx-auto space-y-4 p-8">
        <div className="flex justify-between text-lg">
          <span className="text-muted-foreground">Funding Progress</span>
          <span className="font-bold">{fundedPercent}%</span>
        </div>
        <Progress value={fundedPercent} className="h-4" />
        <p className="text-center text-muted-foreground">{sharesRemaining} shares remaining of {property.totalShares}</p>
      </div>
      <div className="text-center py-8">
        <Button size="lg" className="rounded-2xl px-16 py-7 text-xl gap-3 shadow-lg" onClick={onInvest}>
          <DollarSign className="h-6 w-6" /> Invest Now — $100/share
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 18 — Tight & Dense
// ---------------------------------------------------------------------------

function Version18({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold">{property.title}</h1>
          <Badge variant="secondary" className="text-[10px]">{property.type}</Badge>
          <Badge className="text-[10px] bg-primary/10 text-primary">{property.status === 'open' ? 'Open' : 'Funded'}</Badge>
        </div>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={onInvest}>
          <DollarSign className="h-3 w-3" /> Invest
        </Button>
      </div>
      <div className="grid grid-cols-6 gap-1 text-xs">
        {[
          { l: 'Price', v: `$${property.pricePerShare}` },
          { l: 'Yield', v: `${property.annualYield}%` },
          { l: 'Rent', v: `$${property.monthlyRent}` },
          { l: 'Occupancy', v: `${property.occupancyRate}%` },
          { l: 'Funded', v: `${fundedPercent}%` },
          { l: 'Remaining', v: `${sharesRemaining}` },
        ].map((m) => (
          <div key={m.l} className="rounded border p-2">
            <p className="text-muted-foreground text-[10px]">{m.l}</p>
            <p className="font-bold">{m.v}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        <div className="col-span-2">
          <img src={property.images[0]} alt="" className="h-40 w-full rounded object-cover" />
          <div className="flex gap-1 mt-1">
            {property.images.slice(1, 4).map((img, i) => (
              <img key={i} src={img} alt="" className="h-10 w-1/3 rounded object-cover" />
            ))}
          </div>
        </div>
        <div className="col-span-3 space-y-1">
          <p className="text-muted-foreground text-xs leading-snug">{property.description.slice(0, 200)}...</p>
          <div className="border rounded p-2">
            <p className="font-semibold text-xs mb-1">Highlights</p>
            <ul className="space-y-0.5">
              {property.highlights.map((h) => (
                <li key={h} className="flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" /> {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="border rounded p-2">
        <p className="font-semibold text-xs mb-1">Documents</p>
        <div className="divide-y">
          {property.documents.map((d) => (
            <div key={d} className="flex items-center justify-between py-1 text-xs">
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {d}</span>
              <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1"><Download className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Funded:</span>
        <Progress value={fundedPercent} className="h-1.5 flex-1" />
        <span className="font-bold">{fundedPercent}%</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 19 — Hero-Led
// ---------------------------------------------------------------------------

function Version19({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="space-y-6">
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden rounded-b-3xl">
        <img src={property.images[0]} alt={property.title} className="h-[500px] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12 text-white">
          <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm mb-3">{property.type}</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">{property.title}</h1>
          <p className="flex items-center gap-2 text-white/80 text-lg"><MapPin className="h-5 w-5" /> {property.location}, {property.country}</p>
          <div className="flex items-center gap-6 mt-4">
            <div><p className="text-white/60 text-sm">Share Price</p><p className="text-3xl font-bold">${property.pricePerShare}</p></div>
            <div className="h-10 w-px bg-white/30" />
            <div><p className="text-white/60 text-sm">Annual Yield</p><p className="text-3xl font-bold text-green-400">{property.annualYield}%</p></div>
            <div className="h-10 w-px bg-white/30" />
            <div><p className="text-white/60 text-sm">Funded</p><p className="text-3xl font-bold">{fundedPercent}%</p></div>
          </div>
          <Button size="lg" className="mt-6 gap-2 text-base" onClick={onInvest}><DollarSign className="h-5 w-5" /> Invest Now</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-xl"><CardContent className="p-5 space-y-2"><h3 className="font-semibold text-sm">Property Details</h3><PropertyBadges /></CardContent></Card>
        <Card className="rounded-xl"><CardContent className="p-5 space-y-2"><h3 className="font-semibold text-sm">Financials</h3><div className="grid grid-cols-2 gap-2 text-sm"><div><p className="text-muted-foreground text-xs">Rent</p><p className="font-bold">${property.monthlyRent}/mo</p></div><div><p className="text-muted-foreground text-xs">Occupancy</p><p className="font-bold">{property.occupancyRate}%</p></div><div><p className="text-muted-foreground text-xs">Value</p><p className="font-bold">${(property.propertyValue / 1000).toFixed(0)}k</p></div><div><p className="text-muted-foreground text-xs">Remaining</p><p className="font-bold">{sharesRemaining} shares</p></div></div></CardContent></Card>
        <Card className="rounded-xl"><CardContent className="p-5 space-y-2"><h3 className="font-semibold text-sm">Key Highlights</h3><ul className="space-y-1">{property.highlights.slice(0, 4).map((h) => (<li key={h} className="flex items-center gap-1.5 text-xs"><CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" /> {h}</li>))}</ul></CardContent></Card>
      </div>
      <Card className="rounded-xl"><CardContent className="p-6"><p className="text-muted-foreground leading-relaxed">{property.description}</p></CardContent></Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 20 — Sidebar Command
// ---------------------------------------------------------------------------

function Version20({ onInvest }: { onInvest: () => void }) {
  const [sliderShares, setSliderShares] = useState(5);
  return (
    <div className="flex gap-6">
      <div className="w-80 flex-shrink-0 space-y-4 sticky top-6 self-start">
        <Card className="rounded-xl border-primary/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Investment Controls</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Share price</span><span className="font-bold text-lg">${property.pricePerShare}</span></div>
            <ROISlider shares={sliderShares} setShares={setSliderShares} />
            <Button className="w-full gap-2" onClick={onInvest}><DollarSign className="h-4 w-4" /> Invest Now</Button>
          </CardContent>
        </Card>
        <Card className="rounded-xl"><CardHeader className="pb-2"><CardTitle className="text-sm">Quick Stats</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Annual Yield</span><span className="font-bold text-primary">{property.annualYield}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Occupancy</span><span className="font-bold">{property.occupancyRate}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Monthly Rent</span><span className="font-bold">${property.monthlyRent.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Property Value</span><span className="font-bold">${(property.propertyValue / 1000).toFixed(0)}k</span></div>
          <div className="pt-2 border-t space-y-1"><div className="flex justify-between text-xs"><span className="text-muted-foreground">Funded</span><span>{fundedPercent}%</span></div><Progress value={fundedPercent} className="h-2" /></div>
        </CardContent></Card>
        <Card className="rounded-xl"><CardHeader className="pb-2"><CardTitle className="text-sm">Documents</CardTitle></CardHeader><CardContent><DocumentsList /></CardContent></Card>
      </div>
      <div className="flex-1 space-y-6">
        <div><h1 className="text-3xl font-bold tracking-tight">{property.title}</h1><p className="flex items-center gap-1 text-muted-foreground mt-1"><MapPin className="h-4 w-4" /> {property.location}, {property.country}</p></div>
        <PropertyBadges />
        <ImageGallery />
        <Card className="rounded-xl"><CardContent className="p-6 space-y-4"><h2 className="text-lg font-semibold">About this property</h2><p className="text-muted-foreground leading-relaxed">{property.description}</p><HighlightsList /></CardContent></Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 21 — Step-by-Step
// ---------------------------------------------------------------------------

function Version21({ onInvest }: { onInvest: () => void }) {
  const [step, setStep] = useState(1);
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Step {step} of 3</span><span className="font-medium">{step === 1 ? 'Explore Property' : step === 2 ? 'Review Financials' : 'Make Your Investment'}</span></div>
        <div className="flex gap-2">{[1, 2, 3].map((s) => (<div key={s} className={cn('h-2 flex-1 rounded-full transition-all', s <= step ? 'bg-primary' : 'bg-muted')} />))}</div>
      </div>
      {step === 1 && (<div className="space-y-6"><h1 className="text-3xl font-bold">{property.title}</h1><p className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" /> {property.location}, {property.country}</p><ImageGallery /><Card className="rounded-xl"><CardContent className="p-6 space-y-4"><p className="text-muted-foreground leading-relaxed">{property.description}</p><PropertyBadges /><HighlightsList /></CardContent></Card><Button className="w-full" size="lg" onClick={() => setStep(2)}>Continue to Financials <ChevronRight className="h-4 w-4 ml-1" /></Button></div>)}
      {step === 2 && (<div className="space-y-6"><h2 className="text-2xl font-bold">Financial Overview</h2><div className="grid grid-cols-2 gap-4"><MetricCard icon={DollarSign} label="Share Price" value={`$${property.pricePerShare}`} /><MetricCard icon={TrendingUp} label="Annual Yield" value={`${property.annualYield}%`} /><MetricCard icon={BarChart3} label="Monthly Rent" value={`$${property.monthlyRent.toLocaleString()}`} /><MetricCard icon={PieChart} label="Occupancy" value={`${property.occupancyRate}%`} /></div><Card className="rounded-xl"><CardContent className="p-6 space-y-3"><h3 className="font-semibold">Funding Progress</h3><Progress value={fundedPercent} className="h-3" /><div className="flex justify-between text-sm text-muted-foreground"><span>{property.sharesSold} shares sold</span><span>{sharesRemaining} remaining</span></div></CardContent></Card><Card className="rounded-xl"><CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader><CardContent><DocumentsList /></CardContent></Card><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button><Button className="flex-1" onClick={() => setStep(3)}>Ready to Invest <ChevronRight className="h-4 w-4 ml-1" /></Button></div></div>)}
      {step === 3 && (<div className="space-y-6 text-center"><h2 className="text-2xl font-bold">Invest in {property.title}</h2><p className="text-muted-foreground">You are about to become a co-owner of premium real estate in {property.location}.</p><Card className="rounded-xl max-w-md mx-auto"><CardContent className="p-6 space-y-4"><div className="flex justify-between"><span className="text-muted-foreground">Price per share</span><span className="text-2xl font-bold">${property.pricePerShare}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Annual yield</span><span className="text-xl font-bold text-primary">{property.annualYield}%</span></div><div className="flex justify-between"><span className="text-muted-foreground">Property value</span><span className="font-bold">${(property.propertyValue / 1000).toFixed(0)}k</span></div></CardContent></Card><div className="flex gap-3 max-w-md mx-auto"><Button variant="outline" className="flex-1" onClick={() => setStep(2)}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button><Button className="flex-1 gap-2" size="lg" onClick={onInvest}><Shield className="h-5 w-5" /> Confirm & Invest</Button></div></div>)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 22 — Horizontal Scroll
// ---------------------------------------------------------------------------

function Version22({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">{property.title}</h1><p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3" /> {property.location}</p></div><Button className="gap-2" onClick={onInvest}><DollarSign className="h-4 w-4" /> Invest Now</Button></div>
      <div><h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Gallery</h3><div className="flex gap-4 overflow-x-auto pb-3 flex-nowrap">{property.images.map((img, i) => (<div key={i} className="flex-shrink-0 w-72 h-48 rounded-xl overflow-hidden"><img src={img} alt="" className="h-full w-full object-cover hover:scale-105 transition-transform" /></div>))}</div></div>
      <div><h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Key Metrics</h3><div className="flex gap-3 overflow-x-auto pb-3 flex-nowrap">{[{ l: 'Share Price', v: `$${property.pricePerShare}`, icon: DollarSign },{ l: 'Annual Yield', v: `${property.annualYield}%`, icon: TrendingUp },{ l: 'Monthly Rent', v: `$${property.monthlyRent}`, icon: BarChart3 },{ l: 'Occupancy', v: `${property.occupancyRate}%`, icon: PieChart },{ l: 'Funded', v: `${fundedPercent}%`, icon: Percent },{ l: 'Remaining', v: `${sharesRemaining} shares`, icon: Star }].map((m) => (<Card key={m.l} className="flex-shrink-0 w-44 rounded-xl"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><m.icon className="h-4 w-4 text-primary" /></div><div><p className="text-[10px] text-muted-foreground">{m.l}</p><p className="font-bold text-sm">{m.v}</p></div></CardContent></Card>))}</div></div>
      <div><h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Highlights</h3><div className="flex gap-3 overflow-x-auto pb-3 flex-nowrap">{property.highlights.map((h) => (<div key={h} className="flex-shrink-0 flex items-center gap-2 rounded-full border px-4 py-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" /> {h}</div>))}</div></div>
      <Card className="rounded-xl"><CardContent className="p-6"><p className="text-muted-foreground leading-relaxed">{property.description}</p></CardContent></Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 23 — Stacked Layers
// ---------------------------------------------------------------------------

function Version23({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="space-y-2 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">{property.title}</h1>
      <div className="relative">
        <Card className="rounded-2xl shadow-xl relative z-30"><CardContent className="p-0"><img src={property.images[0]} alt="" className="h-64 w-full object-cover rounded-t-2xl" /><div className="p-6 flex items-center justify-between"><div><p className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" /> {property.location}, {property.country}</p><PropertyBadges /></div><div className="text-right"><p className="text-3xl font-bold">${property.pricePerShare}</p><p className="text-sm text-muted-foreground">per share</p></div></div></CardContent></Card>
        <Card className="rounded-2xl shadow-lg relative z-20 -mt-4 mx-3" style={{ transform: 'translateY(-8px)' }}><CardContent className="p-6 pt-8"><h3 className="font-semibold mb-3">Investment Metrics</h3><div className="grid grid-cols-4 gap-4 text-center"><div><p className="text-xs text-muted-foreground">Yield</p><p className="text-xl font-bold text-primary">{property.annualYield}%</p></div><div><p className="text-xs text-muted-foreground">Occupancy</p><p className="text-xl font-bold">{property.occupancyRate}%</p></div><div><p className="text-xs text-muted-foreground">Rent</p><p className="text-xl font-bold">${property.monthlyRent}</p></div><div><p className="text-xs text-muted-foreground">Funded</p><p className="text-xl font-bold">{fundedPercent}%</p></div></div></CardContent></Card>
        <Card className="rounded-2xl shadow-md relative z-10 -mt-4 mx-6"><CardContent className="p-6 pt-8 space-y-3"><h3 className="font-semibold">About</h3><p className="text-sm text-muted-foreground leading-relaxed">{property.description}</p><HighlightsList /></CardContent></Card>
      </div>
      <div className="text-center pt-6"><Button size="lg" className="gap-2" onClick={onInvest}><DollarSign className="h-5 w-5" /> Invest Now</Button></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 24 — Grid Mosaic
// ---------------------------------------------------------------------------

function Version24({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">{property.title}</h1><Button className="gap-2" onClick={onInvest}><DollarSign className="h-4 w-4" /> Invest</Button></div>
      <div className="grid grid-cols-4 auto-rows-[160px] gap-3">
        <div className="col-span-2 row-span-2 rounded-xl overflow-hidden"><img src={property.images[0]} alt="" className="h-full w-full object-cover" /></div>
        <Card className="rounded-xl flex items-center justify-center"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Share Price</p><p className="text-3xl font-bold">${property.pricePerShare}</p></CardContent></Card>
        <Card className="rounded-xl flex items-center justify-center bg-primary/5"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Annual Yield</p><p className="text-3xl font-bold text-primary">{property.annualYield}%</p></CardContent></Card>
        <Card className="col-span-2 rounded-xl flex items-center"><CardContent className="p-4 flex items-center gap-3 w-full"><MapPin className="h-5 w-5 text-muted-foreground" /><div><p className="font-semibold">{property.location}</p><p className="text-sm text-muted-foreground">{property.country} &middot; {property.type} &middot; {property.bedrooms}BR / {property.bathrooms}BA</p></div></CardContent></Card>
        <Card className="col-span-2 row-span-2 rounded-xl overflow-auto"><CardContent className="p-5 space-y-3"><h3 className="font-semibold text-sm">About</h3><p className="text-xs text-muted-foreground leading-relaxed">{property.description}</p><HighlightsList /></CardContent></Card>
        <div className="rounded-xl overflow-hidden"><img src={property.images[1]} alt="" className="h-full w-full object-cover" /></div>
        <div className="rounded-xl overflow-hidden"><img src={property.images[2]} alt="" className="h-full w-full object-cover" /></div>
        <Card className="col-span-2 rounded-xl flex items-center"><CardContent className="p-4 w-full space-y-2"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Funding</span><span className="font-bold">{fundedPercent}%</span></div><Progress value={fundedPercent} className="h-2" /><p className="text-xs text-muted-foreground">{sharesRemaining} shares remaining</p></CardContent></Card>
        <Card className="col-span-2 rounded-xl"><CardContent className="p-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Rent</p><p className="font-bold">${property.monthlyRent}/mo</p></div><div><p className="text-xs text-muted-foreground">Occupancy</p><p className="font-bold">{property.occupancyRate}%</p></div><div><p className="text-xs text-muted-foreground">Value</p><p className="font-bold">${(property.propertyValue / 1000).toFixed(0)}k</p></div><div><p className="text-xs text-muted-foreground">Built</p><p className="font-bold">{property.yearBuilt}</p></div></CardContent></Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 25 — Inline Everything
// ---------------------------------------------------------------------------

function Version25({ onInvest }: { onInvest: () => void }) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const toggle = (section: string) => setExpandedSection(expandedSection === section ? null : section);
  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <h1 className="text-2xl font-bold">{property.title}</h1>
      <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3" /> {property.location}, {property.country}</p>
      <button onClick={() => toggle('gallery')} className="w-full text-left"><Card className="rounded-xl hover:bg-muted/30 transition"><CardContent className="p-4 flex items-center justify-between"><span className="font-semibold flex items-center gap-2"><Home className="h-4 w-4" /> Property Gallery</span>{expandedSection === 'gallery' ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</CardContent></Card></button>
      <div className={cn('overflow-hidden transition-all duration-300', expandedSection === 'gallery' ? 'max-h-[500px]' : 'max-h-0')}><div className="pb-3"><ImageGallery /></div></div>
      <button onClick={() => toggle('financials')} className="w-full text-left"><Card className="rounded-xl hover:bg-muted/30 transition"><CardContent className="p-4 flex items-center justify-between"><span className="font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Investment Metrics</span><div className="flex items-center gap-3"><span className="text-sm text-primary font-bold">{property.annualYield}% yield</span>{expandedSection === 'financials' ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</div></CardContent></Card></button>
      <div className={cn('overflow-hidden transition-all duration-300', expandedSection === 'financials' ? 'max-h-[400px]' : 'max-h-0')}><div className="grid grid-cols-2 gap-3 p-3"><MetricCard icon={DollarSign} label="Share Price" value={`$${property.pricePerShare}`} /><MetricCard icon={TrendingUp} label="Annual Yield" value={`${property.annualYield}%`} /><MetricCard icon={BarChart3} label="Monthly Rent" value={`$${property.monthlyRent.toLocaleString()}`} /><MetricCard icon={PieChart} label="Occupancy" value={`${property.occupancyRate}%`} /></div><div className="px-3 pb-3 space-y-2"><Progress value={fundedPercent} className="h-2" /><p className="text-xs text-muted-foreground">{fundedPercent}% funded — {sharesRemaining} shares remaining</p></div></div>
      <button onClick={() => toggle('about')} className="w-full text-left"><Card className="rounded-xl hover:bg-muted/30 transition"><CardContent className="p-4 flex items-center justify-between"><span className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> About & Highlights</span>{expandedSection === 'about' ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</CardContent></Card></button>
      <div className={cn('overflow-hidden transition-all duration-300', expandedSection === 'about' ? 'max-h-[600px]' : 'max-h-0')}><div className="p-3 space-y-3"><p className="text-muted-foreground leading-relaxed text-sm">{property.description}</p><PropertyBadges /><HighlightsList /></div></div>
      <button onClick={() => toggle('docs')} className="w-full text-left"><Card className="rounded-xl hover:bg-muted/30 transition"><CardContent className="p-4 flex items-center justify-between"><span className="font-semibold flex items-center gap-2"><Download className="h-4 w-4" /> Documents</span><Badge variant="secondary" className="text-xs">{property.documents.length}</Badge></CardContent></Card></button>
      <div className={cn('overflow-hidden transition-all duration-300', expandedSection === 'docs' ? 'max-h-[400px]' : 'max-h-0')}><div className="p-3"><DocumentsList /></div></div>
      <Button className="w-full gap-2 mt-4" size="lg" onClick={onInvest}><DollarSign className="h-5 w-5" /> Invest Now — ${property.pricePerShare}/share</Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERSION 26 — Floating Panels
// ---------------------------------------------------------------------------

function Version26({ onInvest }: { onInvest: () => void }) {
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b mb-6"><div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3"><div className="flex items-center gap-4"><h2 className="font-bold text-sm">{property.title}</h2><Badge variant="secondary" className="text-xs">{property.type}</Badge></div><div className="flex items-center gap-6 text-sm"><div><span className="text-muted-foreground mr-1">Price:</span><span className="font-bold">${property.pricePerShare}</span></div><div><span className="text-muted-foreground mr-1">Yield:</span><span className="font-bold text-primary">{property.annualYield}%</span></div><div><span className="text-muted-foreground mr-1">Funded:</span><span className="font-bold">{fundedPercent}%</span></div></div></div></div>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {property.location}, {property.country}</div>
        <ImageGallery />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4"><MetricCard icon={DollarSign} label="Share Price" value={`$${property.pricePerShare}`} /><MetricCard icon={TrendingUp} label="Annual Yield" value={`${property.annualYield}%`} /><MetricCard icon={BarChart3} label="Monthly Rent" value={`$${property.monthlyRent.toLocaleString()}`} /><MetricCard icon={PieChart} label="Occupancy" value={`${property.occupancyRate}%`} /></div>
        <Card className="rounded-xl"><CardContent className="p-6 space-y-4"><h2 className="text-lg font-semibold">About this property</h2><p className="text-muted-foreground leading-relaxed">{property.description}</p><HighlightsList /></CardContent></Card>
        <Card className="rounded-xl"><CardContent className="p-6 space-y-3"><h3 className="font-semibold">Funding Progress</h3><Progress value={fundedPercent} className="h-3" /><div className="flex justify-between text-sm text-muted-foreground"><span>{property.sharesSold} sold</span><span>{sharesRemaining} remaining</span></div></CardContent></Card>
        <Card className="rounded-xl"><CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader><CardContent><DocumentsList /></CardContent></Card>
      </div>
      <div className="fixed bottom-6 right-6 z-50"><Button size="lg" className="rounded-full shadow-2xl gap-2 px-8 py-6 text-base" onClick={onInvest}><DollarSign className="h-5 w-5" /> Invest Now</Button></div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InvestMarketplacePage() {
  const [version, setVersion] = useState(1);
  const [investOpen, setInvestOpen] = useState(false);

  const openInvest = () => setInvestOpen(true);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Version switcher */}
        <div className="mb-8 flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Layout</span>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26].map((v) => (
              <button
                key={v}
                onClick={() => setVersion(v)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition',
                  v === version
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 dark:bg-muted/50 dark:hover:bg-muted/70'
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <span className="ml-2 text-xs text-muted-foreground">
            {version === 1 && 'Final — Compact Sidebar'}
            {version === 2 && 'Classic Split'}
            {version === 3 && 'Full-Width Hero'}
            {version === 4 && 'Dashboard Cards'}
            {version === 5 && 'Compact Sidebar'}
            {version === 6 && 'Story Flow'}
            {version === 7 && 'Bento Grid'}
            {version === 8 && 'Glassmorphism'}
            {version === 9 && 'Neubrutalism'}
            {version === 10 && 'Dark Luxury'}
            {version === 11 && 'Animated'}
            {version === 12 && 'Magazine'}
            {version === 13 && 'Terminal'}
            {version === 14 && 'Gamified'}
            {version === 15 && 'Split/Swipe'}
            {version === 16 && 'Apple'}
            {version === 17 && 'Spacious'}
            {version === 18 && 'Dense'}
            {version === 19 && 'Hero-Led'}
            {version === 20 && 'Sidebar'}
            {version === 21 && 'Step-by-Step'}
            {version === 22 && 'Horizontal'}
            {version === 23 && 'Stacked'}
            {version === 24 && 'Mosaic'}
            {version === 25 && 'Inline'}
            {version === 26 && 'Floating'}
          </span>
        </div>

        {/* Versions */}
        {version === 1 && <Version1 onInvest={openInvest} />}
        {version === 2 && <Version2 onInvest={openInvest} />}
        {version === 3 && <Version3 onInvest={openInvest} />}
        {version === 4 && <Version4 onInvest={openInvest} />}
        {version === 5 && <Version5 onInvest={openInvest} />}
        {version === 6 && <Version6 onInvest={openInvest} />}
        {version === 7 && <Version7 onInvest={openInvest} />}
        {version === 8 && <Version8 onInvest={openInvest} />}
        {version === 9 && <Version9 onInvest={openInvest} />}
        {version === 10 && <Version10 onInvest={openInvest} />}
        {version === 11 && <Version11 onInvest={openInvest} />}
        {version === 12 && <Version12 onInvest={openInvest} />}
        {version === 13 && <Version13 onInvest={openInvest} />}
        {version === 14 && <Version14 onInvest={openInvest} />}
        {version === 15 && <Version15 onInvest={openInvest} />}
        {version === 16 && <Version16 onInvest={openInvest} />}
        {version === 17 && <Version17 onInvest={openInvest} />}
        {version === 18 && <Version18 onInvest={openInvest} />}
        {version === 19 && <Version19 onInvest={openInvest} />}
        {version === 20 && <Version20 onInvest={openInvest} />}
        {version === 21 && <Version21 onInvest={openInvest} />}
        {version === 22 && <Version22 onInvest={openInvest} />}
        {version === 23 && <Version23 onInvest={openInvest} />}
        {version === 24 && <Version24 onInvest={openInvest} />}
        {version === 25 && <Version25 onInvest={openInvest} />}
        {version === 26 && <Version26 onInvest={openInvest} />}
      </div>

      <InvestModal open={investOpen} onOpenChange={setInvestOpen} />
    </div>
  );
}
