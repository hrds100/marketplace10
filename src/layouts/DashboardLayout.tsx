import { useState, useEffect } from 'react';
import { Outlet, useLocation, useOutletContext, Link, useNavigate } from 'react-router-dom';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardTopNav from '@/components/DashboardTopNav';
import NotificationBell from '@/components/NotificationBell';
import BurgerMenu from '@/components/BurgerMenu';
import ProtectedRoute from '@/components/ProtectedRoute';
import PaymentSuccessRefresher from '@/components/PaymentSuccessRefresher';
import ClaimAccountBanner from '@/components/ClaimAccountBanner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
  return (
    <header className="h-14 bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-border/30 flex items-center px-5 md:px-8 z-[101] relative flex-shrink-0">
      <Link
        to="/dashboard/deals"
        className="text-[17px] font-extrabold text-foreground tracking-tight hover:opacity-70 transition-opacity"
      >
        NFsTay
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <BurgerMenu />
      </div>
    </header>
  );
}

export default function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [landlordPhone, setLandlordPhone] = useState<string | null>(null);
  const isFullBleed = FULL_BLEED_ROUTES.some(r => location.pathname.startsWith(r));
  const isTopNav = TOP_NAV_ROUTES.some(r => location.pathname === r || location.pathname === r + '/');
  const marginClass = sidebarCollapsed ? 'md:ml-16' : 'md:ml-56';

  // Detect unclaimed landlord accounts (email ends with @nfstay.internal)
  useEffect(() => {
    if (!user?.id || !user.email?.endsWith('@nfstay.internal')) {
      setLandlordPhone(null);
      return;
    }
    (supabase.from('profiles') as any)
      .select('whatsapp')
      .eq('id', user.id)
      .single()
      .then(({ data }: { data: Record<string, unknown> | null }) => {
        setLandlordPhone((data?.whatsapp as string) || '');
      });
  }, [user?.id, user?.email]);

  const claimBanner = landlordPhone !== null ? (
    <ClaimAccountBanner phone={landlordPhone} onClaimed={() => setLandlordPhone(null)} />
  ) : null;

  return (
    <ProtectedRoute>
      {isTopNav ? (
        /* ── Deals page: full top nav ──────────────────────────── */
        <div className="h-screen flex flex-col animate-in fade-in duration-300" style={{ background: 'hsl(210 20% 98%)' }}>
          <PaymentSuccessRefresher />
          <DashboardTopNav />
          {claimBanner}
          <main className="flex-1 flex flex-col overflow-hidden">
            <Outlet context={{ sidebarCollapsed, setSidebarCollapsed }} />
          </main>
        </div>
      ) : (
        /* ── Other pages: minimal top bar + sidebar below it ──── */
        <div className="h-screen flex flex-col animate-in fade-in duration-300" style={{ background: 'hsl(210 20% 98%)' }}>
          <PaymentSuccessRefresher />
          <MinimalTopBar />
          {claimBanner}
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
