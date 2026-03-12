import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, List, Users, FileText, GraduationCap, CreditCard, HelpCircle, UserCheck, Settings } from 'lucide-react';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/listings', label: 'Listings', icon: List },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/submissions', label: 'Submissions', icon: FileText },
  { to: '/admin/university', label: 'University', icon: GraduationCap },
  { to: '/admin/pricing', label: 'Pricing', icon: CreditCard },
  { to: '/admin/faq', label: 'FAQ', icon: HelpCircle },
  { to: '/admin/affiliates', label: 'Affiliates', icon: UserCheck },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="h-[64px] bg-card border-b border-border flex items-center px-6 gap-6">
        <span className="text-lg font-extrabold text-foreground tracking-tight">NFsTay</span>
        <div className="flex gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          {adminLinks.map(l => {
            const isActive = l.exact ? location.pathname === l.to : location.pathname.startsWith(l.to) && l.to !== '/admin';
            return (
              <Link key={l.to} to={l.to} className={`px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-accent-light text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {l.label}
              </Link>
            );
          })}
        </div>
        <Link to="/dashboard/deals" className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-2 whitespace-nowrap">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to App
        </Link>
      </nav>

      <main className="max-w-[1400px] mx-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
