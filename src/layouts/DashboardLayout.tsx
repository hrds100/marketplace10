import { useState } from 'react';
import { Outlet, useLocation, useOutletContext, Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardTopNav from '@/components/DashboardTopNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import PaymentSuccessRefresher from '@/components/PaymentSuccessRefresher';
import { useAuth } from '@/hooks/useAuth';

const FULL_BLEED_ROUTES = ['/dashboard/inbox'];
const TOP_NAV_ROUTES = ['/dashboard/deals'];

export interface DashboardContext {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

export function useDashboardContext() {
  return useOutletContext<DashboardContext>();
}

/* Minimal top bar for sidebar pages — logo at same position as top nav */
function MinimalTopBar() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  return (
    <header className="h-14 bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-border/30 flex items-center px-5 md:px-8 z-[101] relative flex-shrink-0">
      <Link
        to="/dashboard/deals"
        className="text-[17px] font-extrabold text-foreground tracking-tight hover:opacity-70 transition-opacity"
      >
        NFsTay
      </Link>
      <div className="ml-auto">
        <button
          onClick={async () => { await signOut(); navigate('/signin'); }}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          title="Sign out"
        >
          <LogOut className="w-[15px] h-[15px]" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}

export default function DashboardLayout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const isFullBleed = FULL_BLEED_ROUTES.some(r => location.pathname.startsWith(r));
  const isTopNav = TOP_NAV_ROUTES.some(r => location.pathname === r || location.pathname === r + '/');
  const marginClass = sidebarCollapsed ? 'md:ml-16' : 'md:ml-56';

  return (
    <ProtectedRoute>
      {isTopNav ? (
        /* ── Deals page: full top nav ──────────────────────────── */
        <div className="h-screen flex flex-col animate-in fade-in duration-300" style={{ background: 'hsl(210 20% 98%)' }}>
          <PaymentSuccessRefresher />
          <DashboardTopNav />
          <main className="flex-1 flex flex-col overflow-hidden">
            <Outlet context={{ sidebarCollapsed, setSidebarCollapsed }} />
          </main>
        </div>
      ) : (
        /* ── Other pages: minimal top bar + sidebar below it ──── */
        <div className="h-screen flex flex-col animate-in fade-in duration-300" style={{ background: 'hsl(210 20% 98%)' }}>
          <PaymentSuccessRefresher />
          <MinimalTopBar />
          <div className="flex-1 flex overflow-hidden relative">
            <DashboardSidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
            {isFullBleed ? (
              <main className={`${marginClass} flex-1 flex flex-col transition-all duration-300 ease-out overflow-hidden`}>
                <Outlet context={{ sidebarCollapsed, setSidebarCollapsed }} />
              </main>
            ) : (
              <main className={`${marginClass} flex-1 overflow-y-auto transition-all duration-300 ease-out pb-20 md:pb-8`}>
                <div className="max-w-[1440px] mx-auto p-6 md:p-8">
                  <Outlet context={{ sidebarCollapsed, setSidebarCollapsed }} />
                </div>
              </main>
            )}
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
