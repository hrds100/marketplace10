import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeft, LayoutDashboard, List, Users, FileText, GraduationCap,
  CreditCard, HelpCircle, UserCheck, Settings, Bell, TrendingUp,
  Building2, ShoppingCart, Coins, Sliders, Banknote, Vote, Rocket,
  LayoutGrid, ArrowLeftRight, Plug, Globe, CalendarCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const marketplaceLinks = [
  { to: '/admin/marketplace', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/marketplace/listings', label: 'Listings', icon: List },
  { to: '/admin/marketplace/users', label: 'Users', icon: Users },
  { to: '/admin/marketplace/submissions', label: 'Submissions', icon: FileText },
  { to: '/admin/marketplace/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/marketplace/university', label: 'University', icon: GraduationCap },
  { to: '/admin/marketplace/pricing', label: 'Pricing', icon: CreditCard },
  { to: '/admin/marketplace/faq', label: 'FAQ', icon: HelpCircle },
  { to: '/admin/marketplace/affiliates', label: 'Affiliates', icon: UserCheck },
  { to: '/admin/marketplace/settings', label: 'Settings', icon: Settings },
];

const investLinks = [
  { to: '/admin/invest', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/invest/properties', label: 'Properties', icon: Building2 },
  { to: '/admin/invest/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/invest/shareholders', label: 'Shareholders', icon: Users },
  { to: '/admin/invest/commissions', label: 'Commissions', icon: Coins },
  { to: '/admin/invest/commission-settings', label: 'Rates', icon: Sliders },
  { to: '/admin/invest/payouts', label: 'Payouts', icon: Banknote },
  { to: '/admin/invest/proposals', label: 'Proposals', icon: Vote },
  { to: '/admin/invest/boost', label: 'Boost', icon: Rocket },
  { to: '/admin/invest/endpoints', label: 'Endpoints', icon: Plug },
];

const bookingLinks = [
  { to: '/admin/nfstay', label: 'Reservations', icon: CalendarCheck, exact: true },
  { to: '/admin/nfstay/properties', label: 'Properties', icon: Globe },
];

function getWorkspace(pathname: string): 'selector' | 'marketplace' | 'invest' | 'booking' {
  if (pathname.startsWith('/admin/invest')) return 'invest';
  if (pathname.startsWith('/admin/marketplace')) return 'marketplace';
  if (pathname.startsWith('/admin/nfstay')) return 'booking';
  // Legacy routes without /marketplace/ prefix — treat as marketplace
  if (pathname === '/admin' || pathname === '/admin/') return 'selector';
  if (pathname.startsWith('/admin/')) return 'marketplace';
  return 'selector';
}

export default function AdminLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const workspace = getWorkspace(location.pathname);

  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
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

  const links = workspace === 'invest' ? investLinks : workspace === 'booking' ? bookingLinks : marketplaceLinks;
  const workspaceLabel = workspace === 'invest' ? 'JV Partners' : workspace === 'booking' ? 'Booking Site' : 'Marketplace';

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="h-[64px] bg-card border-b border-border flex items-center px-6 gap-4">
        <span className="text-lg font-extrabold text-foreground tracking-tight flex-shrink-0">NFsTay</span>

        {workspace !== 'selector' && (
          <>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${workspace === 'invest' ? 'bg-amber-500/10 text-amber-600' : workspace === 'booking' ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'} flex-shrink-0`}>
              {workspaceLabel}
            </span>

            <div className="flex gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
              {links.map((l) => {
                const isActive = l.exact
                  ? location.pathname === l.to
                  : location.pathname === l.to || location.pathname.startsWith(l.to + '/');
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors inline-flex items-center gap-1.5 ${
                      isActive ? 'bg-accent-light text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {l.label}
                    {l.to.includes('notifications') && unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                to="/admin"
                className="h-9 px-3 rounded-lg border border-border text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" /> Switch
              </Link>
              <Link
                to="/dashboard/deals"
                className="h-9 px-3 rounded-lg border border-border text-[13px] font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> App
              </Link>
            </div>
          </>
        )}

        {workspace === 'selector' && (
          <div className="flex-1 flex justify-end">
            <Link
              to="/dashboard/deals"
              className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to App
            </Link>
          </div>
        )}
      </nav>

      <main className="max-w-[1400px] mx-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
