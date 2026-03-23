import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Outlet, useLocation, useOutletContext, Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Gem, Wallet } from 'lucide-react';
import { useEmbeddedWallet } from '@particle-network/connectkit';
import DashboardSidebar from '@/components/DashboardSidebar';
import NotificationBell from '@/components/NotificationBell';
import BurgerMenu from '@/components/BurgerMenu';
import FavouritesDropdown from '@/components/FavouritesDropdown';
import ProtectedRoute from '@/components/ProtectedRoute';
import PaymentSuccessRefresher from '@/components/PaymentSuccessRefresher';
import WalletProvisioner from '@/components/WalletProvisioner';
import ClaimAccountBanner from '@/components/ClaimAccountBanner';
import InvestSubNav from '@/components/InvestSubNav';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { NfsLogo } from '@/components/nfstay/NfsLogo';

const FULL_BLEED_ROUTES = ['/dashboard/inbox', '/dashboard/deals'];
const INVEST_ROUTES_PREFIX = '/dashboard/invest';

export interface DashboardContext {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

export function useDashboardContext() {
  return useOutletContext<DashboardContext>();
}

/* ── Global top bar — always visible, global items only ───────── */
function TopBar() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  let embeddedWallet: any = null;
  try { embeddedWallet = useEmbeddedWallet(); } catch { /* hook not available outside ConnectKitProvider */ }
  return (
    <header className="dashboard-topbar h-14 bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-border/30 flex items-center px-5 md:px-8 z-[101] relative flex-shrink-0">
      <NfsLogo size="sm" />

      <div className="ml-auto flex items-center gap-3">
        {isAdmin && (
          <Link to="/admin" className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary hidden md:block">
            Admin
          </Link>
        )}
        <Link
          to="/dashboard/invest/marketplace"
          className="hidden md:flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
        >
          <Gem className="w-[13px] h-[13px] text-blue-400" strokeWidth={2} />
          Partner on Airbnbs from £500
        </Link>
        <button
          onClick={() => navigate('/dashboard/list-a-deal')}
          className="hidden md:flex bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3.5 py-[6px] rounded-lg text-[12px] font-semibold hover:from-emerald-600 hover:to-teal-700 shadow-sm transition-all items-center gap-1.5"
        >
          <PlusCircle className="w-[14px] h-[14px]" strokeWidth={1.8} />
          Submit a Deal
        </button>
        <button
          onClick={() => {
            if (embeddedWallet?.openWallet) {
              embeddedWallet.openWallet();
            } else {
              navigate('/dashboard/settings');
            }
          }}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary"
          title="Wallet"
        >
          <Wallet className="w-[15px] h-[15px]" strokeWidth={1.8} />
        </button>
        <FavouritesDropdown />
        <NotificationBell />
        <BurgerMenu />
      </div>
    </header>
  );
}

/* ── Main layout — single consistent structure ────────────────── */
export default function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [landlordPhone, setLandlordPhone] = useState<string | null>(null);
  /** Invest marketplace SamCart checkout: hide chrome and blur page content behind the sheet */
  const [investCheckoutFocus, setInvestCheckoutFocus] = useState(false);
  const isFullBleed = FULL_BLEED_ROUTES.some(r => location.pathname.startsWith(r));
  const isInvest = location.pathname.startsWith(INVEST_ROUTES_PREFIX);
  const marginClass = sidebarCollapsed ? 'md:ml-16' : 'md:ml-56';

  useEffect(() => {
    const onFocus = (e: Event) => {
      const open = Boolean((e as CustomEvent<{ open?: boolean }>).detail?.open);
      setInvestCheckoutFocus(open);
    };
    window.addEventListener('invest-checkout-focus', onFocus);
    return () => window.removeEventListener('invest-checkout-focus', onFocus);
  }, []);

  // Detect unclaimed landlord accounts
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

  const claimBanner = landlordPhone !== null && !investCheckoutFocus ? (
    <ClaimAccountBanner phone={landlordPhone} onClaimed={() => setLandlordPhone(null)} />
  ) : null;

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col animate-in fade-in duration-300" style={{ background: 'hsl(210 20% 98%)' }}>
        <PaymentSuccessRefresher />
        <WalletProvisioner />

        {/* ── Top bar — always present ──────────────────────── */}
        <div className={cn(investCheckoutFocus && 'hidden')}>
          <TopBar />
        </div>
        {claimBanner}

        {/* ── Content area — sidebar + main ─────────────────── */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* ── Left sidebar — always present, collapsed by default ── */}
          <div className={cn('dashboard-sidebar-wrap', investCheckoutFocus && 'hidden')}>
            <DashboardSidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
          </div>

          {/* ── Main content ────────────────────────────────── */}
          <div
            className={cn(
              `${marginClass} flex-1 flex flex-col transition-all duration-300 ease-out overflow-hidden`,
              investCheckoutFocus && 'blur-md pointer-events-none select-none md:ml-0',
            )}
          >

            {/* JV Partners sub-nav */}
            {isInvest && (
              <div className={cn(investCheckoutFocus && 'hidden')}>
                <InvestSubNav />
              </div>
            )}

            {isFullBleed ? (
              <main className="flex-1 flex flex-col overflow-hidden">
                <Outlet context={{ sidebarCollapsed, setSidebarCollapsed }} />
              </main>
            ) : (
              <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
                <div className="max-w-[1440px] mx-auto p-6 md:p-8">
                  <Outlet context={{ sidebarCollapsed, setSidebarCollapsed }} />
                </div>
              </main>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
