import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight, Download, Loader2 } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { SUBGRAPHS } from '@/lib/particle';
import { supabase } from '@/integrations/supabase/client';

interface Shareholder {
  id: string;
  wallet: string;
  name: string;
  whatsapp: string;
  totalShares: number;
  totalInvested: number;
  totalClaimed: number;
  rank: string;
}

const rankColors: Record<string, string> = {
  Noobie: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  'Deal Rookie': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Cashflow Builder': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Portfolio Boss': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Empire Builder': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Property Titan': 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
};

function getRank(shares: number): string {
  if (shares >= 1000) return 'Property Titan';
  if (shares >= 500) return 'Empire Builder';
  if (shares >= 100) return 'Portfolio Boss';
  if (shares >= 20) return 'Cashflow Builder';
  if (shares >= 1) return 'Deal Rookie';
  return 'Noobie';
}

export default function AdminInvestShareholders() {
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Fetch share purchases from The Graph
        const sharesRes = await fetch(SUBGRAPHS.MARKETPLACE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ primarySharesBoughts(first: 1000) { _buyer _sharesBought } }`,
          }),
        });
        const sharesData = await sharesRes.json();
        const buys = sharesData.data?.primarySharesBoughts || [];

        // Group by wallet
        const walletMap: Record<string, { shares: number; invested: number }> = {};
        for (const b of buys) {
          const w = b._buyer.toLowerCase();
          if (!walletMap[w]) walletMap[w] = { shares: 0, invested: 0 };
          const shares = parseInt(b._sharesBought);
          walletMap[w].shares += shares;
          walletMap[w].invested += shares; // $1 per allocation
        }

        // 2. Fetch rent withdrawals from The Graph
        const rentRes = await fetch(SUBGRAPHS.RENT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ rentWithdrawns(first: 1000) { _by _rent } }`,
          }),
        });
        const rentData = await rentRes.json();
        const withdrawals = rentData.data?.rentWithdrawns || [];

        const claimedMap: Record<string, number> = {};
        for (const w of withdrawals) {
          const addr = w._by.toLowerCase();
          claimedMap[addr] = (claimedMap[addr] || 0) + parseInt(w._rent) / 1e18;
        }

        // 3. Fetch profiles to match wallets to names
        const { data: profiles } = await (supabase.from('profiles') as any)
          .select('wallet_address, name, whatsapp');

        const profileMap: Record<string, { name: string; whatsapp: string }> = {};
        for (const p of profiles || []) {
          if (p.wallet_address) {
            profileMap[p.wallet_address.toLowerCase()] = {
              name: p.name || '',
              whatsapp: p.whatsapp || '',
            };
          }
        }

        // 4. Build shareholders list
        const result: Shareholder[] = Object.entries(walletMap)
          .map(([wallet, data]) => {
            const profile = profileMap[wallet];
            return {
              id: wallet,
              wallet,
              name: profile?.name || '',
              whatsapp: profile?.whatsapp || '',
              totalShares: data.shares,
              totalInvested: data.invested,
              totalClaimed: claimedMap[wallet] || 0,
              rank: getRank(data.shares),
            };
          })
          .sort((a, b) => b.totalShares - a.totalShares);

        if (!cancelled) {
          setShareholders(result);
          setLoading(false);
        }
      } catch (err) {
        console.error('[Shareholders] Failed to load:', err);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const filtered = shareholders.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.wallet.includes(q) || s.name.toLowerCase().includes(q);
  });

  const totalShares = shareholders.reduce((sum, s) => sum + s.totalShares, 0);
  const totalInvested = shareholders.reduce((sum, s) => sum + s.totalInvested, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">Shareholders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {shareholders.length} investors &middot; {totalShares.toLocaleString()} total allocations &middot; ${totalInvested.toLocaleString()} invested
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered as any[], 'shareholders')}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm w-64"
            placeholder="Search by name or wallet..."
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
                <TableHead>User</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead className="text-right">Allocations</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead className="text-right">Total Claimed</TableHead>
                <TableHead>Rank</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name || '—'}</TableCell>
                  <TableCell>
                    <a
                      href={`https://bscscan.com/address/${s.wallet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-primary hover:underline"
                    >
                      {s.wallet.slice(0, 6)}...{s.wallet.slice(-4)}
                    </a>
                  </TableCell>
                  <TableCell>
                    {s.whatsapp ? (
                      <a
                        href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {s.whatsapp}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold">{s.totalShares.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">${s.totalInvested.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">${s.totalClaimed.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs whitespace-nowrap', rankColors[s.rank])}>
                      {s.rank}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
