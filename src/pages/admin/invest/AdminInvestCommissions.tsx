import { useState, useMemo } from 'react';
import { useAllCommissions } from '@/hooks/useInvestData';
import { DollarSign, Clock, CheckCircle2, Wallet, Search, Download } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Commission {
  id: string;
  agent: string;
  agentEmail: string;
  referredUser: string;
  source: 'subscription' | 'investment_first' | 'investment_recurring';
  property: string;
  grossAmount: number;
  rate: number;
  commission: number;
  status: 'pending' | 'claimable' | 'claimed' | 'paid';
  claimableDate: string;
}

const sourceColors: Record<string, string> = {
  subscription: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  investment_first: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  investment_recurring: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

const sourceLabels: Record<string, string> = {
  subscription: 'Subscription',
  investment_first: 'First Purchase',
  investment_recurring: 'Recurring',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  claimable: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  claimed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  paid: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
};


export default function AdminInvestCommissions() {
  const { data: realCommissions = [] } = useAllCommissions();

  const [sourceFilter, setSourceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [agentSearch, setAgentSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Map DB rows to Commission display shape
  const commissions: Commission[] = useMemo(() => {
    return (realCommissions as any[]).map((r) => ({
      id: r.id || '',
      agent: r.aff_profiles?.full_name || r.affiliate_user_id?.slice(0, 8) || '—',
      agentEmail: r.aff_profiles?.referral_code ? `code: ${r.aff_profiles.referral_code}` : '—',
      referredUser: r.referred_user_id?.slice(0, 8) || '—',
      source: (r.source || r.commission_type || 'investment_first') as Commission['source'],
      property: r.inv_properties?.title || r.property_title || (r.property_id ? `#${r.property_id}` : ''),
      grossAmount: Number(r.gross_amount || r.amount || 0),
      rate: Number(r.commission_rate || r.rate || 0) * 100,
      commission: Number(r.commission_amount || r.amount || 0),
      status: (r.status || 'pending') as Commission['status'],
      claimableDate: r.claimable_at ? r.claimable_at.slice(0, 10) : r.created_at?.slice(0, 10) || '',
    }));
  }, [realCommissions]);

  // Compute stats from real data
  const stats = useMemo(() => {
    const total = commissions.reduce((s, c) => s + c.commission, 0);
    const pending = commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.commission, 0);
    const claimable = commissions.filter((c) => c.status === 'claimable').reduce((s, c) => s + c.commission, 0);
    const paid = commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.commission, 0);
    return [
      { label: 'Total Commissions', value: `$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { label: 'Pending', value: `$${pending.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
      { label: 'Claimable', value: `$${claimable.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { label: 'Paid', value: `$${paid.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    ];
  }, [commissions]);

  const filtered = commissions.filter((c) => {
    if (sourceFilter !== 'All' && c.source !== sourceFilter) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter.toLowerCase()) return false;
    if (agentSearch && !c.agent.toLowerCase().includes(agentSearch.toLowerCase())) return false;
    if (dateFrom && c.claimableDate < dateFrom) return false;
    if (dateTo && c.claimableDate > dateTo) return false;
    return true;
  });

  return (
    <div data-feature="ADMIN__INVEST">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Commissions</h1>
        <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered as any[], 'commissions')}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>
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
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div data-feature="ADMIN__INVEST_COMMISSIONS_FILTER" className="flex flex-wrap gap-3 mb-6">
        <select
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="All">All Sources</option>
          <option value="subscription">Subscription</option>
          <option value="investment_first">First Purchase</option>
          <option value="investment_recurring">Recurring</option>
        </select>
        <select
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All</option>
          <option>Pending</option>
          <option>Claimable</option>
          <option>Claimed</option>
          <option>Paid</option>
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm w-48"
            placeholder="Search agent..."
            value={agentSearch}
            onChange={(e) => setAgentSearch(e.target.value)}
          />
        </div>
        <input
          type="date"
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From"
        />
        <input
          type="date"
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To"
        />
      </div>

      <Card className="border-border">
        <CardContent className="p-0 overflow-x-auto">
          <Table data-feature="ADMIN__INVEST_COMMISSIONS_TABLE">
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Referred User</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Property</TableHead>
                <TableHead className="text-right">Gross Amount</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Claimable Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{c.agent}</div>
                    <div className="text-xs text-muted-foreground">{c.agentEmail}</div>
                  </TableCell>
                  <TableCell className="text-sm">{c.referredUser}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs', sourceColors[c.source])}>
                      {sourceLabels[c.source]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.property || '\u2014'}</TableCell>
                  <TableCell className="text-right">${c.grossAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{c.rate}%</TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">${c.commission.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs capitalize', statusColors[c.status])}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.claimableDate}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No commissions found
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
