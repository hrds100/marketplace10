import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Heart, Kanban, GraduationCap, Users, PlusCircle, Settings, LogOut, ChevronLeft, ChevronRight, ChevronDown, Globe, TrendingUp, Store, Wallet, Receipt, Vote } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useUserTier } from '@/hooks/useUserTier';
import { isPaidTier } from '@/lib/ghl';

function useNavItems() {
  const { t } = useTranslation();
  return [
    { to: '/dashboard/deals', icon: LayoutGrid, label: t('nav.deals') },
    { to: '/dashboard/crm', icon: Kanban, label: t('nav.crm') },
    { to: '/dashboard/list-a-deal', icon: PlusCircle, label: t('nav.listADeal') },
    { to: '/dashboard/booking-site', icon: Globe, label: t('nav.bookingSite'), highlight: true },
    { to: '/dashboard/affiliates', icon: Users, label: t('nav.becomeAnAgent') },
    { to: '/dashboard/university', icon: GraduationCap, label: t('nav.university') },
  ] as Array<{ to: string; icon: typeof LayoutGrid; label: string; highlight?: boolean }>;
}

function useInvestSubItems() {
  const { t } = useTranslation();
  return [
    { to: '/dashboard/invest/marketplace', icon: Store, label: t('nav.marketplace') },
    { to: '/dashboard/invest/portfolio', icon: Wallet, label: t('nav.portfolio') },
    { to: '/dashboard/invest/proposals', icon: Vote, label: t('nav.proposals') },
    { to: '/dashboard/invest/payouts', icon: Receipt, label: t('nav.payouts') },
  ];
}

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export default function DashboardSidebar({ collapsed: controlledCollapsed, onCollapse }: SidebarProps = {}) {
  const { t } = useTranslation();
  const navItems = useNavItems();
  const investSubItems = useInvestSubItems();
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = (v: boolean) => { setInternalCollapsed(v); onCollapse?.(v); };
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();
  const { user } = useAuth();
  const { tier } = useUserTier();
  const [investOpen, setInvestOpen] = useState(() => location.pathname.startsWith('/dashboard/invest'));
  const isInvestActive = location.pathname.startsWith('/dashboard/invest');

  const handleLogout = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <>
      {/* Desktop sidebar — no logo, starts below persistent top bar */}
      <aside data-feature="NAV_LAYOUT" className={`hidden md:flex fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-white/80 dark:bg-card/80 backdrop-blur-xl border-r border-border/30 z-[100] flex-col transition-all duration-300 ease-out ${collapsed ? 'w-16' : 'w-56'}`}>

        {/* Collapse toggle */}
        <div className={`h-10 flex items-center border-b border-border/30 ${collapsed ? 'justify-center px-2' : 'justify-end px-3'}`}>
          <button data-feature="NAV_LAYOUT__SIDEBAR_COLLAPSE" onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors">
            {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>

        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.to || (item.to === '/dashboard/deals' && location.pathname === '/dashboard');

            // Paid users → open operator dashboard in new tab instead of internal route
            if (item.to === '/dashboard/booking-site' && isPaidTier(tier)) {
              return (
                <a
                  key={item.to}
                  href="https://nfstay.app/nfstay/"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-feature="NAV_LAYOUT__SIDEBAR_BOOKING"
                  className={`group/nav relative flex items-center gap-2 h-10 rounded-lg transition-all duration-200 ${collapsed ? 'justify-center px-2' : 'px-3'} text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]`}
                >
                  <div className="relative flex-shrink-0">
                    <item.icon className="w-[15px] h-[15px]" strokeWidth={1.8} />
                  </div>
                  {!collapsed && (
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] leading-tight">{item.label}</span>
                        {item.highlight && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none" style={{ background: 'linear-gradient(135deg, #FDF5D6, #E8D478)', color: '#8B6914' }}>
                            ✨ HOT
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-200 z-[200] shadow-xl pointer-events-none scale-95 group-hover/nav:scale-100">
                      {item.label}
                      <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                    </div>
                  )}
                </a>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-feature={
                  item.to === '/dashboard/deals' ? 'NAV_LAYOUT__SIDEBAR_DEALS' :
                  item.to === '/dashboard/inbox' ? 'NAV_LAYOUT__SIDEBAR_INBOX' :
                  item.to === '/dashboard/crm' ? 'NAV_LAYOUT__SIDEBAR_CRM' :
                  item.to === '/dashboard/list-a-deal' ? 'NAV_LAYOUT__SIDEBAR_LIST_DEAL' :
                  item.to === '/dashboard/booking-site' ? 'NAV_LAYOUT__SIDEBAR_BOOKING' :
                  item.to === '/dashboard/affiliates' ? 'NAV_LAYOUT__SIDEBAR_AFFILIATES' :
                  item.to === '/dashboard/university' ? 'NAV_LAYOUT__SIDEBAR_UNIVERSITY' :
                  undefined
                }
                className={`group/nav relative flex items-center gap-2 h-10 rounded-lg transition-all duration-200 ${collapsed ? 'justify-center px-2' : 'px-3'} ${isActive ? 'bg-accent-light text-primary font-semibold shadow-[inset_3px_0_0] shadow-primary' : 'text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
              >
                <div className="relative flex-shrink-0">
                  <item.icon className="w-[15px] h-[15px]" strokeWidth={1.8} />
                </div>
                {!collapsed && (
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] leading-tight">{item.label}</span>
                      {item.highlight && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none" style={{ background: 'linear-gradient(135deg, #FDF5D6, #E8D478)', color: '#8B6914' }}>
                          ✨ HOT
                        </span>
                      )}
                    </div>
                    {item.to === '/dashboard/university' && (
                      <span className="text-[9px] font-medium leading-tight" style={{ color: '#1DB954' }}>{t('nav.aiPowered')}</span>
                    )}
                  </div>
                )}
                {/* Styled tooltip on hover when collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-200 z-[200] shadow-xl pointer-events-none scale-95 group-hover/nav:scale-100">
                    {item.label}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                  </div>
                )}
              </NavLink>
            );
          })}

          {/* JV Partners expandable group */}
          <div className="mt-1 pt-1 border-t border-border/20">
            {collapsed ? (
              <button
                data-feature="NAV_LAYOUT__SIDEBAR_INVEST"
                onClick={() => { setCollapsed(false); setInvestOpen(true); }}
                className={`group/nav relative flex items-center justify-center h-10 rounded-lg transition-all duration-200 px-2 w-full ${isInvestActive ? 'text-primary font-semibold' : 'text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
              >
                <TrendingUp className="w-[15px] h-[15px]" strokeWidth={1.8} />
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-200 z-[200] shadow-xl pointer-events-none scale-95 group-hover/nav:scale-100">{t('nav.jvPartners')}<div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" /></div>
              </button>
            ) : (
              <>
                <button
                  data-feature="NAV_LAYOUT__SIDEBAR_INVEST"
                  onClick={() => { setInvestOpen(!investOpen); navigate('/dashboard/invest/marketplace'); }}
                  className={`flex items-center gap-2 h-10 w-full rounded-lg transition-all duration-200 px-3 ${isInvestActive ? 'text-primary font-semibold' : 'text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
                >
                  <TrendingUp className="w-[15px] h-[15px] flex-shrink-0" strokeWidth={1.8} />
                  <span className="text-[13px] leading-tight flex-1 text-left">{t('nav.jvPartners')}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${investOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ease-out ${investOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-4 space-y-0.5 py-0.5">
                    {investSubItems.map(item => {
                      const isActive = location.pathname === item.to;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          data-feature="NAV_LAYOUT__SIDEBAR_INVEST"
                          className={`flex items-center gap-2 h-9 rounded-lg transition-all duration-200 px-3 ${isActive ? 'bg-accent-light text-primary font-semibold shadow-[inset_3px_0_0] shadow-primary' : 'text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
                        >
                          <item.icon className="w-[14px] h-[14px]" strokeWidth={1.8} />
                          <span className="text-[12px] leading-tight">{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </nav>

        <div className="p-2 border-t border-border/30 space-y-0.5">
          {isAdmin && (
            <NavLink to="/admin" className={`group/nav relative flex items-center gap-2 h-10 rounded-lg transition-all duration-200 ${collapsed ? 'justify-center px-2' : 'px-3'} text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]`}>
              <Settings className="w-[15px] h-[15px]" strokeWidth={1.8} />
              {!collapsed && <span className="text-[13px]">{t('nav.adminView')}</span>}
              {collapsed && <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-200 z-[200] shadow-xl pointer-events-none scale-95 group-hover/nav:scale-100">{t('nav.admin')}<div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" /></div>}
            </NavLink>
          )}
          <NavLink data-feature="NAV_LAYOUT__SIDEBAR_SETTINGS" to="/dashboard/settings" className={({ isActive }) => `group/nav relative flex items-center gap-2 h-10 rounded-lg transition-all duration-200 ${collapsed ? 'justify-center px-2' : 'px-3'} ${isActive ? 'bg-accent-light text-primary font-semibold shadow-[inset_3px_0_0] shadow-primary' : 'text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}>
            <Settings className="w-[15px] h-[15px]" strokeWidth={1.8} />
            {!collapsed && <span className="text-[13px]">{t('nav.settings')}</span>}
            {collapsed && <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-200 z-[200] shadow-xl pointer-events-none scale-95 group-hover/nav:scale-100">{t('nav.settings')}<div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" /></div>}
          </NavLink>
          <button data-feature="NAV_LAYOUT__SIDEBAR_SIGNOUT" onClick={handleLogout} className={`group/nav relative flex items-center gap-2 h-10 rounded-lg transition-all duration-200 w-full ${collapsed ? 'justify-center px-2' : 'px-3'} text-muted-foreground font-medium hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10`}>
            <LogOut className="w-[15px] h-[15px]" strokeWidth={1.8} />
            {!collapsed && <span className="text-[13px]">{t('nav.signOut')}</span>}
            {collapsed && <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-200 z-[200] shadow-xl pointer-events-none scale-95 group-hover/nav:scale-100">{t('nav.signOut')}<div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" /></div>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab */}
      <div data-feature="NAV_LAYOUT__SIDEBAR_MOBILE" className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-white/80 dark:bg-card/80 backdrop-blur-xl border-t border-border/30 z-[110] flex justify-around items-center">
        {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[4]].filter(Boolean).map(item => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink key={item.to} to={item.to} className="relative flex flex-col items-center gap-0.5">
              <div className="relative">
                <item.icon className={`w-[22px] h-[22px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={1.75} />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </>
  );
}


