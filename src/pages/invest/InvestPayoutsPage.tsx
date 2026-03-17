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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Landmark,
  Wallet,
  Coins,
  Sprout,
  Loader2,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Circle,
  TrendingUp,
  CalendarDays,
  BadgeCheck,
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

// ─── Version 1: Summary + Table ─────────────────────────────────────────────────

function Version1({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const history = payouts.filter((p) => p.status !== 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available to Claim</p>
                <p className="text-2xl font-bold">{formatCurrency(totalClaimable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="claimable">
        <TabsList>
          <TabsTrigger value="claimable">
            Claimable
            {claimable.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {claimable.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="claimable" className="space-y-3 mt-4">
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
                    <div>
                      <p className="font-medium">{payout.propertyTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payout.date)} &middot; {payout.sharesOwned} shares
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-500">
                          {formatCurrency(payout.amount)}
                        </p>
                        <StatusBadge status={payout.status} />
                      </div>
                      <Button size="sm" onClick={() => onClaim(payout)}>
                        Claim
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
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
                    <TableCell className="text-sm font-medium">{payout.propertyTitle}</TableCell>
                    <TableCell className="text-sm text-right font-mono">
                      {formatCurrency(payout.amount)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {payout.method ? methodLabels[payout.method] || payout.method : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payout.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Version 2: Timeline ─────────────────────────────────────────────────────────

function Version2({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);
  const lastClaimedPayout = payouts.find((p) => p.status === 'claimed' || p.status === 'paid');

  const sorted = [...payouts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Available</p>
              <p className="text-xl font-bold text-green-500">{formatCurrency(totalClaimable)}</p>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Earned</p>
              <p className="text-xl font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</p>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Claim</p>
              <p className="text-xl font-bold">
                {lastClaimedPayout ? formatDate(lastClaimedPayout.date) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

        <div className="space-y-4">
          {sorted.map((payout, index) => {
            const isClaimable = payout.status === 'claimable';
            return (
              <div key={payout.id} className="relative">
                {/* Dot */}
                <div
                  className={cn(
                    'absolute -left-5 top-4 h-3 w-3 rounded-full border-2',
                    isClaimable
                      ? 'bg-green-500 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                      : index === 0
                        ? 'bg-primary border-primary'
                        : 'bg-muted border-muted-foreground/30'
                  )}
                />

                <Card
                  className={cn(isClaimable && 'border-green-500/20 bg-green-500/[0.02]')}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{payout.propertyTitle}</p>
                          <StatusBadge status={payout.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(payout.date)}
                          </span>
                          <span>{payout.sharesOwned} shares</span>
                          {payout.method && <span>{methodLabels[payout.method] || payout.method}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p
                          className={cn(
                            'font-bold font-mono',
                            isClaimable ? 'text-green-500' : 'text-foreground'
                          )}
                        >
                          {formatCurrency(payout.amount)}
                        </p>
                        {isClaimable && (
                          <Button size="sm" onClick={() => onClaim(payout)}>
                            Claim
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Version 3: Split Cards ──────────────────────────────────────────────────────

function Version3({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const history = payouts.filter((p) => p.status !== 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top banner */}
      {totalClaimable > 0 && (
        <Card className="border-green-500/30 bg-green-500/[0.03]">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
              <p className="text-sm text-muted-foreground">
                You have{' '}
                <span className="font-bold text-green-500 text-base">
                  {formatCurrency(totalClaimable)}
                </span>{' '}
                ready to claim
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Ready to Claim */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Ready to Claim
          </h3>
          {claimable.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                No payouts to claim.
              </CardContent>
            </Card>
          ) : (
            claimable.map((payout) => (
              <Card key={payout.id} className="border-green-500/20">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold">{payout.propertyTitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(payout.date)} &middot; {payout.sharesOwned} shares
                      </p>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-bold text-green-500">
                        {formatCurrency(payout.amount)}
                      </p>
                      <Button onClick={() => onClaim(payout)} className="px-6">
                        Claim
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right: Payment History */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Payment History
          </h3>
          <Card>
            <CardContent className="pt-4 divide-y divide-border">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No past payouts.</p>
              ) : (
                history.map((payout) => (
                  <div key={payout.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{payout.propertyTitle}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(payout.date)}
                        </span>
                        <StatusBadge status={payout.status} />
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-mono font-medium">
                        {formatCurrency(payout.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payout.method ? methodLabels[payout.method] || payout.method : '—'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Version 4: Minimal Table ────────────────────────────────────────────────────

function Version4({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);
  const paidPayouts = payouts.filter((p) => p.status === 'paid' || p.status === 'claimed');

  return (
    <div className="space-y-6">
      {/* Inline metrics */}
      <div className="flex flex-wrap items-center gap-6 sm:gap-10">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Available</p>
          <p className="text-2xl font-bold text-green-500">{formatCurrency(totalClaimable)}</p>
        </div>
        <div className="h-10 w-px bg-border hidden sm:block" />
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Earned</p>
          <p className="text-2xl font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</p>
        </div>
        <div className="h-10 w-px bg-border hidden sm:block" />
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Payouts Received</p>
          <p className="text-2xl font-bold">{paidPayouts.length}</p>
        </div>
      </div>

      {/* Unified table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <div className="flex items-center gap-1 cursor-pointer select-none">
                  Date
                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1 cursor-pointer select-none">
                  Property
                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead>Shares</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center gap-1 justify-end cursor-pointer select-none">
                  Amount
                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((payout) => {
              const isClaimable = payout.status === 'claimable';
              return (
                <TableRow
                  key={payout.id}
                  className={cn(
                    isClaimable
                      ? 'border-l-2 border-l-green-500 bg-green-500/[0.02]'
                      : 'text-muted-foreground'
                  )}
                >
                  <TableCell className="text-sm">{formatDate(payout.date)}</TableCell>
                  <TableCell
                    className={cn('text-sm', isClaimable ? 'font-medium text-foreground' : '')}
                  >
                    {payout.propertyTitle}
                  </TableCell>
                  <TableCell className="text-sm">{payout.sharesOwned}</TableCell>
                  <TableCell
                    className={cn(
                      'text-sm text-right font-mono',
                      isClaimable ? 'font-bold text-green-500' : ''
                    )}
                  >
                    {formatCurrency(payout.amount)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {payout.method ? methodLabels[payout.method] || payout.method : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={payout.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {isClaimable ? (
                      <Button size="sm" variant="default" onClick={() => onClaim(payout)}>
                        Claim
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Version 5: Property Grouped ─────────────────────────────────────────────────

function Version5({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const [expandedProperties, setExpandedProperties] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    const propertyIds = [...new Set(payouts.map((p) => p.propertyId))];
    propertyIds.forEach((id) => {
      initial[id] = true;
    });
    return initial;
  });

  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);

  // Group by property
  const grouped = payouts.reduce<Record<number, { title: string; payouts: PayoutItem[] }>>(
    (acc, payout) => {
      if (!acc[payout.propertyId]) {
        acc[payout.propertyId] = { title: payout.propertyTitle, payouts: [] };
      }
      acc[payout.propertyId].payouts.push(payout);
      return acc;
    },
    {}
  );

  const holdings = mockPortfolio.holdings;

  const toggleProperty = (id: number) => {
    setExpandedProperties((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available to Claim</p>
                <p className="text-2xl font-bold">{formatCurrency(totalClaimable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property sections */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([propertyIdStr, group]) => {
          const propertyId = Number(propertyIdStr);
          const isExpanded = expandedProperties[propertyId] ?? true;
          const holding = holdings.find((h) => h.propertyId === propertyId);
          const totalFromProperty = group.payouts.reduce((sum, p) => sum + p.amount, 0);
          const hasClaimable = group.payouts.some((p) => p.status === 'claimable');

          return (
            <Card key={propertyId} className={cn(hasClaimable && 'border-green-500/15')}>
              {/* Property header / accordion trigger */}
              <button
                onClick={() => toggleProperty(propertyId)}
                className="w-full text-left"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {holding && (
                        <img
                          src={holding.image}
                          alt={group.title}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <CardTitle className="text-base">{group.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {holding?.location} &middot; Total earned:{' '}
                          <span className="font-medium text-foreground">
                            {formatCurrency(totalFromProperty)}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasClaimable && (
                        <Badge
                          variant="outline"
                          className="bg-green-500/15 text-green-400 border-green-500/30 text-xs"
                        >
                          Has claimable
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </button>

              {/* Expanded payouts */}
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="divide-y divide-border">
                    {group.payouts.map((payout) => {
                      const isClaimable = payout.status === 'claimable';
                      return (
                        <div
                          key={payout.id}
                          className={cn(
                            'flex items-center justify-between py-3',
                            isClaimable && 'bg-green-500/[0.02] -mx-6 px-6 rounded-md'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {formatDate(payout.date)}
                                </span>
                                <StatusBadge status={payout.status} />
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {payout.sharesOwned} shares
                                {payout.method &&
                                  ` · ${methodLabels[payout.method] || payout.method}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <p
                              className={cn(
                                'font-mono font-medium',
                                isClaimable ? 'text-green-500 font-bold' : ''
                              )}
                            >
                              {formatCurrency(payout.amount)}
                            </p>
                            {isClaimable && (
                              <Button size="sm" onClick={() => onClaim(payout)}>
                                Claim
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Version 6: Bento Grid ───────────────────────────────────────────────────────

function Version6({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((s, p) => s + p.amount, 0);
  const paidCount = payouts.filter((p) => p.status === 'paid' || p.status === 'claimed').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3 auto-rows-[120px]">
        {/* Available — large */}
        <div className="col-span-2 row-span-1 flex flex-col justify-center rounded-2xl bg-green-500/10 border border-green-500/20 p-5">
          <p className="text-xs text-muted-foreground">Available to Claim</p>
          <p className="text-4xl font-bold text-green-500 tracking-tight">{formatCurrency(totalClaimable)}</p>
        </div>

        {/* Total earned */}
        <div className="col-span-1 row-span-1 flex flex-col items-center justify-center rounded-2xl border bg-card p-4">
          <p className="text-2xl font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Total Earned</p>
        </div>

        {/* Payout count */}
        <div className="col-span-1 row-span-1 flex flex-col items-center justify-center rounded-2xl bg-blue-500/10 p-4">
          <p className="text-3xl font-bold text-blue-500">{paidCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Payouts Received</p>
        </div>
      </div>

      {/* Claimable cards */}
      {claimable.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {claimable.map((payout) => (
            <Card key={payout.id} className="rounded-2xl border-green-500/20">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{payout.propertyTitle}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(payout.date)} | {payout.sharesOwned} shares</p>
                  <p className="text-2xl font-bold text-green-500 mt-2">{formatCurrency(payout.amount)}</p>
                </div>
                <Button onClick={() => onClaim(payout)}>Claim</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* History list */}
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-sm">Payment History</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {payouts.filter((p) => p.status !== 'claimable').map((p) => (
            <div key={p.id} className="flex justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{p.propertyTitle}</p>
                <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
              </div>
              <div className="text-right">
                <p className="font-mono">{formatCurrency(p.amount)}</p>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Version 7: Glassmorphism ────────────────────────────────────────────────────

function Version7({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="min-h-screen rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-8 text-white">
      <h2 className="text-3xl font-bold mb-1">Payouts</h2>
      <p className="text-white/40 mb-8">Claim your rental income</p>

      <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-8 text-center mb-6">
        <p className="text-white/50 text-sm">Available to Claim</p>
        <p className="text-5xl font-bold mt-1 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]">
          {formatCurrency(totalClaimable)}
        </p>
        <p className="text-white/30 text-sm mt-2">Total earned: {formatCurrency(mockPortfolio.totalEarnings)}</p>
      </div>

      {claimable.length > 0 && (
        <div className="space-y-3 mb-8">
          {claimable.map((payout) => (
            <div key={payout.id} className="rounded-xl bg-white/10 backdrop-blur-xl border border-emerald-500/30 p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold">{payout.propertyTitle}</p>
                <p className="text-xs text-white/40">{formatDate(payout.date)} | {payout.sharesOwned} shares</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(payout.amount)}</p>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => onClaim(payout)}>
                  Claim
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-5">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-4">History</p>
        <div className="space-y-3">
          {payouts.filter((p) => p.status !== 'claimable').map((p) => (
            <div key={p.id} className="flex justify-between text-sm border-b border-white/5 pb-3 last:border-0">
              <div>
                <p>{p.propertyTitle}</p>
                <p className="text-xs text-white/30">{formatDate(p.date)}</p>
              </div>
              <p className="font-mono">{formatCurrency(p.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Version 8: Neubrutalism ─────────────────────────────────────────────────────

function Version8({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5">
      <div className="border-2 border-black bg-lime-300 p-6 shadow-[6px_6px_0px_black] rounded-lg">
        <h2 className="text-3xl font-black uppercase">PAYOUTS</h2>
        <p className="text-xl font-bold">{formatCurrency(totalClaimable)} READY TO CLAIM</p>
      </div>

      {claimable.map((payout) => (
        <div key={payout.id} className="border-2 border-black bg-yellow-300 p-5 shadow-[4px_4px_0px_black] rounded-lg flex items-center justify-between">
          <div>
            <p className="font-black uppercase">{payout.propertyTitle}</p>
            <p className="text-sm font-bold">{formatDate(payout.date)} | {payout.sharesOwned} shares</p>
            <p className="text-3xl font-black mt-1">{formatCurrency(payout.amount)}</p>
          </div>
          <button
            onClick={() => onClaim(payout)}
            className="border-2 border-black bg-pink-300 px-6 py-3 font-black uppercase shadow-[4px_4px_0px_black] rounded-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_black] transition-all"
          >
            CLAIM
          </button>
        </div>
      ))}

      <div className="border-2 border-black bg-white p-5 shadow-[4px_4px_0px_black] rounded-lg">
        <h3 className="text-xl font-black uppercase mb-3">HISTORY</h3>
        {payouts.filter((p) => p.status !== 'claimable').map((p) => (
          <div key={p.id} className="flex justify-between border-b-2 border-black py-3 last:border-0">
            <div>
              <p className="font-bold">{p.propertyTitle}</p>
              <p className="text-sm">{formatDate(p.date)}</p>
            </div>
            <div className="text-right">
              <p className="font-black">{formatCurrency(p.amount)}</p>
              <p className="text-xs font-bold uppercase">{p.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Version 9: Dark Luxury ──────────────────────────────────────────────────────

function Version9({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="min-h-screen rounded-3xl bg-slate-950 p-8 text-white">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-3 pt-8">
          <p className="text-amber-400/80 text-xs uppercase tracking-[0.4em]">Rental Income</p>
          <h2 className="text-5xl font-light tracking-tight text-amber-400">{formatCurrency(totalClaimable)}</h2>
          <div className="w-16 h-px bg-amber-400/40 mx-auto" />
          <p className="text-white/25 text-sm">Available for withdrawal</p>
        </div>

        {claimable.map((payout) => (
          <div key={payout.id} className="border border-amber-400/20 rounded-xl p-8 flex items-center justify-between">
            <div>
              <p className="text-lg font-light">{payout.propertyTitle}</p>
              <p className="text-white/30 text-sm mt-1">{formatDate(payout.date)} | {payout.sharesOwned} shares</p>
              <p className="text-3xl font-light text-amber-400 mt-3">{formatCurrency(payout.amount)}</p>
            </div>
            <button
              onClick={() => onClaim(payout)}
              className="border border-amber-400 text-amber-400 px-8 py-3 text-sm uppercase tracking-[0.2em] hover:bg-amber-400 hover:text-slate-950 transition-all duration-300 rounded-sm"
            >
              Claim
            </button>
          </div>
        ))}

        <div className="border-t border-white/5 pt-8">
          <p className="text-white/20 text-xs uppercase tracking-[0.3em] mb-6">Payment History</p>
          {payouts.filter((p) => p.status !== 'claimable').map((p) => (
            <div key={p.id} className="flex justify-between py-4 border-b border-white/5 last:border-0">
              <div>
                <p className="font-light">{p.propertyTitle}</p>
                <p className="text-white/20 text-xs mt-1">{formatDate(p.date)}</p>
              </div>
              <p className="text-amber-400/80 font-light">{formatCurrency(p.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Version 10: Animated ────────────────────────────────────────────────────────

function Version10({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-green-500/10 to-background">
        <CardContent className="p-8 text-center relative">
          <div className="absolute top-4 right-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Available to Claim</p>
          <p className="text-5xl font-bold text-green-500 mt-1">{formatCurrency(totalClaimable)}</p>
          <p className="text-muted-foreground text-sm mt-2">Total earned: {formatCurrency(mockPortfolio.totalEarnings)}</p>
        </CardContent>
      </Card>

      {claimable.map((payout) => (
        <Card key={payout.id} className="rounded-2xl border-green-500/20 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-1 hover:shadow-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold">{payout.propertyTitle}</p>
              <p className="text-xs text-muted-foreground">{formatDate(payout.date)} | {payout.sharesOwned} shares</p>
              <p className="text-2xl font-bold text-green-500 mt-2">{formatCurrency(payout.amount)}</p>
            </div>
            <Button className="transition-all duration-300 hover:scale-105 hover:shadow-lg" onClick={() => onClaim(payout)}>
              Claim
            </Button>
          </CardContent>
        </Card>
      ))}

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-sm">History</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {payouts.filter((p) => p.status !== 'claimable').map((p) => (
            <div key={p.id} className="flex justify-between py-3 text-sm transition-all duration-200 hover:bg-muted/30 -mx-6 px-6 rounded">
              <div>
                <p className="font-medium">{p.propertyTitle}</p>
                <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
              </div>
              <div className="text-right">
                <p className="font-mono">{formatCurrency(p.amount)}</p>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Version 11: Magazine ────────────────────────────────────────────────────────

function Version11({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-10 font-serif">
      <div className="border-b-2 border-foreground pb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-2">Income Report</p>
        <h2 className="text-5xl font-bold leading-tight">Rental Payouts</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          <div className="border-l-4 border-green-500 pl-6 py-2">
            <p className="text-6xl font-bold text-green-500">{formatCurrency(totalClaimable)}</p>
            <p className="text-sm text-muted-foreground italic mt-1">Available for withdrawal</p>
          </div>

          <div className="border-l-4 border-muted pl-6 py-2">
            <p className="text-4xl font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</p>
            <p className="text-sm text-muted-foreground italic mt-1">Total lifetime earnings</p>
          </div>

          <div className="border-l-4 border-muted pl-6 py-2">
            <p className="text-4xl font-bold">{payouts.length}</p>
            <p className="text-sm text-muted-foreground italic mt-1">Total payout events</p>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {claimable.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-wider text-muted-foreground font-sans">Ready to Claim</p>
              {claimable.map((payout) => (
                <div key={payout.id} className="border-b pb-4 flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold">{payout.propertyTitle}</p>
                    <p className="text-sm text-muted-foreground italic">{formatDate(payout.date)} | {payout.sharesOwned} shares</p>
                    <p className="text-3xl font-bold text-green-500 mt-2">{formatCurrency(payout.amount)}</p>
                  </div>
                  <Button className="rounded-sm font-serif" onClick={() => onClaim(payout)}>Claim</Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm uppercase tracking-wider text-muted-foreground font-sans">Past Payments</p>
            {payouts.filter((p) => p.status !== 'claimable').map((p) => (
              <div key={p.id} className="flex justify-between border-b pb-3 last:border-0 text-sm">
                <div>
                  <p className="font-medium">{p.propertyTitle}</p>
                  <p className="text-xs text-muted-foreground italic">{formatDate(p.date)}</p>
                </div>
                <p className="font-mono">{formatCurrency(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Version 12: Terminal ────────────────────────────────────────────────────────

function Version12({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="min-h-screen rounded-2xl bg-[#0a0e14] p-6 font-mono text-green-400">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-green-600">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          nfstay-payouts v2.0 -- rental income interface
        </div>

        <div className="border border-green-900/50 rounded-lg p-4 bg-green-950/20">
          <p className="text-green-600 text-xs mb-1">$ payouts --summary</p>
          <pre className="text-sm">{`
CLAIMABLE      ${formatCurrency(totalClaimable)}
TOTAL EARNED   ${formatCurrency(mockPortfolio.totalEarnings)}
PENDING ITEMS  ${claimable.length}`}</pre>
        </div>

        {claimable.length > 0 && (
          <div className="border border-green-900/50 rounded-lg p-4 bg-green-950/20">
            <p className="text-green-600 text-xs mb-2">$ payouts --claimable</p>
            {claimable.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-green-900/30 last:border-0">
                <div>
                  <p className="text-sm">{p.propertyTitle}</p>
                  <p className="text-xs text-green-600">{formatDate(p.date)} | {p.sharesOwned} shares</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{formatCurrency(p.amount)}</span>
                  <button
                    onClick={() => onClaim(p)}
                    className="border border-green-500 text-green-400 px-3 py-1 rounded text-xs hover:bg-green-500/10 transition-colors"
                  >
                    claim
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border border-green-900/50 rounded-lg p-4 bg-green-950/20">
          <p className="text-green-600 text-xs mb-2">$ payouts --history</p>
          {payouts.filter((p) => p.status !== 'claimable').map((p) => (
            <div key={p.id} className="flex justify-between py-1.5 text-sm">
              <span className="text-green-600">[{p.status.toUpperCase().padEnd(10)}]</span>
              <span>{p.propertyTitle.substring(0, 20).padEnd(20)}</span>
              <span>{formatCurrency(p.amount)}</span>
              <span className="text-green-600">{formatDate(p.date)}</span>
            </div>
          ))}
        </div>

        <div className="text-green-600 text-xs">
          $ <span className="text-green-400 animate-pulse">_</span>
        </div>
      </div>
    </div>
  );
}

// ─── Version 13: Gamified ────────────────────────────────────────────────────────

function Version13({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((s, p) => s + p.amount, 0);
  const claimedCount = payouts.filter((p) => p.status === 'claimed' || p.status === 'paid').length;
  const streak = Math.min(claimedCount, 6);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl bg-gradient-to-r from-green-500/10 via-primary/5 to-amber-500/10 border-green-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-1">INCOME QUEST</Badge>
              <h2 className="text-2xl font-bold">Claim Your Rewards</h2>
              <p className="text-sm text-muted-foreground">{claimable.length} payouts ready</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-500">{formatCurrency(totalClaimable)}</p>
              <p className="text-xs text-muted-foreground">+{claimable.length * 50} XP available</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak counter */}
      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold">Claim Streak</p>
            <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/30">{streak} months</Badge>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn(
                'flex-1 h-3 rounded-full',
                i < streak ? 'bg-gradient-to-r from-green-500 to-amber-500' : 'bg-muted'
              )} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Keep claiming monthly to maintain your streak!</p>
        </CardContent>
      </Card>

      {claimable.map((payout) => (
        <Card key={payout.id} className="rounded-2xl border-2 border-green-500/20 hover:border-green-500/40 transition-all hover:scale-[1.01]">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <p className="font-bold">{payout.propertyTitle}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(payout.date)} | {payout.sharesOwned} shares</p>
              <p className="text-2xl font-bold text-green-500 mt-2">{formatCurrency(payout.amount)}</p>
            </div>
            <div className="text-right space-y-2">
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30">+50 XP</Badge>
              <div>
                <Button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white" onClick={() => onClaim(payout)}>
                  Claim Reward
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="flex items-center gap-2"><span>📜</span> Claim History</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {payouts.filter((p) => p.status !== 'claimable').map((p) => (
            <div key={p.id} className="flex justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{p.propertyTitle}</p>
                <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
              </div>
              <div className="text-right">
                <p className="font-mono">{formatCurrency(p.amount)}</p>
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30 mt-0.5">+50 XP earned</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Version 14: Split/Swipe ─────────────────────────────────────────────────────

function Version14({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-0">
      {/* Dark top */}
      <div className="bg-slate-900 text-white p-8 rounded-t-2xl text-center">
        <p className="text-white/50 text-sm">Available to Claim</p>
        <h2 className="text-5xl font-bold text-emerald-400 mt-2">{formatCurrency(totalClaimable)}</h2>
        <p className="text-white/30 text-sm mt-2">from {claimable.length} properties this month</p>

        {claimable.length > 0 && (
          <div className="max-w-2xl mx-auto mt-8 space-y-3">
            {claimable.map((payout) => (
              <div key={payout.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between hover:-translate-y-0.5 transition-transform">
                <div className="text-left">
                  <p className="font-semibold text-sm">{payout.propertyTitle}</p>
                  <p className="text-xs text-white/40">{formatDate(payout.date)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xl font-bold text-emerald-400">{formatCurrency(payout.amount)}</p>
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => onClaim(payout)}>
                    Claim
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Light bottom */}
      <div className="bg-background p-8 rounded-b-2xl border border-t-0">
        <h3 className="text-lg font-semibold mb-4">Payment History</h3>
        <div className="divide-y">
          {payouts.filter((p) => p.status !== 'claimable').map((p) => (
            <div key={p.id} className="flex items-center justify-between py-4 hover:-translate-y-0.5 transition-transform">
              <div>
                <p className="font-medium text-sm">{p.propertyTitle}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{formatDate(p.date)}</span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
              <p className="font-mono font-medium">{formatCurrency(p.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Version 15: Apple ───────────────────────────────────────────────────────────

function Version15({
  payouts,
  onClaim,
}: {
  payouts: PayoutItem[];
  onClaim: (payout: PayoutItem) => void;
}) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-20 py-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground tracking-wider uppercase">Rental Income</p>
        <h2 className="text-6xl font-semibold tracking-tight text-green-500">{formatCurrency(totalClaimable)}</h2>
        <p className="text-xl text-muted-foreground">Ready to claim</p>
      </div>

      {claimable.length > 0 && (
        <div className="max-w-xl mx-auto space-y-4">
          {claimable.map((payout) => (
            <div key={payout.id} className="flex items-center justify-between p-6 rounded-2xl border bg-card">
              <div>
                <p className="font-semibold">{payout.propertyTitle}</p>
                <p className="text-sm text-muted-foreground mt-1">{formatDate(payout.date)}</p>
                <p className="text-3xl font-semibold text-green-500 mt-3">{formatCurrency(payout.amount)}</p>
              </div>
              <Button size="lg" className="rounded-full px-8" onClick={() => onClaim(payout)}>
                Claim
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-2xl mx-auto text-center">
        <h3 className="text-3xl font-semibold tracking-tight mb-2">Payment History</h3>
        <p className="text-muted-foreground mb-8">Total earned: {formatCurrency(mockPortfolio.totalEarnings)}</p>
        <div className="space-y-0 divide-y">
          {payouts.filter((p) => p.status !== 'claimable').map((p) => (
            <div key={p.id} className="flex items-center justify-between py-5 text-left">
              <div>
                <p className="font-medium">{p.propertyTitle}</p>
                <p className="text-sm text-muted-foreground">{formatDate(p.date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{statusConfig[p.status].label}</span>
                <p className="font-semibold">{formatCurrency(p.amount)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── Version 16: Spacious & Breathing ───────────────────────────────────────────

function Version16({ payouts, onClaim }: { payouts: PayoutItem[]; onClaim: (payout: PayoutItem) => void }) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);
  const history = payouts.filter((p) => p.status !== 'claimable');

  return (
    <div className="space-y-12 p-12">
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Available to Claim</p>
        <h2 className="text-6xl font-bold tracking-tight text-green-500">{formatCurrency(totalClaimable)}</h2>
        <p className="text-lg text-muted-foreground">from {claimable.length} properties this month</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {claimable.map((p) => (
          <Card key={p.id} className="rounded-3xl shadow-lg border-green-500/20">
            <CardContent className="p-10 space-y-4">
              <h3 className="text-2xl font-bold">{p.propertyTitle}</h3>
              <p className="text-lg text-muted-foreground">{formatDate(p.date)} &middot; {p.sharesOwned} shares</p>
              <p className="text-4xl font-bold text-green-500">{formatCurrency(p.amount)}</p>
              <Button size="lg" className="w-full gap-2 text-base" onClick={() => onClaim(p)}><DollarSign className="h-5 w-5" /> Claim Now</Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-6">
        <h3 className="text-2xl font-semibold text-center">Payment History</h3>
        <div className="max-w-2xl mx-auto divide-y">
          {history.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-6">
              <div><p className="font-semibold text-lg">{p.propertyTitle}</p><p className="text-muted-foreground">{formatDate(p.date)}</p></div>
              <div className="text-right"><p className="text-xl font-bold">{formatCurrency(p.amount)}</p><StatusBadge status={p.status} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Version 17: Tight & Dense ──────────────────────────────────────────────────

function Version17({ payouts, onClaim }: { payouts: PayoutItem[]; onClaim: (payout: PayoutItem) => void }) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-4 border-b pb-2 text-xs">
        <span>Claimable: <strong className="text-green-500">{formatCurrency(totalClaimable)}</strong></span>
        <span>Total Earned: <strong>{formatCurrency(mockPortfolio.totalEarnings)}</strong></span>
        <span>Items: <strong>{claimable.length}</strong></span>
      </div>
      <Table>
        <TableHeader><TableRow className="text-xs"><TableHead className="py-1">Date</TableHead><TableHead className="py-1">Property</TableHead><TableHead className="py-1 text-right">Shares</TableHead><TableHead className="py-1 text-right">Amount</TableHead><TableHead className="py-1">Method</TableHead><TableHead className="py-1">Status</TableHead><TableHead className="py-1"></TableHead></TableRow></TableHeader>
        <TableBody>
          {payouts.map((p) => (
            <TableRow key={p.id} className="text-xs">
              <TableCell className="py-1">{formatDate(p.date)}</TableCell>
              <TableCell className="py-1 font-medium">{p.propertyTitle}</TableCell>
              <TableCell className="py-1 text-right">{p.sharesOwned}</TableCell>
              <TableCell className="py-1 text-right font-mono">{formatCurrency(p.amount)}</TableCell>
              <TableCell className="py-1">{p.method ? methodLabels[p.method] || p.method : '—'}</TableCell>
              <TableCell className="py-1"><StatusBadge status={p.status} /></TableCell>
              <TableCell className="py-1">{p.status === 'claimable' && <Button size="sm" className="h-5 text-[10px] px-2" onClick={() => onClaim(p)}>Claim</Button>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Version 18: Hero-Led ───────────────────────────────────────────────────────

function Version18({ payouts, onClaim }: { payouts: PayoutItem[]; onClaim: (payout: PayoutItem) => void }) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);
  const history = payouts.filter((p) => p.status !== 'claimable');

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-green-500/15 via-green-500/5 to-background border-green-500/20">
        <CardContent className="py-16 text-center">
          <p className="text-sm text-muted-foreground mb-2">Ready to Claim</p>
          <h1 className="text-7xl font-bold tracking-tighter text-green-500">{formatCurrency(totalClaimable)}</h1>
          <p className="text-muted-foreground mt-4">Your rental income from {claimable.length} properties is waiting</p>
          {claimable.length > 0 && <Button size="lg" className="mt-6 gap-2" onClick={() => onClaim(claimable[0])}><DollarSign className="h-5 w-5" /> Claim First Payout</Button>}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {claimable.map((p) => (
          <Card key={p.id} className="border-green-500/20"><CardContent className="p-4 flex items-center justify-between"><div><p className="font-semibold text-sm">{p.propertyTitle}</p><p className="text-xs text-muted-foreground">{formatDate(p.date)} &middot; {p.sharesOwned} shares</p></div><div className="flex items-center gap-3"><span className="font-bold text-green-500">{formatCurrency(p.amount)}</span><Button size="sm" onClick={() => onClaim(p)}>Claim</Button></div></CardContent></Card>
        ))}
      </div>
      {history.length > 0 && <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Property</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{history.map((p) => (<TableRow key={p.id}><TableCell className="text-sm">{formatDate(p.date)}</TableCell><TableCell className="text-sm">{p.propertyTitle}</TableCell><TableCell className="text-sm text-right font-mono">{formatCurrency(p.amount)}</TableCell><TableCell><StatusBadge status={p.status} /></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>}
    </div>
  );
}

// ─── Version 19: Sidebar Command ────────────────────────────────────────────────

function Version19({ payouts, onClaim }: { payouts: PayoutItem[]; onClaim: (payout: PayoutItem) => void }) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);
  const history = payouts.filter((p) => p.status !== 'claimable');

  return (
    <div className="flex gap-6">
      <div className="w-80 flex-shrink-0 space-y-4 sticky top-6 self-start">
        <Card className="border-green-500/20"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-500" /> Payout Summary</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Claimable</span><span className="font-bold text-green-500">{formatCurrency(totalClaimable)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Earned</span><span className="font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Pending Items</span><span className="font-bold">{claimable.length}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Quick Claim</CardTitle></CardHeader><CardContent className="space-y-2">{claimable.map((p) => (<Button key={p.id} variant="outline" size="sm" className="w-full justify-between" onClick={() => onClaim(p)}><span className="truncate">{p.propertyTitle}</span><span className="text-green-500 font-bold">{formatCurrency(p.amount)}</span></Button>))}</CardContent></Card>
      </div>
      <div className="flex-1 space-y-6">
        <h2 className="text-xl font-bold">Claimable Payouts</h2>
        {claimable.map((p) => (<Card key={p.id} className="border-green-500/20"><CardContent className="pt-6 flex items-center justify-between"><div><p className="font-semibold">{p.propertyTitle}</p><p className="text-sm text-muted-foreground">{formatDate(p.date)} &middot; {p.sharesOwned} shares</p></div><div className="flex items-center gap-3"><p className="text-lg font-bold text-green-500">{formatCurrency(p.amount)}</p><Button size="sm" onClick={() => onClaim(p)}>Claim</Button></div></CardContent></Card>))}
        <h2 className="text-xl font-bold">History</h2>
        <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Property</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{history.map((p) => (<TableRow key={p.id}><TableCell className="text-sm">{formatDate(p.date)}</TableCell><TableCell className="text-sm font-medium">{p.propertyTitle}</TableCell><TableCell className="text-sm text-right font-mono">{formatCurrency(p.amount)}</TableCell><TableCell className="text-sm">{p.method ? methodLabels[p.method] || p.method : '—'}</TableCell><TableCell><StatusBadge status={p.status} /></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
      </div>
    </div>
  );
}

// ─── Version 20: Step-by-Step ───────────────────────────────────────────────────

function Version20({ payouts, onClaim }: { payouts: PayoutItem[]; onClaim: (payout: PayoutItem) => void }) {
  const [step, setStep] = useState(1);
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);
  const history = payouts.filter((p) => p.status !== 'claimable');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-3"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Step {step} of 3</span><span className="font-medium">{step === 1 ? 'Review Earnings' : step === 2 ? 'Claim Payouts' : 'Payment History'}</span></div><div className="flex gap-2">{[1, 2, 3].map((s) => (<div key={s} className={cn('h-2 flex-1 rounded-full transition', s <= step ? 'bg-primary' : 'bg-muted')} />))}</div></div>
      {step === 1 && (<div className="space-y-6"><h2 className="text-2xl font-bold">Your Rental Earnings</h2><Card className="bg-gradient-to-r from-green-500/5 to-background"><CardContent className="p-8 text-center"><p className="text-sm text-muted-foreground">Ready to Claim</p><p className="text-5xl font-bold text-green-500">{formatCurrency(totalClaimable)}</p><p className="text-muted-foreground mt-2">from {claimable.length} properties</p></CardContent></Card><Card><CardContent className="p-5 text-center"><p className="text-xs text-muted-foreground">Total Earned All Time</p><p className="text-2xl font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</p></CardContent></Card><Button className="w-full" onClick={() => setStep(2)}>Proceed to Claim</Button></div>)}
      {step === 2 && (<div className="space-y-4"><h2 className="text-2xl font-bold">Claim Your Payouts</h2>{claimable.map((p) => (<Card key={p.id} className="border-green-500/20"><CardContent className="pt-6 flex items-center justify-between"><div><p className="font-semibold">{p.propertyTitle}</p><p className="text-sm text-muted-foreground">{formatDate(p.date)}</p></div><div className="flex items-center gap-3"><p className="font-bold text-green-500">{formatCurrency(p.amount)}</p><Button size="sm" onClick={() => onClaim(p)}>Claim</Button></div></CardContent></Card>))}<div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button><Button className="flex-1" onClick={() => setStep(3)}>View History</Button></div></div>)}
      {step === 3 && (<div className="space-y-4"><h2 className="text-2xl font-bold">Payment History</h2><Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Property</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{history.map((p) => (<TableRow key={p.id}><TableCell className="text-sm">{formatDate(p.date)}</TableCell><TableCell className="text-sm">{p.propertyTitle}</TableCell><TableCell className="text-sm text-right">{formatCurrency(p.amount)}</TableCell><TableCell><StatusBadge status={p.status} /></TableCell></TableRow>))}</TableBody></Table></CardContent></Card><Button variant="outline" className="w-full" onClick={() => setStep(1)}>Back to Summary</Button></div>)}
    </div>
  );
}

// ─── Version 21: Horizontal Scroll ──────────────────────────────────────────────

function Version21({ payouts, onClaim }: { payouts: PayoutItem[]; onClaim: (payout: PayoutItem) => void }) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);
  const history = payouts.filter((p) => p.status !== 'claimable');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6"><h2 className="text-2xl font-bold text-green-500">{formatCurrency(totalClaimable)}</h2><span className="text-muted-foreground">ready to claim</span></div>
      <div><h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Claimable</h3><div className="flex gap-4 overflow-x-auto pb-3 flex-nowrap">{claimable.map((p) => (<Card key={p.id} className="flex-shrink-0 w-64 border-green-500/20"><CardContent className="p-4 space-y-3"><h4 className="font-semibold text-sm">{p.propertyTitle}</h4><p className="text-xs text-muted-foreground">{formatDate(p.date)} &middot; {p.sharesOwned} shares</p><p className="text-2xl font-bold text-green-500">{formatCurrency(p.amount)}</p><Button size="sm" className="w-full" onClick={() => onClaim(p)}>Claim</Button></CardContent></Card>))}</div></div>
      <div><h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">History</h3><div className="flex gap-3 overflow-x-auto pb-3 flex-nowrap">{history.map((p) => (<Card key={p.id} className="flex-shrink-0 w-56"><CardContent className="p-3"><p className="text-xs text-muted-foreground">{formatDate(p.date)}</p><p className="text-sm font-medium mt-1">{p.propertyTitle}</p><div className="flex items-center justify-between mt-2"><span className="font-bold text-sm">{formatCurrency(p.amount)}</span><StatusBadge status={p.status} /></div></CardContent></Card>))}</div></div>
    </div>
  );
}

// ─── Version 22: Stacked Layers ─────────────────────────────────────────────────

function Version22({ payouts, onClaim }: { payouts: PayoutItem[]; onClaim: (payout: PayoutItem) => void }) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);
  const history = payouts.filter((p) => p.status !== 'claimable');

  return (
    <div className="max-w-4xl mx-auto space-y-2">
      <Card className="rounded-2xl shadow-xl relative z-30"><CardContent className="p-8 text-center"><p className="text-sm text-muted-foreground">Claimable Income</p><h2 className="text-5xl font-bold text-green-500">{formatCurrency(totalClaimable)}</h2><p className="text-muted-foreground mt-2">Total earned: {formatCurrency(mockPortfolio.totalEarnings)}</p></CardContent></Card>
      <Card className="rounded-2xl shadow-lg relative z-20 mx-3" style={{ transform: 'translateY(-8px)' }}><CardContent className="p-6 pt-8 space-y-3"><h3 className="font-semibold">Pending Claims</h3>{claimable.map((p) => (<div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-green-500/5"><div><p className="font-medium text-sm">{p.propertyTitle}</p><p className="text-xs text-muted-foreground">{formatDate(p.date)}</p></div><div className="flex items-center gap-2"><span className="font-bold text-green-500">{formatCurrency(p.amount)}</span><Button size="sm" onClick={() => onClaim(p)}>Claim</Button></div></div>))}</CardContent></Card>
      <Card className="rounded-2xl shadow-md relative z-10 mx-6" style={{ transform: 'translateY(-16px)' }}><CardContent className="p-6 pt-8 space-y-2"><h3 className="font-semibold">Recent History</h3>{history.slice(0, 5).map((p) => (<div key={p.id} className="flex items-center justify-between py-2 text-sm"><span className="text-muted-foreground">{formatDate(p.date)}</span><span className="font-medium">{p.propertyTitle}</span><span className="font-bold">{formatCurrency(p.amount)}</span><StatusBadge status={p.status} /></div>))}</CardContent></Card>
    </div>
  );
}

// ─── Version 23: Grid Mosaic ────────────────────────────────────────────────────

function Version23({ payouts, onClaim }: { payouts: PayoutItem[]; onClaim: (payout: PayoutItem) => void }) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);
  const history = payouts.filter((p) => p.status !== 'claimable');

  return (
    <div className="grid grid-cols-4 auto-rows-[140px] gap-3">
      <Card className="col-span-2 row-span-2 rounded-xl flex items-center justify-center bg-gradient-to-br from-green-500/10 to-background"><CardContent className="text-center p-6"><p className="text-sm text-muted-foreground">Ready to Claim</p><p className="text-5xl font-bold text-green-500 mt-2">{formatCurrency(totalClaimable)}</p><p className="text-muted-foreground mt-2">{claimable.length} payouts pending</p></CardContent></Card>
      <Card className="rounded-xl flex items-center justify-center"><CardContent className="p-4 text-center"><p className="text-[10px] text-muted-foreground">Total Earned</p><p className="text-xl font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</p></CardContent></Card>
      <Card className="rounded-xl flex items-center justify-center"><CardContent className="p-4 text-center"><p className="text-[10px] text-muted-foreground">Pending</p><p className="text-xl font-bold">{claimable.length}</p></CardContent></Card>
      {claimable.map((p) => (<Card key={p.id} className="col-span-2 rounded-xl border-green-500/20"><CardContent className="p-4 flex items-center justify-between h-full"><div><p className="font-semibold text-sm">{p.propertyTitle}</p><p className="text-xs text-muted-foreground">{formatDate(p.date)}</p></div><div className="flex items-center gap-2"><span className="text-lg font-bold text-green-500">{formatCurrency(p.amount)}</span><Button size="sm" onClick={() => onClaim(p)}>Claim</Button></div></CardContent></Card>))}
      {history.slice(0, 4).map((p) => (<Card key={p.id} className="rounded-xl"><CardContent className="p-3 flex flex-col justify-center h-full"><p className="text-xs font-medium truncate">{p.propertyTitle}</p><p className="font-bold text-sm mt-1">{formatCurrency(p.amount)}</p><StatusBadge status={p.status} /></CardContent></Card>))}
    </div>
  );
}

// ─── Version 24: Inline Everything ──────────────────────────────────────────────

function Version24({ payouts, onClaim }: { payouts: PayoutItem[]; onClaim: (payout: PayoutItem) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <div className="flex items-center justify-between border-b pb-3"><div><p className="text-2xl font-bold text-green-500">{formatCurrency(totalClaimable)}</p><p className="text-sm text-muted-foreground">available to claim</p></div><div className="text-right"><p className="text-muted-foreground text-xs">Total Earned</p><p className="font-bold">{formatCurrency(mockPortfolio.totalEarnings)}</p></div></div>
      {payouts.map((p) => { const isOpen = expandedId === p.id; return (<div key={p.id}><button onClick={() => setExpandedId(isOpen ? null : p.id)} className="w-full text-left"><Card className={cn('rounded-xl transition hover:bg-muted/30', isOpen && 'ring-1 ring-primary/30', p.status === 'claimable' && 'border-green-500/20')}><CardContent className="p-4 flex items-center justify-between"><div><p className="font-semibold text-sm">{p.propertyTitle}</p><p className="text-xs text-muted-foreground">{formatDate(p.date)}</p></div><div className="flex items-center gap-3"><span className={cn('font-bold', p.status === 'claimable' ? 'text-green-500' : '')}>{formatCurrency(p.amount)}</span><StatusBadge status={p.status} />{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</div></CardContent></Card></button><div className={cn('overflow-hidden transition-all duration-300', isOpen ? 'max-h-[200px]' : 'max-h-0')}><div className="p-4 space-y-2 text-sm"><div className="grid grid-cols-3 gap-3"><div><p className="text-xs text-muted-foreground">Shares</p><p className="font-bold">{p.sharesOwned}</p></div><div><p className="text-xs text-muted-foreground">Method</p><p className="font-bold">{p.method ? methodLabels[p.method] || p.method : 'Not claimed'}</p></div><div><p className="text-xs text-muted-foreground">Status</p><p className="font-bold">{statusConfig[p.status].label}</p></div></div>{p.status === 'claimable' && <Button size="sm" className="w-full gap-2" onClick={() => onClaim(p)}><DollarSign className="h-4 w-4" /> Claim {formatCurrency(p.amount)}</Button>}</div></div></div>); })}
    </div>
  );
}

// ─── Version 25: Floating Panels ────────────────────────────────────────────────

function Version25({ payouts, onClaim }: { payouts: PayoutItem[]; onClaim: (payout: PayoutItem) => void }) {
  const claimable = payouts.filter((p) => p.status === 'claimable');
  const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);
  const history = payouts.filter((p) => p.status !== 'claimable');

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b mb-6"><div className="flex items-center justify-between px-4 py-3"><div className="flex items-center gap-3"><span className="font-bold text-green-500">{formatCurrency(totalClaimable)}</span><span className="text-sm text-muted-foreground">claimable</span></div><div className="flex gap-4 text-xs"><span>Total Earned: <strong>{formatCurrency(mockPortfolio.totalEarnings)}</strong></span><span>Pending: <strong>{claimable.length}</strong></span></div></div></div>
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Claimable Payouts</h2>
        <div className="space-y-3">{claimable.map((p) => (<Card key={p.id} className="border-green-500/20"><CardContent className="pt-6 flex items-center justify-between"><div><p className="font-semibold">{p.propertyTitle}</p><p className="text-sm text-muted-foreground">{formatDate(p.date)} &middot; {p.sharesOwned} shares</p></div><div className="flex items-center gap-3"><p className="text-lg font-bold text-green-500">{formatCurrency(p.amount)}</p><Button size="sm" onClick={() => onClaim(p)}>Claim</Button></div></CardContent></Card>))}</div>
        <h2 className="text-xl font-bold">Payment History</h2>
        <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Property</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{history.map((p) => (<TableRow key={p.id}><TableCell className="text-sm">{formatDate(p.date)}</TableCell><TableCell className="text-sm font-medium">{p.propertyTitle}</TableCell><TableCell className="text-sm text-right font-mono">{formatCurrency(p.amount)}</TableCell><TableCell><StatusBadge status={p.status} /></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
      </div>
      {claimable.length > 0 && <div className="fixed bottom-6 right-6 z-50"><Button size="lg" className="rounded-full shadow-2xl gap-2 px-8 py-6 text-base" onClick={() => onClaim(claimable[0])}><DollarSign className="h-5 w-5" /> Claim {formatCurrency(totalClaimable)}</Button></div>}
    </div>
  );
}


// ─── Main Page Component ─────────────────────────────────────────────────────────

export default function InvestPayoutsPage() {
  const [version, setVersion] = useState(1);
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

  return (
    <div className="space-y-6">
      {/* Page header + version switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Claim your rental income and view payment history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].map((v) => (
            <button
              key={v}
              onClick={() => setVersion(v)}
              className={cn(
                'h-7 w-7 rounded-md text-xs font-medium transition-colors',
                version === v
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Version content */}
      {version === 1 && <Version1 payouts={payouts} onClaim={handleClaim} />}
      {version === 2 && <Version2 payouts={payouts} onClaim={handleClaim} />}
      {version === 3 && <Version3 payouts={payouts} onClaim={handleClaim} />}
      {version === 4 && <Version4 payouts={payouts} onClaim={handleClaim} />}
      {version === 5 && <Version5 payouts={payouts} onClaim={handleClaim} />}
      {version === 6 && <Version6 payouts={payouts} onClaim={handleClaim} />}
      {version === 7 && <Version7 payouts={payouts} onClaim={handleClaim} />}
      {version === 8 && <Version8 payouts={payouts} onClaim={handleClaim} />}
      {version === 9 && <Version9 payouts={payouts} onClaim={handleClaim} />}
      {version === 10 && <Version10 payouts={payouts} onClaim={handleClaim} />}
      {version === 11 && <Version11 payouts={payouts} onClaim={handleClaim} />}
      {version === 12 && <Version12 payouts={payouts} onClaim={handleClaim} />}
      {version === 13 && <Version13 payouts={payouts} onClaim={handleClaim} />}
      {version === 14 && <Version14 payouts={payouts} onClaim={handleClaim} />}
      {version === 15 && <Version15 payouts={payouts} onClaim={handleClaim} />}
      {version === 16 && <Version16 payouts={payouts} onClaim={handleClaim} />}
      {version === 17 && <Version17 payouts={payouts} onClaim={handleClaim} />}
      {version === 18 && <Version18 payouts={payouts} onClaim={handleClaim} />}
      {version === 19 && <Version19 payouts={payouts} onClaim={handleClaim} />}
      {version === 20 && <Version20 payouts={payouts} onClaim={handleClaim} />}
      {version === 21 && <Version21 payouts={payouts} onClaim={handleClaim} />}
      {version === 22 && <Version22 payouts={payouts} onClaim={handleClaim} />}
      {version === 23 && <Version23 payouts={payouts} onClaim={handleClaim} />}
      {version === 24 && <Version24 payouts={payouts} onClaim={handleClaim} />}
      {version === 25 && <Version25 payouts={payouts} onClaim={handleClaim} />}

      {/* Claim Modal (shared across all versions) */}
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
