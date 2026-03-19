import { useState } from 'react';
import { toast } from 'sonner';
import { usePortfolioWithBlockchain } from '@/hooks/usePortfolioWithBlockchain';
import { useBlockchain } from '@/hooks/useBlockchain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Shield,
  Home,
  Users,
  Building2,
  Award,
  Crown,
  Banknote,
  Vote,
  Sparkles,
  Lock,
  Check,
  Rocket,
  FileText,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Active proposal check will use real data when inv_proposals is populated
const hasActiveProposal = (_propertyId: number) => false;

// ---------------------------------------------------------------------------
// Rank System
// ---------------------------------------------------------------------------

const RANK_LADDER: { min: number; label: string }[] = [
  { min: 0, label: 'Noobie' },
  { min: 1, label: 'Deal Rookie' },
  { min: 3, label: 'Cashflow Builder' },
  { min: 5, label: 'Portfolio Boss' },
  { min: 10, label: 'Empire Builder' },
  { min: 15, label: 'Property Titan' },
];

const MILESTONES = [
  { min: 0, label: 'Noobie', tier: '', tierCount: 0 },
  { min: 1, label: 'Deal Rookie', tier: '\u25C6', tierCount: 1 },
  { min: 3, label: 'Cashflow Builder', tier: '\u25C6', tierCount: 2 },
  { min: 5, label: 'Portfolio Boss', tier: '\u25C6', tierCount: 3 },
  { min: 10, label: 'Empire Builder', tier: '\u25C6', tierCount: 4 },
  { min: 15, label: 'Property Titan', tier: '\u2605', tierCount: 5 },
];

function getCurrentRank(count: number) {
  let rank = RANK_LADDER[0];
  for (const r of RANK_LADDER) {
    if (count >= r.min) rank = r;
  }
  return rank.label;
}

function getNextMilestone(count: number) {
  return MILESTONES.find((m) => count < m.min) ?? null;
}

