import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAllPayoutClaims } from '@/hooks/useInvestData';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Clock, CheckCircle2, AlertTriangle, Zap, Download, Loader2, FlaskConical } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { exportToCSV } from '@/lib/csvExport';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

interface PayoutClaim {
  id: string;
  user_id: string;
  user_name: string;
  user_whatsapp: string;
  type: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  week_ref: string;
  created_at: string;
  paid_at: string;
}

const typeColors: Record<string, string> = {
  investor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  affiliate: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  subscriber: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

const methodColors: Record<string, string> = {
  bank_transfer: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  usdc: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  stay_token: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  lp_token: 'bg-green-500/10 text-green-600 border-green-500/20',
};

const methodLabels: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  usdc: 'USDC',
  stay_token: 'STAY Token',
  lp_token: 'LP Token',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  processing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-600 border-red-500/20',
  cancelled: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

export default function AdminInvestPayouts() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: realClaims = [], isLoading } = useAllPayoutClaims();
  const [testAmount, setTestAmount] = useState('5.00');
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditUserId, setCreditUserId] = useState('');
  const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>([]);

  // Load all users for credit dropdown
  useState(() => {
    (async () => {
      const { data } = await (supabase.from('profiles') as any).select('id, name').order('name');
      if (data) setAllUsers(data);
    })();
  });
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [weekFilter, setWeekFilter] = useState('All');
  const [batchTriggered, setBatchTriggered] = useState(false);

  const handleCreditTestRent = async () => {
    const targetUserId = creditUserId || user?.id;
    if (!targetUserId) return;
    const amount = parseFloat(testAmount);
    if (!amount || amount <= 0 || amount > 100) { toast.error('Enter $0.01–$100'); return; }
    setCreditLoading(true);
    try {
      const { data: prop } = await (supabase.from('inv_properties') as any).select('id').limit(1).single();
      if (!prop) throw new Error('No property found');
      const { error } = await (supabase.from('inv_payouts') as any).insert({
        user_id: targetUserId, property_id: prop.id, period_date: new Date().toISOString().slice(0, 10),
        shares_owned: 1, amount, status: 'claimable',
      });
      if (error) throw error;
      const userName = allUsers.find((u) => u.id === targetUserId)?.name || targetUserId.slice(0, 8);
      toast.success(`$${amount.toFixed(2)} credited to ${userName}`);
      qc.invalidateQueries({ queryKey: ['inv_payouts'] });
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setCreditLoading(false); }
  };

  // Map real data
  const payouts: PayoutClaim[] = realClaims.map((c: any) => ({
    id: c.id?.toString() || '',
    user_id: c.user_id || '',
    user_name: c.profiles?.name || '—',
    user_whatsapp: c.profiles?.whatsapp || '',
    type: c.user_type || 'investor',
    amount: c.amount_entitled || c.amount || 0,
    currency: c.currency || 'GBP',
    method: c.method || 'bank_transfer',
    status: c.status || 'pending',
    week_ref: c.week_ref || '',
    created_at: c.created_at ? new Date(c.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
    paid_at: c.paid_at ? new Date(c.paid_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
  }));

  // Derive stats from real data
  const stats = useMemo(() => {
    const pendingCount = payouts.filter((p) => p.status === 'pending').length;
    const paidThisMonth = payouts
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    const failedCount = payouts.filter((p) => p.status === 'failed').length;
    const thisWeekTotal = payouts
      .filter((p) => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + p.amount, 0);

    return [
      { label: 'Pending Total', value: `$${thisWeekTotal.toLocaleString()}`, sub: `${pendingCount + payouts.filter((p) => p.status === 'processing').length} claims`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { label: 'Pending Approval', value: String(pendingCount), sub: 'claims', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
      { label: 'Paid', value: `$${paidThisMonth.toLocaleString()}`, sub: '', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { label: 'Failed', value: String(failedCount), sub: '', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    ];
  }, [payouts]);

  // Get unique week refs for filter
  const weekOptions = ['All', ...Array.from(new Set(payouts.map((p) => p.week_ref).filter(Boolean)))];

  const filtered = payouts.filter((p) => {
    if (statusFilter !== 'All' && p.status !== statusFilter.toLowerCase()) return false;
    if (typeFilter !== 'All' && p.type !== typeFilter.toLowerCase()) return false;
    if (weekFilter !== 'All' && p.week_ref !== weekFilter) return false;
    return true;
  });

  // Approve = Pay instantly via Revolut
  const [payingId, setPayingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setPayingId(id);
    try {
      const { data, error } = await supabase.functions.invoke('revolut-pay', {
        body: { claim_id: id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(`$${data.usd_amount} → £${data.gbp_amount} paid via Revolut (rate: ${data.exchange_rate?.toFixed(4)})`);
      qc.invalidateQueries({ queryKey: ['payout_claims'] });
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setPayingId(null);
    }
  };

  // Approve All = Pay all pending claims
  const handleApproveAll = async () => {
    const pending = payouts.filter((p) => p.status === 'pending');
    if (pending.length === 0) { toast.error('No pending claims'); return; }
    setBatchTriggered(true);
    let success = 0;
    let failed = 0;
    for (const p of pending) {
      try {
        const { data, error } = await supabase.functions.invoke('revolut-pay', {
          body: { claim_id: p.id },
        });
        if (error || data?.error) { failed++; continue; }
        success++;
      } catch { failed++; }
    }
    toast.success(`${success} paid, ${failed} failed`);
    qc.invalidateQueries({ queryKey: ['payout_claims'] });
    setBatchTriggered(false);
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await (supabase.from('payout_claims') as any)
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['payout_claims'] });
      toast.success('Claim rejected');
    } catch {
      toast.error('Failed to reject claim');
    }
  };

  // handleBatch removed — replaced by handleApproveAll above

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Payouts</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered as any[], 'payouts')}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button
            onClick={handleApproveAll}
            disabled={batchTriggered}
            className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
          >
            <Zap className="w-4 h-4" />
            {batchTriggered ? 'Paying...' : 'Approve All & Pay'}
          </Button>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs text-right">
            Send all pending claims via Revolut
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-5">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', s.bg)}>
                <s.icon className={cn('w-5 h-5', s.color)} />
              </div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {s.label} {s.sub && <span className="text-muted-foreground">{s.sub}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Credit Test Rent — Admin can add claimable amount for testing */}
      <Card className="mb-8 border-dashed border-yellow-500/40 bg-yellow-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Credit Test Rent</p>
                <p className="text-xs text-muted-foreground">Add claimable amount to any user for testing</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={creditUserId} onChange={(e) => setCreditUserId(e.target.value)} className="h-9 px-2 rounded-md border border-input bg-background text-sm max-w-[180px]">
                <option value="">Me (admin)</option>
                {allUsers.map((u) => <option key={u.id} value={u.id}>{u.name || u.id.slice(0, 8)}</option>)}
              </select>
              <span className="text-sm text-muted-foreground">$</span>
              <input type="number" min="0.01" max="100" step="0.01" value={testAmount} onChange={(e) => setTestAmount(e.target.value)} className="w-20 h-9 px-2 rounded-md border border-input bg-background text-sm text-center" />
              <Button size="sm" onClick={handleCreditTestRent} disabled={creditLoading} className="gap-1.5">
                {creditLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                Credit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All</option>
          <option>Pending</option>
          <option>Processing</option>
          <option>Paid</option>
          <option>Failed</option>
          <option>Cancelled</option>
        </select>
        <select
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option>All</option>
          <option value="investor">Investor</option>
          <option value="affiliate">Affiliate</option>
          <option value="subscriber">Subscriber</option>
        </select>
        <select
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={weekFilter}
          onChange={(e) => setWeekFilter(e.target.value)}
        >
          {weekOptions.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </div>

      <Card className="border-border">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Week Ref</TableHead>
                <TableHead>Claimed</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">{p.user_name}</div>
                      {p.user_whatsapp && (
                        <a href={`https://wa.me/${p.user_whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          {p.user_whatsapp}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs capitalize', typeColors[p.type] || '')}>
                      {p.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{p.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.currency}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs', methodColors[p.method] || '')}>
                      {methodLabels[p.method] || p.method || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs capitalize', statusColors[p.status] || '')}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.week_ref || '\u2014'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.created_at}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.paid_at || '\u2014'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(p.status === 'pending' || p.status === 'processing') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1"
                          disabled={payingId === p.id}
                          onClick={() => handleApprove(p.id)}
                        >
                          {payingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          {payingId === p.id ? 'Paying...' : 'Approve & Pay'}
                        </Button>
                      )}
                      {(p.status === 'pending' || p.status === 'processing') && (
                        <Button variant="ghost" size="sm" className="text-xs text-red-500" onClick={() => handleReject(p.id)}>
                          Reject
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No payouts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
