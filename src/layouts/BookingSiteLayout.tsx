import { useEffect } from 'react';
import { Outlet, NavLink, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, CalendarDays, Paintbrush, BarChart3, Settings, Globe, Users, TrendingUp } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useUserTier } from '@/hooks/useUserTier';
import { isPaidTier } from '@/lib/ghl';
import { useAuth } from '@/hooks/useAuth';

const operatorTabs = [
  { to: '/dashboard/booking-site/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/booking-site/properties', label: 'Properties', icon: Building2 },
  { to: '/dashboard/booking-site/reservations', label: 'Reservations', icon: CalendarDays },
  { to: '/dashboard/booking-site/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/booking-site/settings', label: 'Settings', icon: Settings },
  { to: '/dashboard/booking-site/branding', label: 'Branding', icon: Paintbrush },
];

const adminTabs = [
  { to: '/dashboard/booking-site/platform', label: 'Platform Overview', icon: TrendingUp },
  { to: '/dashboard/booking-site/operators', label: 'Operators', icon: Globe },
  { to: '/dashboard/booking-site/all-users', label: 'All Users', icon: Users },
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

  if (!paid) {
    return <Outlet />;
  }

  // Exact match → redirect to dashboard
  if (location.pathname === '/dashboard/booking-site' || location.pathname === '/dashboard/booking-site/') {
    return <Navigate to="/dashboard/booking-site/dashboard" replace />;
  }

  const allTabs = isAdmin ? [...operatorTabs, ...adminTabs] : operatorTabs;

  return (
    <div data-feature="BOOKING_NFSTAY" className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="border-b border-border bg-card px-5 flex-shrink-0">
        <div className="flex gap-1 py-2 overflow-x-auto">
          {allTabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground hover:bg-gray-50'
                }`
              }
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
