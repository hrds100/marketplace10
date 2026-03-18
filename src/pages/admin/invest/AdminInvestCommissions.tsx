import { useState } from 'react';
import { DollarSign, Clock, CheckCircle2, Wallet, Search } from 'lucide-react';
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

const mockCommissions: Commission[] = [
  { id: 'c1', agent: 'Hugo Souza', agentEmail: 'hugo@nfstay.com', referredUser: 'John Smith', source: 'investment_first', property: 'Marina Gate Apartment', grossAmount: 2500, rate: 5, commission: 125, status: 'paid', claimableDate: '2026-03-10' },
  { id: 'c2', agent: 'Hugo Souza', agentEmail: 'hugo@nfstay.com', referredUser: 'Sarah Chen', source: 'subscription', property: '', grossAmount: 97, rate: 40, commission: 38.80, status: 'paid', claimableDate: '2026-03-08' },
  { id: 'c3', agent: 'John Smith', agentEmail: 'john@gmail.com', referredUser: 'Hugo Souza', source: 'investment_first', property: 'Seseh Beachfront Villa', grossAmount: 500, rate: 5, commission: 25, status: 'claimable', claimableDate: '2026-03-18' },
  { id: 'c4', agent: 'Maria Garcia', agentEmail: 'maria@gmail.com', referredUser: 'Ahmed Ali', source: 'investment_first', property: 'KAEC Waterfront Residence', grossAmount: 2250, rate: 5, commission: 112.50, status: 'paid', claimableDate: '2026-03-12' },
  { id: 'c5', agent: 'Hugo Souza', agentEmail: 'hugo@nfstay.com', referredUser: 'Ahmed Ali', source: 'investment_recurring', property: 'Seseh Beachfront Villa', grossAmount: 1200, rate: 2, commission: 24, status: 'pending', claimableDate: '2026-03-25' },
  { id: 'c6', agent: 'John Smith', agentEmail: 'john@gmail.com', referredUser: 'Maria Garcia', source: 'subscription', property: '', grossAmount: 97, rate: 40, commission: 38.80, status: 'paid', claimableDate: '2026-03-05' },
  { id: 'c7', agent: 'Ahmed Ali', agentEmail: 'ahmed@yahoo.com', referredUser: 'David Park', source: 'investment_first', property: 'Seseh Beachfront Villa', grossAmount: 8000, rate: 5, commission: 400, status: 'paid', claimableDate: '2026-02-28' },
  { id: 'c8', agent: 'Ahmed Ali', agentEmail: 'ahmed@yahoo.com', referredUser: 'David Park', source: 'investment_recurring', property: 'Marina Gate Apartment', grossAmount: 15000, rate: 2, commission: 300, status: 'claimed', claimableDate: '2026-03-14' },
  { id: 'c9', agent: 'Hugo Souza', agentEmail: 'hugo@nfstay.com', referredUser: 'David Park', source: 'subscription', property: '', grossAmount: 297, rate: 40, commission: 118.80, status: 'paid', claimableDate: '2026-02-20' },
  { id: 'c10', agent: 'Maria Garcia', agentEmail: 'maria@gmail.com', referredUser: 'Sarah Chen', source: 'investment_first', property: 'Seseh Beachfront Villa', grossAmount: 2000, rate: 5, commission: 100, status: 'paid', claimableDate: '2026-03-01' },
  { id: 'c11', agent: 'John Smith', agentEmail: 'john@gmail.com', referredUser: 'Ahmed Ali', source: 'investment_recurring', property: 'KAEC Waterfront Residence', grossAmount: 2250, rate: 2, commission: 45, status: 'pending', claimableDate: '2026-03-28' },
  { id: 'c12', agent: 'Hugo Souza', agentEmail: 'hugo@nfstay.com', referredUser: 'Maria Garcia', source: 'investment_first', property: 'Marina Gate Apartment', grossAmount: 2000, rate: 5, commission: 100, status: 'paid', claimableDate: '2026-02-15' },
];

const stats = [
  { label: 'Total Commissions', value: '$12,450', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { label: 'Pending', value: '$1,230', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { label: 'Claimable', value: '$890', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { label: 'Paid', value: '$10,330', icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10' },
];

export default function AdminInvestCommissions() {
  const [sourceFilter, setSourceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [agentSearch, setAgentSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = mockCommissions.filter((c) => {
    if (sourceFilter !== 'All' && c.source !== sourceFilter) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter.toLowerCase()) return false;
    if (agentSearch && !c.agent.toLowerCase().includes(agentSearch.toLowerCase())) return false;
    if (dateFrom && c.claimableDate < dateFrom) return false;
    if (dateTo && c.claimableDate > dateTo) return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Commissions</h1>

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
      <div className="flex flex-wrap gap-3 mb-6">
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
          <Table>
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
