import { useState } from 'react';
import { Outlet, useLocation, useOutletContext } from 'react-router-dom';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardTopNav from '@/components/DashboardTopNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import PaymentSuccessRefresher from '@/components/PaymentSuccessRefresher';

const FULL_BLEED_ROUTES = ['/dashboard/inbox'];
const TOP_NAV_ROUTES = ['/dashboard/deals'];

export interface DashboardContext {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

export function useDashboardContext() {
  return useOutletContext<DashboardContext>();
}

export default function DashboardLayout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isFullBleed = FULL_BLEED_ROUTES.some(r => location.pathname.startsWith(r));
  const isTopNav = TOP_NAV_ROUTES.some(r => location.pathname === r || location.pathname === r + '/');
  const marginClass = sidebarCollapsed ? 'md:ml-16' : 'md:ml-56';

  return (
    <ProtectedRoute>
      {isTopNav ? (
        /* ── Top-nav layout: deals page — no sidebar, full viewport ── */
        <div className="h-screen flex flex-col animate-in fade-in duration-300" style={{ background: 'hsl(210 20% 98%)' }}>
          <PaymentSuccessRefresher />
          <DashboardTopNav />
          <main className="flex-1 flex flex-col overflow-hidden">
            <Outlet context={{ sidebarCollapsed, setSidebarCollapsed }} />
          </main>
        </div>
      ) : (
        /* ── Sidebar layout: all other pages ─────────────────────── */
        <div className="min-h-screen animate-in fade-in duration-300" style={{ background: 'hsl(210 20% 98%)' }}>
          <PaymentSuccessRefresher />
          <DashboardSidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
          {isFullBleed ? (
            <main className={`${marginClass} h-screen flex flex-col transition-all duration-300 ease-out`}>
              <Outlet context={{ sidebarCollapsed, setSidebarCollapsed }} />
            </main>
          ) : (
            <main className={`${marginClass} pb-20 md:pb-8 transition-all duration-300 ease-out`}>
              <div className="max-w-[1440px] mx-auto p-6 md:p-8">
                <Outlet context={{ sidebarCollapsed, setSidebarCollapsed }} />
              </div>
            </main>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}
