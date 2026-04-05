import { useState, useEffect } from 'react';
import { List, Users, FileText, DollarSign, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLog';

interface DashboardStats {
  activeListings: number;
  totalUsers: number;
  pendingSubmissions: number;
  mrr: number;
}

interface ActivityEntry {
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

function formatActivity(entry: ActivityEntry): { text: string; time: string } {
  const meta = entry.metadata || {};
  const name = (meta.name as string) || (meta.city as string) || '';
  const diff = Date.now() - new Date(entry.created_at).getTime();
  const mins = Math.floor(diff / 60000);
  const ago = mins < 60
    ? `${mins} min ago`
    : mins < 1440
    ? `${Math.floor(mins / 60)} hr${Math.floor(mins / 60) > 1 ? 's' : ''} ago`
    : `${Math.floor(mins / 1440)} day${Math.floor(mins / 1440) > 1 ? 's' : ''} ago`;
  const labels: Record<string, string> = {
    approve_deal: `Submission approved: ${name}`,
    reject_deal: `Submission rejected: ${name}`,
    delete_deal: `Deal deleted: ${name}`,
    suspend_user: 'User suspended',
    delete_user: 'User deleted',
    reset_all_for_testing: 'Test data reset',
  };
  return { text: labels[entry.action] || entry.action, time: ago };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({ activeListings: 0, totalUsers: 0, pendingSubmissions: 0, mrr: 0 });
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      const [listingsRes, usersRes, pendingRes, mrrRes, activityRes] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }).in('status', ['live', 'approved']),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('tier'),
        (supabase.from('admin_audit_log') as any).select('action, metadata, created_at').order('created_at', { ascending: false }).limit(10),
      ]);
      const tierPrices: Record<string, number> = { monthly: 29, yearly: 19, lifetime: 0 };
      const mrr = ((mrrRes.data || []) as { tier: string }[]).reduce((sum, p) => sum + (tierPrices[p.tier] || 0), 0);
      setStats({
        activeListings: listingsRes.count || 0,
        totalUsers: usersRes.count || 0,
        pendingSubmissions: pendingRes.count || 0,
        mrr,
      });
      setActivities(activityRes.data || []);
    };
    load();
  }, []);

  const handleReset = async () => {
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-for-testing', { method: 'POST' });
      if (error) {
        const detail = data?.error || error.message || JSON.stringify(error);
        console.error('[Reset] Invoke error:', detail);
        throw new Error(detail);
      }
      if (data?.error) {
        console.error('[Reset] Function returned error:', data.error);
        throw new Error(data.error);
      }
      if (user?.id) {
        logAdminAction(user.id, { action: 'reset_all_for_testing', target_table: 'multiple', target_id: 'n/a', metadata: {} });
      }
      toast.success('Reset complete. All inbox and tier data cleared.');
      setShowResetDialog(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const truncated = msg.length > 200 ? msg.slice(0, 200) + '…' : msg;
      console.error('[Reset] Full error:', err);
      toast.error(`Reset failed: ${truncated}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div data-feature="ADMIN">
      <h1 className="text-[28px] font-bold text-foreground mb-6">Admin Dashboard</h1>

      <div data-feature="ADMIN__DASHBOARD_STATS" className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { icon: List, label: 'Active listings', value: stats.activeListings },
          { icon: Users, label: 'Total users', value: stats.totalUsers },
          { icon: FileText, label: 'Pending submissions', value: stats.pendingSubmissions },
          { icon: DollarSign, label: 'MRR', value: `£${stats.mrr}` },
          { icon: DollarSign, label: 'Affiliate payouts', value: '£0' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
            <s.icon className="w-5 h-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div data-feature="ADMIN__DASHBOARD_ACTIVITY" className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h2 className="text-base font-bold text-foreground mb-4">Recent activity</h2>
        <div className="space-y-3">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : activities.map((a, i) => {
            const { text, time } = formatActivity(a);
            return (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-foreground">{text}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{time}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 mb-8">
        <Link to="/admin/submissions" className="h-11 px-5 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center hover:opacity-90 transition-opacity">Review submissions</Link>
        <Link to="/admin/listings" className="h-11 px-5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center">Manage listings</Link>
        <Link to="/admin/users" className="h-11 px-5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center">Manage users</Link>
      </div>

      {/* Testing section — destructive actions */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-base font-bold text-red-900">Testing</h2>
        </div>
        <p className="text-xs text-red-700 mb-4">Dev/test only. These actions cannot be undone.</p>
        <button
          data-feature="ADMIN__DASHBOARD_RESET"
          onClick={() => setShowResetDialog(true)}
          className="px-4 py-2 rounded-lg border-2 border-red-300 bg-white text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors"
        >
          Reset all inbox & payments for testing
        </button>
      </div>

      {showResetDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !resetting && setShowResetDialog(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-bold text-gray-900">Confirm reset</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This will delete <strong>all messages, threads, NDA acceptances, and invites</strong> and set <strong>every user to free tier</strong>. Accounts and properties are kept.
            </p>
            <p className="text-xs text-red-600 mb-5">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetDialog(false)}
                disabled={resetting}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {resetting ? 'Resetting…' : 'Yes, reset everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
