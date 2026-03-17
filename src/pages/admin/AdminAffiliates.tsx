import { useState } from 'react';
import { Check, Search, TrendingUp, Users, MousePointerClick, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLog';

export default function AdminAffiliates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending_payouts'>('all');

  // Fetch all affiliates with profile names
  const { data: affiliates = [], isLoading } = useQuery({
    queryKey: ['admin-affiliates'],
    queryFn: async () => {
      const { data } = await (supabase
        .from('affiliate_profiles') as any)
        .select('*')
        .order('total_earned', { ascending: false });
      if (!data?.length) return [];

      const userIds = data.map((d: { user_id: string }) => d.user_id);
      const { data: profiles } = await (supabase
        .from('profiles') as any)
        .select('id, name, email')
        .in('id', userIds);
      const profileMap = new Map((profiles || []).map((p: { id: string; name: string; email: string }) => [p.id, p]));

      return data.map((a: Record<string, unknown>) => ({
        ...a,
        name: (profileMap.get(a.user_id as string) as { name?: string })?.name || 'Unknown',
        email: (profileMap.get(a.user_id as string) as { email?: string })?.email || '',
      }));
    },
  });

  // Fetch pending payout requests
  const { data: pendingPayouts = [] } = useQuery({
    queryKey: ['admin-pending-payouts'],
    queryFn: async () => {
      const { data } = await (supabase
        .from('affiliate_events') as any)
        .select('*, affiliate_profiles!inner(user_id, referral_code, paypal_email)')
        .eq('event_type', 'payout_requested')
        .order('created_at', { ascending: false });
      if (!data?.length) return [];

      const userIds = data.map((d: { affiliate_profiles: { user_id: string } }) => d.affiliate_profiles.user_id);
      const { data: profiles } = await (supabase
        .from('profiles') as any)
        .select('id, name, email')
        .in('id', userIds);
      const profileMap = new Map((profiles || []).map((p: { id: string; name: string; email: string }) => [p.id, p]));

      return data.map((d: { affiliate_profiles: { user_id: string; paypal_email: string }; amount: number; created_at: string; id: string }) => ({
        ...d,
        name: (profileMap.get(d.affiliate_profiles.user_id) as { name?: string })?.name || 'Unknown',
        email: (profileMap.get(d.affiliate_profiles.user_id) as { email?: string })?.email || '',
        paypal: d.affiliate_profiles.paypal_email,
      }));
    },
  });

  const markPaid = async (eventId: string, affiliateId: string, amount: number, agentEmail: string, agentName: string) => {
    // Update event type to payout_paid
    await (supabase.from('affiliate_events') as any)
      .update({ event_type: 'payout_paid' })
      .eq('id', eventId);

    // Update affiliate balance
    const affiliate = affiliates.find((a: { id: string }) => a.id === affiliateId);
    if (affiliate) {
      await (supabase.from('affiliate_profiles') as any)
        .update({
          pending_balance: Math.max(0, (affiliate.pending_balance || 0) - amount),
          total_paid_out: (affiliate.total_paid_out || 0) + amount,
        })
        .eq('id', affiliateId);
    }

    // Send email to agent
    supabase.functions.invoke('send-email', {
      body: {
        type: 'payout-sent-member',
        data: { email: agentEmail, amount, method: 'PayPal' },
      },
    }).catch(() => {});

    // Audit log
    if (user) logAdminAction(user.id, {
      action: 'affiliate_payout',
      target_table: 'affiliate_events',
      target_id: eventId,
      metadata: { amount, agent: agentName },
    });

    toast.success(`Marked £${Number(amount).toFixed(2)} as paid to ${agentName}`);
    queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
    queryClient.invalidateQueries({ queryKey: ['admin-pending-payouts'] });
  };

  // Global stats
  const totalAgents = affiliates.length;
  const totalEarned = affiliates.reduce((s: number, a: { total_earned: number }) => s + Number(a.total_earned || 0), 0);
  const totalClicks = affiliates.reduce((s: number, a: { total_clicks: number }) => s + (a.total_clicks || 0), 0);
  const totalSignups = affiliates.reduce((s: number, a: { total_signups: number }) => s + (a.total_signups || 0), 0);

  const filtered = affiliates.filter((a: { name: string; email: string; referral_code: string }) => {
    const matchesSearch = !search || [a.name, a.email, a.referral_code].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === 'all' || (filter === 'pending_payouts' && Number((a as Record<string, unknown>).pending_balance || 0) > 0);
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Affiliate Agents</h1>

      {/* Global stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Agents', value: totalAgents, icon: Users, color: 'text-emerald-600' },
          { label: 'Total Clicks', value: totalClicks.toLocaleString(), icon: MousePointerClick, color: 'text-blue-600' },
          { label: 'Total Signups', value: totalSignups, icon: TrendingUp, color: 'text-purple-600' },
          { label: 'Total Commissions', value: `£${totalEarned.toFixed(2)}`, icon: Wallet, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} strokeWidth={1.8} />
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-xl font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Pending payouts */}
      {pendingPayouts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-amber-900 mb-3">
            Pending Payout Requests ({pendingPayouts.length})
          </h3>
          <div className="space-y-2">
            {pendingPayouts.map((p: { id: string; affiliate_id: string; amount: number; name: string; email: string; paypal: string; created_at: string }) => (
              <div key={p.id} className="flex items-center gap-4 bg-white rounded-xl p-3 border border-amber-100">
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-foreground">{p.name}</span>
                  <div className="text-[11px] text-muted-foreground">
                    {p.email} · PayPal: {p.paypal || '(not set)'} · {new Date(p.created_at).toLocaleDateString('en-GB')}
                  </div>
                </div>
                <span className="text-[15px] font-bold text-foreground">£{Number(p.amount).toFixed(2)}</span>
                <button
                  onClick={() => markPaid(p.id, (p as Record<string, unknown>).affiliate_id as string, p.amount, p.email, p.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Mark Paid
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="input-nfstay pl-9 text-sm w-full"
          />
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {([['all', 'All'], ['pending_payouts', 'Pending Payouts']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Agents table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No agents found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Agent', 'Code', 'Clicks', 'Signups', 'Paid Users', 'Earned', 'Pending', 'Rank'].map(h => (
                  <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a: Record<string, unknown>, i: number) => (
                <tr key={a.id as string} className={i % 2 === 1 ? 'bg-secondary/50' : ''}>
                  <td className="p-3.5">
                    <div className="font-medium text-foreground">{a.name as string}</div>
                    <div className="text-[11px] text-muted-foreground">{a.email as string}</div>
                  </td>
                  <td className="p-3.5 font-mono text-xs text-muted-foreground">{a.referral_code as string}</td>
                  <td className="p-3.5 text-foreground">{(a.total_clicks as number || 0).toLocaleString()}</td>
                  <td className="p-3.5 text-foreground">{a.total_signups as number || 0}</td>
                  <td className="p-3.5 text-foreground">{a.total_paid_users as number || 0}</td>
                  <td className="p-3.5 font-semibold text-foreground">£{Number(a.total_earned || 0).toFixed(2)}</td>
                  <td className="p-3.5">
                    {Number(a.pending_balance || 0) > 0 ? (
                      <span className="text-amber-700 font-semibold">£{Number(a.pending_balance).toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground">£0.00</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      a.rank === 'diamond' ? 'bg-blue-100 text-blue-700' :
                      a.rank === 'gold' ? 'bg-amber-100 text-amber-700' :
                      a.rank === 'silver' ? 'bg-gray-100 text-gray-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {(a.rank as string || 'bronze').charAt(0).toUpperCase() + (a.rank as string || 'bronze').slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
