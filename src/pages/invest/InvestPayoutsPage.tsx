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
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((v) => (
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
