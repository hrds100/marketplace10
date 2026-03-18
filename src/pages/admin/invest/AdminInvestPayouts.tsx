import { useState } from 'react';
import { useAllPayoutClaims } from '@/hooks/useInvestData';
import { DollarSign, Clock, CheckCircle2, AlertTriangle, Search, Zap, Download } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Payout {
  id: string;
  user: string;
  email: string;
  type: 'investor' | 'affiliate' | 'subscriber';
  amount: number;
  currency: string;
  method: 'bank_transfer' | 'usdc' | 'stay_token' | 'lp_token';
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  weekRef: string;
  claimed: string;
  paid: string;
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

const stats = [
  { label: 'This Week', value: '\u00a34,230', sub: '8 claims', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { label: 'Pending Approval', value: '15', sub: 'claims', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { label: 'Paid This Month', value: '\u00a312,890', sub: '', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Failed', value: '0', sub: '', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
];

const mockPayouts: Payout[] = [
  { id: 'p1', user: 'Hugo Souza', email: 'hugo@nfstay.com', type: 'investor', amount: 780, currency: 'GBP', method: 'bank_transfer', status: 'pending', weekRef: 'W12-2026', claimed: '2026-03-18', paid: '' },
  { id: 'p2', user: 'John Smith', email: 'john@gmail.com', type: 'affiliate', amount: 125, currency: 'USDC', method: 'usdc', status: 'paid', weekRef: 'W11-2026', claimed: '2026-03-11', paid: '2026-03-12' },
  { id: 'p3', user: 'Sarah Chen', email: 'sarah@outlook.com', type: 'investor', amount: 248, currency: 'GBP', method: 'bank_transfer', status: 'processing', weekRef: 'W12-2026', claimed: '2026-03-17', paid: '' },
  { id: 'p4', user: 'Ahmed Ali', email: 'ahmed@yahoo.com', type: 'investor', amount: 534, currency: 'USDC', method: 'usdc', status: 'paid', weekRef: 'W11-2026', claimed: '2026-03-10', paid: '2026-03-11' },
  { id: 'p5', user: 'Maria Garcia', email: 'maria@gmail.com', type: 'subscriber', amount: 97, currency: 'GBP', method: 'bank_transfer', status: 'pending', weekRef: 'W12-2026', claimed: '2026-03-18', paid: '' },
  { id: 'p6', user: 'David Park', email: 'david@proton.me', type: 'investor', amount: 1540, currency: 'STAY', method: 'stay_token', status: 'paid', weekRef: 'W11-2026', claimed: '2026-03-09', paid: '2026-03-10' },
  { id: 'p7', user: 'Hugo Souza', email: 'hugo@nfstay.com', type: 'affiliate', amount: 340, currency: 'USDC', method: 'usdc', status: 'pending', weekRef: 'W12-2026', claimed: '2026-03-17', paid: '' },
  { id: 'p8', user: 'John Smith', email: 'john@gmail.com', type: 'investor', amount: 427, currency: 'LP', method: 'lp_token', status: 'processing', weekRef: 'W12-2026', claimed: '2026-03-16', paid: '' },
  { id: 'p9', user: 'Ahmed Ali', email: 'ahmed@yahoo.com', type: 'affiliate', amount: 112, currency: 'GBP', method: 'bank_transfer', status: 'paid', weekRef: 'W10-2026', claimed: '2026-03-04', paid: '2026-03-05' },
  { id: 'p10', user: 'Sarah Chen', email: 'sarah@outlook.com', type: 'subscriber', amount: 97, currency: 'GBP', method: 'bank_transfer', status: 'pending', weekRef: 'W12-2026', claimed: '2026-03-18', paid: '' },
];

const weekOptions = ['All', 'W12-2026', 'W11-2026', 'W10-2026'];

export default function AdminInvestPayouts() {
  const { data: realClaims = [] } = useAllPayoutClaims();

  const [payouts, setPayouts] = useState<Payout[]>(mockPayouts);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [weekFilter, setWeekFilter] = useState('All');
  const [batchTriggered, setBatchTriggered] = useState(false);

  const filtered = payouts.filter((p) => {
    if (statusFilter !== 'All' && p.status !== statusFilter.toLowerCase()) return false;
    if (typeFilter !== 'All' && p.type !== typeFilter.toLowerCase()) return false;
    if (weekFilter !== 'All' && p.weekRef !== weekFilter) return false;
    return true;
  });

  const handleApprove = (id: string) => {
    setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'processing' as const } : p)));
  };

  const handleMarkPaid = (id: string) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'paid' as const, paid: '2026-03-18' } : p))
    );
  };

  const handleReject = (id: string) => {
    setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'cancelled' as const } : p)));
  };

  const handleBatch = () => {
    setBatchTriggered(true);
    setTimeout(() => setBatchTriggered(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Payouts</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered as any[], 'payouts')}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button
            onClick={handleBatch}
            disabled={batchTriggered}
            className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
          >
            <Zap className="w-4 h-4" />
            {batchTriggered ? 'Batch Triggered...' : 'Trigger Tuesday Batch'}
          </Button>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs text-right">
            Process all pending bank claims via Revolut
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
                    <div className="font-medium text-sm">{p.user}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs capitalize', typeColors[p.type])}>
                      {p.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{p.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.currency}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs', methodColors[p.method])}>
                      {methodLabels[p.method]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs capitalize', statusColors[p.status])}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.weekRef}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.claimed}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.paid || '\u2014'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === 'pending' && (
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => handleApprove(p.id)}>
                          Approve
                        </Button>
                      )}
                      {p.status === 'processing' && (
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => handleMarkPaid(p.id)}>
                          Mark Paid
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
