import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { usePortfolioWithBlockchain } from '@/hooks/usePortfolioWithBlockchain';
import { useBlockchain } from '@/hooks/useBlockchain';
import { useProposals, useInvestProperties, useMyOrders } from '@/hooks/useInvestData';
import { useWallet } from '@/hooks/useWallet';
import { SUBGRAPHS } from '@/lib/particle';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function BlockchainDot({ tooltip }: { tooltip?: string }) {
  return (
    <span className="relative inline-flex ml-1" title={tooltip || 'From blockchain'}>
      <span className="h-1 w-1 rounded-full bg-green-500" />
      <span className="absolute h-1 w-1 rounded-full bg-green-500 animate-ping opacity-50" />
    </span>
  );
}

// Active proposal check — defined as a module-level factory, actual data injected in component

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

function getAchievements(holdingsCount: number, totalClaimed: number, hasVoted: boolean) {
  return [
    { id: 'first-property', name: 'First Property', description: 'Contributed in your first property', icon: Home, unlocked: holdingsCount >= 1 },
    { id: 'active-partner', name: 'Active Partner', description: 'Participated in the nfstay JV program', icon: Users, unlocked: holdingsCount > 0 },
    { id: 'cashflow-builder', name: 'Cashflow Builder', description: 'Contributed in 3+ properties', icon: Building2, unlocked: holdingsCount >= 3 },
    { id: 'portfolio-boss', name: 'Portfolio Boss', description: 'Contributed in 5+ properties', icon: Award, unlocked: holdingsCount >= 5 },
    { id: 'empire-builder', name: 'Empire Builder', description: 'Contributed in 10+ properties', icon: Sparkles, unlocked: holdingsCount >= 10 },
    { id: 'property-titan', name: 'Property Titan', description: 'Contributed in 15+ properties', icon: Crown, unlocked: holdingsCount >= 15 },
    { id: 'first-payout', name: 'First Payout', description: 'Received your first rental income', icon: Banknote, unlocked: totalClaimed > 0 },
    { id: 'proposal-voter', name: 'Proposal Voter', description: 'Voted on a governance proposal', icon: Vote, unlocked: hasVoted },
  ];
}

// ---------------------------------------------------------------------------
// Monthly Earnings Data — populated from Supabase payout_claims at runtime
// ---------------------------------------------------------------------------

