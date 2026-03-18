import { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockPortfolio } from '@/data/investMockData';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const gainPercent = (
  ((mockPortfolio.totalValue - mockPortfolio.totalInvested) / mockPortfolio.totalInvested) *
  100
).toFixed(1);

// ---------------------------------------------------------------------------
// Rank System
// ---------------------------------------------------------------------------

const RANK_LADDER: { min: number; label: string }[] = [
  { min: 1, label: 'Key Holder' },
  { min: 2, label: 'Co-Host' },
  { min: 3, label: 'Resident Host' },
  { min: 4, label: 'Property Host' },
  { min: 5, label: 'Stay Host' },
  { min: 6, label: 'Host Operator' },
  { min: 7, label: 'Portfolio Host' },
  { min: 8, label: 'Senior Host' },
  { min: 9, label: 'Primary Host' },
  { min: 10, label: 'Elite Host' },
  { min: 11, label: 'Syndicate' },
];

const MILESTONES = [
  { min: 3, label: 'Co-Host', tier: '◆', tierCount: 1 },
  { min: 5, label: 'Official Host', tier: '◆', tierCount: 2 },
  { min: 10, label: 'Superhost', tier: '◆', tierCount: 3 },
  { min: 15, label: 'Elite Superhost', tier: '◆', tierCount: 4 },
  { min: 25, label: 'Host Empire', tier: '★', tierCount: 5 },
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
  { id: 'first-property', name: 'First Property', description: 'Invested in your first property', icon: Home, unlocked: true },
  { id: 'active-partner', name: 'Active Partner', description: 'Participated in the NFStay JV program', icon: Users, unlocked: true },
  { id: 'multi-cohost', name: 'Co-Host', description: 'Invested in 3+ properties', icon: Building2, unlocked: false },
  { id: 'official-host', name: 'Official Host', description: 'Invested in 5+ properties', icon: Award, unlocked: false },
  { id: 'superhost', name: 'Superhost', description: 'Invested in 10+ properties', icon: Crown, unlocked: false },
  { id: 'first-payout', name: 'First Payout', description: 'Received your first rental income', icon: Banknote, unlocked: false },
  { id: 'proposal-voter', name: 'Proposal Voter', description: 'Voted on a governance proposal', icon: Vote, unlocked: false },
  { id: 'early-investor', name: 'Early Investor', description: 'Among the first 100 investors', icon: Sparkles, unlocked: false },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InvestPortfolioPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const holdingsCount = mockPortfolio.holdings.length;
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

  const summaryItems = [
    { label: 'Portfolio Value', value: mockPortfolio.totalValue, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Total Invested', value: mockPortfolio.totalInvested, icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Earnings', value: mockPortfolio.totalEarnings, icon: PiggyBank, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Pending Payouts', value: mockPortfolio.pendingPayouts, icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* ---------------------------------------------------------------- */}
        {/* 1. HEADER                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build your hosting portfolio. Your status grows with every property.
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* 2. TOP SECTION — 3-column grid                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT — Rank Status Card */}
          <div className="lg:col-span-4">
            <Card className="bg-gradient-to-br from-primary/5 to-background h-full rounded-2xl shadow-sm">
              <CardContent className="p-6 flex flex-col h-full">
                {/* Rank icon + name */}
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{currentRank}</p>
                    <p className="text-sm text-muted-foreground">
                      {holdingsCount} {holdingsCount === 1 ? 'property' : 'properties'} in your portfolio
                    </p>
                  </div>
                </div>

                <div className="border-t my-4" />

                {/* Next milestone */}
                {nextMilestone && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Next milestone</p>
                    <p className="font-semibold">{nextMilestone.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {propertiesNeeded} more {propertiesNeeded === 1 ? 'property' : 'properties'} to unlock
                    </p>
                    <Progress value={milestoneProgress} className="h-2 mt-1" />
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-auto pt-4">
                  Every new property strengthens your portfolio status.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CENTER — Portfolio Summary Card */}
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

          {/* RIGHT — Milestone Progress Card */}
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
                            <span className={cn(
                              'text-[10px] tracking-wider leading-none',
                              isReached ? 'text-primary' : isNext ? 'text-primary/70' : 'text-muted-foreground/40'
                            )}>
                              {Array.from({ length: milestone.tierCount }, () => milestone.tier).join('')}
                            </span>
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

          {mockPortfolio.holdings.map((h, idx) => {
            const isExpanded = expandedId === h.propertyId;
            const gain = ((h.currentValue - h.invested) / h.invested) * 100;

            return (
              <Card
                key={h.propertyId}
                className={cn(
                  'overflow-hidden transition-all cursor-pointer rounded-2xl shadow-sm',
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
