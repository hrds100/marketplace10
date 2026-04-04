import { useState } from 'react';
import { Check, Search, TrendingUp, Users, MousePointerClick, Wallet, Trash2 } from 'lucide-react';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPin, setBulkPin] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Fetch all affiliates with profile names
  const { data: affiliates = [], isLoading } = useQuery({
    queryKey: ['admin-affiliates'],
    queryFn: async () => {
      const { data } = await (supabase
        .from('aff_profiles') as any)
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
        .from('aff_events') as any)
        .select('*, aff_profiles!inner(user_id, referral_code, payout_details)')
        .eq('event_type', 'payout_requested')
        .order('created_at', { ascending: false });
      if (!data?.length) return [];

      const userIds = data.map((d: { aff_profiles: { user_id: string } }) => d.aff_profiles.user_id);
      const { data: profiles } = await (supabase
        .from('profiles') as any)
        .select('id, name, email')
        .in('id', userIds);
      const profileMap = new Map((profiles || []).map((p: { id: string; name: string; email: string }) => [p.id, p]));

      return data.map((d: { aff_profiles: { user_id: string; payout_details: { paypal?: string } | null }; amount: number; created_at: string; id: string }) => ({
        ...d,
        name: (profileMap.get(d.aff_profiles.user_id) as { name?: string })?.name || 'Unknown',
        email: (profileMap.get(d.aff_profiles.user_id) as { email?: string })?.email || '',
        paypal: d.aff_profiles.payout_details?.paypal || '',
      }));
    },
  });

  const markPaid = async (eventId: string, affiliateId: string, amount: number, agentEmail: string, agentName: string) => {
    // Update event type to payout_paid
    await (supabase.from('aff_events') as any)
      .update({ event_type: 'payout_paid' })
      .eq('id', eventId);

    // Update affiliate balance
    const affiliate = affiliates.find((a: { id: string }) => a.id === affiliateId);
    if (affiliate) {
      await (supabase.from('aff_profiles') as any)
        .update({
          pending_balance: Math.max(0, (affiliate.pending_balance || 0) - amount),
          total_claimed: (affiliate.total_claimed || 0) + amount,
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
      target_table: 'aff_events',
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
  const totalClicks = affiliates.reduce((s: number, a: { link_clicks: number }) => s + (a.link_clicks || 0), 0);
  const totalSignups = affiliates.reduce((s: number, a: { signups: number }) => s + (a.signups || 0), 0);

  const filtered = affiliates.filter((a: { name: string; email: string; referral_code: string }) => {
    const matchesSearch = !search || [a.name, a.email, a.referral_code].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === 'all' || (filter === 'pending_payouts' && Number((a as Record<string, unknown>).pending_balance || 0) > 0);
    return matchesSearch && matchesFilter;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a: Record<string, unknown>) => a.id as string)));
    }
  };

  const bulkDeleteAffiliates = async () => {
    if (bulkPin !== '5891') { toast.error('Wrong PIN'); return; }
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await (supabase.from('aff_profiles') as any).delete().in('id', ids);
      if (error) throw error;
      if (user) logAdminAction(user.id, { action: 'bulk_delete_affiliates', target_table: 'aff_profiles', target_id: ids.join(','), metadata: { count: ids.length } });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      setBulkPin('');
      toast.success(`${ids.length} affiliate(s) deleted`);
    } catch (err) {
      toast.error('Delete failed: ' + (err instanceof Error ? err.message : 'unknown'));
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div data-feature="ADMIN">
      <h1 className="text-[28px] font-bold text-foreground mb-6">Affiliate Agents</h1>

      {/* Global stats */}
      <div data-feature="ADMIN__AFFILIATES_EARNINGS" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            data-feature="ADMIN__AFFILIATES_SEARCH"
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
      <div data-feature="ADMIN__AFFILIATES_TABLE" className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No agents found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3.5 w-10">
                  <input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-border accent-[#1E9A80] cursor-pointer" />
                </th>
                {['Agent', 'Code', 'Clicks', 'Signups', 'Paid Users', 'Earned', 'Pending', 'Tier'].map(h => (
                  <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a: Record<string, unknown>, i: number) => (
                <tr key={a.id as string} className={i % 2 === 1 ? 'bg-secondary/50' : ''}>
                  <td className="p-3.5 w-10">
                    <input type="checkbox" checked={selectedIds.has(a.id as string)} onChange={() => toggleSelect(a.id as string)} className="w-4 h-4 rounded border-border accent-[#1E9A80] cursor-pointer" />
                  </td>
                  <td className="p-3.5">
                    <div className="font-medium text-foreground">{a.name as string}</div>
                    <div className="text-[11px] text-muted-foreground">{a.email as string}</div>
                  </td>
                  <td className="p-3.5 font-mono text-xs text-muted-foreground">{a.referral_code as string}</td>
                  <td className="p-3.5 text-foreground">{(a.link_clicks as number || 0).toLocaleString()}</td>
                  <td className="p-3.5 text-foreground">{a.signups as number || 0}</td>
                  <td className="p-3.5 text-foreground">{a.paid_users as number || 0}</td>
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
                      a.tier === 'diamond' ? 'bg-blue-100 text-blue-700' :
                      a.tier === 'gold' ? 'bg-amber-100 text-amber-700' :
                      a.tier === 'silver' ? 'bg-gray-100 text-gray-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {(a.tier as string || 'standard').charAt(0).toUpperCase() + (a.tier as string || 'standard').slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E7EB] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{selectedIds.size} selected</span>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hard Delete Selected
          </button>
        </div>
      )}

      {/* Bulk Delete PIN Dialog */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => { setBulkDeleteOpen(false); setBulkPin(''); }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Bulk Delete Affiliates</h3>
                <p className="text-xs text-red-600 font-semibold">Permanently delete {selectedIds.size} affiliate(s) — cannot be undone</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-foreground block mb-1.5">Enter PIN to confirm</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={bulkPin}
                onChange={e => setBulkPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setBulkDeleteOpen(false); setBulkPin(''); }} className="flex-1 h-11 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={bulkDeleteAffiliates}
                disabled={bulkDeleting || bulkPin.length !== 4}
                className="flex-1 h-11 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
