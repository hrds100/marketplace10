import { useState } from 'react';
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
import { mockPayouts, mockPortfolio } from '@/data/investMockData';

type ClaimMethod = 'bank_transfer' | 'usdc' | 'stay_token' | 'lp_token';
type ClaimStep = 'choose' | 'processing' | 'success';
type PayoutStatus = 'claimable' | 'claimed' | 'paid' | 'processing';

interface PayoutItem {
  id: string;
  propertyTitle: string;
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
    description: 'Withdraw directly to your bank account. Funds arrive in 2-3 business days.',
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
    description: 'Swap your yield into STAY tokens.',
    icon: Coins,
  },
  {
    key: 'lp_token',
    label: 'LP Token',
    description: 'Deposit into the liquidity farm for compounding returns.',
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout: PayoutItem | null;
  claimStep: ClaimStep;
  setClaimStep: (step: ClaimStep) => void;
  selectedMethod: ClaimMethod | null;
  setSelectedMethod: (method: ClaimMethod | null) => void;
}) {
  if (!payout) return null;

  const handleContinue = () => {
    if (!selectedMethod) return;
    setClaimStep('processing');
    setTimeout(() => {
      setClaimStep('success');
    }, 2000);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setClaimStep('choose');
      setSelectedMethod(null);
    }, 200);
  };

  const successMessages: Record<ClaimMethod, string> = {
    bank_transfer:
      "Your bank transfer is being processed. You'll receive funds within 2-3 business days.",
    usdc: 'USDC has been sent to your wallet.',
    stay_token: 'STAY tokens have been sent to your wallet.',
    lp_token: 'LP tokens have been deposited into your farm.',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {claimStep === 'choose' && 'Claim Rental Income'}
            {claimStep === 'processing' && 'Processing Claim'}
            {claimStep === 'success' && 'Claim Successful'}
          </DialogTitle>
          <DialogDescription>
            {claimStep === 'choose' && `${payout.propertyTitle} — ${formatCurrency(payout.amount)}`}
            {claimStep === 'processing' && 'Please wait while we process your claim.'}
            {claimStep === 'success' && 'Your claim has been completed.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Choose Method */}
        {claimStep === 'choose' && (
          <div className="space-y-3 py-2">
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

        {/* Step 2: Processing */}
        {claimStep === 'processing' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Claiming your rental income...</p>
            <p className="text-xs text-muted-foreground/60">
              {formatCurrency(payout.amount)} via {selectedMethod ? methodLabels[selectedMethod] : ''}
            </p>
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

// ─── Property Images ────────────────────────────────────────────────────────────

const payoutPropertyImages: Record<number, string> = {
  1: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=200&q=80',
  2: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=200&q=80',
};

// ─── Main Page Component ─────────────────────────────────────────────────────────

export default function InvestPayoutsPage() {
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutItem | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<ClaimMethod | null>(null);
  const [claimStep, setClaimStep] = useState<ClaimStep>('choose');

  const payouts = mockPayouts as PayoutItem[];

  const handleClaim = (payout: PayoutItem) => {
    setSelectedPayout(payout);
    setSelectedMethod(null);
    setClaimStep('choose');
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
      </div>

      {/* Content */}
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
                <span className="text-muted-foreground">Available to Claim</span>
                <span className="font-bold text-green-500">{formatCurrency(totalClaimable)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Earned</span>
                <span className="font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</span>
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
                        <img
                          src={payoutPropertyImages[payout.propertyId] || ''}
                          alt={payout.propertyTitle}
                          className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                        />
                        <div>
                          <p className="font-medium">{payout.propertyTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payout.date)} &middot; {payout.sharesOwned} shares
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.2)]">
                          Claimable
                        </Badge>
                        <p className="text-lg font-bold text-green-500 whitespace-nowrap">
                          {formatCurrency(payout.amount)}
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
                          <img
                            src={payoutPropertyImages[payout.propertyId] || ''}
                            alt={payout.propertyTitle}
                            className="h-8 w-8 rounded object-cover flex-shrink-0"
                          />
                          <span className="font-medium">{payout.propertyTitle}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono">
                        {formatCurrency(payout.amount)}
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

      {/* Claim Modal (shared) */}
      <ClaimModal
        open={claimModalOpen}
        onOpenChange={setClaimModalOpen}
        payout={selectedPayout}
        claimStep={claimStep}
        setClaimStep={setClaimStep}
        selectedMethod={selectedMethod}
        setSelectedMethod={setSelectedMethod}
      />
    </div>
  );
}
