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
// Main Page
// ---------------------------------------------------------------------------

export default function InvestMarketplacePage() {
  const [investOpen, setInvestOpen] = useState(false);
  const [sliderShares, setSliderShares] = useState(5);

  const openInvest = () => setInvestOpen(true);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
                  <Button className="w-full gap-2" size="lg" onClick={openInvest}>
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
      </div>

      <InvestModal open={investOpen} onOpenChange={setInvestOpen} />
    </div>
  );
}
