import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { DollarSign, Users, Building2, TrendingUp, Clock, Plus, Eye, CreditCard, Settings, Wallet, RefreshCw, Loader2, Send, Banknote, RotateCcw, AlertCircle, CheckCircle2, Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useInvestProperties, useInvestOrders, useAllShareholders, useAllPayoutClaims } from '@/hooks/useInvestData';
import { useBlockchain } from '@/hooks/useBlockchain';
import {
  fetchCommissionEventsForPerformanceFees,
  prepareFeeDistributions,
  fetchPerformanceFeeDistributions,
  type SummarizedAgent,
  type FeeDistributionRecord,
} from '@/lib/subgraph';

const quickActions = [
  { icon: Plus, label: 'Add Property', variant: 'default' as const },
  { icon: Eye, label: 'View Orders', variant: 'outline' as const },
  { icon: CreditCard, label: 'Process Payouts', variant: 'outline' as const },
  { icon: Settings, label: 'Commission Settings', variant: 'outline' as const },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const FEE_HISTORY_PER_PAGE = 10;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? 's' : ''} ago`;
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatWeiDisplay(wei: number): string {
  const value = wei / 1e18;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMonthFromTimestamp(ts: number): string {
  const date = new Date(ts * 1000);
  return MONTHS[date.getMonth()] || 'Unknown';
}

export default function AdminInvestDashboard() {
  const [clickedAction, setClickedAction] = useState<string | null>(null);
  const {
    adminGetWalletBalances,
    adminDistributePerformanceFees,
    adminGetTotalPropertyShares,
    adminAddRent,
    adminResetPropertyRent,
    adminGetRentDetails,
    adminBoostUser,
    loading: blockchainLoading,
  } = useBlockchain();
  const [balances, setBalances] = useState<{ managerBnb: string; managerStay: string; treasuryUsdc: string } | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(true);

  const fetchBalances = useCallback(async () => {
    setBalancesLoading(true);
    try {
      const result = await adminGetWalletBalances();
      setBalances(result);
    } catch {
      // silent
    } finally {
      setBalancesLoading(false);
    }
  }, [adminGetWalletBalances]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const { data: properties = [] } = useInvestProperties();
  const { data: orders = [] } = useInvestOrders();
  const { data: shareholders = [] } = useAllShareholders();
  const { data: claims = [] } = useAllPayoutClaims();

  const stats = useMemo(() => {
    const totalInvested = orders
      .filter((o: any) => o.status === 'completed')
      .reduce((sum: number, o: any) => sum + Number(o.amount_paid || 0), 0);
    const uniqueShareholders = new Set((shareholders as any[]).map((s: any) => s.user_id)).size;
    const pendingPayouts = claims
      .filter((c: any) => c.status === 'pending')
      .reduce((sum: number, c: any) => sum + Number(c.amount_entitled || 0), 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthlyRevenue = claims
      .filter((c: any) => c.status === 'paid' && c.created_at >= monthStart)
      .reduce((sum: number, c: any) => sum + Number(c.amount_entitled || 0), 0);

    return [
      { icon: DollarSign, label: 'Total Allocated', value: `$${totalInvested.toLocaleString()}`, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { icon: Users, label: 'Total Shareholders', value: String(uniqueShareholders), color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { icon: Building2, label: 'Active Properties', value: String(properties.length), color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { icon: TrendingUp, label: 'Monthly Revenue', value: `$${monthlyRevenue.toLocaleString()}`, color: 'text-purple-500', bg: 'bg-purple-500/10' },
      { icon: Clock, label: 'Pending Payouts', value: `$${pendingPayouts.toLocaleString()}`, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    ];
  }, [orders, shareholders, properties, claims]);

  const activities = useMemo(() => {
    return (orders as any[])
      .filter((o: any) => o.status === 'completed' || o.status === 'pending')
      .slice(0, 10)
      .map((o: any) => {
        const name = o.user_name || o.user_email?.split('@')[0] || o.user_id?.slice(0, 8) || 'Partner';
        const dateStr = o.created_at
          ? new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ', ' +
            new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          : '';
        return {
          name,
          email: o.user_email || '',
          whatsapp: o.user_whatsapp || '',
          shares: o.shares_requested || o.shares_count || o.shares || '?',
          status: o.status || 'pending',
          property: o.inv_properties?.title || 'a property',
          date: dateStr,
          timeAgo: o.created_at ? timeAgo(o.created_at) : '',
        };
      });
  }, [orders]);

  // ── Performance Fees state ──
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const [pfPropertyId, setPfPropertyId] = useState('');
  const [pfMonth, setPfMonth] = useState('');
  const [pfYear, setPfYear] = useState('');
  const [pfDistributionAmount, setPfDistributionAmount] = useState('');
  const [pfAgents, setPfAgents] = useState<SummarizedAgent[]>([]);
  const [pfIsLoading, setPfIsLoading] = useState(false);
  const [pfIsDistributing, setPfIsDistributing] = useState(false);

  const pfCanFetch = pfPropertyId && pfMonth && pfYear;
  const pfCanDistribute = pfAgents.length > 0 && Number(pfDistributionAmount) > 0 && !pfIsDistributing;

  const handlePfFetch = async () => {
    if (!pfCanFetch) return;
    setPfIsLoading(true);
    setPfAgents([]);
    try {
      const data = await fetchCommissionEventsForPerformanceFees(Number(pfPropertyId), Number(pfYear), Number(pfMonth));
      setPfAgents(data);
      if (data.length === 0) toast.info('No commission events found for the selected filters.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to fetch commission data');
    } finally {
      setPfIsLoading(false);
    }
  };

  const handlePfDistribute = async () => {
    if (!pfCanDistribute) return;
    setPfIsDistributing(true);
    try {
      const totalShares = await adminGetTotalPropertyShares(Number(pfPropertyId));
      if (totalShares === 0) { toast.error('Could not get total property shares from contract.'); return; }
      const { distributions, totalAmountToSend, monthTimestamp } = prepareFeeDistributions(pfAgents, Number(pfDistributionAmount), totalShares, Number(pfYear), Number(pfMonth));
      await adminDistributePerformanceFees(distributions, Number(pfPropertyId), monthTimestamp, totalAmountToSend);
      toast.success('Performance fees distributed successfully.');
    } catch (err: any) {
      toast.error(err?.message || 'Distribution failed');
    } finally {
      setPfIsDistributing(false);
    }
  };

  // ── Fee History state ──
  const today = new Date();
  const lastMonth = today.getMonth();
  const [fhMonth, setFhMonth] = useState(lastMonth === 0 ? 12 : lastMonth);
  const [fhYear, setFhYear] = useState(lastMonth === 0 ? currentYear - 1 : currentYear);
  const [fhData, setFhData] = useState<FeeDistributionRecord[]>([]);
  const [fhIsLoading, setFhIsLoading] = useState(false);
  const [fhPage, setFhPage] = useState(1);

  const fhTotalPages = Math.ceil(fhData.length / FEE_HISTORY_PER_PAGE);
  const fhPaginated = fhData.slice((fhPage - 1) * FEE_HISTORY_PER_PAGE, fhPage * FEE_HISTORY_PER_PAGE);

  const fetchFeeHistory = useCallback(async (y: number, m: number) => {
    setFhIsLoading(true);
    setFhPage(1);
    try {
      const result = await fetchPerformanceFeeDistributions(y, m);
      setFhData(result);
    } catch (err) {
      console.error('Failed to fetch fee history:', err);
      setFhData([]);
    } finally {
      setFhIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeeHistory(fhYear, fhMonth);
  }, [fhYear, fhMonth, fetchFeeHistory]);

  useEffect(() => {
    if (fhYear === currentYear && fhMonth > currentMonth) {
      setFhMonth(currentMonth);
    }
  }, [fhYear, currentYear, currentMonth, fhMonth]);

  // ── Boost On Behalf state ──
  const [boostAddress, setBoostAddress] = useState('');
  const [boostPropertyId, setBoostPropertyId] = useState('');
  const [boostLoading, setBoostLoading] = useState(false);

  const handleAdminBoost = async () => {
    if (!boostAddress || !boostPropertyId) return;
    setBoostLoading(true);
    try {
      await adminBoostUser(boostAddress, boostPropertyId);
      toast.success(`Property ${boostPropertyId} boosted for ${boostAddress.slice(0, 10)}...`);
      setBoostAddress('');
      setBoostPropertyId('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Boost failed';
      toast.error(msg);
    } finally {
      setBoostLoading(false);
    }
  };

  // ── Rent Distribution state ──
  const [rentPropertyId, setRentPropertyId] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [rentIsLoadingAdd, setRentIsLoadingAdd] = useState(false);
  const [rentIsLoadingReset, setRentIsLoadingReset] = useState(false);
  const [rentIsFetching, setRentIsFetching] = useState(false);
  const [rentExists, setRentExists] = useState(false);
  const [rentInfo, setRentInfo] = useState<{ rentRemaining: number; totalRent: number } | null>(null);

  const handleRentPropertyIdChange = useCallback(async (value: string) => {
    setRentPropertyId(value);
    setRentExists(false);
    setRentInfo(null);
    if (!value) return;
    setRentIsFetching(true);
    try {
      const details = await adminGetRentDetails(value);
      if (details && details.rentRemaining > 0) {
        setRentExists(true);
        setRentInfo(details);
      }
    } catch {
      // ignore
    } finally {
      setRentIsFetching(false);
    }
  }, [adminGetRentDetails]);

  const handleAddRent = async () => {
    if (!rentPropertyId || !rentAmount) { toast.error('Property ID and amount are required'); return; }
    setRentIsLoadingAdd(true);
    try {
      await adminAddRent(rentPropertyId, rentAmount);
      toast.success(`Rent of $${rentAmount} added to property ${rentPropertyId}`);
      setRentAmount('');
      setRentPropertyId('');
      setRentExists(false);
      setRentInfo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setRentIsLoadingAdd(false);
    }
  };

  const handleResetProperty = async () => {
    if (!rentPropertyId) { toast.error('Property ID is required'); return; }
    setRentIsLoadingReset(true);
    try {
      await adminResetPropertyRent(rentPropertyId);
      toast.success(`Property ${rentPropertyId} rent details reset`);
      setRentAmount('');
      setRentPropertyId('');
      setRentExists(false);
      setRentInfo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setRentIsLoadingReset(false);
    }
  };

  const rentIsDisabled = rentIsLoadingAdd || rentIsLoadingReset || rentIsFetching || blockchainLoading;

  return (
    <div data-feature="ADMIN__INVEST">
      <h1 className="text-[28px] font-bold text-foreground mb-6">Partnership Dashboard</h1>

      {/* Wallet Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Manager BNB</span>
              <Wallet className="w-4 h-4 text-amber-500" />
            </div>
            {balancesLoading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-xl font-bold text-foreground">{balances?.managerBnb ?? '—'}</div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Manager STAY</span>
              <Wallet className="w-4 h-4 text-[#1E9A80]" />
            </div>
            {balancesLoading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-xl font-bold text-foreground">{balances?.managerStay ?? '—'}</div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Treasury USDC</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchBalances} disabled={balancesLoading}>
                <RefreshCw className={cn('w-3.5 h-3.5', balancesLoading && 'animate-spin')} />
              </Button>
            </div>
            {balancesLoading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-xl font-bold text-foreground">${balances?.treasuryUsdc ?? '—'}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stat cards */}
      <div data-feature="ADMIN__INVEST_STATS" className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-5">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', s.bg)}>
                <s.icon className={cn('w-5 h-5', s.color)} />
              </div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Recent Activity — 60% */}
        <Card className="lg:col-span-3 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No orders yet.</p>
              ) : activities.map((a, i) => (
                <div
                  key={i}
                  className="py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {a.name} purchased {a.shares} share{Number(a.shares) !== 1 ? 's' : ''} of {a.property}
                      {a.status === 'pending' && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{a.timeAgo}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{a.date}</span>
                    {a.email && <span>{a.email}</span>}
                    {a.whatsapp && <span>WhatsApp: {a.whatsapp}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions — 40% */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-feature="ADMIN__INVEST_ACTIONS" className="space-y-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant}
                  className="w-full justify-start gap-3 h-11"
                  onClick={() => {
                    setClickedAction(action.label);
                    setTimeout(() => setClickedAction(null), 1500);
                  }}
                >
                  <action.icon className="w-4 h-4" />
                  {action.label}
                  {clickedAction === action.label && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Navigating...
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {(() => {
              const totalSharesSold = (orders as any[])
                .filter((o: any) => o.status === 'completed')
                .reduce((sum: number, o: any) => sum + Number(o.shares_count || 0), 0);
              return (
                <div className="mt-6 p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Partnership Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Properties</span>
                      <span className="font-medium text-foreground">{properties.length} active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Shares Sold</span>
                      <span className="font-medium text-foreground">{totalSharesSold.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* ── Distribute Performance Fee ── */}
      <Card className="border-border mb-8">
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Send className="w-5 h-5 text-[#1E9A80]" />
            Distribute Performance Fee
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Property ID</label>
              <input
                type="number"
                placeholder="1"
                value={pfPropertyId}
                onChange={(e) => setPfPropertyId(e.target.value)}
                disabled={pfIsDistributing}
                className="h-10 w-32 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Month</label>
              <select
                value={pfMonth}
                onChange={(e) => setPfMonth(e.target.value)}
                disabled={pfIsDistributing}
                className="h-10 w-40 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select Month</option>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1} disabled={Number(pfYear) === currentYear && i >= currentMonth}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Year</label>
              <select
                value={pfYear}
                onChange={(e) => setPfYear(e.target.value)}
                disabled={pfIsDistributing}
                className="h-10 w-32 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select Year</option>
                {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <Button onClick={handlePfFetch} disabled={!pfCanFetch || pfIsLoading} variant="outline" className="h-10">
              {pfIsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Fetch Data
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 items-end mb-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Distribution Amount ($)</label>
              <input
                type="number"
                placeholder="120"
                value={pfDistributionAmount}
                onChange={(e) => setPfDistributionAmount(e.target.value)}
                disabled={pfIsDistributing}
                className="h-10 w-40 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <Button onClick={handlePfDistribute} disabled={!pfCanDistribute} className="h-10 bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white">
              {pfIsDistributing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Distribute
            </Button>
          </div>

          {/* Agent Commissions Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-sm font-bold text-foreground">
                Agent Commissions {pfAgents.length > 0 ? `(${pfAgents.length})` : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Property ID</TableHead>
                    <TableHead>Agent Address</TableHead>
                    <TableHead className="text-right">Shares Sold</TableHead>
                    <TableHead className="text-right">Total Investment</TableHead>
                    <TableHead className="text-right">Total Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pfIsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : pfAgents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No data found. Select filters and click "Fetch Data".
                      </TableCell>
                    </TableRow>
                  ) : (
                    pfAgents.map((a, i) => (
                      <TableRow key={`${a.agent}-${a.propertyId}`}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{a.propertyId}</TableCell>
                        <TableCell className="font-mono text-xs" title={a.agent}>{shortenAddress(a.agent)}</TableCell>
                        <TableCell className="text-right">{a.totalSharesSold}</TableCell>
                        <TableCell className="text-right">{formatWeiDisplay(a.totalInvestment)}</TableCell>
                        <TableCell className="text-right">{formatWeiDisplay(a.totalCommission)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Performance Fee Distribution History ── */}
      <Card className="border-border mb-8">
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground">Performance Fee Distribution History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end mb-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Month</label>
              <select
                value={fhMonth}
                onChange={(e) => setFhMonth(Number(e.target.value))}
                className="h-10 w-40 px-3 rounded-md border border-input bg-background text-sm"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1} disabled={fhYear === currentYear && i >= currentMonth}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Year</label>
              <select
                value={fhYear}
                onChange={(e) => setFhYear(Number(e.target.value))}
                className="h-10 w-32 px-3 rounded-md border border-input bg-background text-sm"
              >
                {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-sm font-bold text-foreground">
                Distributions {fhData.length > 0 ? `(${fhData.length})` : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Property ID</TableHead>
                    <TableHead>Agent Address</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Month</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fhIsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : fhData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No distributions found for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fhPaginated.map((d, i) => (
                      <TableRow key={`${d.agent}-${d.propertyId}-${i}`}>
                        <TableCell>{(fhPage - 1) * FEE_HISTORY_PER_PAGE + i + 1}</TableCell>
                        <TableCell>{d.propertyId}</TableCell>
                        <TableCell className="font-mono text-xs" title={d.agent}>{shortenAddress(d.agent)}</TableCell>
                        <TableCell className="text-right">
                          ${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{formatMonthFromTimestamp(d.monthTimestamp)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {fhTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setFhPage((p) => Math.max(1, p - 1))} disabled={fhPage === 1}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {fhPage} of {fhTotalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setFhPage((p) => Math.min(fhTotalPages, p + 1))} disabled={fhPage === fhTotalPages}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Boost On Behalf Of User ── */}
      <Card className="border-border mb-8">
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Rocket className="w-5 h-5 text-amber-500" />
            Boost On Behalf Of User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Boost a user's property using the admin contract function (boostOnBehalfOf). This does not
            require the user's wallet — only the admin wallet. No USDC cost to the user.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-foreground mb-1.5 block">User Wallet Address</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono"
                placeholder="0x..."
                value={boostAddress}
                onChange={(e) => setBoostAddress(e.target.value)}
                disabled={boostLoading}
              />
            </div>
            <div className="w-32">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Property ID</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                placeholder="1"
                value={boostPropertyId}
                onChange={(e) => setBoostPropertyId(e.target.value)}
                disabled={boostLoading}
              />
            </div>
            <Button
              onClick={handleAdminBoost}
              disabled={!boostAddress || !boostPropertyId || boostLoading || blockchainLoading}
              className="gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white h-10"
            >
              {boostLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {boostLoading ? 'Boosting...' : 'Boost On Behalf'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Rent Distribution ── */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-500" />
            Rent Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Add monthly rent to a property on the Rent smart contract. The USDC is transferred from
            your admin wallet and distributed proportionally to shareholders when they claim.
          </p>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Property ID</label>
            <Input
              type="text"
              placeholder="e.g. 1"
              value={rentPropertyId}
              onChange={(e) => handleRentPropertyIdChange(e.target.value)}
              disabled={rentIsDisabled}
              className="max-w-[200px]"
            />
            {rentIsFetching && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking property...
              </p>
            )}
            {rentExists && rentInfo && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Rent already exists: ${rentInfo.rentRemaining.toFixed(2)} remaining of ${rentInfo.totalRent.toFixed(2)} total
              </p>
            )}
            {rentPropertyId && !rentIsFetching && !rentExists && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                No active rent — ready to add
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Amount (USDC)</label>
            <Input
              type="number"
              placeholder="e.g. 1000"
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              disabled={rentIsDisabled || rentExists}
              className="max-w-[200px]"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={handleAddRent}
              disabled={rentIsDisabled || rentExists || !rentPropertyId || !rentAmount}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
            >
              {rentIsLoadingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
              {rentIsLoadingAdd ? 'Adding...' : 'Add Rent'}
            </Button>
            <Button
              variant="outline"
              onClick={handleResetProperty}
              disabled={rentIsDisabled || !rentExists || !rentPropertyId}
              className="gap-2"
            >
              {rentIsLoadingReset ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              {rentIsLoadingReset ? 'Resetting...' : 'Reset Property'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