// Module-level constants removed: monthlyEarnings is now state in the component

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InvestPortfolioPage() {
  useEffect(() => { document.title = 'nfstay - Portfolio'; }, []);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { portfolio, isLoading, blockchainLoading } = usePortfolioWithBlockchain();
  const { boostApr, claimBoostRewards, getRentHistory, getBoostDetails, loading: boostLoading } = useBlockchain();
  const { data: proposals = [] } = useProposals();
  const [boostSuccess, setBoostSuccess] = useState<{ show: boolean; apr: string }>({ show: false, apr: '' });
  const { data: allProperties = [] } = useInvestProperties();
  const { data: myOrders = [], isLoading: ordersLoading } = useMyOrders();
  const { address } = useWallet();

  const hasActiveProposal = (propertyId: number) =>
    proposals.some(
      (p: any) => p.property_id === propertyId && !p.result && new Date(p.ends_at) > new Date()
    );

  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

  // F5: Boost cost from contract (read getBoostAmount from BOOSTER_ABI)
  const [boostCost, setBoostCost] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ethers = await import('ethers').catch(() => null);
        if (!ethers) return;
        const { BOOSTER_ABI } = await import('@/lib/contractAbis');
        const { CONTRACTS } = await import('@/lib/particle');
        const provider = new ethers.providers.JsonRpcProvider(
          'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T'
        );
        const boosterContract = new ethers.Contract(CONTRACTS.BOOSTER, BOOSTER_ABI, provider);
        // getBoostAmount(address, propertyId) — legacy signature
        if (!address) return;
        const amount = await boosterContract.getBoostAmount(address, 1);
        const formatted = parseFloat(ethers.utils.formatUnits(amount, 18)).toFixed(3);
        if (!cancelled) setBoostCost(formatted);
      } catch {
        // Non-critical: fall back to display "—" if unavailable
        if (!cancelled) setBoostCost(null);
      }
    })();
    return () => { cancelled = true; };
  }, [address]);

  // F6: Monthly earnings chart — merges blockchain withdrawals + Supabase bank payouts
  const [monthlyEarnings, setMonthlyEarnings] = useState<{ month: string; amount: number }[]>([]);
  const [blockchainEarnings, setBlockchainEarnings] = useState<{ amount: number; timestamp: number }[]>([]);

  // Fetch blockchain withdrawal events with timestamps from The Graph
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(SUBGRAPHS.RENT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ rentWithdrawns(first: 1000, orderBy: blockTimestamp, orderDirection: desc, where: { _by: "${address.toLowerCase()}" }) { _rent blockTimestamp } }`,
          }),
        });
        const data = await res.json();
        const withdrawals = data.data?.rentWithdrawns || [];
        const events = withdrawals.map((w: any) => ({
          amount: parseInt(w._rent) / 1e18,
          timestamp: parseInt(w.blockTimestamp),
        }));
        if (!cancelled) setBlockchainEarnings(events);
      } catch {
        // Non-critical
      }
    })();
    return () => { cancelled = true; };
  }, [address]);

  // Build monthly chart from blockchain events + Supabase bank payouts
  useEffect(() => {
    // Build 6-month array
    const months: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        month: d.toLocaleString('en-GB', { month: 'short' }),
        amount: 0,
      });
    }

    // Source 1: Blockchain withdrawal events (The Graph)
    for (const evt of blockchainEarnings) {
      const evtDate = new Date(evt.timestamp * 1000);
      const evtMonth = evtDate.toLocaleString('en-GB', { month: 'short' });
      const entry = months.find((m) => m.month === evtMonth);
      if (entry) {
        entry.amount += evt.amount;
      }
    }

    // Source 2: Bank transfer payouts (Supabase payout_claims) — additive
    if (user?.id) {
      (async () => {
        try {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
          sixMonthsAgo.setDate(1);
          sixMonthsAgo.setHours(0, 0, 0, 0);

          const { data } = await (supabase.from('payout_claims') as any)
            .select('amount_entitled, created_at')
            .eq('user_id', user.id)
            .eq('status', 'paid')
            .gte('created_at', sixMonthsAgo.toISOString())
            .order('created_at', { ascending: true });

          if (data) {
            for (const row of data) {
              const rowDate = new Date(row.created_at);
              const rowMonth = rowDate.toLocaleString('en-GB', { month: 'short' });
              const entry = months.find((m) => m.month === rowMonth);
              if (entry) {
                entry.amount += Number(row.amount_entitled || 0);
              }
            }
          }
        } catch {
          // Non-critical — blockchain data already in chart
        }
        setMonthlyEarnings([...months]);
      })();
    } else {
      setMonthlyEarnings(months);
    }
  }, [user?.id, blockchainEarnings]);

  // Fetch total claimed from blockchain (Total Earnings) + per-property breakdown
  const [totalClaimed, setTotalClaimed] = useState(0);
  const [perPropertyEarnings, setPerPropertyEarnings] = useState<Record<number, { total: number; lastDate: string }>>({});
  const [pendingPayoutsTotal, setPendingPayoutsTotal] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [boostDetailsMap, setBoostDetailsMap] = useState<Record<number, { isBoosted: boolean; estimatedRewards: string; boostCost: string; boostAprValue: string; sharesBoosted: string }>>({});

  useEffect(() => {
    if (!address || portfolio.holdings.length === 0) return;
    let cancelled = false;
    // Fetch total earnings + per-property breakdown from The Graph
    (async () => {
      try {
        const res = await fetch('https://api.studio.thegraph.com/query/62641/nfstay-rwa-mainnet-rent/v3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ rentWithdrawns(where: { _by: "${address.toLowerCase()}" }, orderBy: blockTimestamp, orderDirection: desc) { _rent _propertyId blockTimestamp } }`,
          }),
        });
        const data = await res.json();
        const withdrawals = data.data?.rentWithdrawns || [];
        let total = 0;
        const perProp: Record<number, { total: number; lastDate: string }> = {};
        for (const w of withdrawals) {
          const amount = parseInt(w._rent) / 1e18;
          const pid = Number(w._propertyId);
          total += amount;
          if (!perProp[pid]) {
            perProp[pid] = { total: amount, lastDate: new Date(parseInt(w.blockTimestamp) * 1000).toISOString() };
          } else {
            perProp[pid].total += amount;
          }
        }
        if (!cancelled) {
          setTotalClaimed(total);
          setPerPropertyEarnings(perProp);
        }
      } catch {
        // non-critical
      }
    })();

    // Fetch pending payouts from rent details
    (async () => {
      try {
        const ethers = await import('ethers').catch(() => null);
        if (!ethers) return;
        const { RENT_ABI } = await import('@/lib/contractAbis');
        const { CONTRACTS } = await import('@/lib/particle');
        const provider = new ethers.providers.JsonRpcProvider(
          'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T'
        );
        const { RWA_TOKEN_ABI } = await import('@/lib/contractAbis');
        const rentContract = new ethers.Contract(CONTRACTS.RENT, RENT_ABI, provider);
        const rwaContract = new ethers.Contract(CONTRACTS.RWA_TOKEN, RWA_TOKEN_ABI, provider);

        let pending = 0;
        for (const h of portfolio.holdings) {
          try {
            const prop = (allProperties as any[]).find((p: any) => p.id === h.propertyId);
            const blockchainPropertyId = prop?.blockchain_property_id;
            if (blockchainPropertyId == null) continue;
            const [details, balance] = await Promise.all([
              rentContract.getRentDetails(blockchainPropertyId),
              rwaContract.balanceOf(address, blockchainPropertyId),
            ]);
            const rentPerShare = Number(details[4].toString()) / 1e18;
            const shares = balance.toNumber();
            pending += rentPerShare * shares;
          } catch {
            // skip
          }
        }
        if (!cancelled) setPendingPayoutsTotal(pending);
      } catch {
        // non-critical
      }
    })();

    // Check if user has voted via The Graph
    (async () => {
      try {
        const res = await fetch(SUBGRAPHS.VOTING, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ voteds(first: 1, where: { _by: "${address.toLowerCase()}" }) { id } }`,
          }),
        });
        const data = await res.json();
        if (!cancelled && data.data?.voteds?.length > 0) {
          setHasVoted(true);
        }
      } catch {
        // non-critical
      }
    })();

    // Fetch boost details + boost cost for each holding
    (async () => {
      try {
        const ethers = await import('ethers').catch(() => null);
        if (!ethers) return;
        const { BOOSTER_ABI } = await import('@/lib/contractAbis');
        const { CONTRACTS } = await import('@/lib/particle');
        const provider = new ethers.providers.JsonRpcProvider(
          'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T'
        );
        const boosterContract = new ethers.Contract(CONTRACTS.BOOSTER, BOOSTER_ABI, provider);

        const details: Record<number, { isBoosted: boolean; estimatedRewards: string; boostCost: string; boostAprValue: string; sharesBoosted: string }> = {};
        for (const h of portfolio.holdings) {
          try {
            const prop = (allProperties as any[]).find((p: any) => p.id === h.propertyId);
            const blockchainPropertyId = prop?.blockchain_property_id;
            if (blockchainPropertyId == null) continue;
            const bd = await getBoostDetails(blockchainPropertyId);
            // Get per-property boost cost (legacy: getBoostAmount(address, propertyId))
            let costFormatted = '—';
            try {
              const cost = await boosterContract.getBoostAmount(address, blockchainPropertyId);
              costFormatted = parseFloat(ethers.utils.formatUnits(cost, 18)).toFixed(3);
            } catch { /* some properties may not have boost */ }
            if (bd) {
              details[h.propertyId] = {
                isBoosted: bd.isBoosted,
                estimatedRewards: bd.estimatedRewards,
                sharesBoosted: bd.sharesBoosted || '0',
                boostCost: costFormatted,
                boostAprValue: bd.boostApr,
              };
            }
          } catch {
            // skip
          }
        }
        if (!cancelled) setBoostDetailsMap(details);
      } catch {
        // non-critical
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, portfolio.holdings.length, allProperties.length]);

  const holdingsCount = portfolio.holdings.length;
  const currentRank = getCurrentRank(holdingsCount);
  const nextMilestone = getNextMilestone(holdingsCount);
  const reachedMilestones = getReachedMilestones(holdingsCount);

  const ACHIEVEMENTS = getAchievements(holdingsCount, totalClaimed, hasVoted);
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
  const displayEarnings = totalClaimed > 0 ? totalClaimed : portfolio.totalEarnings;
  const roiProgress = Math.min((displayEarnings / profitTarget) * 100, 100);
  const roiMarkerPct = (roiTarget / profitTarget) * 100;

  const summaryItems = [
    { label: 'Total Contributed', value: portfolio.totalContributed, icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10', blockchain: false },
    { label: 'Total Earnings', value: totalClaimed > 0 ? totalClaimed : portfolio.totalEarnings, icon: PiggyBank, color: 'text-amber-500', bg: 'bg-amber-500/10', blockchain: true },
    { label: 'Pending Payouts', value: pendingPayoutsTotal > 0 ? pendingPayoutsTotal : portfolio.pendingPayouts, icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10', blockchain: true },
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
    <div data-feature="INVEST__PORTFOLIO" className="min-h-screen bg-background">
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

        {/* Investment orders (SamCart / card) — Supabase inv_orders */}
        {user?.id && (
          <Card className="rounded-2xl border-primary/15 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Your allocation orders
              </CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                Card and checkout payments appear here. Holdings below use on-chain data once shares are allocated.
              </p>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading orders…
                </div>
              ) : myOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No orders yet. After you pay in the marketplace checkout, your purchase will show here.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border bg-muted/20">
                  {myOrders.map((row: Record<string, unknown>) => {
                    const title =
                      (row.inv_properties as { title?: string } | null)?.title || 'Property';
                    const amount = Number(row.amount_paid ?? 0);
                    const shares = Number(row.shares_requested ?? 0);
                    const status = String(row.status ?? 'pending');
                    const created = row.created_at ? new Date(String(row.created_at)) : null;
                    return (
                      <li
                        key={String(row.id)}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                      >
                        <div>
                          <p className="font-medium">{title}</p>
                          <p className="text-xs text-muted-foreground">
                            {created
                              ? created.toLocaleString(undefined, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                              : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums">{formatCurrency(amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {shares > 0
                              ? `${shares} share${shares === 1 ? '' : 's'}`
                              : 'Below 1 full share'}
                            {' · '}
                            <span className="capitalize">{status}</span>
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

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
                  <div key={item.label} className="flex items-center gap-3" data-feature="INVEST__PORTFOLIO_TOTAL">
                    <div className={cn('p-2.5 rounded-lg', item.bg)}>
                      <item.icon className={cn('h-4 w-4', item.color)} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{item.label}{item.blockchain && <BlockchainDot />}</p>
                      <p className="text-xl font-bold">{formatCurrency(item.value)}</p>
                    </div>
                  </div>
                ))}

                {/* ROI Progress */}
                <div className="pt-3 border-t space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Returns Progress</p>
                  <div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                        style={{ width: `${roiProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[9px] text-muted-foreground">0%</span>
                      <span className="text-[9px] text-muted-foreground">Returns</span>
                      <span className="text-[9px] text-muted-foreground">Profit</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatCurrency(displayEarnings)} earned of {formatCurrency(roiTarget)} target returns
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CENTER — Monthly Earnings (Horizontal Bars) */}
          <div className="lg:col-span-4">
            <Card className="bg-gradient-to-br from-primary/5 to-background h-full rounded-2xl shadow-sm" data-feature="INVEST__PORTFOLIO_CHART">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Monthly Earnings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {(() => {
                  const hasData = monthlyEarnings.some((m) => m.amount > 0);
                  const maxEarning = Math.max(...monthlyEarnings.map((m) => m.amount), 1);
                  const netProfit = monthlyEarnings.reduce((sum, m) => sum + m.amount, 0);
                  return hasData ? (
                    <>
                      {monthlyEarnings.map((m) => (
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
                  );
                })()}
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
                <p className="text-muted-foreground">You don't own any allocations yet. Visit the Marketplace to get started.</p>
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
                data-feature="INVEST__PORTFOLIO_HOLDING"
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
                          src={h.image || '/placeholder.svg'}
                          alt={h.propertyTitle}
                          data-feature="INVEST__PORTFOLIO_IMAGE"
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
                              <span className="text-muted-foreground">Allocations: </span>
                              <span className="font-medium">{h.sharesOwned}<BlockchainDot tooltip="Allocation balance from blockchain" /></span>
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
                                {(() => {
                                  const prop = (allProperties as any[]).find((p: any) => p.id === h.propertyId);
                                  const bcId = prop?.blockchain_property_id;
                                  const earned = bcId != null ? perPropertyEarnings[bcId] : null;
                                  return earned?.lastDate
                                    ? new Date(earned.lastDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : 'No payouts yet';
                                })()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Contributed</p>
                              <p className="font-semibold">{formatCurrency(h.invested)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Earned</p>
                              <p className="font-semibold">
                                {(() => {
                                  const prop = (allProperties as any[]).find((p: any) => p.id === h.propertyId);
                                  const bcId = prop?.blockchain_property_id;
                                  const earned = bcId != null ? perPropertyEarnings[bcId] : null;
                                  return formatCurrency(earned?.total || h.totalEarned);
                                })()}
                              </p>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 flex-wrap items-center">
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/dashboard/invest/marketplace')}>
                              <Eye className="h-3.5 w-3.5" />
                              View Property
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/dashboard/invest/marketplace')}>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              Buy More Allocations
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/dashboard/invest/proposals')}>
                              <FileText className="h-3.5 w-3.5" />
                              Submit Proposal
                            </Button>
                            {activeProposal && (
                              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/dashboard/invest/proposals')}>
                                <Vote className="h-3.5 w-3.5" />
                                Cast Vote
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right — Boost card — cloned from legacy boostedApr.js */}
                    <div className="sm:w-64 flex-shrink-0">
                      {(() => {
                        const bd = boostDetailsMap[h.propertyId];
                        const isBoosted = bd?.isBoosted || false;
                        const sharesBoosted = bd?.sharesBoosted ? Number(bd.sharesBoosted) : 0;
                        const sharesNotBoosted = h.sharesOwned - sharesBoosted;
                        const boostAprPercent = bd?.boostAprValue ? (Number(bd.boostAprValue) / 10).toFixed(1) : '0';
                        const currentApr = (h.annualYield + Number(boostAprPercent)).toFixed(2);
                        const sixYrRoi = (h.sharesOwned * h.sharePrice * Math.pow(1 + (h.annualYield + Number(boostAprPercent)) / 100, 6)).toFixed(2);
                        const estimatedRewards = bd?.estimatedRewards ? (Number(bd.estimatedRewards) / 1e18).toFixed(2) : '0';
                        const boostCost = bd?.boostCost ?? '—';
                        return (
                      <div className="rounded-xl border border-primary/30 bg-background p-4 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-bold">Current APR: {currentApr}%</p>
                            <p className="text-xs text-muted-foreground">{isBoosted ? 'Boosted' : 'Not Boosted'}</p>
                          </div>
                          <span className="text-xl">{'\uD83D\uDE80'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-base font-bold">{sharesBoosted}</p>
                            <p className="text-[10px] text-muted-foreground">Allocations Boosted</p>
                          </div>
                          <div>
                            <p className="text-base font-bold">{sixYrRoi}</p>
                            <p className="text-[10px] text-muted-foreground">6YR Expected ROI</p>
                          </div>
                          <div>
                            <p className="text-base font-bold">Monthly</p>
                            <p className="text-[10px] text-muted-foreground">Payout Frequency</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Allocations Not Boosted</p>
                            <p className="text-sm font-bold">{sharesNotBoosted < 0 ? 0 : sharesNotBoosted}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Cost of Booster</p>
                            <p className="text-sm font-bold">{Number(boostCost) === 0 || boostCost === '0.000' ? 'Flexible' : `${boostCost} USDC`}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground">STAY Earned</p>
                            <p className="text-sm font-bold">{estimatedRewards} STAY</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            size="sm"
                            className="w-full bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-white text-xs rounded-full"
                            disabled={boostLoading || isBoosted}
                            onClick={async () => {
                              const prop = (allProperties as any[]).find((p: any) => p.id === h.propertyId);
                              const bcId = prop?.blockchain_property_id;
                              if (!bcId) { toast.error('Property not mapped to blockchain'); return; }
                              try {
                                await boostApr(bcId);
                                setBoostSuccess({ show: true, apr: boostAprPercent });
                              } catch (err: any) {
                                toast.error(err?.message || 'Boost failed');
                              }
                            }}
                          >
                            {isBoosted ? 'Already Boosted' : 'Boost APR \uD83D\uDE80'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs rounded-full border-primary/30 text-primary hover:bg-primary/10"
                            data-feature="INVEST__PORTFOLIO_CLAIM"
                            disabled={boostLoading || Number(estimatedRewards) === 0}
                            onClick={async () => {
                              const prop = (allProperties as any[]).find((p: any) => p.id === h.propertyId);
                              const bcId = prop?.blockchain_property_id;
                              if (!bcId) { toast.error('Property not mapped to blockchain'); return; }
                              try {
                                await claimBoostRewards(bcId);
                                toast.success('STAY rewards claimed!');
                              } catch (err: any) {
                                toast.error(err?.message || 'Claim failed');
                              }
                            }}
                          >
                            Claim STAY
                          </Button>
                        </div>
                      </div>
                        );
                      })()}
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
              Partner on{' '}
              <span className="font-semibold">
                {propertiesNeeded} more {propertiesNeeded === 1 ? 'property' : 'properties'}
              </span>{' '}
              to unlock <span className="font-semibold">{nextMilestone.label}</span> status
            </p>
            <Button size="sm" variant="default" onClick={() => navigate('/dashboard/invest/marketplace')}>
              Browse Properties
            </Button>
          </div>
        )}
      </div>

      {/* Boost Congratulations Overlay — cloned from legacy congrats.js */}
      {boostSuccess.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-white rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 min-h-[130px] overflow-hidden">
              <div className="absolute w-[300px] h-[300px] opacity-15 -top-[100px] -left-[140px] rounded-full bg-white/30" />
              <div className="absolute top-5 left-8 text-2xl animate-bounce">🚀</div>
              <div className="absolute top-4 right-10 text-2xl animate-bounce" style={{ animationDelay: '0.3s' }}>🎉</div>
              <div className="absolute bottom-5 left-1/3 text-xl animate-bounce" style={{ animationDelay: '0.6s' }}>✨</div>
            </div>
            <div className="flex justify-center -mt-12 relative z-10">
              <div className="w-24 h-24 rounded-full backdrop-blur-lg bg-white/30 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <span className="text-4xl">📈</span>
                </div>
              </div>
            </div>
            <div className="px-8 pb-8 pt-2 flex flex-col items-center text-center gap-3">
              <h1 className="text-2xl font-bold">Congratulations!</h1>
              <p className="text-muted-foreground max-w-[20rem]">
                Your returns are now boosted{boostSuccess.apr ? ` by ${boostSuccess.apr}%` : ''} for the next 12 months. Enjoy the ride! 🚀
              </p>
              <Button
                className="w-full max-w-[15rem] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full h-11 font-semibold mt-2"
                onClick={() => setBoostSuccess({ show: false, apr: '' })}
              >
                Okay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
