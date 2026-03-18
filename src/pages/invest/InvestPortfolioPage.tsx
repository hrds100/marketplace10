import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  DollarSign,
  Wallet,
  PiggyBank,
  Clock,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockPortfolio } from '@/data/investMockData';

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const gainPercent = (
  ((mockPortfolio.totalValue - mockPortfolio.totalInvested) / mockPortfolio.totalInvested) *
  100
).toFixed(1);

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InvestPortfolioPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const summaryItems = [
    { label: 'Portfolio Value', value: mockPortfolio.totalValue, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Total Invested', value: mockPortfolio.totalInvested, icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Earnings', value: mockPortfolio.totalEarnings, icon: PiggyBank, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Pending Payouts', value: mockPortfolio.pendingPayouts, icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your investments, earnings, and property performance.
          </p>
        </div>

        {/* Content */}
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
      </div>
    </div>
  );
}
