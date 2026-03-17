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
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((v) => (
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
