import { useEffect } from 'react';
import { Outlet, NavLink, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, CalendarCheck, Paintbrush, TrendingUp, Users, Settings, Globe, BarChart3 } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useUserTier } from '@/hooks/useUserTier';
import { isPaidTier } from '@/lib/ghl';
import { useAuth } from '@/hooks/useAuth';

const operatorLinks = [
  { to: '/dashboard/booking-site/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/booking-site/properties', label: 'Properties', icon: Building2 },
  { to: '/dashboard/booking-site/reservations', label: 'Reservations', icon: CalendarCheck },
  { to: '/dashboard/booking-site/branding', label: 'Branding', icon: Paintbrush },
];

const adminLinks = [
  { to: '/dashboard/booking-site/overview', label: 'Platform Overview', icon: BarChart3 },
  { to: '/dashboard/booking-site/operators', label: 'All Operators', icon: Globe },
  { to: '/dashboard/booking-site/users', label: 'All Users', icon: Users },
  { to: '/dashboard/booking-site/analytics', label: 'Analytics', icon: TrendingUp },
  { to: '/dashboard/booking-site/settings', label: 'Settings', icon: Settings },
];

export default function BookingSiteLayout() {
  const { tier, loading: tierLoading } = useUserTier();
  const { isAdmin } = useAuth();
  const paid = isPaidTier(tier) || isAdmin;
  const location = useLocation();

  useEffect(() => { document.title = 'nfstay - Booking Site'; }, []);

  if (tierLoading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Free tier → preview page (rendered as child route)
  if (!paid) {
    return <Outlet />;
  }

  // Exact match on /dashboard/booking-site → redirect to dashboard tab
  if (location.pathname === '/dashboard/booking-site' || location.pathname === '/dashboard/booking-site/') {
    return <Navigate to="/dashboard/booking-site/branding" replace />;
  }

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
      isActive ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
    }`;

  return (
    <div data-feature="BOOKING_NFSTAY" className="h-[calc(100vh-3.5rem)] flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-[220px] border-r border-border bg-card flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[14px] font-bold text-foreground">Booking Site</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Operator</p>
          {operatorLinks.map(link => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => linkClass(isActive)}>
              <link.icon className="w-4 h-4" />
              {link.label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="border-t border-border my-3" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Admin</p>
              {adminLinks.map(link => (
                <NavLink key={link.to} to={link.to} className={({ isActive }) => linkClass(isActive)}>
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
