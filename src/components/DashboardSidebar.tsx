import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Heart, Kanban, GraduationCap, Users, PlusCircle, Settings, LogOut, ChevronLeft, ChevronRight, ChevronDown, MessageSquare, Globe, TrendingUp, Store, Wallet, Receipt, Vote } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const navItems: Array<{ to: string; icon: typeof LayoutGrid; label: string; highlight?: boolean }> = [
  { to: '/dashboard/deals', icon: LayoutGrid, label: 'Deals' },
  { to: '/dashboard/inbox', icon: MessageSquare, label: 'Inbox' },
  { to: '/dashboard/crm', icon: Kanban, label: 'CRM' },
  { to: '/dashboard/list-a-deal', icon: PlusCircle, label: 'List a Deal' },
  { to: '/dashboard/booking-site', icon: Globe, label: 'Booking Site', highlight: true },
  { to: '/dashboard/affiliates', icon: Users, label: 'Become An Agent' },
];

const investSubItems = [
  { to: '/dashboard/invest/marketplace', icon: Store, label: 'Marketplace' },
  { to: '/dashboard/invest/portfolio', icon: Wallet, label: 'Portfolio' },
  { to: '/dashboard/invest/payouts', icon: Receipt, label: 'Payouts' },
  { to: '/dashboard/invest/proposals', icon: Vote, label: 'Proposals' },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export default function DashboardSidebar({ collapsed: controlledCollapsed, onCollapse }: SidebarProps = {}) {
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = (v: boolean) => { setInternalCollapsed(v); onCollapse?.(v); };
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [investOpen, setInvestOpen] = useState(() => location.pathname.startsWith('/dashboard/invest'));
  const isInvestActive = location.pathname.startsWith('/dashboard/invest');

  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('chat_threads')
        .select('id', { count: 'exact', head: true })
        .or(`operator_id.eq.${user.id},landlord_id.eq.${user.id}`)
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();
    const ch1 = supabase
      .channel('sidebar-unread-operator')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads', filter: `operator_id=eq.${user.id}` }, () => fetchUnread())
      .subscribe();
    const ch2 = supabase
      .channel('sidebar-unread-landlord')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads', filter: `landlord_id=eq.${user.id}` }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <>
      {/* Desktop sidebar — no logo, starts below persistent top bar */}
      <aside className={`hidden md:flex fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-white/80 dark:bg-card/80 backdrop-blur-xl border-r border-border/30 z-[100] flex-col transition-all duration-300 ease-out ${collapsed ? 'w-16' : 'w-56'}`}>

        {/* Collapse toggle */}
        <div className={`h-10 flex items-center border-b border-border/30 ${collapsed ? 'justify-center px-2' : 'justify-end px-3'}`}>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors">
            {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>

        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.to || (item.to === '/dashboard/deals' && location.pathname === '/dashboard');
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-2 h-10 rounded-lg transition-all duration-200 ${collapsed ? 'justify-center px-2' : 'px-3'} ${isActive ? 'bg-accent-light text-primary font-semibold shadow-[inset_3px_0_0] shadow-primary' : 'text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
                title={collapsed ? item.label : undefined}
              >
                <div className="relative flex-shrink-0">
                  <item.icon className="w-[15px] h-[15px]" strokeWidth={1.8} />
                  {item.to === '/dashboard/inbox' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-lg w-4 h-4 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
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
                      <span className="text-[9px] font-medium leading-tight" style={{ color: '#1DB954' }}>AI Powered</span>
                    )}
                  </div>
                )}
              </NavLink>
            );
          })}

          {/* Investors expandable group */}
          <div className="mt-1 pt-1 border-t border-border/20">
            {collapsed ? (
              <NavLink
                to="/dashboard/invest/marketplace"
                className={`relative flex items-center justify-center h-10 rounded-lg transition-all duration-200 px-2 ${isInvestActive ? 'bg-accent-light text-primary font-semibold shadow-[inset_3px_0_0] shadow-primary' : 'text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
                title="Investors"
              >
                <TrendingUp className="w-[15px] h-[15px]" strokeWidth={1.8} />
              </NavLink>
            ) : (
              <>
                <button
                  onClick={() => setInvestOpen(!investOpen)}
                  className={`flex items-center gap-2 h-10 w-full rounded-lg transition-all duration-200 px-3 ${isInvestActive ? 'text-primary font-semibold' : 'text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
                >
                  <TrendingUp className="w-[15px] h-[15px] flex-shrink-0" strokeWidth={1.8} />
                  <span className="text-[13px] leading-tight flex-1 text-left">Investors</span>
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
          <NavLink to="/dashboard/university" className={({ isActive }) => `flex items-center gap-2 h-10 rounded-lg transition-all duration-200 ${collapsed ? 'justify-center px-2' : 'px-3'} ${isActive ? 'bg-accent-light text-primary font-semibold shadow-[inset_3px_0_0] shadow-primary' : 'text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`} title={collapsed ? 'University' : undefined}>
            <GraduationCap className="w-[15px] h-[15px]" strokeWidth={1.8} />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-[13px] leading-tight">University</span>
                <span className="text-[9px] font-medium leading-tight" style={{ color: '#1DB954' }}>AI Powered</span>
              </div>
            )}
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={`flex items-center gap-2 h-10 rounded-lg transition-all duration-200 ${collapsed ? 'justify-center px-2' : 'px-3'} text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]`} title={collapsed ? 'Admin' : undefined}>
              <Settings className="w-[15px] h-[15px]" strokeWidth={1.8} />
              {!collapsed && <span className="text-[13px]">Admin View</span>}
            </NavLink>
          )}
          <NavLink to="/dashboard/settings" className={({ isActive }) => `flex items-center gap-2 h-10 rounded-lg transition-all duration-200 ${collapsed ? 'justify-center px-2' : 'px-3'} ${isActive ? 'bg-accent-light text-primary font-semibold shadow-[inset_3px_0_0] shadow-primary' : 'text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`} title={collapsed ? 'Settings' : undefined}>
            <Settings className="w-[15px] h-[15px]" strokeWidth={1.8} />
            {!collapsed && <span className="text-[13px]">Settings</span>}
          </NavLink>
          <button onClick={handleLogout} className={`flex items-center gap-2 h-10 rounded-lg transition-all duration-200 w-full ${collapsed ? 'justify-center px-2' : 'px-3'} text-muted-foreground font-medium hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10`} title={collapsed ? 'Sign out' : undefined}>
            <LogOut className="w-[15px] h-[15px]" strokeWidth={1.8} />
            {!collapsed && <span className="text-[13px]">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-white/80 dark:bg-card/80 backdrop-blur-xl border-t border-border/30 z-[110] flex justify-around items-center">
        {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[4]].filter(Boolean).map(item => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink key={item.to} to={item.to} className="relative flex flex-col items-center gap-0.5">
              <div className="relative">
                <item.icon className={`w-[22px] h-[22px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={1.75} />
                {item.to === '/dashboard/inbox' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-lg w-3.5 h-3.5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </>
  );
}


