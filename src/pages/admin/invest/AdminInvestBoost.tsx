import { useState } from 'react';
import { useInvestProperties } from '@/hooks/useInvestData';
import { Rocket, Check, X } from 'lucide-react';
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

const initialBoosts: BoostEntry[] = [
  { id: 'b1', user: 'Hugo Souza', email: 'hugo@nfstay.com', property: 'Seseh Beachfront Villa', propertyId: 1, boosted: true, baseApr: 12.4, boostedApr: 18.6, stayEarned: 245, costUsdc: 50, boostedDate: '2026-03-01', expires: '2026-06-01' },
  { id: 'b2', user: 'John Smith', email: 'john@gmail.com', property: 'Marina Gate Apartment', propertyId: 2, boosted: true, baseApr: 9.8, boostedApr: 14.7, stayEarned: 180, costUsdc: 75, boostedDate: '2026-02-15', expires: '2026-05-15' },
  { id: 'b3', user: 'Sarah Chen', email: 'sarah@outlook.com', property: 'Seseh Beachfront Villa', propertyId: 1, boosted: false, baseApr: 12.4, boostedApr: 12.4, stayEarned: 0, costUsdc: 0, boostedDate: '', expires: '' },
  { id: 'b4', user: 'Ahmed Ali', email: 'ahmed@yahoo.com', property: 'KAEC Waterfront Residence', propertyId: 3, boosted: true, baseApr: 14.2, boostedApr: 21.3, stayEarned: 320, costUsdc: 60, boostedDate: '2026-03-10', expires: '2026-06-10' },
  { id: 'b5', user: 'Maria Garcia', email: 'maria@gmail.com', property: 'Marina Gate Apartment', propertyId: 2, boosted: false, baseApr: 9.8, boostedApr: 9.8, stayEarned: 0, costUsdc: 0, boostedDate: '', expires: '' },
  { id: 'b6', user: 'David Park', email: 'david@proton.me', property: 'KAEC Waterfront Residence', propertyId: 3, boosted: false, baseApr: 14.2, boostedApr: 14.2, stayEarned: 0, costUsdc: 0, boostedDate: '', expires: '' },
];

export default function AdminInvestBoost() {
  const { data: realProperties = [] } = useInvestProperties();

  const [boosts, setBoosts] = useState<BoostEntry[]>(initialBoosts);
  const [walletAddress, setWalletAddress] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [boosting, setBoosting] = useState(false);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());

  const handleBoost = () => {
    if (!walletAddress || !propertyId) return;
    setBoosting(true);
    setTimeout(() => {
      setBoosting(false);
      setWalletAddress('');
      setPropertyId('');
    }, 1500);
  };

  const handleClaim = (id: string) => {
    setClaimed((prev) => new Set([...prev, id]));
  };

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Boost Management</h1>

      {/* Admin Boost Card */}
      <Card className="border-border mb-8">
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
              <label className="text-sm font-medium text-foreground mb-1.5 block">Wallet Address</label>
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
                      {b.stayEarned > 0 && !claimed.has(b.id) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => handleClaim(b.id)}
                        >
                          Claim
                        </Button>
                      )}
                      {claimed.has(b.id) && (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          Claimed
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">{b.costUsdc > 0 ? `$${b.costUsdc}` : '\u2014'}</TableCell>
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
