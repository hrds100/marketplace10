import { LayoutDashboard, List, Users, FileText, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
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

      <div className="flex gap-3">
        <Link to="/admin/submissions" className="h-11 px-5 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center hover:opacity-90 transition-opacity">Review submissions</Link>
        <Link to="/admin/listings" className="h-11 px-5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center">Manage listings</Link>
        <Link to="/admin/users" className="h-11 px-5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center">Manage users</Link>
      </div>
    </div>
  );
}
