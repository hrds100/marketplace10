import { playCelebrationSound } from '@/lib/celebration';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { sendInvestNotification } from '@/lib/notifications';
import { useMyBankAccount, useInvestProperties } from '@/hooks/useInvestData';
import { usePayoutsWithBlockchain } from '@/hooks/usePayoutsWithBlockchain';
import { useBlockchain } from '@/hooks/useBlockchain';
import { useKycStatus } from '@/hooks/useKycStatus';
import KycVerificationModal from '@/components/KycVerificationModal';
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
  ShieldCheck,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fixIpfsUrl } from '@/lib/ipfs';
import BankDetailsForm from '@/components/BankDetailsForm';

type ClaimMethod = 'bank_transfer' | 'usdc' | 'stay_token' | 'lp_token';
type ClaimStep = 'choose' | 'kyc_required' | 'bank_setup' | 'processing' | 'success';
type PayoutStatus = 'claimable' | 'claimed' | 'paid' | 'processing' | 'pending';

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

const statusConfig: Record<string, { label: string; variant: string; className: string }> = {
  claimable: { label: 'Claimable', variant: 'default', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  claimed: { label: 'Claimed', variant: 'default', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  paid: { label: 'Paid', variant: 'default', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  processing: { label: 'Processing', variant: 'default', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  pending: { label: 'Pending', variant: 'default', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
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
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' };
  return (
    <Badge variant="outline" data-feature="INVEST__PAYOUT_STATUS" className={cn('text-xs font-medium', config.className)}>
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
  onClaimSuccess,
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
  onBuyStayTokens?: (propertyId: number, onStep?: (step: number, total: number) => void) => Promise<{ txHash: string; success: boolean }>;
  onBuyLpTokens?: (propertyId: number, onStep?: (step: number, total: number) => void) => Promise<{ txHash: string; success: boolean }>;
  onClaimSuccess?: () => void;
  kycStatus?: string;
  onKycRequired?: () => void;
}) {
  const [txStep, setTxStep] = useState(0);

  if (!payout) return null;

  const handleContinue = async () => {
    if (!selectedMethod) return;
    setClaimError(null);
    setTxStep(0);

    // KYC gate: must be approved before any claim method
    if (kycStatus !== 'approved') {
      onKycRequired?.();
      return;
    }

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
            amount: payout.amount || 0,
          },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        setClaimStep('success'); playCelebrationSound();
        onClaimSuccess?.();
        sendInvestNotification({
          type: 'rent_claimed',
          user_id: user?.id,
          user_name: user?.email?.split('@')[0] || 'Partner',
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
        setClaimStep('success'); playCelebrationSound();
        onClaimSuccess?.();
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : 'Claim failed. Check your wallet and try again.');
        setClaimStep('choose');
      }
    } else if (selectedMethod === 'stay_token' && payout && onBuyStayTokens) {
      try {
        const result = await onBuyStayTokens(payout.propertyId, (step) => setTxStep(step));
        setClaimTxHash(result.txHash || null);
        setClaimStep('success'); playCelebrationSound();
        onClaimSuccess?.();
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : 'STAY token claim failed. Check your wallet and try again.');
        setClaimStep('choose');
      }
    } else if (selectedMethod === 'lp_token' && payout && onBuyLpTokens) {
      try {
        const result = await onBuyLpTokens(payout.propertyId, (step) => setTxStep(step));
        setClaimTxHash(result.txHash || null);
        setClaimStep('success'); playCelebrationSound();
        onClaimSuccess?.();
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
      setTxStep(0);
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
      <DialogContent className="sm:max-w-md" data-feature="INVEST__PAYOUT_MODAL">
        <DialogHeader>
          <DialogTitle>
            {claimStep === 'choose' && 'Claim Rental Income'}
            {claimStep === 'kyc_required' && 'Identity Verification Required'}
            {claimStep === 'bank_setup' && 'Add Bank Details'}
            {claimStep === 'processing' && 'Processing Claim'}
            {claimStep === 'success' && 'Claim Successful'}
          </DialogTitle>
          <DialogDescription>
            {claimStep === 'choose' && `${payout.propertyTitle} — ${formatCurrency(payout.amount)}`}
            {claimStep === 'kyc_required' && 'You need to verify your identity before claiming payouts.'}
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
          <div className="py-2" data-feature="INVEST__PAYOUT_BANK">
            <BankDetailsForm
              onSave={() => {
                // After bank details saved, proceed straight to the claim
                setClaimStep('processing');
                setClaimError(null);
                supabase.functions
                  .invoke('submit-payout-claim', {
                    body: { user_id: user?.id, user_type: 'investor', currency: 'GBP', amount: payout.amount || 0 },
                  })
                  .then(({ data, error }) => {
                    if (error) throw new Error(error.message);
                    if (data?.error) throw new Error(data.error);
                    setClaimStep('success'); playCelebrationSound();
                    sendInvestNotification({
                      type: 'rent_claimed',
                      user_id: user?.id,
                      user_name: user?.email?.split('@')[0] || 'Partner',
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
          <div className="flex flex-col items-center justify-center py-8 space-y-4 w-full">
            {/* Bank Transfer — simple spinner */}
            {(selectedMethod === 'bank_transfer' || selectedMethod === 'usdc') && (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {selectedMethod === 'bank_transfer' ? 'Submitting your claim...' : 'Withdrawing rent to your wallet...'}
                </p>
                {selectedMethod === 'usdc' && (
                  <p className="text-xs text-muted-foreground/50 text-center max-w-xs">
                    Approve the transaction in your Particle wallet.
                  </p>
                )}
              </>
            )}

            {/* STAY / LP — 3-step progress */}
            {(selectedMethod === 'stay_token' || selectedMethod === 'lp_token') && (() => {
              const steps = selectedMethod === 'stay_token'
                ? ['Withdraw rent from contract', 'Approve STAY swap', 'Swap USDC → STAY']
                : ['Withdraw rent from contract', 'Approve LP deposit', 'Create LP position'];
              return (
                <div className="w-full space-y-2">
                  <div className="flex flex-col items-center mb-3">
                    <Loader2 className="h-7 w-7 text-primary animate-spin mb-2" />
                    <p className="text-xs text-muted-foreground/70 text-center">
                      Approve each prompt in your Particle wallet
                    </p>
                  </div>
                  {steps.map((label, i) => {
                    const n = i + 1;
                    const done = txStep > n;
                    const active = txStep === n;
                    return (
                      <div
                        key={n}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-all',
                          done ? 'border-green-500/30 bg-green-500/5' :
                          active ? 'border-primary/40 bg-primary/5' :
                          'border-border opacity-40'
                        )}
                      >
                        <div className={cn(
                          'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                          done ? 'bg-green-500 text-white' :
                          active ? 'bg-primary text-primary-foreground' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {done ? '✓' : n}
                        </div>
                        <span className={cn(
                          'text-sm flex-1',
                          active ? 'text-foreground font-medium' : 'text-muted-foreground'
                        )}>
                          {label}
                        </span>
                        {active && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Step 3: Success */}
        {claimStep === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4 relative">
            {/* Confetti */}
            <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="absolute animate-confetti-particle" style={{
                  left: `${Math.random() * 100}%`, top: '-10px',
                  width: `${6 + Math.random() * 8}px`, height: `${6 + Math.random() * 8}px`,
                  backgroundColor: ['#00D084', '#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#3B82F6'][i % 6],
                  animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 2}s`,
                }} />
              ))}
            </div>
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
  const { t } = useTranslation();
  useEffect(() => { document.title = 'nfstay - ' + t('invest.payoutsTitle'); }, [t]);
  const { user } = useAuth();
  const { payouts: mergedPayouts, blockchainLoading, refetchRentData } = usePayoutsWithBlockchain();
  const { data: allProperties = [] } = useInvestProperties();
  const { data: bankAccount } = useMyBankAccount();
  const { claimRent, buyStayTokens, buyLpTokens, loading: claimLoading, walletAddress } = useBlockchain();
  const { status: kycStatus, checkStatus: checkKyc, saveSession } = useKycStatus(user?.id);
  const [showKycModal, setShowKycModal] = useState(false);

  // Check KYC status on mount
  useEffect(() => { checkKyc(); }, [checkKyc]);

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

  // Add bank transfer claims from payout_claims (not in blockchain merge)
  // Get first property for image fallback
  const firstProperty = (allProperties as any[])?.[0];
  for (const c of dbPayoutClaims) {
    if (c.status === 'cancelled') continue;
    // Skip if already in payouts (avoid duplicates)
    if (payouts.some((p) => p.id === `claim-${c.id}`)) continue;
    payouts.push({
      id: `claim-${c.id}`,
      propertyTitle: firstProperty?.title || 'Bank Transfer',
      propertyImage: (firstProperty as any)?.photos?.[0] || firstProperty?.image || '',
      propertyId: firstProperty?.id || 0,
      date: c.paid_at || c.created_at,
      sharesOwned: 0,
      amount: Number(c.amount_entitled || 0),
      currency: c.currency || 'GBP',
      status: c.status as PayoutStatus,
      method: 'bank_transfer',
    });
  }

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
    <div data-feature="INVEST__PAYOUTS" className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('invest.payoutsTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('invest.payoutsSubtitle')}
        </p>
        {blockchainLoading && (
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">{t('invest.loadingOnChainRent')}</span>
          </div>
        )}
      </div>

      {/* KYC Status Card */}
      {kycStatus === 'approved' && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-600">{t('invest.identityVerified')}</p>
                <p className="text-xs text-muted-foreground">{t('invest.canClaimAnyMethod')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {kycStatus === 'pending' && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-600">{t('invest.verificationInProgress')}</p>
                  <p className="text-xs text-muted-foreground">{t('invest.wellUpdateYou')}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowKycModal(true)} className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                {t('invest.continueVerification')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {(kycStatus === 'not_started' || kycStatus === 'declined' || kycStatus === 'error') && (
        <Card className="border-border">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t('invest.verifyIdentityToClaim')}</p>
                  <p className="text-xs text-muted-foreground">{t('invest.oneTimeKyc')}</p>
                </div>
              </div>
              <Button size="sm" onClick={() => setShowKycModal(true)} className="bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white">
                {t('invest.verifyNow')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {kycStatus === 'loading' && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            </div>
          </CardContent>
        </Card>
      )}

      {payouts.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="py-16 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">{t('invest.noPayoutsYetDesc')}</p>
          </CardContent>
        </Card>
      ) : (

      /* Content */
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left sticky sidebar */}
        <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          {/* Payout Summary Card */}
          <Card className="border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
                {t('invest.payoutSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('invest.availableToClaim')}<BlockchainDot tooltip={t('invest.fromBlockchain')} /></span>
                <span className="font-bold text-green-500">{formatCurrency(totalClaimable)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('invest.totalEarned')}</span>
                <span className="font-bold">{formatCurrency(payouts.reduce((sum, p) => sum + p.amount, 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('invest.pendingItems')}</span>
                <span className="font-bold">{claimable.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Claim Buttons */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('invest.quickClaim')}</CardTitle>
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
          <h2 className="text-xl font-bold">{t('invest.claimablePayouts')}</h2>
          <div className="space-y-3">
            {claimable.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  {t('invest.noClaimableNow')}
                </CardContent>
              </Card>
            ) : (
              claimable.map((payout) => (
                <Card key={payout.id} className="border-green-500/20" data-feature="INVEST__PAYOUT_CARD">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <PropertyImage
                          src={payout.propertyImage}
                          alt={payout.propertyTitle}
                          className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                        />
                        <div>
                          <p className="font-medium">{payout.propertyTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payout.date)} &middot; {payout.sharesOwned} allocations<BlockchainDot tooltip="Allocation count from blockchain" />
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.2)]" data-feature="INVEST__PAYOUT_STATUS">
                          Claimable
                        </Badge>
                        <p className="text-lg font-bold text-green-500 whitespace-nowrap" data-feature="INVEST__PAYOUT_AMOUNT">
                          {formatCurrency(payout.amount)}<BlockchainDot tooltip="Amount from blockchain" />
                        </p>
                        <Button size="sm" onClick={() => handleClaim(payout)} data-feature="INVEST__PAYOUT_CLAIM">
                          {t('invest.claim')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* History Table */}
          <h2 className="text-xl font-bold">{t('invest.history')}</h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invest.date')}</TableHead>
                    <TableHead>{t('invest.property')}</TableHead>
                    <TableHead className="text-right">{t('invest.amount')}</TableHead>
                    <TableHead>{t('invest.method')}</TableHead>
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
        onClaimSuccess={() => {
          // Auto-refresh payouts after successful claim
          setTimeout(() => refetchRentData(), 2000);
        }}
        kycStatus={kycStatus}
        onKycRequired={() => {
          setClaimModalOpen(false);
          setShowKycModal(true);
        }}
      />

      {/* KYC Verification Modal */}
      <KycVerificationModal
        open={showKycModal}
        onClose={() => setShowKycModal(false)}
        walletAddress={walletAddress || ''}
        saveSession={saveSession}
        onVerificationComplete={() => {
          checkKyc();
          setShowKycModal(false);
        }}
      />
    </div>
  );
}
