import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useInvestProperties } from '@/hooks/useInvestData';
import { useBlockchain } from '@/hooks/useBlockchain';
import { supabase } from '@/integrations/supabase/client';
import { Rocket, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface BoostEntry {
  id: string;
  user: string;
  email: string;
  property: string;
  propertyId: number;
  boosted: boolean;
  baseApr: number;
  boostedApr: number;
  stayEarned: number;
  costUsdc: number;
  boostedDate: string;
  expires: string;
}


export default function AdminInvestBoost() {
  const { data: realProperties = [] } = useInvestProperties();
  const { boostApr, claimBoostRewards, loading: blockchainLoading } = useBlockchain();

  const [boosts, setBoosts] = useState<BoostEntry[]>([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [boosting, setBoosting] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Load all boost statuses from Supabase
  useEffect(() => {
    (supabase.from('inv_boost_status') as any)
      .select('*, inv_properties(title, annual_yield)')
      .then(({ data }: { data: any[] | null }) => {
        if (!data) return;
        setBoosts(data.map((r) => ({
          id: r.id,
          user: r.user_id?.slice(0, 8) || '—',
          email: '—',
          property: r.inv_properties?.title || `Property #${r.property_id}`,
          propertyId: r.property_id,
          boosted: !!r.is_boosted,
          baseApr: Number(r.inv_properties?.annual_yield || 0),
          boostedApr: r.is_boosted ? Number(r.inv_properties?.annual_yield || 0) * 1.5 : Number(r.inv_properties?.annual_yield || 0),
          stayEarned: Number(r.stay_earned || 0),
          costUsdc: Number(r.cost_usdc || 0),
          boostedDate: r.boosted_at?.slice(0, 10) || '',
          expires: r.expires_at?.slice(0, 10) || '',
        })));
      });
  }, []);

  const handleBoost = async () => {
    if (!propertyId) return;
    setBoosting(true);
    try {
      await boostApr(Number(propertyId));
      toast.success(`APR boosted for property ${propertyId}${walletAddress ? ` (wallet: ${walletAddress.slice(0, 10)}…)` : ''}`);
      setWalletAddress('');
      setPropertyId('');
    } catch (err) {
      toast.error('Boost failed — make sure your admin wallet is connected');
    } finally {
      setBoosting(false);
    }
  };

  const handleClaim = async (b: BoostEntry) => {
    setClaimingId(b.id);
    try {
      await claimBoostRewards(b.propertyId);
      toast.success(`STAY rewards claimed for property ${b.propertyId}`);
      setBoosts((prev) => prev.map((x) => x.id === b.id ? { ...x, stayEarned: 0 } : x));
    } catch {
      toast.error('Claim failed — wallet may not be connected');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div data-feature="ADMIN__INVEST">
      <h1 className="text-[28px] font-bold text-foreground mb-6">Boost Management</h1>

      {/* Admin Boost Card */}
      <Card data-feature="ADMIN__INVEST_BOOST_CONTROLS" className="border-border mb-8">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="w-5 h-5 text-emerald-500" />
            Admin Boost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Manually activate APR boost for any user's property. This increases their yield for 90 days and earns STAY tokens.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Investor Wallet (reference only)</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono"
                placeholder="0x..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
            </div>
            <div className="w-32">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Property ID</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                placeholder="1"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              />
            </div>
            <Button
              onClick={handleBoost}
              disabled={!walletAddress || !propertyId || boosting}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white h-10"
            >
              <Rocket className="w-4 h-4" />
              {boosting ? 'Boosting...' : 'Boost User'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Boost Status Table */}
      <h2 className="text-lg font-bold text-foreground mb-4">Boost Status</h2>
      <Card className="border-border">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Property</TableHead>
                <TableHead className="text-center">Boosted</TableHead>
                <TableHead className="text-right">Base APR</TableHead>
                <TableHead className="text-right">Boosted APR</TableHead>
                <TableHead className="text-right">STAY Earned</TableHead>
                <TableHead className="text-right">Cost USDC</TableHead>
                <TableHead>Boosted Date</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boosts.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{b.user}</div>
                    <div className="text-xs text-muted-foreground">{b.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">{b.property}</TableCell>
                  <TableCell className="text-center">
                    {b.boosted ? (
                      <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-gray-400 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">{b.baseApr}%</TableCell>
                  <TableCell className="text-right text-sm">
                    <span className={cn(b.boosted && 'text-emerald-600 font-medium')}>
                      {b.boostedApr}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm">{b.stayEarned}</span>
                      {b.stayEarned > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-2"
                          disabled={claimingId === b.id || blockchainLoading}
                          onClick={() => handleClaim(b)}
                        >
                          {claimingId === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Claim'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell data-feature="ADMIN__INVEST_BOOST_COST" className="text-right text-sm">{b.costUsdc > 0 ? `$${b.costUsdc}` : '\u2014'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{b.boostedDate || '\u2014'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{b.expires || '\u2014'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
