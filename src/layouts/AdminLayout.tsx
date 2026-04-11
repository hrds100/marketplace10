import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeft, LayoutDashboard, List, Users, GraduationCap,
  CreditCard, HelpCircle, UserCheck, Settings, Bell,
  Building2, ShoppingCart, Coins, Sliders, Banknote, Vote, Rocket,
  Plug, Zap, Menu, X, MessageSquare,
  BarChart3, Calendar,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { NfsLogo } from '@/components/nfstay/NfsLogo';

const marketplaceLinks = [
  { to: '/admin/marketplace', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/marketplace/quick-list', label: 'Quick List', icon: Zap },
  { to: '/admin/marketplace/deals', label: 'Deals', icon: List },
  { to: '/admin/marketplace/outreach', label: 'The Gate', icon: Rocket },
  { to: '/admin/marketplace/users', label: 'Users', icon: Users },
  { to: '/admin/marketplace/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/marketplace/university', label: 'University', icon: GraduationCap },
  { to: '/admin/marketplace/pricing', label: 'Pricing', icon: CreditCard },
  { to: '/admin/marketplace/faq', label: 'FAQ', icon: HelpCircle },
  { to: '/admin/marketplace/affiliates', label: 'Affiliates', icon: UserCheck },
  { to: '/admin/marketplace/settings', label: 'Settings', icon: Settings },
  { to: '/admin/marketplace/whatsapp-scraper', label: 'Deal Scanner', icon: MessageSquare },
  { to: '/admin/marketplace/growth', label: 'Growth', icon: BarChart3 },
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
  { to: '/admin/invest/endpoints', label: 'Endpoints', icon: Plug },
];

const bookingLinks = [
  { to: '/admin/nfstay/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/nfstay', label: 'Reservations', icon: Calendar, exact: true },
  { to: '/admin/nfstay/properties', label: 'Properties', icon: Building2 },
  { to: '/admin/nfstay/users', label: 'Users', icon: Users },
  { to: '/admin/nfstay/operators', label: 'Operators', icon: UserCheck },
  { to: '/admin/nfstay/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/nfstay/settings', label: 'Settings', icon: Settings },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const workspace = getWorkspace(location.pathname);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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

  const currentLinks = workspace === 'invest' ? investLinks : workspace === 'booking' ? bookingLinks : marketplaceLinks;
  const workspaceLabel = workspace === 'invest' ? 'JV Partners' : workspace === 'booking' ? 'Booking Site' : 'Marketplace';

  return (
    <div data-feature="NAV_LAYOUT" className="min-h-screen bg-background relative overflow-x-hidden">
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
              <Link to="/sms/inbox" className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary">
                SMS
              </Link>
            </div>

            <div className="hidden md:flex gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
              {currentLinks.map((l) => {
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
              {/* Mobile hamburger */}
              <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
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

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-[64px] left-0 right-0 bg-white border-b shadow-lg md:hidden z-50 p-4">
          {currentLinks.map((link) => {
            const isActive = (link as { exact?: boolean }).exact
              ? location.pathname === link.to
              : location.pathname === link.to || location.pathname.startsWith(link.to + '/');
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-accent-light text-primary font-medium' : 'text-foreground hover:bg-gray-100'}`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}

      <main className="max-w-[1400px] mx-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
