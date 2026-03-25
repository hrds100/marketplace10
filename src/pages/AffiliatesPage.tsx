import { useState, useEffect, useMemo } from 'react';
import { Copy, Check, TrendingUp, Users, MousePointerClick, Wallet, Share2, MessageCircle, Mail, Building2, CreditCard, Globe, Pencil, X, Loader2 } from 'lucide-react';
import { useMyAffiliateProfile, useInvestProperties, useMyCommissions } from '@/hooks/useInvestData';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWalletGate } from '@/components/WalletProvisioner';

const BASE_URL = 'https://hub.nfstay.com';

const SHARING_MESSAGES = [
  { platform: 'WhatsApp', icon: MessageCircle, color: '#25D366', template: (link: string) => `Hey! I've been using nfstay to find rent-to-rent deals across the UK. You should check it out 👇\n\n${link}` },
  { platform: 'Email', icon: Mail, color: '#EA4335', template: (link: string) => `Hi,\n\nI wanted to share nfstay with you — it's a property marketplace for rent-to-rent deals in the UK. I've been using it and finding great opportunities.\n\nSign up here: ${link}\n\nBest regards` },
  { platform: 'Copy Message', icon: Copy, color: '#6B7280', template: (link: string) => `🏠 Check out nfstay — the UK's rent-to-rent property marketplace. Browse landlord-approved deals and start your portfolio.\n\nSign up free: ${link}` },
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
  const { data: realAffProfile } = useMyAffiliateProfile();
  const { requireWallet } = useWalletGate();

  // Live GBP→USD rate (same API as admin payouts page)
  const [gbpToUsd, setGbpToUsd] = useState(1.33);
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/GBP')
      .then(r => r.json())
      .then(d => { if (d.rates?.USD) setGbpToUsd(d.rates.USD); })
      .catch(() => {});
  }, []);
  // TODO: Wire realAffProfile to replace mock affiliate data when available
  const [copied, setCopied] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);
  const [calcMode, setCalcMode] = useState<'subscriptions' | 'jv'>('subscriptions');
  const [calcPlan, setCalcPlan] = useState<'yearly' | 'monthly' | 'lifetime'>('lifetime');
  const [calcReferrals, setCalcReferrals] = useState(10);
  const [calcDealAmount, setCalcDealAmount] = useState(6000);
  const [calcDeals, setCalcDeals] = useState(3);
  const [payoutTab, setPayoutTab] = useState<'bank' | 'paypal' | 'other'>('bank');
  const [editingCode, setEditingCode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeSaving, setCodeSaving] = useState(false);

  // Check for new referral signups → toast
  useEffect(() => {
    const lastCheck = localStorage.getItem('nfstay_aff_last_check');
    if (lastCheck && user?.id) {
      (supabase.from('aff_events') as any)
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

  // Fetch affiliate profile - auto-provisions on first visit
  const { data: profile, isLoading } = useQuery({
    queryKey: ['affiliate-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // Try to fetch existing profile
      const { data } = await (supabase.from('aff_profiles') as any)
        .select('*').eq('user_id', user.id).maybeSingle();
      if (data) return data;
      // No profile yet - auto-create one
      try {
        const code = generateCode(userName || '');
        const { data: newProfile } = await (supabase.from('aff_profiles') as any)
          .insert({ user_id: user.id, referral_code: code, full_name: userName || '' })
          .select('*').single();
        return newProfile;
      } catch {
        // Duplicate key (another tab/request) - just re-fetch
        const { data: retry } = await (supabase.from('aff_profiles') as any)
          .select('*').eq('user_id', user.id).maybeSingle();
        return retry;
      }
    },
    enabled: !!user?.id,
  });

  // Fetch recent events
  const { data: events = [] } = useQuery({
    queryKey: ['affiliate-events', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await (supabase.from('aff_events') as any)
        .select('*').eq('affiliate_id', profile.id).order('created_at', { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['affiliate-leaderboard'],
    queryFn: async () => {
      const { data } = await (supabase.from('aff_profiles') as any)
        .select('id, referral_code, signups, paid_users, total_earned, user_id')
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
      const { error } = await (supabase.from('aff_profiles') as any).insert({
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

  // Request payout — creates a payout_claims row (same as investor rent claims)
  const payoutMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profile?.pending_balance || profile.pending_balance <= 0) throw new Error('No claimable balance');
      const { data, error } = await supabase.functions.invoke('submit-payout-claim', {
        body: { user_id: user.id, user_type: 'affiliate', currency: 'USD', amount: profile.pending_balance },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Notify admin
      supabase.functions.invoke('send-email', {
        body: { type: 'payout-requested-admin', data: { name: userName, amount: profile.pending_balance, paypal: profile.payout_details?.paypal || '(not set)', email: user?.email } },
      }).catch(() => {});
      (supabase.from('notifications') as any).insert({
        type: 'payout_request', title: 'Payout requested',
        body: `${userName} requested $${Number(profile.pending_balance).toFixed(2)} payout.`,
      }).then(() => {}).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Payout requested! Payouts are processed every Tuesday.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Save payout details
  const savePayoutDetails = async (field: string, value: string) => {
    if (!profile?.id) return;
    await (supabase.from('aff_profiles') as any).update({ [field]: value }).eq('id', profile.id);
    toast.success('Saved');
  };

  const saveReferralCode = async () => {
    if (!profile?.id) return;
    const code = newCode.trim().toLowerCase();
    if (!/^[a-z0-9]{3,20}$/.test(code)) {
      setCodeError('Code must be 3-20 characters, lowercase letters and numbers only.');
      return;
    }
    setCodeSaving(true);
    setCodeError('');
    try {
      const newCodeUpper = code.toUpperCase();
      const { data: existing } = await (supabase.from('aff_profiles') as any)
        .select('id').eq('referral_code', newCodeUpper).maybeSingle();
      if (existing && existing.id !== profile.id) {
        setCodeError('This code is already in use.');
        setCodeSaving(false);
        return;
      }
      const { error } = await (supabase.from('aff_profiles') as any)
        .update({ referral_code: newCodeUpper }).eq('id', profile.id);
      if (error) throw error;
      // DB trigger `trg_sync_referred_by` auto-updates profiles.referred_by
      // for all users who were referred by the old code

      queryClient.invalidateQueries({ queryKey: ['affiliate-profile'] });
      toast.success('Referral code updated!');
      setEditingCode(false);
      setNewCode('');
    } catch (err: any) {
      setCodeError(err?.message || 'Failed to save.');
    } finally {
      setCodeSaving(false);
    }
  };

  const referralLink = profile ? `${BASE_URL}/signup?ref=${profile.referral_code}` : '';
  const { data: investProperties } = useInvestProperties();
  const { data: myCommissions = [] } = useMyCommissions();
  const activeProperty = investProperties?.[0] || null;
  const investReferralLink = profile && activeProperty
    ? `${BASE_URL}/dashboard/invest/marketplace?ref=${profile.referral_code}&property=${activeProperty.id}`
    : '';
  const isAgent = !!profile;

  const copyLink = async () => {
    const ok = await requireWallet('To get your affiliate link, you must verify your email. Click continue and enter the email you used to register.');
    if (!ok) return;
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

  // Monthly earnings for chart — reads from aff_commissions (not aff_events)
  const monthlyEarnings = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[d.toLocaleString('en-GB', { month: 'short' })] = 0;
    }
    myCommissions.forEach((c: { created_at: string; commission_amount: number }) => {
      const key = new Date(c.created_at).toLocaleString('en-GB', { month: 'short' });
      if (key in months) months[key] += Number(c.commission_amount) || 0;
    });
    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  }, [myCommissions]);
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
    <div data-feature="AFFILIATES" className="p-6 md:p-8 space-y-6">

      {/* ─── HEADER + JOIN CTA ───────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center flex-wrap gap-x-5 gap-y-2">
            <h1 className="text-[28px] font-bold text-foreground">Become An Agent</h1>
            <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">1</span> Share your link</span>
              <span className="text-border">→</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">2</span> User joins</span>
              <span className="text-border">→</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">3</span> You get paid</span>
            </div>
          </div>
          <div data-feature="AFFILIATES__REFERRAL_CODE" className="flex items-center gap-2 mt-0.5">
            {profile?.referral_code ? (
              editingCode ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => { setNewCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')); setCodeError(''); }}
                    placeholder="your-code"
                    maxLength={20}
                    className="input-nfstay text-sm w-40 h-8 px-2"
                    autoFocus
                  />
                  <button onClick={saveReferralCode} disabled={codeSaving}
                    className="h-8 px-3 rounded-lg bg-[#1E9A80] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
                    {codeSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                  </button>
                  <button onClick={() => { setEditingCode(false); setNewCode(''); setCodeError(''); }}
                    className="h-8 px-2 rounded-lg text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {codeError && <span className="text-xs text-red-500">{codeError}</span>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your code: <span className="font-mono font-medium text-foreground">{profile.referral_code}</span>
                  <button data-feature="AFFILIATES__EDIT_CODE" onClick={() => { setEditingCode(true); setNewCode(profile.referral_code.toLowerCase()); }}
                    className="ml-2 inline-flex items-center gap-1 text-xs text-[#1E9A80] hover:underline">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">Earn commission by referring people to nfstay.</p>
            )}
          </div>
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
              JV Deals (5%)
            </button>
          </div>

          {calcMode === 'subscriptions' ? (() => {
            const price = calcPlan === 'lifetime' ? 997 : calcPlan === 'yearly' ? 397 : 67;
            const label = calcPlan === 'lifetime' ? 'Lifetime (£997)' : calcPlan === 'yearly' ? 'Annual (£397/yr)' : 'Monthly (£67/mo)';
            const commission = calcReferrals * price * 0.40;
            const yearlyIncome = calcPlan === 'monthly' ? commission * 12 : commission;
            return (
            <>
              <div className="flex items-center gap-2 mb-3">
                <label className="text-xs text-muted-foreground">
                  If you refer <span className="font-bold text-foreground">{calcReferrals}</span> people on
                </label>
                <div className="inline-flex items-center bg-emerald-50 rounded-lg p-0.5">
                  {([
                    { key: 'lifetime' as const, label: 'Lifetime' },
                    { key: 'yearly' as const, label: 'Yearly' },
                    { key: 'monthly' as const, label: 'Monthly' },
                  ]).map(p => (
                    <button
                      key={p.key}
                      onClick={() => setCalcPlan(p.key)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${calcPlan === p.key ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-700 hover:text-emerald-800'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">({label})</span>
              </div>
              <input
                type="range" min={1} max={200} value={calcReferrals}
                onChange={e => setCalcReferrals(Number(e.target.value))}
                className="w-full mt-2 accent-emerald-500"
                style={{
                  height: '6px',
                  background: `linear-gradient(to right, #10b981 ${(calcReferrals / 200) * 100}%, #e5e7eb ${(calcReferrals / 200) * 100}%)`,
                  borderRadius: '4px',
                  WebkitAppearance: 'none',
                  appearance: 'none' as never,
                }}
              />
              <div className="flex justify-between mt-4">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    {calcPlan === 'lifetime' ? 'Total earned' : calcPlan === 'yearly' ? 'Yearly income' : 'Monthly income'}
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-600">
                    ${Math.round(commission * gbpToUsd).toLocaleString()}
                    {calcPlan !== 'lifetime' && <span className="text-sm font-medium text-muted-foreground">{calcPlan === 'yearly' ? '/yr' : '/mo'}</span>}
                  </div>
                </div>
                {calcPlan !== 'lifetime' && (
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Yearly total</div>
                  <div className="text-2xl font-extrabold text-foreground">${Math.round(yearlyIncome * gbpToUsd).toLocaleString()}<span className="text-sm font-medium text-muted-foreground">/yr</span></div>
                </div>
                )}
                {calcPlan === 'lifetime' && (
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Per referral</div>
                  <div className="text-2xl font-extrabold text-foreground">${Math.round(997 * 0.40 * gbpToUsd)}<span className="text-sm font-medium text-muted-foreground"> one-time</span></div>
                </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                You earn <strong>40% recurring commission</strong> on every subscription from your referral link. Monthly (£67), Annual (£397), or Lifetime (£997).
              </p>
            </>
            );
          })() : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium">Deal value ($)</label>
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
                  <div className="text-2xl font-extrabold text-emerald-600">${(calcDealAmount * 0.05).toFixed(0)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Total ({calcDeals} deals)</div>
                  <div className="text-2xl font-extrabold text-foreground">${(calcDealAmount * 0.05 * calcDeals).toFixed(0)}</div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                Earn <strong>5% commission</strong> on JV property deals. Average deal value is $6,000.
              </p>
            </>
          )}
        </div>

        {/* Top Agents (green card) */}
        <div data-feature="AFFILIATES__LEADERBOARD" className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Top Agents This Month
          </h3>
          {(() => {
            const placeholder = [
              { id: 'p1', name: 'James T.', position: 1, signups: 24, user_id: '' },
              { id: 'p2', name: 'Sarah M.', position: 2, signups: 18, user_id: '' },
              { id: 'p3', name: 'David K.', position: 3, signups: 12, user_id: '' },
              { id: 'p4', name: 'Emma L.', position: 4, signups: 9, user_id: '' },
              { id: 'p5', name: 'Michael R.', position: 5, signups: 5, user_id: '' },
            ];
            // Merge real agents (with activity) + placeholders, sort by referrals, show top 5
            const realAgents = leaderboard.filter((a: { signups?: number; total_earned?: number }) => (a.signups || 0) > 0 || Number(a.total_earned || 0) > 0);
            const merged = [...realAgents, ...placeholder]
              .sort((a, b) => (b.signups || 0) - (a.signups || 0))
              .slice(0, 5)
              .map((a, i) => ({ ...a, position: i + 1 }));
            const agents = merged;
            return (
              <div className="space-y-0">
                {agents.map((a: { id: string; name: string; position: number; signups?: number; user_id: string }) => {
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
                      <span className="text-sm font-medium opacity-80">{a.signups || 0} referrals</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ─── AGENT DASHBOARD ────────────── */}
      {profile && (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Link Clicks', value: profile.link_clicks || 0, icon: MousePointerClick, color: 'text-blue-600' },
              { label: 'Signups', value: profile.signups || 0, icon: Users, color: 'text-emerald-600' },
              { label: 'Paid Users', value: profile.paid_users || 0, icon: TrendingUp, color: 'text-purple-600' },
              { label: 'Pending Balance', value: `$${Number(profile.pending_balance || 0).toFixed(2)}`, icon: Wallet, color: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} data-feature="AFFILIATES__STAT_CARD" className="bg-card border border-border rounded-2xl p-4">
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

              {/* Subscription referral link */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Your Subscription Referral Link</h3>
                <div className="flex gap-2">
                  <input data-feature="AFFILIATES__LINK" readOnly value={referralLink} className="input-nfstay flex-1 bg-secondary text-sm font-mono" />
                  <button data-feature="AFFILIATES__SHARE_BUTTON" onClick={copyLink} className="h-10 px-4 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  40% commission on every subscription from this link.
                </p>
              </div>

              {/* Investment referral link */}
              {activeProperty && investReferralLink && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="flex items-stretch">
                    {/* Property thumbnail */}
                    {(activeProperty.photos?.[0] || activeProperty.image) && (
                      <div className="w-[100px] min-h-[100px] flex-shrink-0">
                        <img
                          src={activeProperty.photos?.[0] || activeProperty.image}
                          alt={activeProperty.title || 'Investment property'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-5 flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground mb-1">Your Investment Referral Link</h3>
                      <p className="text-[11px] text-muted-foreground mb-3">
                        {activeProperty.title || 'Active deal'} — 5% commission on every share purchase.
                      </p>
                      <div className="flex gap-2">
                        <input readOnly value={investReferralLink} className="input-nfstay flex-1 bg-secondary text-sm font-mono min-w-0" />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(investReferralLink);
                            toast.success('Investment referral link copied!');
                          }}
                          className="h-10 px-4 rounded-lg bg-[#1E9A80] text-white font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity flex-shrink-0"
                        >
                          <Copy className="w-4 h-4" /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Earnings chart */}
              <div data-feature="AFFILIATES__EARNINGS" className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Earnings</h3>
                <div className="flex items-end gap-2 h-[120px]">
                  {monthlyEarnings.map(m => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium">{m.amount > 0 ? `$${m.amount.toFixed(0)}` : ''}</span>
                      <div className={`w-full rounded-t-md transition-all duration-300 ${m.amount > 0 ? 'bg-gradient-to-t from-emerald-500 to-teal-400' : 'bg-border'}`}
                        style={{ height: `${Math.max((m.amount / maxEarning) * 80, 4)}px` }} />
                      <span className="text-[10px] text-muted-foreground">{m.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commission ledger */}
              {myCommissions.length > 0 && (() => {
                const hasClaimable = myCommissions.some((c: { status: string }) => c.status === 'claimable');
                const claimableTotal = myCommissions
                  .filter((c: { status: string }) => c.status === 'claimable')
                  .reduce((sum: number, c: { commission_amount: number }) => sum + Number(c.commission_amount), 0);
                return (
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-foreground">Your Commissions</h3>
                      <button
                        disabled={!hasClaimable}
                        onClick={() => { if (hasClaimable) payoutMutation.mutate(); }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          hasClaimable
                            ? 'bg-[#1E9A80] text-white hover:opacity-90 cursor-pointer'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5 inline mr-1.5" />
                        {hasClaimable ? `Claim $${claimableTotal.toFixed(2)}` : 'Claim'}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {myCommissions.map((c: { id: string; source: string; gross_amount: number; commission_amount: number; commission_rate: number; status: string; claimable_at: string; created_at: string; inv_properties?: { title: string } }) => (
                        <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E9A80]/10 flex-shrink-0">
                            <CreditCard className="w-4 h-4 text-[#1E9A80]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-foreground truncate">
                              {c.inv_properties?.title || (c.source === 'subscription' ? 'Subscription' : 'Investment')}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              ${Number(c.gross_amount).toFixed(2)} sale · {(Number(c.commission_rate) * 100).toFixed(0)}% rate · {new Date(c.created_at).toLocaleDateString('en-GB')} {new Date(c.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-foreground">${Number(c.commission_amount).toFixed(2)}</p>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              c.status === 'claimable' ? 'bg-emerald-100 text-emerald-700' :
                              c.status === 'claimed' || c.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {c.status === 'pending' ? 'Pending' : c.status === 'claimable' ? 'Claimable' : c.status === 'claimed' ? 'Claimed' : c.status === 'paid' ? 'Paid' : c.status}
                            </span>
                            {c.status === 'pending' && c.claimable_at && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Claimable on {new Date(c.claimable_at).toLocaleDateString('en-GB')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Activity feed */}
              <div data-feature="AFFILIATES__EVENTS" className="bg-card border border-border rounded-2xl p-5">
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
                        {e.amount > 0 && <span className="text-[13px] font-semibold text-emerald-600">+${Number(e.amount).toFixed(2)}</span>}
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

              {/* Payouts — redirects to centralized Payout Settings */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-2">Payouts</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Manage your bank details and claim commissions from the Payout Settings page.
                </p>
                <a href="/dashboard/settings" className="inline-flex items-center gap-2 px-4 py-2.5 bg-nfstay-black text-nfstay-black-foreground text-[13px] font-semibold rounded-lg hover:opacity-90 transition-opacity">
                  Go to Payout Settings
                </a>
              </div>

              {/* Commission breakdown */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Commission Rates</h3>
                {[
                  { label: 'Subscriptions', rate: '40%', desc: 'Monthly, Annual, or Lifetime', active: true },
                  { label: 'JV Deals', rate: '5%', desc: 'Featured property partnerships', active: true },
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
    await (supabase.from('aff_profiles') as any).update({ [field]: value }).eq('id', profileId);
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