function getReachedMilestones(count: number) {
  return MILESTONES.filter((m) => count >= m.min);
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

const ACHIEVEMENTS = [
  { id: 'first-property', name: 'First Property', description: 'Contributed in your first property', icon: Home, unlocked: true },
  { id: 'active-partner', name: 'Active Partner', description: 'Participated in the NFStay JV program', icon: Users, unlocked: true },
  { id: 'cashflow-builder', name: 'Cashflow Builder', description: 'Contributed in 3+ properties', icon: Building2, unlocked: false },
  { id: 'portfolio-boss', name: 'Portfolio Boss', description: 'Contributed in 5+ properties', icon: Award, unlocked: false },
  { id: 'property-titan', name: 'Property Titan', description: 'Contributed in 10+ properties', icon: Crown, unlocked: false },
  { id: 'first-payout', name: 'First Payout', description: 'Received your first rental income', icon: Banknote, unlocked: false },
  { id: 'proposal-voter', name: 'Proposal Voter', description: 'Voted on a governance proposal', icon: Vote, unlocked: false },
  { id: 'early-investor', name: 'Early Investor', description: 'Among the first 100 investors', icon: Sparkles, unlocked: false },
];

// ---------------------------------------------------------------------------
// Monthly Earnings Data
// ---------------------------------------------------------------------------

// Earnings chart data will be populated from real payout history
const MONTHLY_EARNINGS: { month: string; amount: number }[] = [];

const maxEarning = Math.max(...MONTHLY_EARNINGS.map((m) => m.amount), 1);
const netProfit = MONTHLY_EARNINGS.reduce((sum, m) => sum + m.amount, 0);

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InvestPortfolioPage() {
  const { portfolio, isLoading, blockchainLoading } = usePortfolioWithBlockchain();
  const { boostApr, claimBoostRewards, loading: boostLoading } = useBlockchain();

  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

  const holdingsCount = portfolio.holdings.length;
  const currentRank = getCurrentRank(holdingsCount);
  const nextMilestone = getNextMilestone(holdingsCount);
  const reachedMilestones = getReachedMilestones(holdingsCount);
  const unlockedCount = ACHIEVEMENTS.filter((a) => a.unlocked).length;

  const milestoneProgress = nextMilestone
    ? (holdingsCount / nextMilestone.min) * 100
    : 100;
  const propertiesNeeded = nextMilestone
    ? nextMilestone.min - holdingsCount
    : 0;

  // ROI progress
  const roiTarget = portfolio.totalContributed;
  const profitTarget = roiTarget * 1.5;
  const roiProgress = Math.min((portfolio.totalEarnings / profitTarget) * 100, 100);
  const roiMarkerPct = (roiTarget / profitTarget) * 100;

  const summaryItems = [
    { label: 'Total Contributed', value: portfolio.totalContributed, icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Earnings', value: portfolio.totalEarnings, icon: PiggyBank, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Pending Payouts', value: portfolio.pendingPayouts, icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  const toggleCollapse = (propertyId: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* ---------------------------------------------------------------- */}
        {/* 1. HEADER                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Airbnb Portfolio</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build your hosting portfolio. Your status grows with every property.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-0 text-xs gap-1 px-3 py-1">
              <Shield className="h-3 w-3" />
              {currentRank}
            </Badge>
            {nextMilestone && (
              <span className="text-xs text-muted-foreground">{propertiesNeeded} more to {nextMilestone.label}</span>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* 2. TOP SECTION — 3-column grid                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT — Portfolio Summary Card */}
          <div className="lg:col-span-4">
            <Card className="bg-gradient-to-br from-primary/5 to-background h-full rounded-2xl shadow-sm">
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

                {/* ROI Progress */}
                <div className="pt-3 border-t space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Returns Progress</p>
                  <div className="relative">
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                        style={{ width: `${roiProgress}%` }}
                      />
                    </div>
                    {/* ROI marker */}
                    <div
                      className="absolute top-3 flex flex-col items-center"
                      style={{ left: `${roiMarkerPct}%`, transform: 'translateX(-50%)' }}
                    >
                      <div className="w-px h-2 bg-muted-foreground/40" />
                      <span className="text-[9px] text-muted-foreground mt-0.5">Returns</span>
                    </div>
                    {/* Profit marker */}
                    <div
                      className="absolute top-3 flex flex-col items-center"
                      style={{ left: '100%', transform: 'translateX(-50%)' }}
                    >
                      <div className="w-px h-2 bg-muted-foreground/40" />
                      <span className="text-[9px] text-muted-foreground mt-0.5">Profit</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {formatCurrency(portfolio.totalEarnings)} earned of {formatCurrency(roiTarget)} target returns
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CENTER — Monthly Earnings (Horizontal Bars) */}
          <div className="lg:col-span-4">
            <Card className="bg-gradient-to-br from-primary/5 to-background h-full rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Monthly Earnings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {MONTHLY_EARNINGS.length > 0 ? (
                  <>
                    {MONTHLY_EARNINGS.map((m) => (
                      <div key={m.month} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-7 text-right flex-shrink-0">{m.month}</span>
                        <div className="flex-1 h-5 rounded bg-muted/30 overflow-hidden relative">
                          {m.amount > 0 ? (
                            <div
                              className="h-full rounded bg-gradient-to-r from-primary to-primary/70 flex items-center justify-end pr-2 transition-all duration-500"
                              style={{ width: `${Math.max((m.amount / maxEarning) * 100, 20)}%` }}
                            >
                              <span className="text-[10px] font-medium text-white">${m.amount.toFixed(0)}</span>
                            </div>
                          ) : (
                            <div className="h-full w-full" />
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Net Profit</span>
                        <span className="font-bold text-emerald-500">{formatCurrency(netProfit)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">Earnings data will appear here after your first payout</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — Your Journey (Milestone Ladder) */}
          <div className="lg:col-span-4">
            <Card className="h-full rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Your Journey</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-0">
                  {MILESTONES.map((milestone, idx) => {
                    const isReached = reachedMilestones.some((m) => m.min === milestone.min);
                    const isNext = nextMilestone?.min === milestone.min;
                    const isLast = idx === MILESTONES.length - 1;

                    return (
                      <div key={milestone.min} className="relative flex items-start gap-3 pb-6 last:pb-0">
                        {/* Vertical connector line */}
                        {!isLast && (
                          <div
                            className={cn(
                              'absolute left-[11px] top-[22px] w-[2px] h-[calc(100%-10px)]',
                              isReached ? 'bg-primary' : 'bg-muted'
                            )}
                          />
                        )}

                        {/* Dot */}
                        <div className="relative z-10 flex-shrink-0">
                          {isReached ? (
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          ) : isNext ? (
                            <div className="h-6 w-6 rounded-full border-2 border-primary bg-primary/10 shadow-[0_0_8px_rgba(var(--primary),0.3)]" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-muted" />
                          )}
                        </div>

                        {/* Label */}
                        <div className="pt-0.5">
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                'text-sm',
                                isReached && 'font-bold text-foreground',
                                isNext && 'font-medium text-foreground',
                                !isReached && !isNext && 'text-muted-foreground'
                              )}
                            >
                              {milestone.label}
                            </p>
                            {milestone.tierCount > 0 && (
                              <span className={cn(
                                'text-[10px] tracking-wider leading-none',
                                isReached ? 'text-primary' : isNext ? 'text-primary/70' : 'text-muted-foreground/40'
                              )}>
                                {Array.from({ length: milestone.tierCount }, () => milestone.tier).join('')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {milestone.min} {milestone.min === 1 ? 'property' : 'properties'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* 3. HOLDINGS SECTION                                              */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Your Holdings</h3>
            <Badge variant="secondary" className="text-xs">
              {holdingsCount} {holdingsCount === 1 ? 'property' : 'properties'}
            </Badge>
          </div>

          {holdingsCount === 0 ? (
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="py-12 text-center">
                <Home className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">You don't own any shares yet. Visit the Marketplace to start investing.</p>
              </CardContent>
            </Card>
          ) : null}

          {portfolio.holdings.map((h, idx) => {
            const isCollapsed = collapsedIds.has(h.propertyId);
            const gain = ((h.currentValue - h.invested) / h.invested) * 100;
            const activeProposal = hasActiveProposal(h.propertyId);

            return (
              <Card
                key={h.propertyId}
                className={cn(
                  'overflow-hidden transition-all rounded-2xl shadow-sm',
                  !isCollapsed && 'ring-1 ring-primary/30'
                )}
              >
                <CardContent className="p-4">
                  {/* Main layout: left content + right boost card */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Left — property info + metrics */}
                    <div className="flex-1 min-w-0 space-y-4">
                      {/* Compact header row */}
                      <div
                        className="flex items-center gap-4 cursor-pointer"
                        onClick={() => toggleCollapse(h.propertyId)}
                      >
                        <img
                          src={h.image}
                          alt={h.propertyTitle}
                          className="h-14 w-20 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm truncate">{h.propertyTitle}</h4>
                            {isCollapsed ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{h.location}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
                            <span>
                              <span className="text-muted-foreground">Shares: </span>
                              <span className="font-medium">{h.sharesOwned}</span>
                            </span>
                            <span>
                              <span className="text-muted-foreground">Value: </span>
                              <span className="font-medium">{formatCurrency(h.currentValue)}</span>
                            </span>
                            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-xs">
                              {h.annualYield}% APY
                            </Badge>
                            <Badge variant="secondary" className="text-xs text-muted-foreground">
                              Property {idx + 1} of {holdingsCount}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Expanded metrics + buttons */}
                      {!isCollapsed && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Current Value</p>
                              <p className="font-semibold">{formatCurrency(h.currentValue)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Monthly Yield</p>
                              <p className="font-semibold text-emerald-600">{formatCurrency(h.monthlyYield)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Gain</p>
                              <p className="font-semibold text-emerald-500">
                                +{formatCurrency(h.currentValue - h.invested)} ({gain.toFixed(1)}%)
                              </p>
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
                            <div>
                              <p className="text-muted-foreground">Contributed</p>
                              <p className="font-semibold">{formatCurrency(h.invested)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Earned</p>
                              <p className="font-semibold">{formatCurrency(h.totalEarned)}</p>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 flex-wrap items-center">
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <Eye className="h-3.5 w-3.5" />
                              View Property
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              Buy More Shares
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <FileText className="h-3.5 w-3.5" />
                              Submit Proposal
                            </Button>
                            {activeProposal && (
                              <Button variant="outline" size="sm" className="gap-1.5">
                                <Vote className="h-3.5 w-3.5" />
                                Cast Vote
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right — Boost card (always visible, aligned with property title) */}
                    <div className="sm:w-64 flex-shrink-0">
                      <div className="rounded-xl border border-primary/30 bg-background p-4 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-bold">Boosted APR: {(h.annualYield * 1.5).toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">Not Boosted</p>
                          </div>
                          <span className="text-xl">{'\uD83D\uDE80'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-base font-bold">${(h.sharesOwned * h.sharePrice).toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">Your Shares</p>
                          </div>
                          <div>
                            <p className="text-base font-bold">{(h.annualYield * 6 + 30).toFixed(0)}%</p>
                            <p className="text-[10px] text-muted-foreground">6YR Est. Returns</p>
                          </div>
                          <div>
                            <p className="text-base font-bold">Monthly</p>
                            <p className="text-[10px] text-muted-foreground">Payout Frequency</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Cost of Booster</p>
                            <p className="text-sm font-bold">0.275 USDC</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Stay Earned</p>
                            <p className="text-sm font-bold">0 STAY</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            size="sm"
                            className="w-full bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-white text-xs rounded-full"
                            disabled={boostLoading}
                            onClick={async () => {
                              try {
                                await boostApr(h.propertyId);
                                toast.success('APR boosted successfully!');
                              } catch (err) {
                                toast.error('Boost failed — wallet may not be connected');
                              }
                            }}
                          >
                            Boost APR {'\uD83D\uDE80'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs rounded-full border-primary/30 text-primary hover:bg-primary/10"
                            disabled={boostLoading}
                            onClick={async () => {
                              try {
                                await claimBoostRewards(h.propertyId);
                                toast.success('STAY rewards claimed!');
                              } catch (err) {
                                toast.error('Claim failed — no rewards available');
                              }
                            }}
                          >
                            Claim
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* 4. ACHIEVEMENTS SECTION                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Achievements</h3>
            <Badge variant="secondary" className="text-xs">
              {unlockedCount} of {ACHIEVEMENTS.length} unlocked
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ACHIEVEMENTS.map((achievement) => {
              const Icon = achievement.icon;
              return (
                <Card
                  key={achievement.id}
                  className={cn(
                    'rounded-2xl shadow-sm transition-all',
                    !achievement.unlocked && 'opacity-50'
                  )}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="relative">
                      <div
                        className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center',
                          achievement.unlocked ? 'bg-primary/10' : 'bg-muted/50'
                        )}
                      >
                        {achievement.unlocked ? (
                          <Icon className="h-5 w-5 text-primary" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      {achievement.unlocked && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-sm">{achievement.name}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{achievement.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* 5. BOTTOM ENCOURAGEMENT BANNER                                   */}
        {/* ---------------------------------------------------------------- */}
        {nextMilestone && (
          <div className="bg-primary/5 border-l-4 border-primary rounded-r-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-foreground">
              Invest in{' '}
              <span className="font-semibold">
                {propertiesNeeded} more {propertiesNeeded === 1 ? 'property' : 'properties'}
              </span>{' '}
              to unlock <span className="font-semibold">{nextMilestone.label}</span> status
            </p>
            <Button size="sm" variant="default">
              Browse Properties
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
