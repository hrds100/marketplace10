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
// VERSION 1 — Classic Split
// ---------------------------------------------------------------------------

function Version1({
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
// VERSION 2 — Full-Width Hero
// ---------------------------------------------------------------------------

function Version2({ onInvest }: { onInvest: () => void }) {
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
// VERSION 3 — Dashboard Cards
// ---------------------------------------------------------------------------

function Version3({ onInvest }: { onInvest: () => void }) {
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
// VERSION 4 — Compact Sidebar
// ---------------------------------------------------------------------------

function Version4({ onInvest }: { onInvest: () => void }) {
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
// VERSION 5 — Story Flow
// ---------------------------------------------------------------------------

function Version5({ onInvest }: { onInvest: () => void }) {
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
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((v) => (
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
            {version === 1 && 'Classic Split'}
            {version === 2 && 'Full-Width Hero'}
            {version === 3 && 'Dashboard Cards'}
            {version === 4 && 'Compact Sidebar'}
            {version === 5 && 'Story Flow'}
          </span>
        </div>

        {/* Versions */}
        {version === 1 && <Version1 onInvest={openInvest} />}
        {version === 2 && <Version2 onInvest={openInvest} />}
        {version === 3 && <Version3 onInvest={openInvest} />}
        {version === 4 && <Version4 onInvest={openInvest} />}
        {version === 5 && <Version5 onInvest={openInvest} />}
      </div>

      <InvestModal open={investOpen} onOpenChange={setInvestOpen} />
    </div>
  );
}
