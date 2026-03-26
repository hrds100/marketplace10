import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeft, LayoutDashboard, List, Users, FileText, GraduationCap,
  CreditCard, HelpCircle, UserCheck, Settings, Bell, TrendingUp,
  Building2, ShoppingCart, Coins, Sliders, Banknote, Vote, Rocket,
  LayoutGrid, Plug, Globe, CalendarCheck, Zap, Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { NfsLogo } from '@/components/nfstay/NfsLogo';

const marketplaceLinks = [
  { to: '/admin/marketplace', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/marketplace/quick-list', label: 'Quick List', icon: Zap },
  { to: '/admin/marketplace/listings', label: 'Listings', icon: List },
  { to: '/admin/marketplace/users', label: 'Users', icon: Users },
  { to: '/admin/marketplace/submissions', label: 'Submissions', icon: FileText },
  { to: '/admin/marketplace/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/marketplace/university', label: 'University', icon: GraduationCap },
  { to: '/admin/marketplace/pricing', label: 'Pricing', icon: CreditCard },
  { to: '/admin/marketplace/faq', label: 'FAQ', icon: HelpCircle },
  { to: '/admin/marketplace/affiliates', label: 'Affiliates', icon: UserCheck },
  { to: '/admin/marketplace/settings', label: 'Settings', icon: Settings },
  { to: '/admin/observatory', label: 'Observatory', icon: Eye },
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
    <div data-feature="NAV_LAYOUT" className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="h-[64px] bg-card border-b border-border flex items-center px-6 gap-4">
        <Link to="/admin" className="flex-shrink-0">
          <NfsLogo size="sm" />
        </Link>

        {workspace !== 'selector' && (
          <>
            {/* Workspace quick-switch tabs */}
            <div className="flex items-center gap-1 flex-shrink-0 border-r border-border pr-3 mr-1">
              <Link to="/admin/marketplace" className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${workspace === 'marketplace' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                Marketplace
              </Link>
              <Link to="/admin/invest" className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${workspace === 'invest' ? 'bg-amber-500/10 text-amber-600' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                JV
              </Link>
              <Link to="/admin/nfstay" className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${workspace === 'booking' ? 'bg-blue-500/10 text-blue-600' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                Booking
              </Link>
            </div>

            <div className="flex gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
              {links.map((l) => {
                const isActive = l.exact
                  ? location.pathname === l.to
                  : location.pathname === l.to || location.pathname.startsWith(l.to + '/');
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    data-feature={
                      l.label === 'Dashboard' ? 'NAV_LAYOUT__ADMIN_DASHBOARD' :
                      l.label === 'Listings' ? 'NAV_LAYOUT__ADMIN_LISTINGS' :
                      l.label === 'Users' ? 'NAV_LAYOUT__ADMIN_USERS' :
                      l.label === 'Quick List' ? 'NAV_LAYOUT__ADMIN_QUICK_LIST' :
                      'NAV_LAYOUT__ADMIN_LINK'
                    }
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
                data-feature="NAV_LAYOUT__ADMIN_WORKSPACE"
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
              data-feature="NAV_LAYOUT__ADMIN_WORKSPACE"
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
