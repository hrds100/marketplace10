import { useState, useMemo } from 'react';
import { useProposals } from '@/hooks/useInvestData';
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
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  ThumbsUp,
  ThumbsDown,
  Gavel,
  PlusCircle,
  Coins,
  Loader2,
  ChevronDown,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  mockProposals,
  mockProperties,
  type ActiveProposal,
  type PastProposal,
} from '@/data/investMockData';

// ─── Types ───────────────────────────────────────────────────────────────────

type VoteChoice = 'yes' | 'no';

interface VoteDialogState {
  open: boolean;
  proposalId: string | null;
  proposalTitle: string;
  choice: VoteChoice | null;
}

interface ActiveProposalWithVote extends Omit<ActiveProposal, 'userVoted'> {
  votesYes: number;
  votesNo: number;
  userVoted: VoteChoice | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function pct(a: number, b: number): number {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

function typeBadgeColor(type: string): string {
  switch (type) {
    case 'Renovation':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'Management':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'Pricing':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'Distribution':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    case 'Strategy':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function InvestProposalsPage() {
  const { data: realProposals = [] } = useProposals();
  // TODO: Replace mockProposals with realProposals when data exists

  // Local mutable state for active proposals (so votes update in place)
  const [activeProposals, setActiveProposals] = useState<ActiveProposalWithVote[]>(
    () =>
      mockProposals.active.map((p) => ({
        ...p,
        userVoted: p.userVoted as VoteChoice | null,
      }))
  );

  // Dialog state
  const [voteDialog, setVoteDialog] = useState<VoteDialogState>({
    open: false,
    proposalId: null,
    proposalTitle: '',
    choice: null,
  });

  const pastProposals: PastProposal[] = mockProposals.past;

  // Submit proposal state
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitStep, setSubmitStep] = useState<'form' | 'approving' | 'submitting' | 'success'>('form');
  const [submitPropertyId, setSubmitPropertyId] = useState<number | null>(null);
  const [submitDescription, setSubmitDescription] = useState('');
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const proposalFee = 10; // ~10 USDC in STAY tokens

  const selectedProperty = mockProperties.find((p) => p.id === submitPropertyId);

  function openSubmitModal() {
    setSubmitStep('form');
    setSubmitPropertyId(null);
    setSubmitDescription('');
    setSubmitOpen(true);
  }

  function handleSubmitProposal() {
    if (!submitPropertyId || !submitDescription.trim()) return;
    setSubmitStep('approving');
    // Simulate approve step (1.5s)
    setTimeout(() => {
      setSubmitStep('submitting');
      // Simulate on-chain submission (2s)
      setTimeout(() => {
        setSubmitStep('success');
      }, 2000);
    }, 1500);
  }

  function closeSubmitModal() {
    setSubmitOpen(false);
    setSubmitStep('form');
    setSubmitPropertyId(null);
    setSubmitDescription('');
    setPropertyDropdownOpen(false);
  }

  // Derived stats
  const stats = useMemo(() => {
    const votesCast = activeProposals.filter((p) => p.userVoted !== null).length;
    return {
      activeCount: activeProposals.length,
      votesCast,
      thisMonth: activeProposals.length,
    };
  }, [activeProposals]);

  // ─── Vote handlers ──────────────────────────────────────────────────────

  function openVoteDialog(proposalId: string, title: string, choice: VoteChoice) {
    setVoteDialog({ open: true, proposalId, proposalTitle: title, choice });
  }

  function confirmVote() {
    if (!voteDialog.proposalId || !voteDialog.choice) return;
    setActiveProposals((prev) =>
      prev.map((p) => {
        if (p.id !== voteDialog.proposalId) return p;
        return {
          ...p,
          votesYes: voteDialog.choice === 'yes' ? p.votesYes + 1 : p.votesYes,
          votesNo: voteDialog.choice === 'no' ? p.votesNo + 1 : p.votesNo,
          userVoted: voteDialog.choice,
        };
      })
    );
    setVoteDialog({ open: false, proposalId: null, proposalTitle: '', choice: null });
  }

  function cancelVote() {
    setVoteDialog({ open: false, proposalId: null, proposalTitle: '', choice: null });
  }

  // ─── Shared sub-components ─────────────────────────────────────────────

  function VoteBar({ yes, no, total }: { yes: number; no: number; total: number }) {
    const yesPct = pct(yes, total);
    const noPct = pct(no, total);
    const voted = yes + no;
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="text-emerald-400">{yesPct}% Yes ({yes})</span>
          <span className="text-muted-foreground">{noPct}% No ({no})</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
          {voted > 0 && (
            <>
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${pct(yes, voted)}%` }}
              />
              <div
                className="h-full bg-muted-foreground/40 transition-all duration-500"
                style={{ width: `${pct(no, voted)}%` }}
              />
            </>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {voted} of {total} shares voted
        </p>
      </div>
    );
  }

  function QuorumBar({ current, quorum }: { current: number; quorum: number }) {
    const reached = current >= quorum;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Quorum</span>
          <span className={cn(reached ? 'text-emerald-400' : 'text-amber-400')}>
            {current}/{quorum} {reached ? '(reached)' : ''}
          </span>
        </div>
        <Progress value={Math.min(pct(current, quorum), 100)} className="h-1.5" />
      </div>
    );
  }

  function VoteButtons({ proposal }: { proposal: ActiveProposalWithVote }) {
    if (proposal.userVoted) {
      return (
        <Badge
          variant="outline"
          className={cn(
            'text-sm px-3 py-1.5',
            proposal.userVoted === 'yes'
              ? 'border-emerald-500/40 text-emerald-400'
              : 'border-muted-foreground/40 text-muted-foreground'
          )}
        >
          {proposal.userVoted === 'yes' ? (
            <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
          ) : (
            <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
          )}
          You voted {proposal.userVoted === 'yes' ? 'Yes' : 'No'}
        </Badge>
      );
    }
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => openVoteDialog(proposal.id, proposal.title, 'yes')}
        >
          <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
          Vote Yes
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-muted-foreground border-muted-foreground/40 hover:bg-muted"
          onClick={() => openVoteDialog(proposal.id, proposal.title, 'no')}
        >
          <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
          Vote No
        </Button>
      </div>
    );
  }

  function ResultBadge({ result }: { result: 'approved' | 'rejected' }) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'text-xs',
          result === 'approved'
            ? 'border-emerald-500/40 text-emerald-400'
            : 'border-muted-foreground/40 text-muted-foreground'
        )}
      >
        {result === 'approved' ? (
          <CheckCircle2 className="w-3 h-3 mr-1" />
        ) : (
          <XCircle className="w-3 h-3 mr-1" />
        )}
        {result === 'approved' ? 'Approved' : 'Rejected'}
      </Badge>
    );
  }

  // ─── Version 1 Content ─────────────────────────────────────────────────

  const proposalPropertyImages: Record<number, string> = {
    1: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=200&q=80',
    2: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=200&q=80',
  };

  const [filterType, setFilterType] = useState<string>('all');
  const filtered = filterType === 'all' ? activeProposals : activeProposals.filter((p) => p.type === filterType);
  const filteredPast = filterType === 'all' ? pastProposals : pastProposals.filter((p) => p.type === filterType);
  const types = ['all', ...Array.from(new Set([...activeProposals.map((p) => p.type), ...pastProposals.map((p) => p.type)]))];

  // Merge active and past chronologically (newest first)
  const timeline = useMemo(() => {
    const items: Array<
      | { kind: 'active'; data: ActiveProposalWithVote }
      | { kind: 'past'; data: PastProposal }
    > = [
      ...filtered.map((d) => ({ kind: 'active' as const, data: d })),
      ...filteredPast.map((d) => ({ kind: 'past' as const, data: d })),
    ];
    items.sort(
      (a, b) =>
        new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
    );
    return items;
  }, [filtered, filteredPast]);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Governance Proposals</h1>
        <p className="text-sm text-muted-foreground">
          Vote on property decisions and shape your partnership outcomes.
        </p>
      </div>

      {/* Content */}
      <div className="flex gap-6">
        {/* Left sticky sidebar */}
        <div className="w-80 flex-shrink-0 space-y-4 sticky top-6 self-start">
          {/* Governance Stats */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gavel className="h-4 w-4 text-primary" />
                Governance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active</span>
                <span className="font-bold">{stats.activeCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Votes</span>
                <span className="font-bold">{stats.votesCast}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Past</span>
                <span className="font-bold">{pastProposals.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Filter by Type */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {types.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 rounded text-sm transition capitalize',
                    filterType === t
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted'
                  )}
                >
                  {t}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Submit a Proposal */}
          <Card className="border-dashed">
            <CardContent className="pt-5 space-y-3">
              <Button className="w-full gap-2" onClick={openSubmitModal}>
                <PlusCircle className="h-4 w-4" />
                Submit a Proposal
              </Button>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Coins className="h-3 w-3" />
                <span>Fee: ~{proposalFee} USDC in STAY tokens</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                You must own shares in a property to submit a proposal. Proposals are open for 30 days.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right main area — Timeline */}
        <div className="flex-1">
          <div className="relative pl-8">
            {/* Timeline line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-6">
              {timeline.map((item) => {
                const isActive = item.kind === 'active';
                const p = item.data;

                return (
                  <div key={p.id} className="relative">
                    {/* Dot */}
                    <div
                      className={cn(
                        'absolute -left-5 top-2 w-3 h-3 rounded-full border-2',
                        isActive
                          ? 'bg-emerald-500 border-emerald-400'
                          : 'bg-muted-foreground/40 border-muted-foreground/30'
                      )}
                    />

                    <Card
                      className={cn(
                        isActive
                          ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
                          : 'border-muted opacity-75'
                      )}
                    >
                      <CardContent className="pt-5 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Property image thumbnail */}
                              <img
                                src={proposalPropertyImages[p.propertyId] || ''}
                                alt={p.propertyTitle}
                                className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                              />
                              <Badge variant="outline" className="text-[11px]">{p.propertyTitle}</Badge>
                              <Badge variant="outline" className={cn('text-[11px]', typeBadgeColor(p.type))}>{p.type}</Badge>
                              {isActive && (
                                <Badge className="text-[11px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <h3 className={cn('font-semibold', isActive ? 'text-base' : 'text-sm')}>
                              {p.title}
                            </h3>
                            {isActive && (
                              <p className="text-sm text-muted-foreground">
                                {(p as ActiveProposalWithVote).description}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {p.createdAt}
                          </span>
                        </div>

                        {isActive ? (
                          <>
                            <VoteBar
                              yes={(p as ActiveProposalWithVote).votesYes}
                              no={(p as ActiveProposalWithVote).votesNo}
                              total={(p as ActiveProposalWithVote).totalVotes}
                            />
                            <QuorumBar
                              current={
                                (p as ActiveProposalWithVote).votesYes +
                                (p as ActiveProposalWithVote).votesNo
                              }
                              quorum={(p as ActiveProposalWithVote).quorum}
                            />
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">
                                <Clock className="w-3 h-3 mr-1" />
                                Ends in {daysUntil((p as ActiveProposalWithVote).endsAt)} days
                              </Badge>
                              <VoteButtons proposal={p as ActiveProposalWithVote} />
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {(p as PastProposal).votesYes} yes / {(p as PastProposal).votesNo} no
                            </span>
                            <ResultBadge result={(p as PastProposal).result} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog (shared) */}
      <Dialog open={voteDialog.open} onOpenChange={(open) => !open && cancelVote()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Vote</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to vote{' '}
            <span
              className={cn(
                'font-semibold',
                voteDialog.choice === 'yes' ? 'text-emerald-400' : 'text-muted-foreground'
              )}
            >
              {voteDialog.choice === 'yes' ? 'Yes' : 'No'}
            </span>{' '}
            on &lsquo;{voteDialog.proposalTitle}&rsquo;?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelVote}>
              Cancel
            </Button>
            <Button
              className={cn(
                voteDialog.choice === 'yes'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-muted-foreground hover:bg-muted-foreground/80 text-white'
              )}
              onClick={confirmVote}
            >
              {voteDialog.choice === 'yes' ? (
                <ThumbsUp className="w-4 h-4 mr-1.5" />
              ) : (
                <ThumbsDown className="w-4 h-4 mr-1.5" />
              )}
              Confirm {voteDialog.choice === 'yes' ? 'Yes' : 'No'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Proposal Modal */}
      <Dialog open={submitOpen} onOpenChange={(open) => !open && closeSubmitModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {submitStep === 'success' ? 'Proposal Submitted' : 'Submit a Proposal'}
            </DialogTitle>
            {submitStep === 'form' && (
              <DialogDescription>
                Propose a decision for shareholders to vote on. Your proposal will be open for 30 days.
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Form step */}
          {submitStep === 'form' && (
            <div className="space-y-4 py-2">
              {/* Property selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Property</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors',
                      'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20',
                      submitPropertyId ? 'border-border' : 'border-dashed border-muted-foreground/30'
                    )}
                  >
                    {selectedProperty ? (
                      <>
                        <img
                          src={selectedProperty.image}
                          alt={selectedProperty.title}
                          className="h-9 w-9 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{selectedProperty.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" />
                            {selectedProperty.location}
                          </p>
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Choose a property...</span>
                    )}
                    <ChevronDown className={cn(
                      'h-4 w-4 text-muted-foreground ml-auto transition-transform',
                      propertyDropdownOpen && 'rotate-180'
                    )} />
                  </button>

                  {propertyDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg overflow-hidden">
                      {mockProperties.map((prop) => (
                        <button
                          key={prop.id}
                          type="button"
                          onClick={() => {
                            setSubmitPropertyId(prop.id);
                            setPropertyDropdownOpen(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-muted transition-colors',
                            submitPropertyId === prop.id && 'bg-primary/5'
                          )}
                        >
                          <img
                            src={prop.image}
                            alt={prop.title}
                            className="h-9 w-9 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{prop.title}</p>
                            <p className="text-xs text-muted-foreground">{prop.location}</p>
                          </div>
                          {submitPropertyId === prop.id && (
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Proposal Description</label>
                <textarea
                  value={submitDescription}
                  onChange={(e) => setSubmitDescription(e.target.value)}
                  placeholder="Describe what you're proposing and why shareholders should vote for it..."
                  rows={4}
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
                <p className="text-[11px] text-muted-foreground">
                  Be clear and specific. Good proposals explain the expected impact on rental income or property value.
                </p>
              </div>

              {/* Fee notice */}
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
                <Coins className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-amber-600 dark:text-amber-400">
                    Proposal fee: ~{proposalFee} USDC in STAY tokens
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    STAY tokens will be deducted from your wallet to prevent spam proposals.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeSubmitModal}>
                  Cancel
                </Button>
                <Button
                  disabled={!submitPropertyId || !submitDescription.trim()}
                  onClick={handleSubmitProposal}
                  className="gap-2"
                >
                  <Gavel className="h-4 w-4" />
                  Submit Proposal
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Approving step */}
          {submitStep === 'approving' && (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <div>
                <p className="font-semibold">Approving STAY tokens (1/2)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please confirm the approval in your wallet...
                </p>
              </div>
              <Progress value={33} className="h-1.5 w-48" />
            </div>
          )}

          {/* Submitting step */}
          {submitStep === 'submitting' && (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <div>
                <p className="font-semibold">Submitting proposal (2/2)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Creating your proposal on-chain...
                </p>
              </div>
              <Progress value={66} className="h-1.5 w-48" />
            </div>
          )}

          {/* Success step */}
          {submitStep === 'success' && (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-lg">Proposal submitted!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your proposal for <span className="font-medium text-foreground">{selectedProperty?.title}</span> is now live.
                  Shareholders have 30 days to vote.
                </p>
              </div>
              {selectedProperty && (
                <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
                  <img
                    src={selectedProperty.image}
                    alt={selectedProperty.title}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <div className="text-left text-sm">
                    <p className="font-medium">{selectedProperty.title}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {submitDescription}
                    </p>
                  </div>
                </div>
              )}
              <DialogFooter className="w-full">
                <Button className="w-full" onClick={closeSubmitModal}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
