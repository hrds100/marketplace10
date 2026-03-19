import { useState, useMemo } from 'react';
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

function getRank(propertyCount: number): string {
  if (propertyCount >= 15) return 'Property Titan';
  if (propertyCount >= 10) return 'Empire Builder';
  if (propertyCount >= 5) return 'Portfolio Boss';
  if (propertyCount >= 3) return 'Cashflow Builder';
  if (propertyCount >= 1) return 'Deal Rookie';
  return 'Noobie';
}

export default function AdminInvestShareholders() {
  const { data: realShareholders = [] } = useAllShareholders();

  const [propertyFilter, setPropertyFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group inv_shareholdings rows by user_id → Shareholder[]
  const shareholders: Shareholder[] = useMemo(() => {
    const grouped: Record<string, Shareholder> = {};
    for (const row of realShareholders as any[]) {
      const uid = row.user_id || 'unknown';
      const propTitle = row.inv_properties?.title || `Property #${row.property_id}`;
      const shares = Number(row.shares_owned || 0);
      const invested = Number(row.invested_amount || 0);
      if (!grouped[uid]) {
        grouped[uid] = {
          id: uid,
          name: uid.slice(0, 8),
          email: '—',
          wallet: '—',
          properties: [],
          totalShares: 0,
          totalInvested: 0,
          totalEarned: 0,
          monthlyYield: 0,
          rank: 'Noobie',
          holdings: [],
        };
      }
      grouped[uid].properties.push(propTitle);
      grouped[uid].totalShares += shares;
      grouped[uid].totalInvested += invested;
      grouped[uid].holdings.push({
        property: propTitle,
        shares,
        invested,
        earned: 0,
        lastPayout: '—',
        apy: 0,
      });
    }
    return Object.values(grouped).map((s) => ({
      ...s,
      rank: getRank(s.holdings.length),
    }));
  }, [realShareholders]);

  const propertyOptions = useMemo(() => {
    const titles = Array.from(new Set((realShareholders as any[]).map((r: any) => r.inv_properties?.title).filter(Boolean)));
    return ['All', ...titles];
  }, [realShareholders]);

  const filtered = shareholders.filter((s) => {
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
