import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  PiggyBank,
  Clock,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Building2,
  Eye,
  Activity,
  History,
  Coins,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockPortfolio } from '@/data/investMockData';

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const gainPercent = (
  ((mockPortfolio.totalValue - mockPortfolio.totalInvested) / mockPortfolio.totalInvested) *
  100
).toFixed(1);

const mockTransactions = [
  { id: 't1', date: '2026-03-01', action: 'Claimed $127.50 rent', property: 'Seseh Beachfront Villa', type: 'payout' as const },
  { id: 't2', date: '2026-03-01', action: 'Claimed $102.08 rent', property: 'Marina Gate Apartment', type: 'payout' as const },
  { id: 't3', date: '2026-02-15', action: 'Bought 5 shares', property: 'Marina Gate Apartment', type: 'purchase' as const },
  { id: 't4', date: '2026-02-01', action: 'Claimed $127.50 rent', property: 'Seseh Beachfront Villa', type: 'payout' as const },
  { id: 't5', date: '2026-02-01', action: 'Claimed $102.08 rent', property: 'Marina Gate Apartment', type: 'payout' as const },
  { id: 't6', date: '2026-01-10', action: 'Bought 15 shares', property: 'Seseh Beachfront Villa', type: 'purchase' as const },
  { id: 't7', date: '2026-01-01', action: 'Claimed $127.50 rent', property: 'Seseh Beachfront Villa', type: 'payout' as const },
  { id: 't8', date: '2026-01-01', action: 'Claimed $102.08 rent', property: 'Marina Gate Apartment', type: 'payout' as const },
];

// ─── VERSION 1: Overview Dashboard ────────────────────────────────────────────

