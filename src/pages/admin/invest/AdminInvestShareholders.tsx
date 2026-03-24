import { useState, useEffect } from 'react';
import { Search, Download, Loader2, Pencil, Check, X } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { SUBGRAPHS } from '@/lib/particle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Shareholder {
  id: string;
  wallet: string;
  name: string;
  whatsapp: string;
  adminLabel: string;
  totalShares: number;
  totalInvested: number;
  totalClaimed: number;
  unclaimed: number;
  firstPurchase: string;
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

function getRank(invested: number): string {
  if (invested >= 1000) return 'Property Titan';
  if (invested >= 500) return 'Empire Builder';
  if (invested >= 100) return 'Portfolio Boss';
  if (invested >= 20) return 'Cashflow Builder';
  if (invested >= 1) return 'Deal Rookie';
  return 'Noobie';
}

export default function AdminInvestShareholders() {
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadShareholders(cancelled).then((data) => {
      if (!cancelled) { setShareholders(data); setLoading(false); }
    }).catch((err) => { if (!cancelled) { setLoading(false); setError(err.message || 'Failed to load — The Graph may be temporarily down. Refresh to retry.'); } });
    return () => { cancelled = true; };
  }, []);

  async function loadShareholders(cancelled: boolean): Promise<Shareholder[]> {
    // 1. Fetch share purchases with amounts and timestamps from The Graph
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const sharesRes = await fetch(SUBGRAPHS.MARKETPLACE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ primarySharesBoughts(first: 1000, orderBy: blockTimestamp, orderDirection: asc) { _buyer _sharesBought _amount blockTimestamp } }`,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const sharesData = await sharesRes.json();
    if (sharesData.errors) throw new Error(sharesData.errors[0]?.message || 'Graph query failed');
    const buys = sharesData.data?.primarySharesBoughts || [];
    if (buys.length === 0) throw new Error('The Graph returned 0 results — it may be temporarily unavailable. Refresh to retry.');

    const walletMap: Record<string, { graphShares: number; invested: number; firstPurchase: string }> = {};
    for (const b of buys) {
      const w = b._buyer.toLowerCase();
      const shares = parseInt(b._sharesBought);
      const amount = b._amount ? parseInt(b._amount) / 1e18 : shares;
      const date = new Date(parseInt(b.blockTimestamp) * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      if (!walletMap[w]) walletMap[w] = { graphShares: 0, invested: 0, firstPurchase: date };
      walletMap[w].graphShares += shares;
      walletMap[w].invested += amount;
    }

    // 1b. Get REAL balances from RWA contract (Graph may miss admin transfers)
    const onChainBalances: Record<string, number> = {};
    try {
      const ethers = await import('ethers');
      const provider = new ethers.providers.JsonRpcProvider('https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T');
      const { RWA_TOKEN_ABI } = await import('@/lib/contractAbis');
      const rwa = new ethers.Contract(CONTRACTS.RWA_TOKEN, RWA_TOKEN_ABI, provider);
      const wallets = Object.keys(walletMap);
      const balChecks = await Promise.allSettled(
        wallets.map(async (w) => {
          const bal = await rwa.balanceOf(w, 1);
          return { wallet: w, balance: bal.toNumber() };
        })
      );
      for (const r of balChecks) {
        if (r.status === 'fulfilled') onChainBalances[r.value.wallet] = r.value.balance;
      }
    } catch { /* non-critical — fall back to Graph shares */ }

    // 2. Fetch rent withdrawals (total claimed)
    const rentRes = await fetch(SUBGRAPHS.RENT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ rentWithdrawns(first: 1000) { _by _rent } }`,
      }),
    });
    const rentData = await rentRes.json();
    const claimedMap: Record<string, number> = {};
    for (const w of rentData.data?.rentWithdrawns || []) {
      const addr = w._by.toLowerCase();
      claimedMap[addr] = (claimedMap[addr] || 0) + parseInt(w._rent) / 1e18;
    }

    // 3. Fetch unclaimed rent from contract
    let rentPerShare = 0;
    const eligibleMap: Record<string, boolean> = {};
    try {
      const ethers = await import('ethers');
      const provider = new ethers.providers.JsonRpcProvider('https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T');
      const rent = new ethers.Contract('0x5880FABeafDD228f0d8bc70Ebb2bb79971100C89', [
        'function getRentDetails(uint256) view returns (uint256, uint256, uint256, uint256, uint256)',
        'function isEligibleForRent(uint256, address) view returns (bool)',
      ], provider);
      const details = await rent.getRentDetails(1);
      rentPerShare = Number(details[4].toString()) / 1e18;

      const wallets = Object.keys(walletMap);
      const eligChecks = await Promise.allSettled(
        wallets.map(async (w) => {
          const eligible = await rent.isEligibleForRent(1, w);
          return { wallet: w, eligible };
        })
      );
      for (const r of eligChecks) {
        if (r.status === 'fulfilled') eligibleMap[r.value.wallet] = r.value.eligible;
      }
    } catch { /* non-critical */ }

    // 4. Fetch profiles
    const { data: profiles } = await (supabase.from('profiles') as any)
      .select('id, wallet_address, name, whatsapp, admin_label');

    const profileMap: Record<string, { id: string; name: string; whatsapp: string; adminLabel: string }> = {};
    for (const p of profiles || []) {
      if (p.wallet_address) {
        profileMap[p.wallet_address.toLowerCase()] = {
          id: p.id,
          name: p.name || '',
          whatsapp: p.whatsapp || '',
          adminLabel: p.admin_label || '',
        };
      }
    }

    // 5. Build list — use on-chain balance if available (more accurate than Graph)
    return Object.entries(walletMap)
      .map(([wallet, data]) => {
        const profile = profileMap[wallet];
        const realShares = onChainBalances[wallet] ?? data.graphShares;
        const realInvested = realShares; // $1 per share — on-chain balance × $1
        const unclaimed = eligibleMap[wallet] ? rentPerShare * realShares : 0;
        return {
          id: profile?.id || wallet,
          wallet,
          name: profile?.name || '',
          whatsapp: profile?.whatsapp || '',
          adminLabel: profile?.adminLabel || '',
          totalShares: realShares,
          totalInvested: realInvested,
          totalClaimed: claimedMap[wallet] || 0,
          unclaimed,
          firstPurchase: data.firstPurchase,
          rank: getRank(data.invested),
        };
      })
      .sort((a, b) => b.totalInvested - a.totalInvested);
  }

  const handleSaveEdit = async (wallet: string) => {
    const profile = shareholders.find((s) => s.wallet === wallet);
    if (!profile) return;
    try {
      // Find profile by wallet_address
      const { data: existing } = await (supabase.from('profiles') as any)
        .select('id')
        .eq('wallet_address', wallet)
        .maybeSingle();
      if (!existing) {
        // Try case-insensitive
        const { data: existing2 } = await (supabase.from('profiles') as any)
          .select('id')
          .ilike('wallet_address', wallet)
          .maybeSingle();
        if (!existing2) { toast.error('No profile found for this wallet'); setEditingId(null); return; }
        await (supabase.from('profiles') as any).update({ name: editName, admin_label: editLabel }).eq('id', existing2.id);
      } else {
        await (supabase.from('profiles') as any).update({ name: editName, admin_label: editLabel }).eq('id', existing.id);
      }
      setShareholders((prev) => prev.map((s) => s.wallet === wallet ? { ...s, name: editName, adminLabel: editLabel } : s));
      toast.success('Updated');
      setEditingId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const filtered = shareholders.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.wallet.includes(q) || s.name.toLowerCase().includes(q) || s.adminLabel.toLowerCase().includes(q);
  });

  const totalShares = shareholders.reduce((sum, s) => sum + s.totalShares, 0);
  const totalInvested = shareholders.reduce((sum, s) => sum + s.totalInvested, 0);
  const totalClaimed = shareholders.reduce((sum, s) => sum + s.totalClaimed, 0);
  const totalUnclaimed = shareholders.reduce((sum, s) => sum + s.unclaimed, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="outline" size="sm" onClick={() => { setError(''); setLoading(true); loadShareholders(false).then(setShareholders).catch((e) => setError(e.message)).finally(() => setLoading(false)); }}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div data-feature="ADMIN__INVEST">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">Shareholders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {shareholders.length} investors &middot; {totalShares.toLocaleString()} allocations &middot; ${totalInvested.toLocaleString()} invested &middot; ${totalClaimed.toFixed(2)} claimed &middot; ${totalUnclaimed.toFixed(2)} unclaimed
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered as any[], 'shareholders')}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            data-feature="ADMIN__INVEST_SHAREHOLDERS_SEARCH"
            className="h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm w-64"
            placeholder="Search by name, wallet, or label..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-0 overflow-x-auto">
          <Table data-feature="ADMIN__INVEST_SHAREHOLDERS_TABLE">
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead className="text-right">Allocations</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead className="text-right">Claimed</TableHead>
                <TableHead className="text-right">Unclaimed</TableHead>
                <TableHead>Since</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.wallet}>
                  <TableCell>
                    {editingId === s.wallet ? (
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 w-28 px-1.5 rounded border border-input bg-background text-sm" placeholder="Name" />
                    ) : (
                      <span className="font-medium">{s.name || '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === s.wallet ? (
                      <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-7 w-24 px-1.5 rounded border border-input bg-background text-xs" placeholder="Label" />
                    ) : (
                      s.adminLabel ? <Badge variant="outline" className="text-[10px]">{s.adminLabel}</Badge> : <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <a href={`https://bscscan.com/address/${s.wallet}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-primary hover:underline">
                      {s.wallet.slice(0, 6)}...{s.wallet.slice(-4)}
                    </a>
                  </TableCell>
                  <TableCell>
                    {s.whatsapp ? (
                      <a href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{s.whatsapp}</a>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-bold">{s.totalShares.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">${s.totalInvested.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">${s.totalClaimed.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {s.unclaimed > 0 ? (
                      <span className="text-amber-600 font-medium">${s.unclaimed.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground">$0.00</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{s.firstPurchase}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs whitespace-nowrap', rankColors[s.rank])}>
                      {s.rank}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingId === s.wallet ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleSaveEdit(s.wallet)} className="p-1 rounded hover:bg-emerald-50"><Check className="h-3.5 w-3.5 text-emerald-600" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-red-50"><X className="h-3.5 w-3.5 text-red-500" /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(s.wallet); setEditName(s.name); setEditLabel(s.adminLabel); }} className="p-1 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">No shareholders found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
