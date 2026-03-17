import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Vote,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
  Users,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Gavel,
  Landmark,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  mockProposals,
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
  const [version, setVersion] = useState(1);

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
          <span className="text-red-400">{noPct}% No ({no})</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
          {voted > 0 && (
            <>
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${pct(yes, voted)}%` }}
              />
              <div
                className="h-full bg-red-500 transition-all duration-500"
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
              : 'border-red-500/40 text-red-400'
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
          variant="destructive"
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
            : 'border-red-500/40 text-red-400'
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

  // ─── VERSION 1 — Card Stack ────────────────────────────────────────────

  function Version1() {
    return (
      <div className="space-y-8">
        {/* Active Proposals */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Gavel className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Active Proposals</h2>
            <Badge variant="secondary" className="ml-1">{activeProposals.length}</Badge>
          </div>
          <div className="space-y-4">
            {activeProposals.map((p) => (
              <Card key={p.id} className="border-primary/20">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Landmark className="w-3 h-3 mr-1" />
                          {p.propertyTitle}
                        </Badge>
                        <Badge variant="outline" className={cn('text-xs', typeBadgeColor(p.type))}>
                          {p.type}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold">{p.title}</h3>
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30 shrink-0">
                      <Clock className="w-3 h-3 mr-1" />
                      Ends in {daysUntil(p.endsAt)} days
                    </Badge>
                  </div>

                  <VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} />
                  <QuorumBar current={p.votesYes + p.votesNo} quorum={p.quorum} />

                  <div className="flex justify-end">
                    <VoteButtons proposal={p} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Past Proposals */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-bold">Past Proposals</h2>
            <Badge variant="secondary" className="ml-1">{pastProposals.length}</Badge>
          </div>
          <div className="space-y-3">
            {pastProposals.map((p) => (
              <Card key={p.id} className="border-muted">
                <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[11px]">{p.propertyTitle}</Badge>
                      <Badge variant="outline" className={cn('text-[11px]', typeBadgeColor(p.type))}>{p.type}</Badge>
                    </div>
                    <p className="font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.votesYes} yes / {p.votesNo} no &middot; ended {p.endsAt}
                    </p>
                  </div>
                  <ResultBadge result={p.result} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // ─── VERSION 2 — Dashboard Grid ────────────────────────────────────────

  function Version2() {
    const [pastOpen, setPastOpen] = useState(false);

    return (
      <div className="space-y-6">
        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Proposals', value: stats.activeCount, icon: Vote },
            { label: 'Your Votes Cast', value: stats.votesCast, icon: CheckCircle2 },
            { label: 'Proposals This Month', value: stats.thisMonth, icon: Calendar },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active — 2-column grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Active Proposals</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {activeProposals.map((p) => (
              <Card key={p.id} className="border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={cn('text-xs', typeBadgeColor(p.type))}>{p.type}</Badge>
                    <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">
                      <Clock className="w-3 h-3 mr-1" />
                      {daysUntil(p.endsAt)}d left
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-1">{p.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{p.propertyTitle}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} />
                  <QuorumBar current={p.votesYes + p.votesNo} quorum={p.quorum} />
                  <div className="flex justify-end pt-1">
                    <VoteButtons proposal={p} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Past — collapsible table */}
        <div>
          <button
            onClick={() => setPastOpen(!pastOpen)}
            className="flex items-center gap-2 text-lg font-semibold hover:text-primary transition-colors"
          >
            Past Proposals
            <Badge variant="secondary" className="text-xs">{pastProposals.length}</Badge>
            {pastOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {pastOpen && (
            <div className="mt-3 border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Proposal</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Property</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Votes</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {pastProposals.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{p.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.propertyTitle}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn('text-[11px]', typeBadgeColor(p.type))}>{p.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.votesYes}Y / {p.votesNo}N</td>
                      <td className="px-4 py-3"><ResultBadge result={p.result} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── VERSION 3 — Timeline ──────────────────────────────────────────────

  function Version3() {
    // Merge active and past chronologically (newest first)
    const timeline = useMemo(() => {
      const items: Array<
        | { kind: 'active'; data: ActiveProposalWithVote }
        | { kind: 'past'; data: PastProposal }
      > = [
        ...activeProposals.map((d) => ({ kind: 'active' as const, data: d })),
        ...pastProposals.map((d) => ({ kind: 'past' as const, data: d })),
      ];
      items.sort(
        (a, b) =>
          new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
      );
      return items;
    }, [activeProposals, pastProposals]);

    return (
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
    );
  }

  // ─── VERSION 4 — Tabbed View ───────────────────────────────────────────

  function Version4() {
    const myVotes = activeProposals.filter((p) => p.userVoted !== null);

    return (
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active ({activeProposals.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastProposals.length})</TabsTrigger>
          <TabsTrigger value="myvotes">My Votes ({myVotes.length})</TabsTrigger>
        </TabsList>

        {/* Active Tab */}
        <TabsContent value="active" className="space-y-4">
          {activeProposals.map((p) => (
            <Card key={p.id} className="border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">{p.propertyTitle}</Badge>
                      <Badge variant="outline" className={cn('text-xs', typeBadgeColor(p.type))}>{p.type}</Badge>
                    </div>
                    <h3 className="text-lg font-semibold">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30 shrink-0">
                    <Clock className="w-3 h-3 mr-1" />
                    {daysUntil(p.endsAt)}d left
                  </Badge>
                </div>
                <VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} />
                <QuorumBar current={p.votesYes + p.votesNo} quorum={p.quorum} />
                <div className="flex justify-end">
                  <VoteButtons proposal={p} />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Past Tab */}
        <TabsContent value="past">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Property</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Proposal</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Result</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Votes</th>
                </tr>
              </thead>
              <tbody>
                {pastProposals.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{p.propertyTitle}</td>
                    <td className="px-4 py-3 font-medium">{p.title}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn('text-[11px]', typeBadgeColor(p.type))}>{p.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.endsAt}</td>
                    <td className="px-4 py-3"><ResultBadge result={p.result} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {p.votesYes}Y / {p.votesNo}N
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* My Votes Tab */}
        <TabsContent value="myvotes">
          {myVotes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-3">
                <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground/50" />
                <h3 className="font-semibold text-lg">You haven't voted on any proposals yet.</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Active proposals need your input! Head to the Active tab to cast your votes and
                  shape the future of your investments.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myVotes.map((p) => (
                <Card key={p.id}>
                  <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.propertyTitle}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-sm',
                        p.userVoted === 'yes'
                          ? 'border-emerald-500/40 text-emerald-400'
                          : 'border-red-500/40 text-red-400'
                      )}
                    >
                      {p.userVoted === 'yes' ? (
                        <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                      ) : (
                        <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Voted {p.userVoted === 'yes' ? 'Yes' : 'No'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    );
  }

  // ─── VERSION 5 — Minimal List ──────────────────────────────────────────

  function Version5() {
    return (
      <div className="space-y-6">
        {/* Top bar with filter */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Proposals</h2>
          <Button variant="outline" size="sm" className="text-xs">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            All Properties
            <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

        {/* Active list */}
        <div className="divide-y">
          {activeProposals.map((p) => (
            <div key={p.id} className="py-5 first:pt-0 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <h3 className="text-lg font-semibold leading-tight">{p.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{p.propertyTitle}</span>
                    <span>&middot;</span>
                    <Badge variant="outline" className={cn('text-[11px]', typeBadgeColor(p.type))}>{p.type}</Badge>
                    <span>&middot;</span>
                    <span className="text-amber-400">{daysUntil(p.endsAt)}d left</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex-1 min-w-[200px] max-w-md">
                  <VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} />
                </div>
                <VoteButtons proposal={p} />
              </div>
            </div>
          ))}
        </div>

        {/* Past list */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Past Proposals
          </p>
          <div className="divide-y">
            {pastProposals.map((p) => (
              <div
                key={p.id}
                className="py-3 first:pt-0 flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-muted-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground/60">
                    {p.propertyTitle} &middot; {p.endsAt} &middot; {p.votesYes}Y / {p.votesNo}N
                  </p>
                </div>
                <ResultBadge result={p.result} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── VERSION 6 — Bento Grid ────────────────────────────────────────────

  function Version6() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-3 auto-rows-[100px]">
          <div className="col-span-1 row-span-1 flex flex-col items-center justify-center rounded-2xl bg-primary/10 p-4">
            <p className="text-3xl font-bold text-primary">{stats.activeCount}</p>
            <p className="text-[10px] text-muted-foreground">Active</p>
          </div>
          <div className="col-span-1 row-span-1 flex flex-col items-center justify-center rounded-2xl bg-emerald-500/10 p-4">
            <p className="text-3xl font-bold text-emerald-500">{stats.votesCast}</p>
            <p className="text-[10px] text-muted-foreground">Your Votes</p>
          </div>
          <div className="col-span-1 row-span-1 flex flex-col items-center justify-center rounded-2xl bg-amber-500/10 p-4">
            <p className="text-3xl font-bold text-amber-500">{pastProposals.length}</p>
            <p className="text-[10px] text-muted-foreground">Past</p>
          </div>
          <div className="col-span-1 row-span-1 flex flex-col items-center justify-center rounded-2xl border bg-card p-4">
            <p className="text-3xl font-bold">{pastProposals.filter((p) => p.result === 'approved').length}</p>
            <p className="text-[10px] text-muted-foreground">Approved</p>
          </div>
        </div>

        {activeProposals.map((p) => (
          <Card key={p.id} className="rounded-2xl border-primary/20">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn('text-xs', typeBadgeColor(p.type))}>{p.type}</Badge>
                    <span className="text-xs text-muted-foreground">{p.propertyTitle}</span>
                  </div>
                  <h3 className="text-lg font-bold">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                </div>
                <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30 shrink-0">
                  {daysUntil(p.endsAt)}d
                </Badge>
              </div>
              <VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} />
              <div className="flex justify-end"><VoteButtons proposal={p} /></div>
            </CardContent>
          </Card>
        ))}

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm">Past Proposals</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {pastProposals.map((p) => (
              <div key={p.id} className="flex justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.propertyTitle} | {p.votesYes}Y / {p.votesNo}N</p>
                </div>
                <ResultBadge result={p.result} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── VERSION 7 — Glassmorphism ─────────────────────────────────────────

  function Version7() {
    return (
      <div className="min-h-screen rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-8 text-white">
        <h2 className="text-3xl font-bold mb-1">Governance</h2>
        <p className="text-white/40 mb-8">Vote on property decisions</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Active', value: stats.activeCount },
            { label: 'Your Votes', value: stats.votesCast },
            { label: 'Past', value: pastProposals.length },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 text-center">
              <p className="text-2xl font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{item.value}</p>
              <p className="text-xs text-white/40 mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {activeProposals.map((p) => (
            <div key={p.id} className="rounded-xl bg-white/10 backdrop-blur-xl border border-emerald-500/20 p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-white/10 border-white/20 text-white text-[11px]">{p.type}</Badge>
                    <span className="text-xs text-white/40">{p.propertyTitle}</span>
                  </div>
                  <h3 className="text-lg font-semibold">{p.title}</h3>
                  <p className="text-sm text-white/50 mt-1">{p.description}</p>
                </div>
                <span className="text-xs text-amber-400">{daysUntil(p.endsAt)}d left</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400">{pct(p.votesYes, p.totalVotes)}% Yes</span>
                  <span className="text-red-400">{pct(p.votesNo, p.totalVotes)}% No</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/10 overflow-hidden flex">
                  {(p.votesYes + p.votesNo) > 0 && (
                    <>
                      <div className="h-full bg-emerald-500/70" style={{ width: `${pct(p.votesYes, p.votesYes + p.votesNo)}%` }} />
                      <div className="h-full bg-red-500/70" style={{ width: `${pct(p.votesNo, p.votesYes + p.votesNo)}%` }} />
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end"><VoteButtons proposal={p} /></div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-4">Past Proposals</p>
          {pastProposals.map((p) => (
            <div key={p.id} className="flex justify-between py-3 border-b border-white/5 last:border-0 text-sm">
              <div>
                <p>{p.title}</p>
                <p className="text-xs text-white/30">{p.propertyTitle}</p>
              </div>
              <ResultBadge result={p.result} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── VERSION 8 — Neubrutalism ──────────────────────────────────────────

  function Version8() {
    return (
      <div className="space-y-5">
        <div className="border-2 border-black bg-pink-300 p-6 shadow-[6px_6px_0px_black] rounded-lg">
          <h2 className="text-3xl font-black uppercase">GOVERNANCE</h2>
          <p className="text-lg font-bold">{stats.activeCount} ACTIVE PROPOSALS</p>
        </div>

        {activeProposals.map((p) => (
          <div key={p.id} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0px_black] rounded-lg space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block bg-yellow-300 border border-black px-2 py-0.5 text-xs font-black uppercase mr-2">{p.type}</span>
                <span className="text-xs font-bold">{p.propertyTitle}</span>
                <h3 className="text-xl font-black uppercase mt-1">{p.title}</h3>
                <p className="text-sm font-medium mt-1">{p.description}</p>
              </div>
              <span className="border-2 border-black bg-orange-300 px-2 py-1 text-xs font-black">{daysUntil(p.endsAt)}D LEFT</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-black">
                <span>YES: {p.votesYes}</span>
                <span>NO: {p.votesNo}</span>
              </div>
              <div className="h-5 border-2 border-black rounded overflow-hidden flex bg-white">
                {(p.votesYes + p.votesNo) > 0 && (
                  <>
                    <div className="h-full bg-lime-300" style={{ width: `${pct(p.votesYes, p.votesYes + p.votesNo)}%` }} />
                    <div className="h-full bg-pink-300" style={{ width: `${pct(p.votesNo, p.votesYes + p.votesNo)}%` }} />
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end"><VoteButtons proposal={p} /></div>
          </div>
        ))}

        <div className="border-2 border-black bg-white p-5 shadow-[4px_4px_0px_black] rounded-lg">
          <h3 className="text-xl font-black uppercase mb-3">PAST PROPOSALS</h3>
          {pastProposals.map((p) => (
            <div key={p.id} className="flex justify-between border-b-2 border-black py-3 last:border-0">
              <div>
                <p className="font-bold">{p.title}</p>
                <p className="text-xs font-bold">{p.propertyTitle} | {p.votesYes}Y / {p.votesNo}N</p>
              </div>
              <span className={cn('font-black uppercase', p.result === 'approved' ? 'text-lime-600' : 'text-red-600')}>
                {p.result}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── VERSION 9 — Dark Luxury ───────────────────────────────────────────

  function Version9() {
    return (
      <div className="min-h-screen rounded-3xl bg-slate-950 p-8 text-white">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-3 pt-8">
            <p className="text-amber-400/80 text-xs uppercase tracking-[0.4em]">Shareholder Governance</p>
            <h2 className="text-4xl font-light tracking-tight">Active Proposals</h2>
            <div className="w-16 h-px bg-amber-400/40 mx-auto" />
          </div>

          {activeProposals.map((p) => (
            <div key={p.id} className="border border-amber-400/10 rounded-xl p-8 space-y-6">
              <div>
                <p className="text-amber-400/50 text-xs uppercase tracking-[0.2em]">{p.propertyTitle} | {p.type}</p>
                <h3 className="text-2xl font-light mt-2">{p.title}</h3>
                <p className="text-white/30 text-sm mt-2">{p.description}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400/60">{pct(p.votesYes, p.totalVotes)}% Yes</span>
                  <span className="text-red-400/60">{pct(p.votesNo, p.totalVotes)}% No</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex">
                  <div className="h-full bg-amber-400/60" style={{ width: `${pct(p.votesYes, p.votesYes + p.votesNo || 1)}%` }} />
                  <div className="h-full bg-red-400/40" style={{ width: `${pct(p.votesNo, p.votesYes + p.votesNo || 1)}%` }} />
                </div>
                <p className="text-[10px] text-white/20">{p.votesYes + p.votesNo} of {p.totalVotes} shares voted | {daysUntil(p.endsAt)} days remaining</p>
              </div>

              <div className="flex justify-end"><VoteButtons proposal={p} /></div>
            </div>
          ))}

          <div className="border-t border-white/5 pt-8">
            <p className="text-white/20 text-xs uppercase tracking-[0.3em] mb-6">Past Decisions</p>
            {pastProposals.map((p) => (
              <div key={p.id} className="flex justify-between py-4 border-b border-white/5 last:border-0">
                <div>
                  <p className="font-light">{p.title}</p>
                  <p className="text-white/20 text-xs mt-1">{p.propertyTitle}</p>
                </div>
                <ResultBadge result={p.result} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── VERSION 10 — Animated ─────────────────────────────────────────────

  function Version10() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active', value: stats.activeCount, color: 'text-primary' },
            { label: 'Your Votes', value: stats.votesCast, color: 'text-emerald-500' },
            { label: 'Past', value: pastProposals.length, color: 'text-muted-foreground' },
          ].map((item) => (
            <Card key={item.label} className="rounded-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-xl">
              <CardContent className="p-5 text-center relative">
                {item.label === 'Active' && (
                  <div className="absolute top-3 right-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                  </div>
                )}
                <p className={cn('text-3xl font-bold', item.color)}>{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {activeProposals.map((p) => (
          <Card key={p.id} className="rounded-2xl border-primary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn('text-xs', typeBadgeColor(p.type))}>{p.type}</Badge>
                    <span className="text-xs text-muted-foreground">{p.propertyTitle}</span>
                  </div>
                  <h3 className="text-lg font-semibold">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                </div>
                <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30 shrink-0 animate-pulse">
                  {daysUntil(p.endsAt)}d left
                </Badge>
              </div>

              <VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} />
              <QuorumBar current={p.votesYes + p.votesNo} quorum={p.quorum} />
              <div className="flex justify-end"><VoteButtons proposal={p} /></div>
            </CardContent>
          </Card>
        ))}

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm">Past Proposals</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {pastProposals.map((p) => (
              <div key={p.id} className="flex justify-between py-3 text-sm transition-all duration-200 hover:bg-muted/30 -mx-6 px-6 rounded">
                <div><p className="font-medium">{p.title}</p><p className="text-xs text-muted-foreground">{p.propertyTitle}</p></div>
                <ResultBadge result={p.result} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── VERSION 11 — Magazine ─────────────────────────────────────────────

  function Version11() {
    return (
      <div className="space-y-10 font-serif">
        <div className="border-b-2 border-foreground pb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-2">Shareholder Voice</p>
          <h2 className="text-5xl font-bold leading-tight">Governance Proposals</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-8">
            <div className="border-l-4 border-primary pl-6 py-2">
              <p className="text-6xl font-bold">{stats.activeCount}</p>
              <p className="text-sm text-muted-foreground italic mt-1">Active proposals requiring your vote</p>
            </div>
            <div className="border-l-4 border-muted pl-6 py-2">
              <p className="text-4xl font-bold">{stats.votesCast}</p>
              <p className="text-sm text-muted-foreground italic mt-1">Votes you have cast</p>
            </div>
            <div className="border-l-4 border-muted pl-6 py-2">
              <p className="text-4xl font-bold">{pastProposals.filter((p) => p.result === 'approved').length}/{pastProposals.length}</p>
              <p className="text-sm text-muted-foreground italic mt-1">Past proposals approved</p>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {activeProposals.map((p) => (
              <div key={p.id} className="border-b pb-6 last:border-0 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground italic">{p.propertyTitle} | {p.type} | {daysUntil(p.endsAt)} days left</p>
                  <h3 className="text-2xl font-bold mt-1">{p.title}</h3>
                  <p className="text-base text-muted-foreground mt-2 leading-relaxed">{p.description}</p>
                </div>
                <VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} />
                <div className="flex justify-end font-sans"><VoteButtons proposal={p} /></div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm uppercase tracking-wider text-muted-foreground font-sans mb-4">Past Proposals</p>
          {pastProposals.map((p) => (
            <div key={p.id} className="flex justify-between border-b py-3 last:border-0 text-sm">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground italic">{p.propertyTitle}</p>
              </div>
              <ResultBadge result={p.result} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── VERSION 12 — Terminal ─────────────────────────────────────────────

  function Version12() {
    return (
      <div className="min-h-screen rounded-2xl bg-[#0a0e14] p-6 font-mono text-green-400">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-green-600">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            nfstay-governance v2.0 -- shareholder voting interface
          </div>

          <div className="border border-green-900/50 rounded-lg p-4 bg-green-950/20">
            <p className="text-green-600 text-xs mb-1">$ governance --status</p>
            <pre className="text-sm">{`
ACTIVE PROPOSALS   ${stats.activeCount}
YOUR VOTES CAST    ${stats.votesCast}
PAST PROPOSALS     ${pastProposals.length}
APPROVAL RATE      ${Math.round(pastProposals.filter((p) => p.result === 'approved').length / pastProposals.length * 100)}%`}</pre>
          </div>

          {activeProposals.map((p) => (
            <div key={p.id} className="border border-green-900/50 rounded-lg p-4 bg-green-950/20 space-y-3">
              <p className="text-green-600 text-xs">$ cat proposal/{p.id}</p>
              <div>
                <p className="text-sm font-bold">{p.title}</p>
                <p className="text-xs text-green-600">[{p.type}] {p.propertyTitle} | expires in {daysUntil(p.endsAt)}d</p>
                <p className="text-xs text-green-500/70 mt-1">{p.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-green-950 rounded overflow-hidden border border-green-900/50 flex">
                  {(p.votesYes + p.votesNo) > 0 && (
                    <>
                      <div className="h-full bg-green-500/60" style={{ width: `${pct(p.votesYes, p.votesYes + p.votesNo)}%` }} />
                      <div className="h-full bg-red-500/40" style={{ width: `${pct(p.votesNo, p.votesYes + p.votesNo)}%` }} />
                    </>
                  )}
                </div>
                <span className="text-xs">{p.votesYes}Y/{p.votesNo}N</span>
              </div>
              {!p.userVoted && (
                <div className="flex gap-2">
                  <button onClick={() => openVoteDialog(p.id, p.title, 'yes')} className="border border-green-500 text-green-400 px-3 py-1 rounded text-xs hover:bg-green-500/10">vote --yes</button>
                  <button onClick={() => openVoteDialog(p.id, p.title, 'no')} className="border border-red-500 text-red-400 px-3 py-1 rounded text-xs hover:bg-red-500/10">vote --no</button>
                </div>
              )}
              {p.userVoted && <p className="text-xs text-green-600">[VOTED: {p.userVoted.toUpperCase()}]</p>}
            </div>
          ))}

          <div className="border border-green-900/50 rounded-lg p-4 bg-green-950/20">
            <p className="text-green-600 text-xs mb-2">$ governance --past</p>
            {pastProposals.map((p) => (
              <p key={p.id} className="text-sm py-1">
                <span className={p.result === 'approved' ? 'text-green-400' : 'text-red-400'}>[{p.result.toUpperCase().padEnd(8)}]</span> {p.title}
              </p>
            ))}
          </div>

          <div className="text-green-600 text-xs">$ <span className="text-green-400 animate-pulse">_</span></div>
        </div>
      </div>
    );
  }

  // ─── VERSION 13 — Gamified ─────────────────────────────────────────────

  function Version13() {
    const governanceLevel = stats.votesCast * 2 + pastProposals.length;

    return (
      <div className="space-y-6">
        <Card className="rounded-2xl bg-gradient-to-r from-purple-500/10 via-primary/5 to-amber-500/10 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-1">GOVERNANCE QUEST</Badge>
                <h2 className="text-2xl font-bold">Shareholder Voting</h2>
                <p className="text-sm text-muted-foreground">{activeProposals.length} proposals need your vote</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Gov. Level</p>
                <p className="text-3xl font-bold text-amber-400">{governanceLevel}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span>Participation XP</span>
                <span className="text-amber-400">{stats.votesCast}/{activeProposals.length} voted</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-amber-500" style={{ width: `${activeProposals.length > 0 ? (stats.votesCast / activeProposals.length) * 100 : 0}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {activeProposals.map((p) => (
          <Card key={p.id} className="rounded-2xl border-2 hover:border-primary/30 transition-all hover:scale-[1.01]">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn('text-xs', typeBadgeColor(p.type))}>{p.type}</Badge>
                    <span className="text-xs text-muted-foreground">{p.propertyTitle}</span>
                    <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30">+100 XP</Badge>
                  </div>
                  <h3 className="text-lg font-bold">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                </div>
                <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">{daysUntil(p.endsAt)}d</Badge>
              </div>
              <VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} />
              <div className="flex justify-end"><VoteButtons proposal={p} /></div>
            </CardContent>
          </Card>
        ))}

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="flex items-center gap-2"><span>📜</span> Past Decisions</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {pastProposals.map((p) => (
              <div key={p.id} className="flex justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.propertyTitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30">+50 XP earned</Badge>
                  <ResultBadge result={p.result} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── VERSION 14 — Split/Swipe ──────────────────────────────────────────

  function Version14() {
    return (
      <div className="space-y-0">
        <div className="bg-slate-900 text-white p-8 rounded-t-2xl">
          <div className="max-w-4xl mx-auto text-center space-y-2">
            <p className="text-white/50 text-sm">Governance</p>
            <h2 className="text-4xl font-bold">{stats.activeCount} Active Proposals</h2>
            <p className="text-white/30">{stats.votesCast} of {stats.activeCount} voted</p>
          </div>

          <div className="max-w-3xl mx-auto mt-8 space-y-3">
            {activeProposals.map((p) => (
              <div key={p.id} className="bg-white/5 rounded-xl p-5 space-y-4 hover:-translate-y-0.5 transition-transform">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-white/10 border-white/20 text-white text-[11px]">{p.type}</Badge>
                      <span className="text-xs text-white/40">{p.propertyTitle}</span>
                    </div>
                    <h3 className="font-semibold">{p.title}</h3>
                  </div>
                  <span className="text-xs text-amber-400">{daysUntil(p.endsAt)}d</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
                  {(p.votesYes + p.votesNo) > 0 && (
                    <>
                      <div className="h-full bg-emerald-500/70" style={{ width: `${pct(p.votesYes, p.votesYes + p.votesNo)}%` }} />
                      <div className="h-full bg-red-500/70" style={{ width: `${pct(p.votesNo, p.votesYes + p.votesNo)}%` }} />
                    </>
                  )}
                </div>
                <div className="flex justify-end"><VoteButtons proposal={p} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background p-8 rounded-b-2xl border border-t-0">
          <h3 className="text-lg font-semibold mb-4">Past Proposals</h3>
          <div className="divide-y">
            {pastProposals.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-4 hover:-translate-y-0.5 transition-transform">
                <div>
                  <p className="font-medium text-sm">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.propertyTitle} | {p.votesYes}Y / {p.votesNo}N</p>
                </div>
                <ResultBadge result={p.result} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── VERSION 15 — Apple ────────────────────────────────────────────────

  function Version15() {
    return (
      <div className="space-y-20 py-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <p className="text-sm text-muted-foreground tracking-wider uppercase">Governance</p>
          <h2 className="text-6xl font-semibold tracking-tight">Proposals</h2>
          <p className="text-xl text-muted-foreground">{stats.activeCount} decisions need your vote</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-8">
          {activeProposals.map((p) => (
            <div key={p.id} className="space-y-6 p-8 rounded-3xl border bg-card">
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{p.type}</span>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{p.propertyTitle}</span>
                  <span className="rounded-full bg-amber-500/10 text-amber-600 px-3 py-1 text-xs font-medium">{daysUntil(p.endsAt)} days left</span>
                </div>
                <h3 className="text-2xl font-semibold tracking-tight">{p.title}</h3>
                <p className="text-muted-foreground mt-2">{p.description}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-500">{pct(p.votesYes, p.totalVotes)}% Yes</span>
                  <span className="text-red-500">{pct(p.votesNo, p.totalVotes)}% No</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                  {(p.votesYes + p.votesNo) > 0 && (
                    <>
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct(p.votesYes, p.votesYes + p.votesNo)}%` }} />
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct(p.votesNo, p.votesYes + p.votesNo)}%` }} />
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-center gap-3">
                {p.userVoted ? (
                  <span className="rounded-full bg-muted px-5 py-2.5 text-sm font-medium">
                    You voted {p.userVoted === 'yes' ? 'Yes' : 'No'}
                  </span>
                ) : (
                  <>
                    <Button className="rounded-full px-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => openVoteDialog(p.id, p.title, 'yes')}>
                      <ThumbsUp className="w-4 h-4 mr-2" /> Vote Yes
                    </Button>
                    <Button variant="outline" className="rounded-full px-8" onClick={() => openVoteDialog(p.id, p.title, 'no')}>
                      <ThumbsDown className="w-4 h-4 mr-2" /> Vote No
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          <h3 className="text-3xl font-semibold tracking-tight text-center mb-8">Past Decisions</h3>
          <div className="divide-y">
            {pastProposals.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-5">
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm text-muted-foreground">{p.propertyTitle}</p>
                </div>
                <span className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium',
                  p.result === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                )}>
                  {p.result === 'approved' ? 'Approved' : 'Rejected'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }


  // ─── VERSION 16 — Spacious & Breathing ──────────────────────────────────

  function Version16() {
    return (
      <div className="space-y-12 p-12">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Governance</p>
          <h2 className="text-4xl font-bold">Active Proposals</h2>
          <p className="text-lg text-muted-foreground">{activeProposals.length} proposals awaiting your vote</p>
        </div>
        <div className="space-y-8">
          {activeProposals.map((p) => (
            <Card key={p.id} className="rounded-3xl shadow-lg border-primary/20">
              <CardContent className="p-10 space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="text-sm"><Landmark className="w-3.5 h-3.5 mr-1.5" />{p.propertyTitle}</Badge>
                  <Badge variant="outline" className={cn('text-sm', typeBadgeColor(p.type))}>{p.type}</Badge>
                  <Badge variant="outline" className="text-sm text-amber-400 border-amber-500/30"><Clock className="w-3.5 h-3.5 mr-1.5" />{daysUntil(p.endsAt)} days left</Badge>
                </div>
                <h3 className="text-2xl font-bold">{p.title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">{p.description}</p>
                <VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} />
                <QuorumBar current={p.votesYes + p.votesNo} quorum={p.quorum} />
                <div className="flex justify-end pt-4"><VoteButtons proposal={p} /></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <h3 className="text-2xl font-semibold text-center">Past Proposals</h3>
          <div className="max-w-2xl mx-auto divide-y">
            {pastProposals.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-6">
                <div><p className="font-semibold text-lg">{p.title}</p><p className="text-muted-foreground">{p.propertyTitle} &middot; {p.type}</p></div>
                <ResultBadge result={p.result} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── VERSION 17 — Tight & Dense ─────────────────────────────────────────

  function Version17() {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-4 border-b pb-2 text-xs">
          <span>Active: <strong>{stats.activeCount}</strong></span>
          <span>Your Votes: <strong>{stats.votesCast}</strong></span>
          <span>Past: <strong>{pastProposals.length}</strong></span>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="border-b bg-muted/50"><th className="text-left px-2 py-1 font-medium">Proposal</th><th className="text-left px-2 py-1 font-medium">Property</th><th className="text-left px-2 py-1 font-medium">Type</th><th className="text-left px-2 py-1 font-medium">Votes</th><th className="text-left px-2 py-1 font-medium">Ends</th><th className="text-left px-2 py-1 font-medium">Action</th></tr></thead>
          <tbody>{activeProposals.map((p) => (<tr key={p.id} className="border-b"><td className="px-2 py-1 font-medium">{p.title}</td><td className="px-2 py-1 text-muted-foreground">{p.propertyTitle}</td><td className="px-2 py-1"><Badge variant="outline" className={cn('text-[10px]', typeBadgeColor(p.type))}>{p.type}</Badge></td><td className="px-2 py-1">{p.votesYes}Y/{p.votesNo}N</td><td className="px-2 py-1">{daysUntil(p.endsAt)}d</td><td className="px-2 py-1"><VoteButtons proposal={p} /></td></tr>))}</tbody>
        </table>
        <div className="border-t pt-2"><p className="text-xs font-semibold mb-1">Past</p><div className="divide-y">{pastProposals.map((p) => (<div key={p.id} className="flex items-center justify-between py-1 text-xs"><span className="font-medium">{p.title}</span><span className="text-muted-foreground">{p.propertyTitle}</span><span>{p.votesYes}Y/{p.votesNo}N</span><ResultBadge result={p.result} /></div>))}</div></div>
      </div>
    );
  }

  // ─── VERSION 18 — Hero-Led ──────────────────────────────────────────────

  function Version18() {
    const featured = activeProposals[0];
    const rest = activeProposals.slice(1);
    return (
      <div className="space-y-6">
        {featured && (
          <Card className="bg-gradient-to-br from-primary/15 via-primary/5 to-background border-primary/20">
            <CardContent className="py-12 px-8 space-y-6">
              <div className="flex flex-wrap gap-2"><Badge variant="outline" className="text-sm"><Landmark className="w-3.5 h-3.5 mr-1.5" />{featured.propertyTitle}</Badge><Badge variant="outline" className={cn('text-sm', typeBadgeColor(featured.type))}>{featured.type}</Badge></div>
              <h1 className="text-4xl font-bold">{featured.title}</h1>
              <p className="text-lg text-muted-foreground">{featured.description}</p>
              <VoteBar yes={featured.votesYes} no={featured.votesNo} total={featured.totalVotes} />
              <QuorumBar current={featured.votesYes + featured.votesNo} quorum={featured.quorum} />
              <div className="flex items-center justify-between"><Badge variant="outline" className="text-amber-400 border-amber-500/30"><Clock className="w-3.5 h-3.5 mr-1.5" />{daysUntil(featured.endsAt)} days left</Badge><VoteButtons proposal={featured} /></div>
            </CardContent>
          </Card>
        )}
        {rest.length > 0 && (<div className="grid md:grid-cols-2 gap-4">{rest.map((p) => (<Card key={p.id} className="border-primary/20"><CardContent className="pt-5 space-y-3"><div className="flex items-center justify-between"><Badge variant="outline" className={cn('text-xs', typeBadgeColor(p.type))}>{p.type}</Badge><Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">{daysUntil(p.endsAt)}d</Badge></div><h3 className="font-semibold">{p.title}</h3><p className="text-xs text-muted-foreground">{p.propertyTitle}</p><VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} /><div className="flex justify-end"><VoteButtons proposal={p} /></div></CardContent></Card>))}</div>)}
        <Card><CardContent className="p-0"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left px-4 py-2 font-medium">Past Proposal</th><th className="text-left px-4 py-2 font-medium">Votes</th><th className="text-left px-4 py-2 font-medium">Result</th></tr></thead><tbody>{pastProposals.map((p) => (<tr key={p.id} className="border-b last:border-0"><td className="px-4 py-3 font-medium">{p.title} <span className="text-muted-foreground font-normal">({p.propertyTitle})</span></td><td className="px-4 py-3 text-muted-foreground">{p.votesYes}Y / {p.votesNo}N</td><td className="px-4 py-3"><ResultBadge result={p.result} /></td></tr>))}</tbody></table></CardContent></Card>
      </div>
    );
  }

  // ─── VERSION 19 — Sidebar Command ───────────────────────────────────────

  function Version19() {
    const [filterType, setFilterType] = useState<string>('all');
    const filtered = filterType === 'all' ? activeProposals : activeProposals.filter((p) => p.type === filterType);
    const types = ['all', ...Array.from(new Set(activeProposals.map((p) => p.type)))];
    return (
      <div className="flex gap-6">
        <div className="w-80 flex-shrink-0 space-y-4 sticky top-6 self-start">
          <Card className="border-primary/20"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gavel className="h-4 w-4 text-primary" /> Governance</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Active</span><span className="font-bold">{stats.activeCount}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Your Votes</span><span className="font-bold">{stats.votesCast}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Past</span><span className="font-bold">{pastProposals.length}</span></div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4" /> Filter by Type</CardTitle></CardHeader><CardContent className="space-y-1">{types.map((t) => (<button key={t} onClick={() => setFilterType(t)} className={cn('w-full text-left px-3 py-1.5 rounded text-sm transition capitalize', filterType === t ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted')}>{t}</button>))}</CardContent></Card>
        </div>
        <div className="flex-1 space-y-4">
          {filtered.map((p) => (<Card key={p.id} className="border-primary/20"><CardContent className="pt-5 space-y-3"><div className="flex items-center justify-between"><div className="flex gap-2"><Badge variant="outline" className="text-xs">{p.propertyTitle}</Badge><Badge variant="outline" className={cn('text-xs', typeBadgeColor(p.type))}>{p.type}</Badge></div><Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />{daysUntil(p.endsAt)}d</Badge></div><h3 className="text-lg font-semibold">{p.title}</h3><p className="text-sm text-muted-foreground">{p.description}</p><VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} /><QuorumBar current={p.votesYes + p.votesNo} quorum={p.quorum} /><div className="flex justify-end"><VoteButtons proposal={p} /></div></CardContent></Card>))}
        </div>
      </div>
    );
  }

  // ─── VERSION 20 — Step-by-Step ──────────────────────────────────────────

  function Version20() {
    const [step, setStep] = useState(1);
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-3"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Step {step} of 3</span><span className="font-medium">{step === 1 ? 'Overview' : step === 2 ? 'Cast Your Votes' : 'Past Results'}</span></div><div className="flex gap-2">{[1, 2, 3].map((s) => (<div key={s} className={cn('h-2 flex-1 rounded-full transition', s <= step ? 'bg-primary' : 'bg-muted')} />))}</div></div>
        {step === 1 && (<div className="space-y-6"><h2 className="text-2xl font-bold">Governance Overview</h2><div className="grid grid-cols-3 gap-4">{[{ l: 'Active', v: stats.activeCount, icon: Vote },{ l: 'Your Votes', v: stats.votesCast, icon: CheckCircle2 },{ l: 'Past', v: pastProposals.length, icon: Clock }].map((s) => (<Card key={s.l}><CardContent className="p-5 text-center"><s.icon className="h-5 w-5 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{s.v}</p><p className="text-xs text-muted-foreground">{s.l}</p></CardContent></Card>))}</div><Button className="w-full" onClick={() => setStep(2)}>Review & Vote</Button></div>)}
        {step === 2 && (<div className="space-y-4"><h2 className="text-2xl font-bold">Cast Your Votes</h2>{activeProposals.map((p) => (<Card key={p.id} className="border-primary/20"><CardContent className="pt-5 space-y-3"><div className="flex gap-2"><Badge variant="outline" className="text-xs">{p.propertyTitle}</Badge><Badge variant="outline" className={cn('text-xs', typeBadgeColor(p.type))}>{p.type}</Badge></div><h3 className="font-semibold">{p.title}</h3><p className="text-sm text-muted-foreground">{p.description}</p><VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} /><div className="flex justify-end"><VoteButtons proposal={p} /></div></CardContent></Card>))}<div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button><Button className="flex-1" onClick={() => setStep(3)}>View Past Results</Button></div></div>)}
        {step === 3 && (<div className="space-y-4"><h2 className="text-2xl font-bold">Past Results</h2>{pastProposals.map((p) => (<Card key={p.id}><CardContent className="py-4 flex items-center justify-between"><div><p className="font-medium">{p.title}</p><p className="text-xs text-muted-foreground">{p.propertyTitle} &middot; {p.votesYes}Y / {p.votesNo}N</p></div><ResultBadge result={p.result} /></CardContent></Card>))}<Button variant="outline" className="w-full" onClick={() => setStep(1)}>Back to Overview</Button></div>)}
      </div>
    );
  }

  // ─── VERSION 21 — Horizontal Scroll ─────────────────────────────────────

  function Version21() {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><h2 className="text-2xl font-bold">Governance</h2><Badge variant="secondary">{activeProposals.length} active</Badge></div>
        <div><h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Active Proposals</h3><div className="flex gap-4 overflow-x-auto pb-3 flex-nowrap">{activeProposals.map((p) => (<Card key={p.id} className="flex-shrink-0 w-80 border-primary/20"><CardContent className="p-5 space-y-3"><div className="flex gap-2"><Badge variant="outline" className={cn('text-xs', typeBadgeColor(p.type))}>{p.type}</Badge><Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">{daysUntil(p.endsAt)}d</Badge></div><h4 className="font-semibold">{p.title}</h4><p className="text-xs text-muted-foreground">{p.propertyTitle}</p><VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} /><div className="flex justify-end"><VoteButtons proposal={p} /></div></CardContent></Card>))}</div></div>
        <div><h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Past Results</h3><div className="flex gap-3 overflow-x-auto pb-3 flex-nowrap">{pastProposals.map((p) => (<Card key={p.id} className="flex-shrink-0 w-56"><CardContent className="p-3"><p className="text-sm font-medium">{p.title}</p><p className="text-xs text-muted-foreground mt-1">{p.propertyTitle}</p><div className="flex items-center justify-between mt-2"><span className="text-xs text-muted-foreground">{p.votesYes}Y/{p.votesNo}N</span><ResultBadge result={p.result} /></div></CardContent></Card>))}</div></div>
      </div>
    );
  }

  // ─── VERSION 22 — Stacked Layers ────────────────────────────────────────

  function Version22() {
    return (
      <div className="max-w-4xl mx-auto space-y-2">
        <Card className="rounded-2xl shadow-xl relative z-30"><CardContent className="p-8 text-center"><p className="text-sm text-muted-foreground">Governance</p><h2 className="text-4xl font-bold mt-2">{stats.activeCount} Active Proposals</h2><p className="text-muted-foreground mt-2">{stats.votesCast} of your votes cast</p></CardContent></Card>
        {activeProposals.map((p, i) => (<Card key={p.id} className={cn('rounded-2xl shadow-lg relative', i === 0 ? 'z-20 mx-3' : 'z-10 mx-6')} style={{ transform: `translateY(-${(i + 1) * 8}px)` }}><CardContent className="p-6 pt-8 space-y-3"><div className="flex items-center justify-between"><div className="flex gap-2"><Badge variant="outline" className="text-xs">{p.propertyTitle}</Badge><Badge variant="outline" className={cn('text-xs', typeBadgeColor(p.type))}>{p.type}</Badge></div><Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">{daysUntil(p.endsAt)}d left</Badge></div><h3 className="font-semibold">{p.title}</h3><VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} /><div className="flex justify-end"><VoteButtons proposal={p} /></div></CardContent></Card>))}
      </div>
    );
  }

  // ─── VERSION 23 — Grid Mosaic ───────────────────────────────────────────

  function Version23() {
    return (
      <div className="grid grid-cols-4 auto-rows-[140px] gap-3">
        <Card className="col-span-2 row-span-2 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/10 to-background"><CardContent className="text-center p-6"><Gavel className="h-8 w-8 mx-auto text-primary mb-2" /><p className="text-4xl font-bold">{stats.activeCount}</p><p className="text-muted-foreground">Active Proposals</p><p className="text-sm text-muted-foreground mt-2">{stats.votesCast} votes cast</p></CardContent></Card>
        <Card className="rounded-xl flex items-center justify-center"><CardContent className="p-4 text-center"><p className="text-[10px] text-muted-foreground">Your Votes</p><p className="text-2xl font-bold">{stats.votesCast}</p></CardContent></Card>
        <Card className="rounded-xl flex items-center justify-center"><CardContent className="p-4 text-center"><p className="text-[10px] text-muted-foreground">Past</p><p className="text-2xl font-bold">{pastProposals.length}</p></CardContent></Card>
        {activeProposals.map((p) => (<Card key={p.id} className="col-span-2 rounded-xl border-primary/20"><CardContent className="p-4 space-y-2 h-full flex flex-col justify-center"><div className="flex items-center justify-between"><h4 className="font-semibold text-sm truncate flex-1 mr-2">{p.title}</h4><Badge variant="outline" className={cn('text-[10px] flex-shrink-0', typeBadgeColor(p.type))}>{p.type}</Badge></div><p className="text-xs text-muted-foreground">{p.propertyTitle} &middot; {daysUntil(p.endsAt)}d left</p><VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} /><div className="flex justify-end"><VoteButtons proposal={p} /></div></CardContent></Card>))}
        {pastProposals.slice(0, 4).map((p) => (<Card key={p.id} className="rounded-xl"><CardContent className="p-3 flex flex-col justify-center h-full"><p className="text-xs font-medium truncate">{p.title}</p><div className="flex items-center justify-between mt-1"><span className="text-[10px] text-muted-foreground">{p.votesYes}Y/{p.votesNo}N</span><ResultBadge result={p.result} /></div></CardContent></Card>))}
      </div>
    );
  }

  // ─── VERSION 24 — Inline Everything ─────────────────────────────────────

  function Version24() {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="flex items-center justify-between border-b pb-3"><h2 className="text-lg font-bold">Active Proposals</h2><Badge variant="secondary">{activeProposals.length}</Badge></div>
        {activeProposals.map((p) => { const isOpen = expandedId === p.id; return (<div key={p.id}><button onClick={() => setExpandedId(isOpen ? null : p.id)} className="w-full text-left"><Card className={cn('rounded-xl transition hover:bg-muted/30', isOpen && 'ring-1 ring-primary/30')}><CardContent className="p-4 flex items-center justify-between"><div className="flex items-center gap-3 min-w-0"><Badge variant="outline" className={cn('text-[10px] flex-shrink-0', typeBadgeColor(p.type))}>{p.type}</Badge><p className="font-semibold text-sm truncate">{p.title}</p></div><div className="flex items-center gap-3 flex-shrink-0"><Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">{daysUntil(p.endsAt)}d</Badge>{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div></CardContent></Card></button><div className={cn('overflow-hidden transition-all duration-300', isOpen ? 'max-h-[400px]' : 'max-h-0')}><div className="p-4 space-y-3"><p className="text-sm text-muted-foreground">{p.description}</p><p className="text-xs text-muted-foreground">{p.propertyTitle}</p><VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} /><QuorumBar current={p.votesYes + p.votesNo} quorum={p.quorum} /><div className="flex justify-end"><VoteButtons proposal={p} /></div></div></div></div>); })}
        <div className="border-t pt-3 mt-6"><h2 className="text-lg font-bold mb-3">Past Proposals</h2>{pastProposals.map((p) => (<div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0"><div><p className="font-medium text-sm">{p.title}</p><p className="text-xs text-muted-foreground">{p.propertyTitle} &middot; {p.votesYes}Y / {p.votesNo}N</p></div><ResultBadge result={p.result} /></div>))}</div>
      </div>
    );
  }

  // ─── VERSION 25 — Floating Panels ───────────────────────────────────────

  function Version25() {
    return (
      <div className="pb-20">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b mb-6"><div className="flex items-center justify-between px-4 py-3"><div className="flex items-center gap-3"><Gavel className="h-4 w-4 text-primary" /><span className="font-bold">Governance</span></div><div className="flex gap-4 text-xs"><span>Active: <strong>{stats.activeCount}</strong></span><span>Your Votes: <strong>{stats.votesCast}</strong></span><span>Past: <strong>{pastProposals.length}</strong></span></div></div></div>
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Active Proposals</h2>
          <div className="space-y-4">{activeProposals.map((p) => (<Card key={p.id} className="border-primary/20"><CardContent className="pt-5 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2"><Badge variant="outline" className="text-xs">{p.propertyTitle}</Badge><Badge variant="outline" className={cn('text-xs', typeBadgeColor(p.type))}>{p.type}</Badge></div><Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />{daysUntil(p.endsAt)}d left</Badge></div><h3 className="text-lg font-semibold">{p.title}</h3><p className="text-sm text-muted-foreground">{p.description}</p><VoteBar yes={p.votesYes} no={p.votesNo} total={p.totalVotes} /><QuorumBar current={p.votesYes + p.votesNo} quorum={p.quorum} /><div className="flex justify-end"><VoteButtons proposal={p} /></div></CardContent></Card>))}</div>
          <h2 className="text-xl font-bold">Past Proposals</h2>
          <div className="space-y-2">{pastProposals.map((p) => (<Card key={p.id}><CardContent className="py-3 flex items-center justify-between"><div><p className="font-medium text-sm">{p.title}</p><p className="text-xs text-muted-foreground">{p.propertyTitle} &middot; {p.votesYes}Y / {p.votesNo}N</p></div><ResultBadge result={p.result} /></CardContent></Card>))}</div>
        </div>
        <div className="fixed bottom-6 right-6 z-50"><Badge className="shadow-2xl px-4 py-2 text-sm bg-primary text-primary-foreground">{stats.activeCount} proposals need your vote</Badge></div>
      </div>
    );
  }


  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header + version switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Governance Proposals</h1>
          <p className="text-sm text-muted-foreground">
            Vote on property decisions and shape your investment outcomes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].map((v) => (
            <Button
              key={v}
              size="sm"
              variant={version === v ? 'default' : 'outline'}
              className={cn('w-8 h-8 p-0 text-xs', version === v && 'pointer-events-none')}
              onClick={() => setVersion(v)}
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      {/* Active version */}
      {version === 1 && <Version1 />}
      {version === 2 && <Version2 />}
      {version === 3 && <Version3 />}
      {version === 4 && <Version4 />}
      {version === 5 && <Version5 />}
      {version === 6 && <Version6 />}
      {version === 7 && <Version7 />}
      {version === 8 && <Version8 />}
      {version === 9 && <Version9 />}
      {version === 10 && <Version10 />}
      {version === 11 && <Version11 />}
      {version === 12 && <Version12 />}
      {version === 13 && <Version13 />}
      {version === 14 && <Version14 />}
      {version === 15 && <Version15 />}
      {version === 16 && <Version16 />}
      {version === 17 && <Version17 />}
      {version === 18 && <Version18 />}
      {version === 19 && <Version19 />}
      {version === 20 && <Version20 />}
      {version === 21 && <Version21 />}
      {version === 22 && <Version22 />}
      {version === 23 && <Version23 />}
      {version === 24 && <Version24 />}
      {version === 25 && <Version25 />}

      {/* Confirmation Dialog (shared across all versions) */}
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
                voteDialog.choice === 'yes' ? 'text-emerald-400' : 'text-red-400'
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
                  : 'bg-red-600 hover:bg-red-700 text-white'
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
    </div>
  );
}
