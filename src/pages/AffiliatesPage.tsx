import { useState, useEffect, useMemo } from 'react';
import { Copy, Check, TrendingUp, Users, MousePointerClick, Wallet, Share2, MessageCircle, Mail, Building2, CreditCard, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE_URL = 'https://hub.nfstay.com';

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

function getNextTuesday() {
  const d = new Date();
  const day = d.getDay();
  const daysUntil = (2 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntil);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function AffiliatesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);
  const [calcMode, setCalcMode] = useState<'subscriptions' | 'jv'>('subscriptions');
  const [calcReferrals, setCalcReferrals] = useState(10);
  const [calcDealAmount, setCalcDealAmount] = useState(6000);
  const [calcDeals, setCalcDeals] = useState(3);
  const [payoutTab, setPayoutTab] = useState<'bank' | 'paypal' | 'other'>('bank');

  // Check for new referral signups → toast
  useEffect(() => {
    const lastCheck = localStorage.getItem('nfstay_aff_last_check');
    if (lastCheck && user?.id) {
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
      const { data } = await (supabase.from('affiliate_profiles') as any)
        .select('*').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch recent events
  const { data: events = [] } = useQuery({
    queryKey: ['affiliate-events', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await (supabase.from('affiliate_events') as any)
        .select('*').eq('affiliate_id', profile.id).order('created_at', { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['affiliate-leaderboard'],
    queryFn: async () => {
      const { data } = await (supabase.from('affiliate_profiles') as any)
        .select('id, referral_code, total_signups, total_paid_users, total_earned, user_id')
        .order('total_earned', { ascending: false }).limit(10);
      if (!data?.length) return [];
      const userIds = data.map((d: { user_id: string }) => d.user_id);
      const { data: profiles } = await (supabase.from('profiles') as any)
        .select('id, name').in('id', userIds);
      const nameMap = new Map((profiles || []).map((p: { id: string; name: string }) => [p.id, p.name]));
      return data.map((d: { user_id: string; total_earned: number }, i: number) => ({
        ...d, name: nameMap.get(d.user_id) || 'Agent', position: i + 1,
      }));
    },
  });

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
      const { error } = await (supabase.from('affiliate_profiles') as any).insert({
        user_id: user.id, referral_code: code,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-profile'] });
      toast.success("You're now an agent!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Request payout
  const payoutMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !profile.pending_balance || profile.pending_balance <= 0) throw new Error('No balance');
      await (supabase.from('affiliate_events') as any).insert({
        affiliate_id: profile.id, event_type: 'payout_requested', amount: profile.pending_balance,
        metadata: { paypal: profile.paypal_email || '', bank_sort: profile.bank_sort_code || '', bank_account: profile.bank_account_number || '', payout_method: payoutTab, requested_at: new Date().toISOString() },
      });
      supabase.functions.invoke('send-email', {
        body: { type: 'payout-requested-admin', data: { name: userName, amount: profile.pending_balance, paypal: profile.paypal_email || '(not set)', email: user?.email } },
      }).catch(() => {});
      (supabase.from('notifications') as any).insert({
        type: 'payout_request', title: 'Payout requested',
        body: `${userName} requested £${Number(profile.pending_balance).toFixed(2)} payout via ${payoutTab}.`,
      }).then(() => {}).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-events'] });
      toast.success('Payout requested! Payouts are processed every Tuesday.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Save payout details
  const savePayoutDetails = async (field: string, value: string) => {
    if (!profile?.id) return;
    await (supabase.from('affiliate_profiles') as any).update({ [field]: value }).eq('id', profile.id);
    toast.success('Saved');
  };

  const referralLink = profile ? `${BASE_URL}/signup?ref=${profile.referral_code}` : '';
  const isAgent = !!profile;

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

  // Monthly earnings for chart
  const monthlyEarnings = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[d.toLocaleString('en-GB', { month: 'short' })] = 0;
    }
    events.filter((e: { event_type: string }) => e.event_type === 'payment')
      .forEach((e: { created_at: string; amount: number }) => {
        const key = new Date(e.created_at).toLocaleString('en-GB', { month: 'short' });
        if (key in months) months[key] += Number(e.amount) || 0;
      });
    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  }, [events]);
  const maxEarning = Math.max(...monthlyEarnings.map(m => m.amount), 1);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-48 bg-muted rounded-2xl" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">

      {/* ─── HEADER + JOIN CTA ───────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">Become An Agent</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAgent ? `Your code: ${profile.referral_code}` : 'Earn commission by referring people to NFsTay.'}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-4 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">1</span> Share your link</span>
            <span className="text-border">→</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">2</span> User joins</span>
            <span className="text-border">→</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">3</span> You get paid</span>
          </div>
          {!isAgent && (
            <button
              onClick={() => becomeMutation.mutate()}
              disabled={becomeMutation.isPending}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-xl shadow-md hover:opacity-95 transition-all disabled:opacity-50"
            >
              {becomeMutation.isPending ? 'Setting up...' : 'Join — It\'s Free'}
            </button>
          )}
        </div>
      </div>

      {/* ─── TOP ROW: Calculator + Top Agents ────────────── */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">

        {/* Calculator */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Earnings Calculator</h3>

          {/* Calc mode tabs */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg mb-5 w-fit">
            <button
              onClick={() => setCalcMode('subscriptions')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${calcMode === 'subscriptions' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Subscriptions (40%)
            </button>
            <button
              onClick={() => setCalcMode('jv')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${calcMode === 'jv' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              JV Deals (10%)
            </button>
          </div>

          {calcMode === 'subscriptions' ? (
            <>
              <label className="text-xs text-muted-foreground">
                If you refer <span className="font-bold text-foreground">{calcReferrals}</span> people on Monthly (£67/mo)
              </label>
              <input
                type="range" min={1} max={100} value={calcReferrals}
                onChange={e => setCalcReferrals(Number(e.target.value))}
                className="w-full mt-2 accent-emerald-500"
                style={{
                  height: '6px',
                  background: `linear-gradient(to right, #10b981 ${calcReferrals}%, #e5e7eb ${calcReferrals}%)`,
                  borderRadius: '4px',
                  WebkitAppearance: 'none',
                  appearance: 'none' as never,
                }}
              />
              <div className="flex justify-between mt-4">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Monthly income</div>
                  <div className="text-2xl font-extrabold text-emerald-600">£{(calcReferrals * 67 * 0.40).toFixed(0)}<span className="text-sm font-medium text-muted-foreground">/mo</span></div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Yearly income</div>
                  <div className="text-2xl font-extrabold text-foreground">£{(calcReferrals * 67 * 0.40 * 12).toFixed(0)}<span className="text-sm font-medium text-muted-foreground">/yr</span></div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                You earn <strong>40% recurring commission</strong> on every subscription from your referral link. Monthly (£67), Annual (£397), or Lifetime (£997).
              </p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium">Deal value (£)</label>
                  <input type="number" value={calcDealAmount} onChange={e => setCalcDealAmount(Number(e.target.value))}
                    className="input-nfstay mt-1 w-full text-sm" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium">Number of deals</label>
                  <input type="number" value={calcDeals} onChange={e => setCalcDeals(Number(e.target.value))} min={1} max={50}
                    className="input-nfstay mt-1 w-full text-sm" />
                </div>
              </div>
              <div className="flex justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Per deal</div>
                  <div className="text-2xl font-extrabold text-emerald-600">£{(calcDealAmount * 0.10).toFixed(0)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Total ({calcDeals} deals)</div>
                  <div className="text-2xl font-extrabold text-foreground">£{(calcDealAmount * 0.10 * calcDeals).toFixed(0)}</div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                Earn <strong>10% commission</strong> on JV property deals. Average deal value is £6,000. <span className="text-amber-600 font-medium">Coming soon.</span>
              </p>
            </>
          )}
        </div>

        {/* Top Agents (green card) */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Top Agents This Month
          </h3>
          {leaderboard.length === 0 ? (
            <p className="text-sm opacity-80 py-6 text-center">Be the first on the leaderboard!</p>
          ) : (
            <div className="space-y-0">
              {leaderboard.map((a: { id: string; name: string; position: number; total_earned: number; total_signups?: number; user_id: string }) => {
                const isMe = a.user_id === user?.id;
                return (
                  <div key={a.id} className={`flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0 ${isMe ? 'bg-white/10 -mx-2 px-2 rounded-lg' : ''}`}>
                    <span className={`w-6 text-center text-sm font-bold ${a.position <= 3 ? 'text-yellow-300' : 'text-white/60'}`}>
                      {a.position <= 3 ? ['🥇', '🥈', '🥉'][a.position - 1] : `#${a.position}`}
                    </span>
                    <span className={`text-[13px] flex-1 ${isMe ? 'font-bold' : 'font-medium opacity-90'}`}>
                      {a.name?.split(' ')[0] || 'Agent'} {(a.name?.split(' ')[1] || '')[0] ? (a.name?.split(' ')[1] || '')[0] + '.' : ''}
                      {isMe && <span className="text-[10px] ml-1 opacity-70">(you)</span>}
                    </span>
                    <span className="text-sm font-medium opacity-80">{a.total_signups || 0} referrals</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── AGENT DASHBOARD (only if joined) ────────────── */}
      {isAgent && (
        <>
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

          <div className="grid lg:grid-cols-[1fr_360px] gap-6">

            {/* ─── LEFT COLUMN ────────────────────────────── */}
            <div className="space-y-6">

              {/* Referral link */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Your Referral Link</h3>
                <div className="flex gap-2">
                  <input readOnly value={referralLink} className="input-nfstay flex-1 bg-secondary text-sm font-mono" />
                  <button onClick={copyLink} className="h-10 px-4 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  40% commission on every subscription from this link.
                </p>
              </div>

              {/* Earnings chart */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Earnings</h3>
                <div className="flex items-end gap-2 h-[120px]">
                  {monthlyEarnings.map(m => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium">{m.amount > 0 ? `£${m.amount.toFixed(0)}` : ''}</span>
                      <div className={`w-full rounded-t-md transition-all duration-300 ${m.amount > 0 ? 'bg-gradient-to-t from-emerald-500 to-teal-400' : 'bg-border'}`}
                        style={{ height: `${Math.max((m.amount / maxEarning) * 80, 4)}px` }} />
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
                        <span className="text-sm">{e.event_type === 'payment' ? '✅' : e.event_type === 'signup' ? '👤' : e.event_type === 'click' ? '🔗' : '💰'}</span>
                        <span className="text-[13px] text-foreground flex-1 min-w-0">
                          {e.event_type === 'payment' && `${e.metadata?.user_name || 'Someone'} subscribed`}
                          {e.event_type === 'signup' && `${e.metadata?.user_name || 'Someone'} signed up`}
                          {e.event_type === 'click' && 'Link click'}
                          {e.event_type === 'payout_requested' && 'Payout requested'}
                          {e.event_type === 'payout_paid' && 'Payout sent'}
                        </span>
                        {e.amount > 0 && <span className="text-[13px] font-semibold text-emerald-600">+£{Number(e.amount).toFixed(2)}</span>}
                        <span className="text-[11px] text-muted-foreground flex-shrink-0">{timeAgo(e.created_at)}</span>
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
                      <button onClick={() => copyMessage(s.template(referralLink), s.platform)}
                        className="text-[12px] font-medium text-primary hover:underline flex-shrink-0">
                        {copiedMsg === s.platform ? 'Copied ✓' : 'Copy'}
                      </button>
                    </div>
                  ))}
                  <a href={`https://wa.me/?text=${encodeURIComponent(SHARING_MESSAGES[0].template(referralLink))}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: '#25D366' }}>
                    <MessageCircle className="w-4 h-4" /> Share via WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* ─── RIGHT COLUMN ───────────────────────────── */}
            <div className="space-y-6">

              {/* Payouts */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-5 pb-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1">Payouts</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">£{Number(profile.pending_balance || 0).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">pending</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Total earned: £{Number(profile.total_earned || 0).toFixed(2)} · Paid out: £{Number(profile.total_paid_out || 0).toFixed(2)}
                  </p>
                </div>

                {/* Payout method tabs */}
                <div className="border-t border-border">
                  <div className="flex">
                    {([
                      { key: 'bank' as const, label: 'UK Bank', icon: Building2 },
                      { key: 'paypal' as const, label: 'PayPal', icon: CreditCard },
                      { key: 'other' as const, label: 'Other', icon: Globe },
                    ]).map(t => (
                      <button key={t.key} onClick={() => setPayoutTab(t.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-medium border-b-2 transition-colors ${
                          payoutTab === t.key
                            ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}>
                        <t.icon className="w-3.5 h-3.5" /> {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 space-y-3">
                    {payoutTab === 'bank' && (
                      <>
                        <PayoutField label="Account holder name" field="bank_holder_name" profileId={profile.id} currentValue={profile.bank_holder_name} />
                        <PayoutField label="Sort code" field="bank_sort_code" profileId={profile.id} currentValue={profile.bank_sort_code} placeholder="12-34-56" />
                        <PayoutField label="Account number" field="bank_account_number" profileId={profile.id} currentValue={profile.bank_account_number} placeholder="12345678" />
                      </>
                    )}
                    {payoutTab === 'paypal' && (
                      <PayoutField label="PayPal email" field="paypal_email" profileId={profile.id} currentValue={profile.paypal_email} placeholder="your@paypal.com" />
                    )}
                    {payoutTab === 'other' && (
                      <PayoutField label="Payment details" field="other_payout_details" profileId={profile.id} currentValue={profile.other_payout_details} placeholder="Enter your preferred payment method and details..." multiline />
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button onClick={() => payoutMutation.mutate()}
                    disabled={payoutMutation.isPending || !profile.pending_balance || profile.pending_balance <= 0}
                    className="w-full py-2.5 bg-nfstay-black text-nfstay-black-foreground text-[13px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40">
                    {payoutMutation.isPending ? 'Requesting...' : 'Request Payout'}
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    Payouts processed every Tuesday · Next: {getNextTuesday()}
                  </p>
                </div>

                {/* Payout history */}
                {events.filter((e: { event_type: string }) => e.event_type === 'payout_requested' || e.event_type === 'payout_paid').length > 0 && (
                  <div className="border-t border-border p-4">
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

              {/* Commission breakdown */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Commission Rates</h3>
                {[
                  { label: 'Subscriptions', rate: '40%', desc: 'Monthly, Annual, or Lifetime', active: true },
                  { label: 'JV Deals', rate: '10%', desc: 'Featured property partnerships', active: false },
                ].map(c => (
                  <div key={c.label} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                    <div>
                      <span className="text-[13px] font-medium text-foreground">{c.label}</span>
                      <p className="text-[11px] text-muted-foreground">{c.desc}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${c.active ? 'text-emerald-600' : 'text-muted-foreground'}`}>{c.rate}</span>
                      {!c.active && <p className="text-[10px] text-amber-600 font-medium">Coming soon</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Payout field component ──────────────────────────

function PayoutField({ label, field, profileId, currentValue, placeholder, multiline }: {
  label: string; field: string; profileId: string; currentValue: string | null; placeholder?: string; multiline?: boolean;
}) {
  const [value, setValue] = useState(currentValue || '');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await (supabase.from('affiliate_profiles') as any).update({ [field]: value }).eq('id', profileId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const InputEl = multiline ? 'textarea' : 'input';

  return (
    <div>
      <label className="text-[11px] text-muted-foreground font-medium">{label}</label>
      <div className="flex gap-2 mt-1">
        <InputEl
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(e.target.value)}
          placeholder={placeholder}
          className={`input-nfstay flex-1 text-sm ${multiline ? 'min-h-[80px] py-2' : ''}`}
          {...(multiline ? { rows: 3 } : {})}
        />
        <button onClick={save} className="text-xs font-medium text-primary hover:underline px-2 self-start mt-2">
          {saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>
    </div>
  );
}
