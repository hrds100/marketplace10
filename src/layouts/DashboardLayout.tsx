import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Outlet, useLocation, useOutletContext, Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Gem, Wallet, MessageCircle } from 'lucide-react';
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
import { toast } from 'sonner';
import { normalizeUKPhone } from '@/lib/phoneValidation';

const FULL_BLEED_ROUTES = ['/dashboard/deals'];
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
  const embeddedWallet = useEmbeddedWallet();
  return (
    <header className="dashboard-topbar h-14 bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-border/30 flex items-center px-5 md:px-8 z-[101] relative flex-shrink-0">
      <a href="/dashboard/deals" className="flex items-center" style={{ gap: 3 }}>
        <div style={{ width: 28, height: 28, border: '1.5px solid #0a0a0a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12, color: '#0a0a0a', lineHeight: 1 }}>nf</div>
        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 400, fontSize: 18, color: '#0a0a0a', letterSpacing: 2, lineHeight: 1 }}>stay</span>
      </a>

      <div className="ml-auto flex items-center gap-3">
        {isAdmin && (
          <Link to="/admin" className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary hidden md:block">
            Admin
          </Link>
        )}
        <button
          onClick={() => {
            const target = '/dashboard/invest/marketplace';
            if (window.location.pathname === target) {
              document.querySelector('[data-feature="INVEST__MARKETPLACE_CARD"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              navigate(target);
            }
          }}
          className="hidden md:flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
        >
          <Gem className="w-[13px] h-[13px] text-blue-400" strokeWidth={2} />
          Partner on Airbnbs from £500
        </button>
        <button
          onClick={() => navigate('/dashboard/list-a-deal')}
          className="hidden md:flex bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3.5 py-[6px] rounded-lg text-[12px] font-semibold hover:from-emerald-600 hover:to-teal-700 shadow-sm transition-all items-center gap-1.5"
        >
          <PlusCircle className="w-[14px] h-[14px]" strokeWidth={1.8} />
          Submit a Deal
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
  const [whatsappMissing, setWhatsappMissing] = useState<boolean | null>(null);
  const [gatePh, setGatePh] = useState('');
  const [gateSaving, setGateSaving] = useState(false);
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

    let cancelled = false;

    (async () => {
      const { data: profile } = await (supabase.from('profiles') as any)
        .select('whatsapp, email')
        .eq('id', user.id)
        .single();

      if (cancelled) return;

      const whatsapp = (profile?.whatsapp as string | undefined) || '';
      const email = (profile?.email as string | undefined) || user.email || '';
      const filters: string[] = [`lister_id.eq.${user.id}`];
      if (whatsapp) filters.push(`lister_phone.eq.${whatsapp}`);
      if (email) filters.push(`lister_email.eq.${email}`);

      const { data: claimRequiredLeads } = await (supabase.from('inquiries') as any)
        .select('id')
        .or(filters.join(','))
        .eq('authorized', true)
        .eq('authorisation_type', 'nda_and_claim')
        .limit(1);

      if (cancelled) return;

      // Claim banner disabled - NDA+Claim flow now forces claim inline in the LeadAccessAgreement modal.
      // setLandlordPhone(claimRequiredLeads && claimRequiredLeads.length > 0 ? whatsapp : null);
      setLandlordPhone(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  // WhatsApp gate: check if user has set a WhatsApp number
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data: profile } = await (supabase.from('profiles') as any)
        .select('whatsapp')
        .eq('id', user.id)
        .single();
      if (cancelled) return;
      const wa = (profile?.whatsapp as string | undefined) || '';
      setWhatsappMissing(!wa);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const claimBanner = landlordPhone !== null && !investCheckoutFocus ? (
    <ClaimAccountBanner phone={landlordPhone} onClaimed={() => setLandlordPhone(null)} />
  ) : null;

  return (
    <ProtectedRoute>
      {/* WhatsApp gate modal — blocks access until WhatsApp is set */}
      {whatsappMissing === true && (
        <div className="fixed inset-0 z-[400] bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-[440px] w-full mx-4">
            <div className="flex justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground text-center mb-2">Add your WhatsApp to continue</h2>
            <p className="text-sm text-muted-foreground text-center mb-4">
              nfstay uses WhatsApp to send you deal alerts and account updates. This is required to access the platform.
            </p>
            <input
              className="input-nfstay w-full mt-4"
              placeholder="+44 7911 123456"
              value={gatePh}
              onChange={e => setGatePh(e.target.value)}
            />
            <button
              disabled={gateSaving}
              onClick={async () => {
                const normalized = normalizeUKPhone(gatePh);
                if (!normalized) {
                  toast.error('Enter a valid UK mobile number');
                  return;
                }
                setGateSaving(true);
                const { error } = await supabase.from('profiles').update({ whatsapp: normalized }).eq('id', user!.id);
                if (error) {
                  toast.error('Failed to save');
                } else {
                  setWhatsappMissing(false);
                  toast.success('WhatsApp saved');
                }
                setGateSaving(false);
              }}
              className="w-full h-11 mt-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {gateSaving ? 'Saving...' : 'Save and continue'}
            </button>
          </div>
        </div>
      )}

      <WalletProvisioner>
      <div data-feature="NAV_LAYOUT" className="flex flex-col animate-in fade-in duration-300" style={{ background: 'hsl(210 20% 98%)', height: '100dvh' }}>
        <PaymentSuccessRefresher />

        {/* ── Top bar — always present ──────────────────────── */}
        <div className={cn(investCheckoutFocus && 'hidden')}>
          <TopBar />
        </div>

        {/* ── Claim banner — offset to clear fixed sidebar on desktop ── */}
        {claimBanner && (
          <div className={cn(`${marginClass} transition-all duration-300 ease-out`)}>
            {claimBanner}
          </div>
        )}

        {/* ── Content area — sidebar + main ─────────────────── */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* ── Left sidebar — always present, collapsed by default ── */}
          <div data-feature="NAV_LAYOUT__SIDEBAR_WRAP" className={cn('dashboard-sidebar-wrap', investCheckoutFocus && 'hidden')}>
            <DashboardSidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
          </div>

          {/* ── Main content ────────────────────────────────── */}
          <div
            data-feature="NAV_LAYOUT__MAIN_CONTENT"
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
      </WalletProvisioner>
    </ProtectedRoute>
  );
}
