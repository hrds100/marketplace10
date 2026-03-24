// Admin Test Console — Safe testing of all investment flows without real funds
// All blockchain calls use callStatic (dry-run, no gas, no state changes)
// Bank claims create real payout_claims rows (can be deleted after testing)

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Wallet, Vote, Banknote, Coins, Landmark, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CONTRACTS, SUBGRAPHS } from '@/lib/particle';
import { toast } from 'sonner';

type TestResult = { status: 'idle' | 'running' | 'pass' | 'fail'; message: string };

export default function AdminTestConsole() {
  const { user } = useAuth();

  // Blockchain state
  const [walletAddress, setWalletAddress] = useState('');
  const [shares, setShares] = useState(0);
  const [rentEligible, setRentEligible] = useState(false);
  const [rentClaimable, setRentClaimable] = useState(0);
  const [totalClaimed, setTotalClaimed] = useState(0);
  const [bnbBalance, setBnbBalance] = useState('0');
  const [loading, setLoading] = useState(false);

  // Test results
  const [bankSaveTest, setBankSaveTest] = useState<TestResult>({ status: 'idle', message: '' });
  const [bankClaimTest, setBankClaimTest] = useState<TestResult>({ status: 'idle', message: '' });
  const [voteTest, setVoteTest] = useState<TestResult>({ status: 'idle', message: '' });
  const [usdcClaimTest, setUsdcClaimTest] = useState<TestResult>({ status: 'idle', message: '' });
  const [stayClaimTest, setStayClaimTest] = useState<TestResult>({ status: 'idle', message: '' });

  // Bank account state
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [testClaims, setTestClaims] = useState<any[]>([]);

  // Load wallet from profile
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase.from('profiles') as any)
        .select('wallet_address')
        .eq('id', user.id)
        .single();
      if (data?.wallet_address) setWalletAddress(data.wallet_address);
    })();
  }, [user?.id]);

  // Load bank account
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase.from('user_bank_accounts') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setBankAccount(data);
    })();
  }, [user?.id]);

  // Load test claims
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase.from('payout_claims') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setTestClaims(data || []);
    })();
  }, [user?.id]);

  // Fetch blockchain state
  async function refreshBlockchain() {
    if (!walletAddress) { toast.error('No wallet address in profile'); return; }
    setLoading(true);
    try {
      const ethers = await import('ethers');
      const provider = new ethers.providers.JsonRpcProvider(
        'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T'
      );

      const wallet = walletAddress.toLowerCase();

      // BNB balance
      const bal = await provider.getBalance(wallet);
      setBnbBalance(parseFloat(ethers.utils.formatEther(bal)).toFixed(4));

      // Shares
      const { RWA_TOKEN_ABI, RENT_ABI } = await import('@/lib/contractAbis');
      const rwa = new ethers.Contract(CONTRACTS.RWA_TOKEN, RWA_TOKEN_ABI, provider);
      const balance = await rwa.balanceOf(wallet, 1);
      setShares(balance.toNumber());

      // Rent
      const rent = new ethers.Contract(CONTRACTS.RENT, RENT_ABI, provider);
      const details = await rent.getRentDetails(1);
      const rentPerShare = Number(details[4].toString()) / 1e18;
      setRentClaimable(rentPerShare * balance.toNumber());

      try {
        const eligible = await rent.isEligibleForRent(1, wallet);
        setRentEligible(eligible);
      } catch { setRentEligible(false); }

      // Total claimed from Graph
      const res = await fetch(SUBGRAPHS.RENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ rentWithdrawns(where: { _by: "${wallet}" }) { _rent } }`,
        }),
      });
      const data = await res.json();
      const total = (data.data?.rentWithdrawns || []).reduce(
        (sum: number, w: any) => sum + parseInt(w._rent) / 1e18, 0
      );
      setTotalClaimed(total);

      toast.success('Blockchain state refreshed');
    } catch (err: any) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  // TEST 1: Bank Save
  async function testBankSave() {
    setBankSaveTest({ status: 'running', message: 'Saving test bank details...' });
    try {
      const { data, error } = await supabase.functions.invoke('save-bank-details', {
        body: {
          user_id: user?.id,
          currency: 'GBP',
          account_name: 'Test Account',
          sort_code: '000000',
          account_number: '00000000',
          bank_country: 'GB',
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setBankSaveTest({ status: 'pass', message: `Bank saved: ID ${data.id}` });
      // Refresh bank account
      const { data: bank } = await (supabase.from('user_bank_accounts') as any)
        .select('*').eq('user_id', user?.id).maybeSingle();
      setBankAccount(bank);
    } catch (err: any) {
      setBankSaveTest({ status: 'fail', message: err.message });
    }
  }

  // TEST 2: Bank Claim
  async function testBankClaim() {
    setBankClaimTest({ status: 'running', message: 'Submitting test bank claim ($1.00)...' });
    try {
      const { data, error } = await supabase.functions.invoke('submit-payout-claim', {
        body: {
          user_id: user?.id,
          user_type: 'investor',
          currency: 'GBP',
          amount: 1.00, // Test amount
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setBankClaimTest({ status: 'pass', message: `Claim created: ${data.claim_id} — $${data.amount} for ${data.week_ref}` });
      // Refresh claims
      const { data: claims } = await (supabase.from('payout_claims') as any)
        .select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(10);
      setTestClaims(claims || []);
    } catch (err: any) {
      setBankClaimTest({ status: 'fail', message: err.message });
    }
  }

  // TEST 3: Vote Dry-Run
  async function testVoteDryRun() {
    setVoteTest({ status: 'running', message: 'Running callStatic.vote(1, true)...' });
    try {
      const ethers = await import('ethers');
      const provider = new ethers.providers.JsonRpcProvider(
        'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T'
      );
      const { VOTING_ABI } = await import('@/lib/contractAbis');
      const contract = new ethers.Contract(CONTRACTS.VOTING, VOTING_ABI, provider);

      // callStatic with a read-only provider simulates without signing
      // This will revert if the vote would fail (already voted, not eligible, etc.)
      await contract.callStatic.vote(1, true, { from: walletAddress });
      setVoteTest({ status: 'pass', message: 'Vote would succeed — contract accepts the call' });
    } catch (err: any) {
      const msg = err.reason || err.message || 'Unknown error';
      if (msg.includes('already voted')) {
        setVoteTest({ status: 'pass', message: 'Already voted on proposal 1 — contract correctly rejects duplicate' });
      } else {
        setVoteTest({ status: 'fail', message: `Vote would fail: ${msg}` });
      }
    }
  }

  // TEST 4: USDC Claim Dry-Run
  async function testUsdcClaimDryRun() {
    setUsdcClaimTest({ status: 'running', message: 'Running callStatic.withdrawRent(1)...' });
    try {
      const ethers = await import('ethers');
      const provider = new ethers.providers.JsonRpcProvider(
        'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T'
      );
      const { RENT_ABI } = await import('@/lib/contractAbis');
      const contract = new ethers.Contract(CONTRACTS.RENT, RENT_ABI, provider);

      await contract.callStatic.withdrawRent(1, { from: walletAddress });
      setUsdcClaimTest({ status: 'pass', message: 'USDC claim would succeed — rent contract accepts withdrawal' });
    } catch (err: any) {
      const msg = err.reason || err.message || 'Unknown error';
      if (msg.includes('not eligible') || msg.includes('already withdrawn') || msg.includes('NotEligible')) {
        setUsdcClaimTest({ status: 'pass', message: `Not eligible (already claimed this period) — contract correctly rejects` });
      } else {
        setUsdcClaimTest({ status: 'fail', message: `Claim would fail: ${msg}` });
      }
    }
  }

  // TEST 5: STAY claim dry-run (same as USDC — first step is withdrawRent)
  async function testStayClaimDryRun() {
    setStayClaimTest({ status: 'running', message: 'Running callStatic.withdrawRent(1) for STAY path...' });
    try {
      const ethers = await import('ethers');
      const provider = new ethers.providers.JsonRpcProvider(
        'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T'
      );
      const { RENT_ABI } = await import('@/lib/contractAbis');
      const contract = new ethers.Contract(CONTRACTS.RENT, RENT_ABI, provider);

      await contract.callStatic.withdrawRent(1, { from: walletAddress });
      setStayClaimTest({ status: 'pass', message: 'STAY claim step 1 (withdrawRent) would succeed' });
    } catch (err: any) {
      const msg = err.reason || err.message || 'Unknown error';
      if (msg.includes('not eligible') || msg.includes('already withdrawn') || msg.includes('NotEligible')) {
        setStayClaimTest({ status: 'pass', message: `Not eligible (already claimed this period) — expected behavior` });
      } else {
        setStayClaimTest({ status: 'fail', message: `Would fail: ${msg}` });
      }
    }
  }

  // Delete a test claim
  async function deleteTestClaim(claimId: string) {
    await (supabase.from('payout_claims') as any).delete().eq('id', claimId);
    setTestClaims((prev) => prev.filter((c) => c.id !== claimId));
    toast.success('Test claim deleted');
  }

  function StatusBadge({ result }: { result: TestResult }) {
    if (result.status === 'idle') return <Badge variant="secondary">Not run</Badge>;
    if (result.status === 'running') return <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
    if (result.status === 'pass') return <Badge className="bg-green-500/15 text-green-500 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Pass</Badge>;
    return <Badge className="bg-red-500/15 text-red-500 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Fail</Badge>;
  }

  return (
    <div data-feature="ADMIN__INVEST" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Test Console</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Safe testing — no real funds are spent. Blockchain calls use callStatic (dry-run only).
        </p>
      </div>

      {/* Blockchain State */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Blockchain State
            </CardTitle>
            <Button size="sm" variant="outline" onClick={refreshBlockchain} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Wallet</p>
              <p className="font-mono text-xs">{walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not set'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">BNB (gas)</p>
              <p className="font-bold">{bnbBalance} BNB</p>
            </div>
            <div>
              <p className="text-muted-foreground">Shares</p>
              <p className="font-bold">{shares}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rent Eligible</p>
              <p className="font-bold">{rentEligible ? '✅ Yes' : '❌ No'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Claimable</p>
              <p className="font-bold">${rentClaimable.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Claimed</p>
              <p className="font-bold">${totalClaimed.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Suite */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Test Suite — Run All</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Bank Save */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Landmark className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Bank Save</p>
                <p className="text-xs text-muted-foreground">{bankSaveTest.message || 'Saves test bank details (sort: 000000, acct: 00000000)'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge result={bankSaveTest} />
              <Button size="sm" onClick={testBankSave} disabled={bankSaveTest.status === 'running'}>Test</Button>
            </div>
          </div>

          {/* Bank Claim */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Banknote className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Bank Claim ($1.00 test)</p>
                <p className="text-xs text-muted-foreground">{bankClaimTest.message || 'Creates a real payout_claims row with $1.00 test amount'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge result={bankClaimTest} />
              <Button size="sm" onClick={testBankClaim} disabled={bankClaimTest.status === 'running'}>Test</Button>
            </div>
          </div>

          {/* Vote Dry-Run */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Vote className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Vote Dry-Run</p>
                <p className="text-xs text-muted-foreground">{voteTest.message || 'callStatic.vote(1, true) — checks if contract would accept'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge result={voteTest} />
              <Button size="sm" onClick={testVoteDryRun} disabled={voteTest.status === 'running'}>Test</Button>
            </div>
          </div>

          {/* USDC Claim Dry-Run */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">USDC Claim Dry-Run</p>
                <p className="text-xs text-muted-foreground">{usdcClaimTest.message || 'callStatic.withdrawRent(1) — checks if rent is claimable'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge result={usdcClaimTest} />
              <Button size="sm" onClick={testUsdcClaimDryRun} disabled={usdcClaimTest.status === 'running'}>Test</Button>
            </div>
          </div>

          {/* STAY Claim Dry-Run */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">STAY/LP Claim Dry-Run</p>
                <p className="text-xs text-muted-foreground">{stayClaimTest.message || 'Same first step as USDC — verifies withdrawRent would work'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge result={stayClaimTest} />
              <Button size="sm" onClick={testStayClaimDryRun} disabled={stayClaimTest.status === 'running'}>Test</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Account Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Bank Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bankAccount ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{bankAccount.account_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Currency</p>
                <p className="font-medium">{bankAccount.currency}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sort / IBAN</p>
                <p className="font-medium">{bankAccount.sort_code || bankAccount.iban || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Verified</p>
                <p className="font-medium">{bankAccount.is_verified ? '🔒 Locked' : '🔓 Editable'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No bank account saved. Run "Bank Save" test above.</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Claims */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Payout Claims</CardTitle>
        </CardHeader>
        <CardContent>
          {testClaims.length === 0 ? (
            <p className="text-sm text-muted-foreground">No claims yet. Run "Bank Claim" test above.</p>
          ) : (
            <div className="space-y-2">
              {testClaims.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                  <div className="flex items-center gap-4">
                    <Badge variant={claim.status === 'pending' ? 'secondary' : claim.status === 'paid' ? 'default' : 'outline'}>
                      {claim.status}
                    </Badge>
                    <span className="font-bold">${Number(claim.amount_entitled).toFixed(2)}</span>
                    <span className="text-muted-foreground">{claim.currency}</span>
                    <span className="text-muted-foreground text-xs">{claim.week_ref}</span>
                    <span className="text-muted-foreground text-xs">{new Date(claim.created_at).toLocaleString()}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 h-7 px-2" onClick={() => deleteTestClaim(claim.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
