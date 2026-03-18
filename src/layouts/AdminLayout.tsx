import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, List, Users, FileText, GraduationCap, CreditCard, HelpCircle, UserCheck, Settings, Bell, TrendingUp, Building2, ShoppingCart, Coins, Sliders, Banknote, Vote, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type AdminLink =
  | { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; separator?: false }
  | { to: string; label: string; icon: null; separator: true };

const adminLinks: AdminLink[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/listings', label: 'Listings', icon: List },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/submissions', label: 'Submissions', icon: FileText },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/university', label: 'University', icon: GraduationCap },
  { to: '/admin/pricing', label: 'Pricing', icon: CreditCard },
  { to: '/admin/faq', label: 'FAQ', icon: HelpCircle },
  { to: '/admin/affiliates', label: 'Affiliates', icon: UserCheck },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: 'separator', label: 'Investment', icon: null, separator: true },
  { to: '/admin/invest', label: 'Invest Dashboard', icon: TrendingUp, exact: true },
  { to: '/admin/invest/properties', label: 'Properties', icon: Building2 },
  { to: '/admin/invest/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/invest/shareholders', label: 'Shareholders', icon: Users },
  { to: '/admin/invest/commissions', label: 'Commissions', icon: Coins },
  { to: '/admin/invest/commission-settings', label: 'Commission Settings', icon: Sliders },
  { to: '/admin/invest/payouts', label: 'Payouts', icon: Banknote },
  { to: '/admin/invest/proposals', label: 'Proposals', icon: Vote },
  { to: '/admin/invest/boost', label: 'Boost', icon: Rocket },
];

export default function AdminLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notification count, poll every 30s
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      // notifications table not in generated types
      const { count } = await (supabase.from('notifications') as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="h-[64px] bg-card border-b border-border flex items-center px-6 gap-6">
        <span className="text-lg font-extrabold text-foreground tracking-tight">NFsTay</span>
        <div className="flex gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          {adminLinks.map((l, i) => {
            if (l.separator) {
              return (
                <span key={`sep-${i}`} className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap select-none">
                  {l.label}
                </span>
              );
            }
            const isActive = l.exact
              ? location.pathname === l.to
              : location.pathname === l.to || (location.pathname.startsWith(l.to + '/') && l.to !== '/admin');
            return (
              <Link key={l.to} to={l.to} className={`px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors inline-flex items-center gap-1.5 ${isActive ? 'bg-accent-light text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {l.label}
                {l.to === '/admin/notifications' && unreadCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
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