function Version1() {
  const summaryCards = [
    {
      title: 'Total Invested',
      value: mockPortfolio.totalInvested,
      icon: Wallet,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Current Value',
      value: mockPortfolio.totalValue,
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      trend: +13.5,
    },
    {
      title: 'Total Earnings',
      value: mockPortfolio.totalEarnings,
      icon: PiggyBank,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      trend: +8.2,
    },
    {
      title: 'Pending Payouts',
      value: mockPortfolio.pendingPayouts,
      icon: Clock,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold">{formatCurrency(card.value)}</p>
                </div>
                <div className={cn('p-3 rounded-xl', card.bg)}>
                  <card.icon className={cn('h-5 w-5', card.color)} />
                </div>
              </div>
              {card.trend !== undefined && (
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-500">
                  <TrendingUp className="h-3 w-3" />
                  <span>+{card.trend}%</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Holdings */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Your Holdings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {mockPortfolio.holdings.map((holding) => {
            const gainPct = (
              ((holding.currentValue - holding.invested) / holding.invested) *
              100
            ).toFixed(1);
            const progressValue = (holding.currentValue / (holding.invested * 2)) * 100;

            return (
              <Card key={holding.propertyId} className="overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={holding.image}
                    alt={holding.propertyTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <Badge className="absolute top-3 right-3 bg-emerald-500/90 text-white border-0">
                    {holding.status}
                  </Badge>
                </div>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h4 className="font-semibold text-base">{holding.propertyTitle}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {holding.location}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Shares Owned</p>
                      <p className="font-medium">{holding.sharesOwned}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Value</p>
                      <p className="font-medium">{formatCurrency(holding.currentValue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Monthly Yield</p>
                      <p className="font-medium text-emerald-600">{formatCurrency(holding.monthlyYield)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Annual Yield</p>
                      <p className="font-medium text-emerald-600">{holding.annualYield}%</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Growth</span>
                      <span className="text-emerald-500">+{gainPct}%</span>
                    </div>
                    <Progress value={Math.min(progressValue, 100)} className="h-1.5" />
                  </div>

                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Eye className="h-4 w-4" />
                    View Property
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── VERSION 2: Big Numbers ───────────────────────────────────────────────────

function Version2() {
  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground mb-1">Total Portfolio Value</p>
          <h2 className="text-5xl font-bold tracking-tight">{formatCurrency(mockPortfolio.totalValue)}</h2>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <span className="text-lg font-semibold text-emerald-500">+{gainPercent}%</span>
            <span className="text-sm text-muted-foreground ml-1">all time</span>
          </div>
        </CardContent>
      </Card>

      {/* Mini Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10">
              <Wallet className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Invested</p>
              <p className="text-lg font-bold">{formatCurrency(mockPortfolio.totalInvested)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10">
              <Coins className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Earned</p>
              <p className="text-lg font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10">
              <Clock className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Payouts</p>
              <p className="text-lg font-bold">{formatCurrency(mockPortfolio.pendingPayouts)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Holdings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Yield</TableHead>
                <TableHead className="text-right">Last Payout</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPortfolio.holdings.map((h) => (
                <TableRow
                  key={h.propertyId}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={h.image}
                        alt={h.propertyTitle}
                        className="h-10 w-14 rounded-md object-cover"
                      />
                      <div>
                        <p className="font-medium text-sm">{h.propertyTitle}</p>
                        <p className="text-xs text-muted-foreground">{h.location}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{h.sharesOwned}</TableCell>
                  <TableCell className="text-right">{formatCurrency(h.invested)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(h.currentValue)}</TableCell>
                  <TableCell className="text-right text-emerald-600">{h.annualYield}%</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(h.lastPayout).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    >
                      {h.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── VERSION 3: Card Grid ─────────────────────────────────────────────────────

function Version3() {
  return (
    <div className="space-y-6">
      {/* Holdings — visual-first cards */}
      <div className="space-y-4">
        {mockPortfolio.holdings.map((h) => {
          const gain = ((h.currentValue - h.invested) / h.invested) * 100;
          const progressValue = (h.totalEarned / h.invested) * 100;

          return (
            <Card key={h.propertyId} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row">
                {/* Image — left 40% */}
                <div className="relative w-full md:w-[40%] h-56 md:h-auto overflow-hidden">
                  <img
                    src={h.image}
                    alt={h.propertyTitle}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent md:bg-gradient-to-r" />
                  <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4">
                    <Badge className="bg-white/90 text-foreground border-0 font-medium">
                      <Building2 className="h-3 w-3 mr-1" />
                      {h.sharesOwned} shares
                    </Badge>
                  </div>
                </div>

                {/* Details — right 60% */}
                <div className="flex-1 p-5 md:p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-semibold">{h.propertyTitle}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {h.location}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 capitalize"
                    >
                      {h.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Current Value</p>
                      <p className="text-base font-bold">{formatCurrency(h.currentValue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Invested</p>
                      <p className="text-base font-bold">{formatCurrency(h.invested)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Monthly Yield</p>
                      <p className="text-base font-bold text-emerald-600">
                        {formatCurrency(h.monthlyYield)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Annual Return</p>
                      <p className="text-base font-bold text-emerald-600">{h.annualYield}%</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Earnings vs. Invested</span>
                      <span className="text-emerald-500">{progressValue.toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(progressValue, 100)} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-sm text-emerald-500">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-medium">+{gain.toFixed(1)}% gain</span>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-primary">
                      View Property
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Portfolio Summary Footer */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Invested</p>
              <p className="text-lg font-bold mt-0.5">{formatCurrency(mockPortfolio.totalInvested)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Value</p>
              <p className="text-lg font-bold mt-0.5">{formatCurrency(mockPortfolio.totalValue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Earnings</p>
              <p className="text-lg font-bold mt-0.5 text-emerald-600">
                {formatCurrency(mockPortfolio.totalEarnings)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
              <p className="text-lg font-bold mt-0.5">{formatCurrency(mockPortfolio.pendingPayouts)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── VERSION 4: Split View ────────────────────────────────────────────────────

function Version4() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const summaryItems = [
    { label: 'Portfolio Value', value: mockPortfolio.totalValue, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Total Invested', value: mockPortfolio.totalInvested, icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Earnings', value: mockPortfolio.totalEarnings, icon: PiggyBank, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Pending Payouts', value: mockPortfolio.pendingPayouts, icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left — Portfolio Summary (40%) */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="bg-gradient-to-br from-primary/5 to-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Portfolio Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {summaryItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={cn('p-2.5 rounded-lg', item.bg)}>
                  <item.icon className={cn('h-4 w-4', item.color)} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold">{formatCurrency(item.value)}</p>
                </div>
              </div>
            ))}

            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Gain</span>
                <div className="flex items-center gap-1 text-emerald-500 font-semibold">
                  <TrendingUp className="h-4 w-4" />
                  +{gainPercent}%
                </div>
              </div>
              <Progress
                value={parseFloat(gainPercent)}
                className="h-2 mt-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right — Holdings List (60%) */}
      <div className="lg:col-span-3 space-y-3">
        <h3 className="text-base font-semibold mb-1">Holdings</h3>
        {mockPortfolio.holdings.map((h) => {
          const isExpanded = expandedId === h.propertyId;
          const gain = ((h.currentValue - h.invested) / h.invested) * 100;

          return (
            <Card
              key={h.propertyId}
              className={cn(
                'overflow-hidden transition-all cursor-pointer',
                isExpanded && 'ring-1 ring-primary/30'
              )}
              onClick={() => setExpandedId(isExpanded ? null : h.propertyId)}
            >
              <CardContent className="p-4">
                {/* Compact Row */}
                <div className="flex items-center gap-4">
                  <img
                    src={h.image}
                    alt={h.propertyTitle}
                    className="h-14 w-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm truncate">{h.propertyTitle}</h4>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{h.location}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <span>
                        <span className="text-muted-foreground">Shares: </span>
                        <span className="font-medium">{h.sharesOwned}</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Value: </span>
                        <span className="font-medium">{formatCurrency(h.currentValue)}</span>
                      </span>
                      <span className="text-emerald-500 font-medium">{h.annualYield}% APY</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Invested</p>
                        <p className="font-semibold">{formatCurrency(h.invested)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current Value</p>
                        <p className="font-semibold">{formatCurrency(h.currentValue)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gain</p>
                        <p className="font-semibold text-emerald-500">
                          +{formatCurrency(h.currentValue - h.invested)} ({gain.toFixed(1)}%)
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Earned</p>
                        <p className="font-semibold">{formatCurrency(h.totalEarned)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Monthly Yield</p>
                        <p className="font-semibold text-emerald-600">{formatCurrency(h.monthlyYield)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Payout</p>
                        <p className="font-semibold">
                          {new Date(h.lastPayout).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                        View Property
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        Buy More Shares
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── VERSION 5: Tabbed Portfolio ──────────────────────────────────────────────

function Version5() {
  const inlineMetrics = [
    { label: 'Invested', value: mockPortfolio.totalInvested },
    { label: 'Value', value: mockPortfolio.totalValue },
    { label: 'Earned', value: mockPortfolio.totalEarnings },
    { label: 'Pending', value: mockPortfolio.pendingPayouts },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {inlineMetrics.map((m, i) => (
              <div key={m.label} className="flex items-center gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-bold">{formatCurrency(m.value)}</p>
                </div>
                {i < inlineMetrics.length - 1 && (
                  <div className="hidden sm:block h-8 w-px bg-border ml-3" />
                )}
              </div>
            ))}
            <div className="flex items-center gap-1 text-emerald-500 font-semibold text-sm">
              <TrendingUp className="h-4 w-4" />
              +{gainPercent}%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="holdings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="holdings" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Holdings
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            <Activity className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Holdings Tab */}
        <TabsContent value="holdings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockPortfolio.holdings.map((h) => {
              const gain = ((h.currentValue - h.invested) / h.invested) * 100;

              return (
                <Card key={h.propertyId} className="overflow-hidden group hover:shadow-lg transition-shadow">
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={h.image}
                      alt={h.propertyTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div>
                        <h4 className="text-white font-semibold text-sm">{h.propertyTitle}</h4>
                        <p className="text-white/80 text-xs">{h.location}</p>
                      </div>
                      <Badge className="bg-emerald-500/90 text-white border-0 capitalize text-xs">
                        {h.status}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Shares</p>
                        <p className="font-bold">{h.sharesOwned}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Value</p>
                        <p className="font-bold">{formatCurrency(h.currentValue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Yield</p>
                        <p className="font-bold text-emerald-600">{h.annualYield}%</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Monthly: <span className="text-foreground font-medium">{formatCurrency(h.monthlyYield)}</span>
                      </span>
                      <span className="text-emerald-500 font-medium flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        +{gain.toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Portfolio Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mock Sparkline */}
              <div className="relative h-48 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/20 flex items-center justify-center overflow-hidden">
                {/* Fake sparkline with CSS */}
                <div className="absolute inset-x-6 bottom-6 top-10 flex items-end gap-1">
                  {[35, 42, 38, 55, 48, 62, 58, 70, 65, 78, 72, 85, 80, 88, 92].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-primary/60 to-primary/20 rounded-t-sm transition-all hover:from-primary/80 hover:to-primary/40"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="absolute top-3 left-4 text-xs text-muted-foreground">
                  12-month trend
                </div>
                <div className="absolute top-3 right-4 flex items-center gap-1 text-xs text-emerald-500 font-medium">
                  <TrendingUp className="h-3 w-3" />
                  +{gainPercent}%
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">ROI</p>
                  <p className="text-xl font-bold text-emerald-500">+{gainPercent}%</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Avg. Monthly</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(
                      mockPortfolio.holdings.reduce((sum, h) => sum + h.monthlyYield, 0)
                    )}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Best Performer</p>
                  <p className="text-sm font-bold mt-1">Seseh Villa</p>
                  <p className="text-xs text-emerald-500">12.4% APY</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Properties</p>
                  <p className="text-xl font-bold">{mockPortfolio.holdings.length}</p>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Performance chart coming soon - live data will replace mock visualisation
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead className="text-right">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTransactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{tx.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.property}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            'capitalize text-xs',
                            tx.type === 'purchase'
                              ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          )}
                        >
                          {tx.type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── VERSION 6: Bento Grid ───────────────────────────────────────────────────

function Version6() {
  const totalMonthly = mockPortfolio.holdings.reduce((s, h) => s + h.monthlyYield, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 grid-rows-3 gap-3 auto-rows-[140px]">
        {/* Portfolio value — large */}
        <div className="col-span-2 row-span-1 flex flex-col justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-5">
          <p className="text-xs text-muted-foreground">Portfolio Value</p>
          <p className="text-4xl font-bold tracking-tight">{formatCurrency(mockPortfolio.totalValue)}</p>
          <div className="flex items-center gap-1 mt-1 text-emerald-500 text-sm font-medium">
            <TrendingUp className="h-3.5 w-3.5" /> +{gainPercent}%
          </div>
        </div>

        {/* Invested */}
        <div className="col-span-1 row-span-1 flex flex-col items-center justify-center rounded-2xl bg-blue-500/10 p-4">
          <Wallet className="h-5 w-5 text-blue-500 mb-1" />
          <p className="text-xl font-bold">{formatCurrency(mockPortfolio.totalInvested)}</p>
          <p className="text-[10px] text-muted-foreground">Invested</p>
        </div>

        {/* Earnings */}
        <div className="col-span-1 row-span-1 flex flex-col items-center justify-center rounded-2xl bg-amber-500/10 p-4">
          <PiggyBank className="h-5 w-5 text-amber-500 mb-1" />
          <p className="text-xl font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</p>
          <p className="text-[10px] text-muted-foreground">Earned</p>
        </div>

        {/* Holdings — each gets a tile */}
        {mockPortfolio.holdings.map((h) => (
          <div key={h.propertyId} className="col-span-2 row-span-1 flex gap-4 rounded-2xl border bg-card p-4 overflow-hidden">
            <img src={h.image} alt="" className="h-full w-28 rounded-xl object-cover flex-shrink-0" />
            <div className="flex flex-col justify-center min-w-0">
              <p className="font-semibold text-sm truncate">{h.propertyTitle}</p>
              <p className="text-xs text-muted-foreground">{h.location}</p>
              <div className="flex gap-4 mt-2 text-xs">
                <span><span className="text-muted-foreground">Value:</span> <span className="font-bold">{formatCurrency(h.currentValue)}</span></span>
                <span className="text-emerald-500 font-bold">{h.annualYield}% APY</span>
              </div>
            </div>
          </div>
        ))}

        {/* Monthly income */}
        <div className="col-span-1 row-span-1 flex flex-col items-center justify-center rounded-2xl bg-emerald-500/10 p-4">
          <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalMonthly)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Monthly Income</p>
        </div>

        {/* Pending */}
        <div className="col-span-1 row-span-1 flex flex-col items-center justify-center rounded-2xl bg-purple-500/10 p-4">
          <Clock className="h-5 w-5 text-purple-500 mb-1" />
          <p className="text-xl font-bold">{formatCurrency(mockPortfolio.pendingPayouts)}</p>
          <p className="text-[10px] text-muted-foreground">Pending</p>
        </div>
      </div>
    </div>
  );
}

// ─── VERSION 7: Glassmorphism ────────────────────────────────────────────────

function Version7() {
  return (
    <div className="min-h-screen rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-8 text-white">
      <h2 className="text-3xl font-bold mb-1">My Portfolio</h2>
      <p className="text-white/40 mb-8">Track your investments and earnings</p>

      {/* Big value */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-8 text-center mb-6">
        <p className="text-white/50 text-sm">Total Portfolio Value</p>
        <p className="text-5xl font-bold mt-1 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]">{formatCurrency(mockPortfolio.totalValue)}</p>
        <p className="text-emerald-400 mt-2 font-medium">+{gainPercent}% all time</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Invested', value: formatCurrency(mockPortfolio.totalInvested), glow: '' },
          { label: 'Earned', value: formatCurrency(mockPortfolio.totalEarnings), glow: 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]' },
          { label: 'Pending', value: formatCurrency(mockPortfolio.pendingPayouts), glow: '' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 text-center">
            <p className="text-xs text-white/40">{item.label}</p>
            <p className={cn('text-xl font-bold mt-1', item.glow || 'text-white')}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Holdings */}
      <div className="space-y-4">
        {mockPortfolio.holdings.map((h) => (
          <div key={h.propertyId} className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 flex gap-5">
            <img src={h.image} alt="" className="h-24 w-32 rounded-lg object-cover opacity-80 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">{h.propertyTitle}</p>
              <p className="text-xs text-white/40">{h.location}</p>
              <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                <div>
                  <p className="text-white/40 text-xs">Value</p>
                  <p className="font-bold">{formatCurrency(h.currentValue)}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Monthly</p>
                  <p className="font-bold text-emerald-400">{formatCurrency(h.monthlyYield)}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Yield</p>
                  <p className="font-bold text-emerald-400">{h.annualYield}%</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── VERSION 8: Neubrutalism ─────────────────────────────────────────────────

function Version8() {
  return (
    <div className="space-y-5">
      <div className="border-2 border-black bg-yellow-300 p-6 shadow-[6px_6px_0px_black] rounded-lg">
        <h2 className="text-3xl font-black uppercase">MY PORTFOLIO</h2>
        <p className="text-lg font-bold">{formatCurrency(mockPortfolio.totalValue)} total value</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'INVESTED', value: formatCurrency(mockPortfolio.totalInvested), bg: 'bg-cyan-300' },
          { label: 'VALUE', value: formatCurrency(mockPortfolio.totalValue), bg: 'bg-pink-300' },
          { label: 'EARNED', value: formatCurrency(mockPortfolio.totalEarnings), bg: 'bg-lime-300' },
          { label: 'PENDING', value: formatCurrency(mockPortfolio.pendingPayouts), bg: 'bg-orange-300' },
        ].map((item) => (
          <div key={item.label} className={cn('border-2 border-black p-4 shadow-[4px_4px_0px_black] rounded-lg', item.bg)}>
            <p className="text-[10px] font-black uppercase tracking-widest">{item.label}</p>
            <p className="text-xl font-black">{item.value}</p>
          </div>
        ))}
      </div>

      {mockPortfolio.holdings.map((h) => {
        const gain = ((h.currentValue - h.invested) / h.invested) * 100;
        return (
          <div key={h.propertyId} className="border-2 border-black bg-white shadow-[4px_4px_0px_black] rounded-lg overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <img src={h.image} alt="" className="h-48 md:h-auto md:w-48 object-cover border-b-2 md:border-b-0 md:border-r-2 border-black" />
              <div className="p-5 flex-1">
                <h3 className="text-xl font-black uppercase">{h.propertyTitle}</h3>
                <p className="font-bold text-sm">{h.location}</p>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-yellow-200 border border-black p-2 rounded text-center">
                    <p className="text-[10px] font-black">SHARES</p>
                    <p className="text-lg font-black">{h.sharesOwned}</p>
                  </div>
                  <div className="bg-pink-200 border border-black p-2 rounded text-center">
                    <p className="text-[10px] font-black">VALUE</p>
                    <p className="text-lg font-black">{formatCurrency(h.currentValue)}</p>
                  </div>
                  <div className="bg-lime-200 border border-black p-2 rounded text-center">
                    <p className="text-[10px] font-black">GAIN</p>
                    <p className="text-lg font-black">+{gain.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── VERSION 9: Dark Luxury ──────────────────────────────────────────────────

function Version9() {
  return (
    <div className="min-h-screen rounded-3xl bg-slate-950 p-8 text-white">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-3 pt-8">
          <p className="text-amber-400/80 text-xs uppercase tracking-[0.4em]">Private Portfolio</p>
          <h2 className="text-5xl font-light tracking-tight">{formatCurrency(mockPortfolio.totalValue)}</h2>
          <div className="w-16 h-px bg-amber-400/40 mx-auto" />
          <p className="text-white/30 text-sm">+{gainPercent}% return on investment</p>
        </div>

        <div className="grid grid-cols-3 gap-px bg-amber-400/10 border border-amber-400/20 rounded-xl overflow-hidden">
          {[
            { label: 'Invested', value: formatCurrency(mockPortfolio.totalInvested) },
            { label: 'Earnings', value: formatCurrency(mockPortfolio.totalEarnings) },
            { label: 'Pending', value: formatCurrency(mockPortfolio.pendingPayouts) },
          ].map((item) => (
            <div key={item.label} className="bg-slate-950 p-6 text-center">
              <p className="text-2xl font-light text-amber-400">{item.value}</p>
              <p className="text-[10px] text-white/25 mt-2 uppercase tracking-[0.3em]">{item.label}</p>
            </div>
          ))}
        </div>

        {mockPortfolio.holdings.map((h) => (
          <div key={h.propertyId} className="border border-amber-400/10 rounded-xl overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <img src={h.image} alt="" className="h-48 md:h-auto md:w-56 object-cover opacity-70" />
              <div className="p-8 flex-1 space-y-4">
                <h3 className="text-2xl font-light">{h.propertyTitle}</h3>
                <p className="text-white/30 text-sm">{h.location}</p>
                <div className="grid grid-cols-3 gap-6 pt-4">
                  <div>
                    <p className="text-amber-400 text-2xl font-light">{formatCurrency(h.currentValue)}</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">Value</p>
                  </div>
                  <div>
                    <p className="text-amber-400 text-2xl font-light">{h.annualYield}%</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">Yield</p>
                  </div>
                  <div>
                    <p className="text-white text-2xl font-light">{h.sharesOwned}</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">Shares</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── VERSION 10: Animated ────────────────────────────────────────────────────

function Version10() {
  return (
    <div className="space-y-6">
      {/* Value banner with pulse */}
      <Card className="rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-background transition-all duration-300 hover:shadow-xl">
        <CardContent className="p-8 text-center relative">
          <div className="absolute top-4 right-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Total Value</p>
          <p className="text-5xl font-bold tracking-tight mt-1">{formatCurrency(mockPortfolio.totalValue)}</p>
          <p className="text-emerald-500 font-medium mt-2">+{gainPercent}%</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Invested', value: formatCurrency(mockPortfolio.totalInvested) },
          { label: 'Earned', value: formatCurrency(mockPortfolio.totalEarnings) },
          { label: 'Pending', value: formatCurrency(mockPortfolio.pendingPayouts) },
        ].map((item) => (
          <Card key={item.label} className="rounded-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-xl">
            <CardContent className="p-5 text-center">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xl font-bold mt-1">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockPortfolio.holdings.map((h) => {
        const gain = ((h.currentValue - h.invested) / h.invested) * 100;
        const progress = (h.totalEarned / h.invested) * 100;
        return (
          <Card key={h.propertyId} className="rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-48 h-40 md:h-auto overflow-hidden">
                <img src={h.image} alt="" className="h-full w-full object-cover transition-transform duration-700 hover:scale-110" />
              </div>
              <CardContent className="p-5 flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{h.propertyTitle}</h4>
                    <p className="text-xs text-muted-foreground">{h.location}</p>
                  </div>
                  <span className="text-emerald-500 font-bold text-sm">+{gain.toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Value</p><p className="font-bold">{formatCurrency(h.currentValue)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Monthly</p><p className="font-bold text-emerald-500">{formatCurrency(h.monthlyYield)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Yield</p><p className="font-bold">{h.annualYield}%</p></div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </CardContent>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── VERSION 11: Magazine ────────────────────────────────────────────────────

function Version11() {
  return (
    <div className="space-y-10 font-serif">
      <div className="border-b-2 border-foreground pb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-2">Investor Report</p>
        <h2 className="text-5xl font-bold leading-tight">Portfolio Overview</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          <div className="border-l-4 border-primary pl-6 py-2">
            <p className="text-6xl font-bold">{formatCurrency(mockPortfolio.totalValue)}</p>
            <p className="text-sm text-muted-foreground italic mt-1">Total portfolio value</p>
          </div>
          <div className="border-l-4 border-muted pl-6 py-2">
            <p className="text-4xl font-bold text-emerald-500">+{gainPercent}%</p>
            <p className="text-sm text-muted-foreground italic mt-1">Return on investment</p>
          </div>
          <div className="border-l-4 border-muted pl-6 py-2">
            <p className="text-4xl font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</p>
            <p className="text-sm text-muted-foreground italic mt-1">Total rental earnings</p>
          </div>
          <div className="border-l-4 border-muted pl-6 py-2">
            <p className="text-4xl font-bold">{mockPortfolio.holdings.length}</p>
            <p className="text-sm text-muted-foreground italic mt-1">Properties in portfolio</p>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {mockPortfolio.holdings.map((h) => (
            <div key={h.propertyId} className="flex gap-6 border-b pb-6 last:border-0">
              <img src={h.image} alt="" className="h-36 w-48 rounded-sm object-cover flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{h.propertyTitle}</h3>
                <p className="text-sm text-muted-foreground italic">{h.location}</p>
                <p className="text-lg leading-[1.8] text-muted-foreground">
                  Holding <span className="font-bold text-foreground">{h.sharesOwned} shares</span> valued at{' '}
                  <span className="font-bold text-foreground">{formatCurrency(h.currentValue)}</span>, yielding{' '}
                  <span className="font-bold text-emerald-600">{formatCurrency(h.monthlyYield)}/mo</span> at{' '}
                  <span className="font-bold text-emerald-600">{h.annualYield}% APY</span>.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── VERSION 12: Terminal ────────────────────────────────────────────────────

function Version12() {
  return (
    <div className="min-h-screen rounded-2xl bg-[#0a0e14] p-6 font-mono text-green-400">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-green-600">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          nfstay-portfolio v2.0 -- investor dashboard
        </div>

        <div className="border border-green-900/50 rounded-lg p-4 bg-green-950/20">
          <p className="text-green-600 text-xs mb-1">$ portfolio --summary</p>
          <pre className="text-sm">{`
TOTAL VALUE     ${formatCurrency(mockPortfolio.totalValue)}
TOTAL INVESTED  ${formatCurrency(mockPortfolio.totalInvested)}
TOTAL EARNINGS  ${formatCurrency(mockPortfolio.totalEarnings)}
PENDING         ${formatCurrency(mockPortfolio.pendingPayouts)}
ROI             +${gainPercent}%`}</pre>
        </div>

        <div className="border border-green-900/50 rounded-lg p-4 bg-green-950/20">
          <p className="text-green-600 text-xs mb-2">$ portfolio --holdings --format table</p>
          <pre className="text-sm overflow-x-auto">{`
+${'-'.repeat(26)}+${'-'.repeat(8)}+${'-'.repeat(14)}+${'-'.repeat(14)}+${'-'.repeat(8)}+
| PROPERTY${' '.repeat(17)}| SHARES | INVESTED${' '.repeat(5)}| VALUE${' '.repeat(8)}| YIELD  |
+${'-'.repeat(26)}+${'-'.repeat(8)}+${'-'.repeat(14)}+${'-'.repeat(14)}+${'-'.repeat(8)}+`}
{mockPortfolio.holdings.map((h) => `| ${h.propertyTitle.padEnd(24)} | ${String(h.sharesOwned).padEnd(6)} | ${formatCurrency(h.invested).padEnd(12)} | ${formatCurrency(h.currentValue).padEnd(12)} | ${(h.annualYield + '%').padEnd(6)} |`).join('\n')}
{`+${'-'.repeat(26)}+${'-'.repeat(8)}+${'-'.repeat(14)}+${'-'.repeat(14)}+${'-'.repeat(8)}+`}
          </pre>
        </div>

        <div className="border border-green-900/50 rounded-lg p-4 bg-green-950/20">
          <p className="text-green-600 text-xs mb-2">$ portfolio --roi-bar</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-4 bg-green-950 rounded overflow-hidden border border-green-900/50">
              <div className="h-full bg-green-500/60" style={{ width: `${Math.min(parseFloat(gainPercent) * 5, 100)}%` }} />
            </div>
            <span className="text-sm font-bold">+{gainPercent}%</span>
          </div>
        </div>

        <div className="text-green-600 text-xs">
          $ <span className="text-green-400 animate-pulse">_</span>
        </div>
      </div>
    </div>
  );
}

// ─── VERSION 13: Gamified ────────────────────────────────────────────────────

function Version13() {
  const level = Math.floor(mockPortfolio.holdings.reduce((s, h) => s + h.sharesOwned, 0) / 5);
  const totalMonthly = mockPortfolio.holdings.reduce((s, h) => s + h.monthlyYield, 0);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl bg-gradient-to-r from-purple-500/10 via-primary/5 to-amber-500/10 border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-1">INVESTOR PROFILE</Badge>
              <h2 className="text-2xl font-bold">Level {level} Investor</h2>
              <p className="text-sm text-muted-foreground">{mockPortfolio.holdings.length} properties in portfolio</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-amber-400">{formatCurrency(mockPortfolio.totalValue)}</p>
              <p className="text-xs text-muted-foreground">Portfolio Value</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span>XP to next level</span>
              <span className="text-amber-400">{level * 500} / {(level + 1) * 500}</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-amber-500" style={{ width: `${(level / (level + 1)) * 100}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: '💰', label: 'Invested', value: formatCurrency(mockPortfolio.totalInvested), xp: '+100 XP' },
          { icon: '📈', label: 'ROI', value: `+${gainPercent}%`, xp: '+200 XP' },
          { icon: '🏠', label: 'Monthly', value: formatCurrency(totalMonthly), xp: '+75 XP' },
          { icon: '⏳', label: 'Pending', value: formatCurrency(mockPortfolio.pendingPayouts), xp: '+50 XP' },
        ].map((item) => (
          <Card key={item.label} className="rounded-xl border-2 hover:border-primary/50 transition-all hover:scale-[1.02]">
            <CardContent className="p-4 text-center">
              <span className="text-2xl">{item.icon}</span>
              <p className="text-lg font-bold mt-1">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <Badge variant="outline" className="mt-2 text-[10px] text-amber-400 border-amber-400/30">{item.xp}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockPortfolio.holdings.map((h) => (
        <Card key={h.propertyId} className="rounded-2xl border-2 hover:border-primary/30 transition-all">
          <CardContent className="p-5 flex gap-5 items-center">
            <img src={h.image} alt="" className="h-20 w-28 rounded-xl object-cover" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold">{h.propertyTitle}</h4>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                  {h.annualYield}% APY
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{h.sharesOwned} shares owned</p>
              <div className="flex gap-4 mt-2">
                <span className="text-sm font-bold">{formatCurrency(h.currentValue)}</span>
                <span className="text-sm text-emerald-500">{formatCurrency(h.monthlyYield)}/mo</span>
              </div>
            </div>
            <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/30">+{Math.round(h.annualYield * 10)} XP/mo</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── VERSION 14: Split/Swipe ─────────────────────────────────────────────────

function Version14() {
  return (
    <div className="space-y-0">
      {/* Dark top section */}
      <div className="bg-slate-900 text-white p-8 rounded-t-2xl">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <p className="text-white/50 text-sm">Total Portfolio Value</p>
          <h2 className="text-5xl font-bold">{formatCurrency(mockPortfolio.totalValue)}</h2>
          <p className="text-emerald-400 font-medium">+{gainPercent}% all time</p>
        </div>
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 mt-8 text-center">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(mockPortfolio.totalInvested)}</p>
            <p className="text-xs text-white/40">Invested</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(mockPortfolio.totalEarnings)}</p>
            <p className="text-xs text-white/40">Earned</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{formatCurrency(mockPortfolio.pendingPayouts)}</p>
            <p className="text-xs text-white/40">Pending</p>
          </div>
        </div>
      </div>

      {/* Light bottom */}
      <div className="bg-background p-8 rounded-b-2xl border border-t-0">
        <h3 className="text-lg font-semibold mb-4">Your Holdings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockPortfolio.holdings.map((h) => {
            const gain = ((h.currentValue - h.invested) / h.invested) * 100;
            return (
              <Card key={h.propertyId} className="overflow-hidden rounded-xl hover:-translate-y-1 transition-transform">
                <div className="flex">
                  <img src={h.image} alt="" className="h-full w-32 object-cover -rotate-1 transform hover:rotate-0 transition-transform duration-500" />
                  <CardContent className="p-4 flex-1 space-y-2">
                    <h4 className="font-semibold text-sm">{h.propertyTitle}</h4>
                    <p className="text-xs text-muted-foreground">{h.location}</p>
                    <div className="flex gap-4 text-sm">
                      <span className="font-bold">{formatCurrency(h.currentValue)}</span>
                      <span className="text-emerald-500">+{gain.toFixed(1)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{h.sharesOwned} shares | {h.annualYield}% APY</p>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── VERSION 15: Apple ───────────────────────────────────────────────────────

function Version15() {
  return (
    <div className="space-y-20 py-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground tracking-wider uppercase">Your Portfolio</p>
        <h2 className="text-6xl font-semibold tracking-tight">{formatCurrency(mockPortfolio.totalValue)}</h2>
        <p className="text-xl text-muted-foreground">+{gainPercent}% return on investment</p>
      </div>

      <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
        {[
          { value: formatCurrency(mockPortfolio.totalInvested), label: 'Total Invested' },
          { value: formatCurrency(mockPortfolio.totalEarnings), label: 'Total Earned' },
          { value: formatCurrency(mockPortfolio.pendingPayouts), label: 'Pending' },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-3xl font-semibold tracking-tight">{item.value}</p>
            <p className="text-sm text-muted-foreground mt-2">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {mockPortfolio.holdings.map((h) => (
          <div key={h.propertyId} className="flex flex-col md:flex-row gap-8 items-center">
            <div className="overflow-hidden rounded-3xl md:w-80 flex-shrink-0">
              <img src={h.image} alt="" className="h-56 w-full object-cover" />
            </div>
            <div className="space-y-4 text-center md:text-left">
              <h3 className="text-3xl font-semibold tracking-tight">{h.propertyTitle}</h3>
              <p className="text-muted-foreground">{h.location}</p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <span className="rounded-full bg-muted px-4 py-2 text-sm font-medium">{h.sharesOwned} shares</span>
                <span className="rounded-full bg-muted px-4 py-2 text-sm font-medium">{formatCurrency(h.currentValue)}</span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 px-4 py-2 text-sm font-medium">{h.annualYield}% yield</span>
                <span className="rounded-full bg-muted px-4 py-2 text-sm font-medium">{formatCurrency(h.monthlyYield)}/mo</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const versions = [
  { id: 1, label: '1', component: Version1 },
  { id: 2, label: '2', component: Version2 },
  { id: 3, label: '3', component: Version3 },
  { id: 4, label: '4', component: Version4 },
  { id: 5, label: '5', component: Version5 },
  { id: 6, label: '6', component: Version6 },
  { id: 7, label: '7', component: Version7 },
  { id: 8, label: '8', component: Version8 },
  { id: 9, label: '9', component: Version9 },
  { id: 10, label: '10', component: Version10 },
  { id: 11, label: '11', component: Version11 },
  { id: 12, label: '12', component: Version12 },
  { id: 13, label: '13', component: Version13 },
  { id: 14, label: '14', component: Version14 },
  { id: 15, label: '15', component: Version15 },
];

export default function InvestPortfolioPage() {
  const [activeVersion, setActiveVersion] = useState(1);
  const ActiveComponent = versions.find((v) => v.id === activeVersion)?.component ?? Version1;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Portfolio</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your investments, earnings, and property performance.
            </p>
          </div>

          {/* Version Switcher */}
          <div className="flex flex-wrap items-center gap-1.5">
            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveVersion(v.id)}
                className={cn(
                  'h-8 w-8 rounded-md text-xs font-semibold transition-all',
                  'border hover:bg-accent hover:text-accent-foreground',
                  activeVersion === v.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-muted-foreground border-border'
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Version */}
        <ActiveComponent />
      </div>
    </div>
  );
}
