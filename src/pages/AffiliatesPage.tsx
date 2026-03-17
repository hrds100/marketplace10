import { useState, useEffect, useMemo } from 'react';
import { Copy, Check, ExternalLink, TrendingUp, Users, MousePointerClick, Wallet, Crown, Share2, MessageCircle, Mail, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE_URL = 'https://hub.nfstay.com';

const RANKS = [
  { key: 'bronze', label: 'Bronze Agent', emoji: '🥉', threshold: 1, color: '#CD7F32' },
  { key: 'silver', label: 'Silver Agent', emoji: '🥈', threshold: 5, color: '#C0C0C0' },
  { key: 'gold', label: 'Gold Agent', emoji: '🥇', threshold: 15, color: '#FFD700' },
  { key: 'diamond', label: 'Diamond Agent', emoji: '💎', threshold: 50, color: '#B9F2FF' },
];

const COMMISSION_RATES = { referral: 0.30, direct_link: 0.40, jv_partner: 0.10 };

const SHARING_MESSAGES = [
  { platform: 'WhatsApp', icon: MessageCircle, color: '#25D366', template: (link: string) => `Hey! I've been using NFsTay to find rent-to-rent deals across the UK. You should check it out 👇\n\n${link}` },
  { platform: 'Email', icon: Mail, color: '#EA4335', template: (link: string) => `Hi,\n\nI wanted to share NFsTay with you — it's a property marketplace for rent-to-rent deals in the UK. I've been using it and finding great opportunities.\n\nSign up here: ${link}\n\nBest regards` },
  { platform: 'Copy Message', icon: Copy, color: '#6B7280', template: (link: string) => `🏠 Check out NFsTay — the UK's rent-to-rent property marketplace. Browse landlord-approved deals and start your portfolio.\n\nSign up free: ${link}` },
];

function generateCode(name: string): string {
  const prefix = (name || 'AGENT').replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 4) || 'AGENT';
  const suffix = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}${suffix}`;
}

export default function AffiliatesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  // Check for new referral signups → toast
  useEffect(() => {
    const lastCheck = localStorage.getItem('nfstay_aff_last_check');
    if (lastCheck && user?.id) {
      // Check for new signups since last visit
      (supabase.from('affiliate_events') as any)
        .select('metadata')
        .eq('event_type', 'signup')
        .gt('created_at', lastCheck)
        .then(({ data }: { data: Array<{ metadata: { user_name?: string } }> | null }) => {
          if (data?.length) {
            data.forEach((e: { metadata: { user_name?: string } }) => {
              toast.success(`${e.metadata?.user_name || 'Someone'} signed up from your link!`);
            });
          }
        });
    }
    localStorage.setItem('nfstay_aff_last_check', new Date().toISOString());
  }, [user?.id]);

  // Fetch affiliate profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['affiliate-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase
        .from('affiliate_profiles') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch recent events
  const { data: events = [] } = useQuery({
    queryKey: ['affiliate-events', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await (supabase
        .from('affiliate_events') as any)
        .select('*')
        .eq('affiliate_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['affiliate-leaderboard'],
    queryFn: async () => {
      const { data } = await (supabase
        .from('affiliate_profiles') as any)
        .select('id, referral_code, total_signups, total_paid_users, total_earned, user_id')
        .order('total_earned', { ascending: false })
        .limit(10);
      if (!data?.length) return [];
      // Get names
      const userIds = data.map((d: { user_id: string }) => d.user_id);
      const { data: profiles } = await (supabase
        .from('profiles') as any)
        .select('id, name')
        .in('id', userIds);
      const nameMap = new Map((profiles || []).map((p: { id: string; name: string }) => [p.id, p.name]));
      return data.map((d: { user_id: string; total_earned: number; total_signups: number }, i: number) => ({
        ...d,
        name: nameMap.get(d.user_id) || 'Agent',
        position: i + 1,
      }));
    },
  });

  // Fetch user name for profile
  const { data: userName } = useQuery({
    queryKey: ['user-name', user?.id],
    queryFn: async () => {
      if (!user?.id) return '';
      const { data } = await (supabase.from('profiles') as any).select('name').eq('id', user.id).single();
      return data?.name || '';
    },
    enabled: !!user?.id,
  });

  // Become an agent
  const becomeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not logged in');
      const code = generateCode(userName || '');
      const { data, error } = await (supabase.from('affiliate_profiles') as any).insert({
        user_id: user.id,
        referral_code: code,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-profile'] });
      toast.success('You\'re now an agent!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Request payout
  const payoutMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !profile.pending_balance || profile.pending_balance <= 0) throw new Error('No balance');
      // Create payout_requested event
      await (supabase.from('affiliate_events') as any).insert({
        affiliate_id: profile.id,
        event_type: 'payout_requested',
        amount: profile.pending_balance,
        metadata: { paypal: profile.paypal_email || '', requested_at: new Date().toISOString() },
      });
      // Email admin
      supabase.functions.invoke('send-email', {
        body: {
          type: 'payout-requested-admin',
          data: {
            name: userName,
            amount: profile.pending_balance,
            paypal: profile.paypal_email || '(not set)',
            email: user?.email,
          },
        },
      }).catch(() => {});
      // Notification for admin
      (supabase.from('notifications') as any).insert({
        type: 'payout_request',
        title: 'Payout requested',
        body: `${userName} requested £${Number(profile.pending_balance).toFixed(2)} payout.`,
      }).then(() => {}).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-events'] });
      toast.success('Payout requested! Hugo will process it on Tuesday.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const referralLink = profile ? `${BASE_URL}/signup?ref=${profile.referral_code}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyMessage = (msg: string, platform: string) => {
    navigator.clipboard.writeText(msg);
    setCopiedMsg(platform);
    setTimeout(() => setCopiedMsg(null), 2000);
    toast.success(`${platform} message copied`);
  };

  const currentRank = RANKS.find(r => r.key === (profile?.rank || 'bronze')) || RANKS[0];
  const nextRank = RANKS[RANKS.indexOf(currentRank) + 1];
  const signupsToNext = nextRank ? nextRank.threshold - (profile?.total_signups || 0) : 0;
  const rankProgress = nextRank ? ((profile?.total_signups || 0) / nextRank.threshold) * 100 : 100;

  // Monthly earnings for chart (CSS-only bars)
  const monthlyEarnings = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-GB', { month: 'short' });
      months[key] = 0;
    }
    events
      .filter((e: { event_type: string }) => e.event_type === 'payment')
      .forEach((e: { created_at: string; amount: number }) => {
        const key = new Date(e.created_at).toLocaleString('en-GB', { month: 'short' });
        if (key in months) months[key] += Number(e.amount) || 0;
      });
    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  }, [events]);

  const maxEarning = Math.max(...monthlyEarnings.map(m => m.amount), 1);

  // Next Tuesday
  const getNextTuesday = () => {
    const d = new Date();
    const day = d.getDay();
    const daysUntil = (2 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntil);
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  // ─── NOT YET AN AGENT ───────────────────────────────────
  if (!profile) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[28px] font-bold text-foreground mb-2">Become An Agent</h1>
          <p className="text-muted-foreground text-[15px] max-w-md mx-auto mb-8">
            Share NFsTay with your network and earn commission on every subscription.
          </p>

          {/* Commission tiers */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10 text-left">
            {[
              { rate: '30%', label: 'Referral Signup', desc: 'When someone subscribes after signing up via your link', color: 'from-emerald-500 to-emerald-600' },
              { rate: '40%', label: 'Direct Link', desc: 'When someone subscribes directly through your referral link', color: 'from-teal-500 to-teal-600' },
              { rate: '10%', label: 'JV Partner', desc: 'Partner on featured JV property deals (coming soon)', color: 'from-slate-500 to-slate-600' },
            ].map(t => (
              <div key={t.label} className="bg-card border border-border rounded-2xl p-5">
                <div className={`text-2xl font-extrabold bg-gradient-to-r ${t.color} bg-clip-text text-transparent`}>{t.rate}</div>
                <div className="text-sm font-semibold text-foreground mt-1">{t.label}</div>
                <p className="text-xs text-muted-foreground mt-1.5">{t.desc}</p>
              </div>
            ))}
          </div>

          {/* Earnings calculator */}
          <EarningsCalculator />

          <button
            onClick={() => becomeMutation.mutate()}
            disabled={becomeMutation.isPending}
            className="mt-8 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[15px] font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:opacity-95 disabled:opacity-50"
          >
            {becomeMutation.isPending ? 'Setting up...' : 'Become An Agent — It\'s Free'}
          </button>
        </div>
      </div>
    );
  }

  // ─── AGENT DASHBOARD ───────────────────────────────────
  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">Agent Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentRank.emoji} {currentRank.label} · Code: {profile.referral_code}
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Link Clicks', value: profile.total_clicks || 0, icon: MousePointerClick, color: 'text-blue-600' },
          { label: 'Signups', value: profile.total_signups || 0, icon: Users, color: 'text-emerald-600' },
          { label: 'Paid Users', value: profile.total_paid_users || 0, icon: TrendingUp, color: 'text-purple-600' },
          { label: 'Pending Balance', value: `£${Number(profile.pending_balance || 0).toFixed(2)}`, icon: Wallet, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} strokeWidth={1.8} />
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-xl font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Referral link */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Your Referral Link</h3>
            <div className="flex gap-2">
              <input readOnly value={referralLink} className="input-nfstay flex-1 bg-secondary text-sm font-mono" />
              <button onClick={copyLink} className="h-10 px-4 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-muted-foreground">Commission rates:</span>
              <span className="text-xs font-medium text-emerald-600">30% referral</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-medium text-teal-600">40% direct link</span>
            </div>
          </div>

          {/* Earnings chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Earnings</h3>
            <div className="flex items-end gap-2 h-[120px]">
              {monthlyEarnings.map(m => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {m.amount > 0 ? `£${m.amount.toFixed(0)}` : ''}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all duration-300 ${m.amount > 0 ? 'bg-gradient-to-t from-emerald-500 to-teal-400' : 'bg-border'}`}
                    style={{ height: `${Math.max((m.amount / maxEarning) * 80, 4)}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{m.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No activity yet. Share your link to get started!</p>
            ) : (
              <div className="space-y-0">
                {events.slice(0, 10).map((e: { id: string; event_type: string; amount: number; metadata: Record<string, string>; created_at: string }) => (
                  <div key={e.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                    <span className="text-sm">
                      {e.event_type === 'payment' && '✅'}
                      {e.event_type === 'signup' && '👤'}
                      {e.event_type === 'click' && '🔗'}
                      {e.event_type === 'payout_requested' && '💰'}
                      {e.event_type === 'payout_paid' && '✅'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] text-foreground">
                        {e.event_type === 'payment' && `${e.metadata?.user_name || 'Someone'} subscribed`}
                        {e.event_type === 'signup' && `${e.metadata?.user_name || 'Someone'} signed up`}
                        {e.event_type === 'click' && 'Link click'}
                        {e.event_type === 'payout_requested' && 'Payout requested'}
                        {e.event_type === 'payout_paid' && 'Payout sent'}
                      </span>
                    </div>
                    {e.amount > 0 && (
                      <span className="text-[13px] font-semibold text-emerald-600">+£{Number(e.amount).toFixed(2)}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">
                      {timeAgo(e.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sharing kit */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Share2 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Sharing Kit</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Pre-written messages — just copy and send.</p>
            <div className="space-y-3">
              {SHARING_MESSAGES.map(s => (
                <div key={s.platform} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-foreground">{s.platform}</span>
                    <p className="text-[11px] text-muted-foreground truncate">{s.template(referralLink).slice(0, 60)}...</p>
                  </div>
                  <button
                    onClick={() => copyMessage(s.template(referralLink), s.platform)}
                    className="text-[12px] font-medium text-primary hover:underline flex-shrink-0"
                  >
                    {copiedMsg === s.platform ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
              ))}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(SHARING_MESSAGES[0].template(referralLink))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: '#25D366' }}
              >
                <MessageCircle className="w-4 h-4" /> Share via WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Rank / Milestones */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-bold">{currentRank.label}</span>
            </div>
            {nextRank ? (
              <>
                <p className="text-sm opacity-80 mt-1">
                  {signupsToNext > 0 ? `${signupsToNext} more referral${signupsToNext === 1 ? '' : 's'} to ${nextRank.label}` : `You've reached ${currentRank.label}!`}
                </p>
                <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${Math.min(rankProgress, 100)}%` }} />
                </div>
                <p className="text-xs opacity-70 mt-1.5">{profile.total_signups} of {nextRank.threshold} referrals</p>
              </>
            ) : (
              <p className="text-sm opacity-80 mt-1">You're at the highest rank. Legend status.</p>
            )}
            <div className="flex gap-3 mt-4">
              {RANKS.map(r => (
                <div key={r.key} className={`flex flex-col items-center gap-1 ${r.key === currentRank.key ? 'opacity-100' : 'opacity-40'}`}>
                  <span className="text-lg">{r.emoji}</span>
                  <span className="text-[9px] font-medium">{r.threshold}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payout */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Payouts</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-bold text-foreground">£{Number(profile.pending_balance || 0).toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">pending</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              Total earned: £{Number(profile.total_earned || 0).toFixed(2)} · Paid out: £{Number(profile.total_paid_out || 0).toFixed(2)}
            </p>

            {/* PayPal email */}
            <PayPalInput profileId={profile.id} currentEmail={profile.paypal_email} />

            <button
              onClick={() => payoutMutation.mutate()}
              disabled={payoutMutation.isPending || !profile.pending_balance || profile.pending_balance <= 0}
              className="w-full mt-3 py-2.5 bg-nfstay-black text-nfstay-black-foreground text-[13px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {payoutMutation.isPending ? 'Requesting...' : 'Request Payout'}
            </button>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Next payout day: {getNextTuesday()}
            </p>

            {/* Payout history */}
            {events.filter((e: { event_type: string }) => e.event_type === 'payout_requested' || e.event_type === 'payout_paid').length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/50">
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">History</span>
                {events
                  .filter((e: { event_type: string }) => e.event_type === 'payout_requested' || e.event_type === 'payout_paid')
                  .slice(0, 5)
                  .map((e: { id: string; event_type: string; amount: number; created_at: string }) => (
                    <div key={e.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <span className="text-[13px] text-foreground">£{Number(e.amount).toFixed(2)}</span>
                      <span className={`text-[11px] font-medium ${e.event_type === 'payout_paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {e.event_type === 'payout_paid' ? 'Paid' : 'Requested'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">Top Agents This Month</h3>
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Be the first on the leaderboard!</p>
            ) : (
              <div className="space-y-0">
                {leaderboard.map((a: { id: string; name: string; position: number; total_earned: number; user_id: string }) => {
                  const isMe = a.user_id === user?.id;
                  const initial = (a.name || 'A').split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                  return (
                    <div key={a.id} className={`flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0 ${isMe ? 'bg-emerald-50/50 -mx-2 px-2 rounded-lg' : ''}`}>
                      <span className={`w-5 text-[13px] font-bold ${a.position <= 3 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {a.position}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[10px] font-bold text-white">
                        {initial}
                      </div>
                      <span className={`text-[13px] flex-1 ${isMe ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                        {a.name?.split(' ')[0] || 'Agent'} {(a.name?.split(' ')[1] || '')[0] ? (a.name?.split(' ')[1] || '')[0] + '.' : ''}
                        {isMe && <span className="text-[10px] text-emerald-600 ml-1.5">(you)</span>}
                      </span>
                      <span className="text-[13px] font-semibold text-foreground">£{Number(a.total_earned).toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────

function PayPalInput({ profileId, currentEmail }: { profileId: string; currentEmail: string | null }) {
  const [email, setEmail] = useState(currentEmail || '');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await (supabase.from('affiliate_profiles') as any).update({ paypal_email: email }).eq('id', profileId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <label className="text-[11px] text-muted-foreground font-medium">PayPal email (for payouts)</label>
      <div className="flex gap-2 mt-1">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@paypal.com"
          className="input-nfstay flex-1 text-sm"
        />
        <button onClick={save} className="text-xs font-medium text-primary hover:underline px-2">
          {saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function EarningsCalculator() {
  const [referrals, setReferrals] = useState(10);
  const monthly = referrals * 67 * 0.30;
  const yearly = monthly * 12;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-left max-w-md mx-auto">
      <h3 className="text-sm font-semibold text-foreground mb-4">Earnings Calculator</h3>
      <label className="text-xs text-muted-foreground">
        If you refer <span className="font-bold text-foreground">{referrals}</span> people on Monthly (£67/mo)
      </label>
      <input
        type="range"
        min={1}
        max={100}
        value={referrals}
        onChange={e => setReferrals(Number(e.target.value))}
        className="w-full mt-2 accent-emerald-500"
      />
      <div className="flex justify-between mt-3">
        <div>
          <div className="text-xs text-muted-foreground">Monthly income</div>
          <div className="text-lg font-bold text-emerald-600">£{monthly.toFixed(0)}/mo</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Yearly income</div>
          <div className="text-lg font-bold text-foreground">£{yearly.toFixed(0)}/yr</div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}
