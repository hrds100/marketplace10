import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { sendInvestNotification } from '@/lib/notifications';
import { useMyBankAccount } from '@/hooks/useInvestData';
import { usePayoutsWithBlockchain } from '@/hooks/usePayoutsWithBlockchain';
import { useBlockchain } from '@/hooks/useBlockchain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  CheckCircle2,
  Landmark,
  Wallet,
  Coins,
  Sprout,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fixIpfsUrl } from '@/lib/ipfs';
import BankDetailsForm from '@/components/BankDetailsForm';

type ClaimMethod = 'bank_transfer' | 'usdc' | 'stay_token' | 'lp_token';
type ClaimStep = 'choose' | 'bank_setup' | 'processing' | 'success';
type PayoutStatus = 'claimable' | 'claimed' | 'paid' | 'processing';

interface PayoutItem {
  id: string;
  propertyTitle: string;
  propertyImage: string;
  propertyId: number;
  date: string;
  sharesOwned: number;
  amount: number;
  currency: string;
  status: PayoutStatus;
  method: string | null;
  txHash?: string;
}

const statusConfig: Record<PayoutStatus, { label: string; variant: string; className: string }> = {
  claimable: { label: 'Claimable', variant: 'default', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  claimed: { label: 'Claimed', variant: 'default', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  paid: { label: 'Paid', variant: 'default', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  processing: { label: 'Processing', variant: 'default', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
};

const methodLabels: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  usdc: 'USDC',
  stay_token: 'STAY Token',
  lp_token: 'LP Token',
};

const claimMethods: { key: ClaimMethod; label: string; description: string; icon: typeof Landmark; recommended?: boolean }[] = [
  {
    key: 'bank_transfer',
    label: 'Bank Transfer',
    description: 'Withdraw directly to your bank account. Funds arrive next Tuesday morning (weekly Revolut batch).',
    icon: Landmark,
    recommended: true,
  },
  {
    key: 'usdc',
    label: 'USDC',
    description: 'Send USDC directly to your connected wallet.',
    icon: Wallet,
  },
  {
    key: 'stay_token',
    label: 'STAY Token',
    description: 'Claim as USDC, then swap to STAY on PancakeSwap.',
    icon: Coins,
  },
  {
    key: 'lp_token',
    label: 'LP Token',
    description: 'Claim as USDC, then add liquidity on PancakeSwap for compounding.',
    icon: Sprout,
  },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function BlockchainDot({ tooltip }: { tooltip?: string }) {
  return (
    <span className="relative inline-flex ml-1" title={tooltip || 'From blockchain'}>
      <span className="h-1 w-1 rounded-full bg-green-500" />
      <span className="absolute h-1 w-1 rounded-full bg-green-500 animate-ping opacity-50" />
    </span>
  );
}

function StatusBadge({ status }: { status: PayoutStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}

// ─── Claim Modal ────────────────────────────────────────────────────────────────

function ClaimModal({
  open,
  onOpenChange,
  payout,
  claimStep,
  setClaimStep,
  selectedMethod,
  setSelectedMethod,
  claimTxHash,
  setClaimTxHash,
  claimError,
  setClaimError,
  bankAccount,
  user,
  onClaimRent,
  onBuyStayTokens,
  onBuyLpTokens,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout: PayoutItem | null;
  claimStep: ClaimStep;
  setClaimStep: (step: ClaimStep) => void;
  selectedMethod: ClaimMethod | null;
  setSelectedMethod: (method: ClaimMethod | null) => void;
  claimTxHash: string | null;
  setClaimTxHash: (hash: string | null) => void;
  claimError: string | null;
  setClaimError: (err: string | null) => void;
  bankAccount: Record<string, unknown> | null;
  user: { id: string; email?: string } | null;
  onClaimRent?: (propertyId: number) => Promise<{ txHash: string; success: boolean }>;
  onBuyStayTokens?: (propertyId: number) => Promise<{ txHash: string; success: boolean }>;
  onBuyLpTokens?: (propertyId: number) => Promise<{ txHash: string; success: boolean }>;
}) {
  if (!payout) return null;

  const handleContinue = async () => {
    if (!selectedMethod) return;
    setClaimError(null);

    if (selectedMethod === 'bank_transfer' && !bankAccount) {
      // No bank details on file — show setup form before proceeding
      setClaimStep('bank_setup');
      return;
    }

    setClaimStep('processing');

    if (selectedMethod === 'bank_transfer') {
      try {
        const { data, error } = await supabase.functions.invoke('submit-payout-claim', {
          body: {
            user_id: user?.id,
            user_type: 'investor',
            currency: 'GBP',
          },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        setClaimStep('success');
        sendInvestNotification({
          type: 'rent_claimed',
          user_id: user?.id,
          user_name: user?.email?.split('@')[0] || 'Investor',
          amount: payout.amount || 0,
          property: payout.propertyTitle || '',
        });
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : 'Bank transfer failed. Please try again.');
        setClaimStep('choose');
      }
    } else if (selectedMethod === 'usdc' && payout && onClaimRent) {
      try {
        const result = await onClaimRent(payout.propertyId);
        setClaimTxHash(result.txHash || null);
        setClaimStep('success');
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : 'Claim failed. Check your wallet and try again.');
        setClaimStep('choose');
      }
    } else if (selectedMethod === 'stay_token' && payout && onBuyStayTokens) {
      // buyStayTokens handles withdraw + approve + swap internally — do NOT call onClaimRent first
      try {
        const result = await onBuyStayTokens(payout.propertyId);
        setClaimTxHash(result.txHash || null);
        setClaimStep('success');
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : 'STAY token claim failed. Check your wallet and try again.');
        setClaimStep('choose');
      }
    } else if (selectedMethod === 'lp_token' && payout && onBuyLpTokens) {
      // buyLpTokens handles withdraw + approve + swap internally — do NOT call onClaimRent first
      try {
        const result = await onBuyLpTokens(payout.propertyId);
        setClaimTxHash(result.txHash || null);
        setClaimStep('success');
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : 'LP token claim failed. Check your wallet and try again.');
        setClaimStep('choose');
      }
    } else {
      setClaimStep('choose');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setClaimStep('choose');
      setSelectedMethod(null);
      setClaimTxHash(null);
      setClaimError(null);
    }, 200);
  };

  const PANCAKESWAP_STAY_URL = 'https://pancakeswap.finance/swap?outputCurrency=0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0';
  const PANCAKESWAP_LP_URL = 'https://pancakeswap.finance/add/0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d/0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0';

  const successMessages: Record<ClaimMethod, string | React.ReactNode> = {
    bank_transfer:
      "Your bank transfer is being processed. You'll receive funds next Tuesday morning (weekly Revolut batch).",
    usdc: 'USDC has been sent to your wallet.',
    stay_token: 'USDC claimed to your wallet. Swap to STAY tokens on PancakeSwap.',
    lp_token: 'USDC claimed to your wallet. Add liquidity on PancakeSwap to compound returns.',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {claimStep === 'choose' && 'Claim Rental Income'}
            {claimStep === 'bank_setup' && 'Add Bank Details'}
            {claimStep === 'processing' && 'Processing Claim'}
            {claimStep === 'success' && 'Claim Successful'}
          </DialogTitle>
          <DialogDescription>
            {claimStep === 'choose' && `${payout.propertyTitle} — ${formatCurrency(payout.amount)}`}
            {claimStep === 'bank_setup' && 'We need your bank details before processing your payout.'}
            {claimStep === 'processing' && 'Please wait while we process your claim.'}
            {claimStep === 'success' && 'Your claim has been completed.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Choose Method */}
        {claimStep === 'choose' && (
          <div className="space-y-3 py-2">
            {claimError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
                <p className="text-xs text-destructive leading-relaxed">{claimError}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Choose how you'd like to receive your payout:
            </p>
            <div className="space-y-2">
              {claimMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.key;
                return (
                  <button
                    key={method.key}
                    onClick={() => setSelectedMethod(method.key)}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/50'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50',
                      method.recommended && !isSelected && 'border-primary/30 bg-primary/[0.02]'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{method.label}</span>
                        {method.recommended && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30"
                          >
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {method.description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'mt-1 h-4 w-4 shrink-0 rounded-full border-2 transition-colors',
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                      )}
                    >
                      {isSelected && (
                        <div className="h-full w-full flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1b: Bank Setup (no bank account on file) */}
        {claimStep === 'bank_setup' && (
          <div className="py-2">
            <BankDetailsForm
              onSave={() => {
                // After bank details saved, proceed straight to the claim
                setClaimStep('processing');
                setClaimError(null);
                supabase.functions
                  .invoke('submit-payout-claim', {
                    body: { user_id: user?.id, user_type: 'investor', currency: 'GBP' },
                  })
                  .then(({ data, error }) => {
                    if (error) throw new Error(error.message);
                    if (data?.error) throw new Error(data.error);
                    setClaimStep('success');
                    sendInvestNotification({
                      type: 'rent_claimed',
                      user_id: user?.id,
                      user_name: user?.email?.split('@')[0] || 'Investor',
                      amount: payout.amount || 0,
                      property: payout.propertyTitle || '',
                    });
                  })
                  .catch((err: unknown) => {
                    setClaimError(err instanceof Error ? err.message : 'Bank transfer failed. Please try again.');
                    setClaimStep('choose');
                  });
              }}
            />
          </div>
        )}

        {/* Step 2: Processing */}
        {claimStep === 'processing' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Claiming your rental income...</p>
            <p className="text-xs text-muted-foreground/60">
              {formatCurrency(payout.amount)} via {selectedMethod ? methodLabels[selectedMethod] : ''}
            </p>
            {selectedMethod !== 'bank_transfer' && (
              <p className="text-xs text-muted-foreground/50 text-center max-w-xs">
                Approve the transaction(s) in your Particle wallet to continue.
              </p>
            )}
          </div>
        )}

        {/* Step 3: Success */}
        {claimStep === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-lg font-semibold">
              {formatCurrency(payout.amount)} claimed successfully
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
              {selectedMethod ? successMessages[selectedMethod] : ''}
            </p>
            {claimTxHash && (
              <p className="text-xs text-muted-foreground font-mono break-all text-center max-w-xs">
                Tx: {claimTxHash}
              </p>
            )}
            {selectedMethod === 'stay_token' && (
              <a
                href={PANCAKESWAP_STAY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Swap on PancakeSwap &rarr;
              </a>
            )}
            {selectedMethod === 'lp_token' && (
              <a
                href={PANCAKESWAP_LP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Add Liquidity on PancakeSwap &rarr;
              </a>
            )}
          </div>
        )}

        <DialogFooter>
          {claimStep === 'choose' && (
            <div className="flex w-full gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleContinue} disabled={!selectedMethod} className="flex-1">
                Continue
              </Button>
            </div>
          )}
          {claimStep === 'success' && (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Property Image helpers ─────────────────────────────────────────────────

const PROPERTY_PLACEHOLDER_IMAGE = '/placeholder.svg';

/** Fix IPFS gateway URLs before returning */
function resolveImageUrl(url: string): string {
  if (!url) return PROPERTY_PLACEHOLDER_IMAGE;
  return fixIpfsUrl(url);
}

/** Fallback component: shows property initials on image error */
function PropertyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [errored, setErrored] = useState(false);
  const resolved = resolveImageUrl(src);
  const initials = alt
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (errored || !resolved || resolved === PROPERTY_PLACEHOLDER_IMAGE) {
    return (
      <div className={cn('flex items-center justify-center bg-muted text-muted-foreground font-bold text-sm rounded-lg', className)}>
        {initials || '?'}
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────────

export default function InvestPayoutsPage() {
  const { user } = useAuth();
  const { payouts: mergedPayouts, blockchainLoading } = usePayoutsWithBlockchain();
  const { data: bankAccount } = useMyBankAccount();
  const { claimRent, buyStayTokens, buyLpTokens, loading: claimLoading } = useBlockchain();

  // F4: Fetch payout_claims from Supabase for history amount fallback
  const [dbPayoutClaims, setDbPayoutClaims] = useState<any[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    (supabase.from('payout_claims') as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: any[] | null }) => {
        if (data) setDbPayoutClaims(data);
      });
  }, [user?.id]);

  // Map merged payouts to PayoutItem[]
  // F4: For history rows where blockchain amount is 0, try to find a matching payout_claims row
  const payouts: PayoutItem[] = mergedPayouts.map((p) => {
    let amount = p.amount;
    if (amount === 0 && p.status !== 'claimable') {
      // Try to match by same-day date in payout_claims
      const pDate = p.date ? p.date.slice(0, 10) : null;
      const match = pDate
        ? dbPayoutClaims.find((c) => c.created_at && c.created_at.slice(0, 10) === pDate)
        : undefined;
      if (match) {
        amount = Number(match.amount_entitled || 0);
      }
    }
    return {
      id: p.id,
      propertyTitle: p.propertyTitle,
      propertyImage: p.propertyImage,
      propertyId: p.propertyId,
      date: p.date,
      sharesOwned: p.sharesOwned,
      amount,
      currency: p.currency,
      status: p.status,
      method: p.method,
      txHash: p.txHash,
    };
  });

  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutItem | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<ClaimMethod | null>(null);
  const [claimStep, setClaimStep] = useState<ClaimStep>('choose');
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const handleClaim = (payout: PayoutItem) => {
    setSelectedPayout(payout);
    setSelectedMethod('bank_transfer');
    setClaimStep('choose');
    setClaimTxHash(null);
    setClaimError(null);
    setClaimModalOpen(true);
  };

  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);
  const history = payouts.filter((p) => p.status !== 'claimable');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Claim your rental income and view payment history.
        </p>
        {blockchainLoading && (
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading on-chain rent data...</span>
          </div>
        )}
      </div>

      {payouts.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="py-16 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No payouts yet. Rental income will appear here when available.</p>
          </CardContent>
        </Card>
      ) : (

      /* Content */
      <div className="flex gap-6">
        {/* Left sticky sidebar */}
        <div className="w-80 flex-shrink-0 space-y-4 sticky top-6 self-start">
          {/* Payout Summary Card */}
          <Card className="border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
                Payout Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available to Claim<BlockchainDot tooltip="Claimable amount from blockchain" /></span>
                <span className="font-bold text-green-500">{formatCurrency(totalClaimable)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Earned</span>
                <span className="font-bold">{formatCurrency(payouts.reduce((sum, p) => sum + p.amount, 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending Items</span>
                <span className="font-bold">{claimable.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Claim Buttons */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Claim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {claimable.map((p) => (
                <Button
                  key={p.id}
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => handleClaim(p)}
                >
                  <span className="truncate">{p.propertyTitle}</span>
                  <span className="text-green-500 font-bold">{formatCurrency(p.amount)}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right main area */}
        <div className="flex-1 space-y-6">
          {/* Claimable Payouts Section */}
          <h2 className="text-xl font-bold">Claimable Payouts</h2>
          <div className="space-y-3">
            {claimable.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No payouts available to claim right now.
                </CardContent>
              </Card>
            ) : (
              claimable.map((payout) => (
                <Card key={payout.id} className="border-green-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <PropertyImage
                          src={payout.propertyImage}
                          alt={payout.propertyTitle}
                          className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                        />
                        <div>
                          <p className="font-medium">{payout.propertyTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payout.date)} &middot; {payout.sharesOwned} shares<BlockchainDot tooltip="Share count from blockchain" />
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.2)]">
                          Claimable
                        </Badge>
                        <p className="text-lg font-bold text-green-500 whitespace-nowrap">
                          {formatCurrency(payout.amount)}<BlockchainDot tooltip="Amount from blockchain" />
                        </p>
                        <Button size="sm" onClick={() => handleClaim(payout)}>
                          Claim
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* History Table */}
          <h2 className="text-xl font-bold">History</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="text-sm">{formatDate(payout.date)}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <PropertyImage
                            src={payout.propertyImage}
                            alt={payout.propertyTitle}
                            className="h-8 w-8 rounded object-cover flex-shrink-0"
                          />
                          <span className="font-medium">{payout.propertyTitle}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono">
                        {payout.amount > 0 ? formatCurrency(payout.amount) : '\u2014'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {payout.method ? methodLabels[payout.method] || payout.method : '\u2014'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payout.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {/* Claim Modal (shared) */}
      <ClaimModal
        open={claimModalOpen}
        onOpenChange={setClaimModalOpen}
        payout={selectedPayout}
        claimStep={claimStep}
        setClaimStep={setClaimStep}
        selectedMethod={selectedMethod}
        setSelectedMethod={setSelectedMethod}
        claimTxHash={claimTxHash}
        setClaimTxHash={setClaimTxHash}
        claimError={claimError}
        setClaimError={setClaimError}
        bankAccount={bankAccount ?? null}
        user={user}
        onClaimRent={claimRent}
        onBuyStayTokens={buyStayTokens}
        onBuyLpTokens={buyLpTokens}
      />
    </div>
  );
}
