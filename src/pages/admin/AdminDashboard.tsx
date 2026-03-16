import { useState } from 'react';
import { LayoutDashboard, List, Users, FileText, DollarSign, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLog';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);

  const stats = [
    { icon: List, label: 'Active listings', value: '90' },
    { icon: Users, label: 'Total users', value: '8' },
    { icon: FileText, label: 'Pending submissions', value: '4' },
    { icon: DollarSign, label: 'MRR', value: '£776' },
    { icon: DollarSign, label: 'Affiliate payouts', value: '£0' },
  ];

  const activities = [
    'New submission: Hawthorn Mews, Manchester · 2 min ago',
    'User signed up: Tom Peters · 15 min ago',
    'Submission approved: Station Mews, Bristol · 1 hr ago',
    'Deal status changed: Oak Lodge → On Offer · 2 hrs ago',
    'New submission: Riverside Loft, London · 3 hrs ago',
    'User cancelled: Alex Reeves · 5 hrs ago',
    'Submission approved: Park View, Liverpool · 6 hrs ago',
    'New deal listed: Cedar View, Glasgow · 8 hrs ago',
    'Affiliate payout processed: £48.50 · 12 hrs ago',
    'New submission: Canal Quarter, Birmingham · 1 day ago',
  ];

  const handleReset = async () => {
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-for-testing', { method: 'POST' });
      if (error) throw new Error(error.message || 'Edge function error');
      if (data?.error) throw new Error(data.error);
      if (user?.id) {
        logAdminAction(user.id, { action: 'reset_all_for_testing', target_table: 'multiple', target_id: 'n/a', metadata: {} });
      }
      toast.success('Reset complete. All inbox and tier data cleared.');
      setShowResetDialog(false);
    } catch (err) {
      toast.error(`Reset failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
            <s.icon className="w-5 h-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h2 className="text-base font-bold text-foreground mb-4">Recent activity</h2>
        <div className="space-y-3">
          {activities.map((a, i) => {
            const [text, time] = a.split(' · ');
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
          onClick={() => setShowResetDialog(true)}
          className="px-4 py-2 rounded-lg border-2 border-red-300 bg-white text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors"
        >
          Reset all inbox & payments for testing
        </button>
      </div>

      {/* Confirmation dialog */}
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
