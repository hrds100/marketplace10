import { useState } from 'react';
import { useAllShareholders } from '@/hooks/useInvestData';
import { Search, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface PropertyHolding {
  property: string;
  shares: number;
  invested: number;
  earned: number;
  lastPayout: string;
  apy: number;
}

interface Shareholder {
  id: string;
  name: string;
  email: string;
  wallet: string;
  properties: string[];
  totalShares: number;
  totalInvested: number;
  totalEarned: number;
  monthlyYield: number;
  rank: string;
  holdings: PropertyHolding[];
}

const rankColors: Record<string, string> = {
  Noobie: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  'Deal Rookie': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Cashflow Builder': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Portfolio Boss': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Empire Builder': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Property Titan': 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
};

const mockShareholders: Shareholder[] = [
  {
    id: 'u1', name: 'Hugo Souza', email: 'hugo@nfstay.com', wallet: '0x6eb0...1436',
    properties: ['Seseh Beachfront Villa', 'KAEC Waterfront Residence'],
    totalShares: 85, totalInvested: 13000, totalEarned: 2340, monthlyYield: 195, rank: 'Portfolio Boss',
    holdings: [
      { property: 'Seseh Beachfront Villa', shares: 50, invested: 5000, earned: 1560, lastPayout: '2026-03-15', apy: 12.4 },
      { property: 'KAEC Waterfront Residence', shares: 35, invested: 5250, earned: 780, lastPayout: '2026-03-15', apy: 14.2 },
    ],
  },
  {
    id: 'u2', name: 'John Smith', email: 'john@gmail.com', wallet: '0x8f3a...e2c1',
    properties: ['Marina Gate Apartment', 'Seseh Beachfront Villa'],
    totalShares: 120, totalInvested: 32000, totalEarned: 5120, monthlyYield: 427, rank: 'Empire Builder',
    holdings: [
      { property: 'Marina Gate Apartment', shares: 100, invested: 25000, earned: 4080, lastPayout: '2026-03-15', apy: 9.8 },
      { property: 'Seseh Beachfront Villa', shares: 20, invested: 2000, earned: 496, lastPayout: '2026-03-15', apy: 12.4 },
    ],
  },
  {
    id: 'u3', name: 'Sarah Chen', email: 'sarah@outlook.com', wallet: '0x2b7c...f9a3',
    properties: ['Seseh Beachfront Villa'],
    totalShares: 20, totalInvested: 2000, totalEarned: 248, monthlyYield: 21, rank: 'Deal Rookie',
    holdings: [
      { property: 'Seseh Beachfront Villa', shares: 20, invested: 2000, earned: 248, lastPayout: '2026-03-15', apy: 12.4 },
    ],
  },
  {
    id: 'u4', name: 'Ahmed Ali', email: 'ahmed@yahoo.com', wallet: '0x9c2f...a1d7',
    properties: ['KAEC Waterfront Residence', 'Seseh Beachfront Villa'],
    totalShares: 47, totalInvested: 5850, totalEarned: 890, monthlyYield: 74, rank: 'Cashflow Builder',
    holdings: [
      { property: 'KAEC Waterfront Residence', shares: 15, invested: 2250, earned: 534, lastPayout: '2026-03-15', apy: 14.2 },
      { property: 'Seseh Beachfront Villa', shares: 32, invested: 3200, earned: 396, lastPayout: '2026-03-15', apy: 12.4 },
    ],
  },
  {
    id: 'u5', name: 'Maria Garcia', email: 'maria@gmail.com', wallet: '0x1d4e...b8f2',
    properties: ['Marina Gate Apartment'],
    totalShares: 8, totalInvested: 2000, totalEarned: 163, monthlyYield: 16, rank: 'Noobie',
    holdings: [
      { property: 'Marina Gate Apartment', shares: 8, invested: 2000, earned: 163, lastPayout: '2026-03-15', apy: 9.8 },
    ],
  },
  {
    id: 'u6', name: 'David Park', email: 'david@proton.me', wallet: '0x5a3b...c7d8',
    properties: ['Seseh Beachfront Villa', 'Marina Gate Apartment', 'KAEC Waterfront Residence'],
    totalShares: 210, totalInvested: 48500, totalEarned: 9240, monthlyYield: 770, rank: 'Property Titan',
    holdings: [
      { property: 'Seseh Beachfront Villa', shares: 80, invested: 8000, earned: 3720, lastPayout: '2026-03-15', apy: 12.4 },
      { property: 'Marina Gate Apartment', shares: 60, invested: 15000, earned: 3060, lastPayout: '2026-03-15', apy: 9.8 },
      { property: 'KAEC Waterfront Residence', shares: 70, invested: 10500, earned: 2460, lastPayout: '2026-03-15', apy: 14.2 },
    ],
  },
];

const propertyOptions = ['All', 'Seseh Beachfront Villa', 'Marina Gate Apartment', 'KAEC Waterfront Residence'];

export default function AdminInvestShareholders() {
  const { data: realShareholders = [] } = useAllShareholders();

  const [propertyFilter, setPropertyFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = mockShareholders.filter((s) => {
    if (propertyFilter !== 'All' && !s.properties.includes(propertyFilter)) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Shareholders</h1>
        <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered as any[], 'shareholders')}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
        >
          {propertyOptions.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm w-64"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead className="text-right">Total Shares</TableHead>
                <TableHead className="text-right">Total Invested</TableHead>
                <TableHead className="text-right">Total Earned</TableHead>
                <TableHead className="text-right">Monthly Yield</TableHead>
                <TableHead>Rank</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <>
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  >
                    <TableCell>
                      {expandedId === s.id ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.email}</TableCell>
                    <TableCell className="text-sm">{s.properties.length}</TableCell>
                    <TableCell className="text-right font-medium">{s.totalShares}</TableCell>
                    <TableCell className="text-right font-medium">${s.totalInvested.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">${s.totalEarned.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${s.monthlyYield}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs whitespace-nowrap', rankColors[s.rank])}>
                        {s.rank}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {expandedId === s.id && (
                    <TableRow key={`${s.id}-expanded`}>
                      <TableCell colSpan={9} className="bg-muted/30 p-0">
                        <div className="px-10 py-4">
                          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Holdings Breakdown</p>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Property</TableHead>
                                <TableHead className="text-xs text-right">Shares</TableHead>
                                <TableHead className="text-xs text-right">Invested</TableHead>
                                <TableHead className="text-xs text-right">Earned</TableHead>
                                <TableHead className="text-xs">Last Payout</TableHead>
                                <TableHead className="text-xs text-right">APY</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {s.holdings.map((h, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-sm">{h.property}</TableCell>
                                  <TableCell className="text-right text-sm">{h.shares}</TableCell>
                                  <TableCell className="text-right text-sm">${h.invested.toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-sm text-emerald-600">${h.earned.toLocaleString()}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{h.lastPayout}</TableCell>
                                  <TableCell className="text-right text-sm font-medium">{h.apy}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No shareholders found
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
