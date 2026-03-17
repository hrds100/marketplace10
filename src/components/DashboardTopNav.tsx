import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Heart, Kanban, GraduationCap, Users,
  PlusCircle, Settings, LogOut, MessageSquare, Menu, X, Globe,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import BurgerMenu from '@/components/BurgerMenu';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const navItems: Array<{ to: string; icon: typeof LayoutGrid; label: string; pro?: boolean }> = [
  { to: '/dashboard/deals', icon: LayoutGrid, label: 'Deals' },
  { to: '/dashboard/inbox', icon: MessageSquare, label: 'Inbox' },
  { to: '/dashboard/crm', icon: Kanban, label: 'CRM' },
  { to: '/dashboard/list-a-deal', icon: PlusCircle, label: 'List a Deal' },
  { to: '/dashboard/university', icon: GraduationCap, label: 'University' },
  { to: '/dashboard/booking-site', icon: Globe, label: 'Booking Site', pro: true },
  { to: '/dashboard/affiliates', icon: Users, label: 'Become An Agent' },
];

export default function DashboardTopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    const ch = supabase
      .channel('topnav-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate('/signin');
  };

  const isActive = (to: string) =>
    location.pathname === to ||
    (to === '/dashboard/deals' && (location.pathname === '/dashboard' || location.pathname === '/dashboard/deals'));

  return (
    <>
      <header className="h-14 bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-border/30 flex items-center px-5 md:px-8 z-[100] relative flex-shrink-0">
        {/* Logo — extra spacing before nav */}
        <Link
          to="/dashboard/deals"
          className="text-[17px] font-extrabold text-foreground tracking-tight hover:opacity-70 transition-opacity mr-14 flex-shrink-0"
        >
          NFsTay
        </Link>

        {/* Desktop nav — green active state matching sidebar */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 min-w-0">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`relative flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[13px] transition-all duration-200 whitespace-nowrap ${
                isActive(item.to)
                  ? 'bg-accent-light text-primary font-semibold shadow-[inset_3px_0_0] shadow-primary'
                  : 'text-muted-foreground font-medium hover:text-foreground hover:bg-secondary'
              }`}
            >
              <item.icon className="w-[15px] h-[15px]" strokeWidth={1.8} />
              <span>{item.label}</span>
              {item.pro && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none" style={{ background: 'linear-gradient(135deg, #FDF5D6, #E8D478)', color: '#8B6914' }}>
                  ✨ PRO
                </span>
              )}
              {item.to === '/dashboard/inbox' && unreadCount > 0 && (
                <span className={`text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 ${
                  isActive(item.to)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-red-500 text-white'
                }`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right side — desktop */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-4">
          {isAdmin && (
            <NavLink
              to="/admin"
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-secondary"
            >
              Admin
            </NavLink>
          )}
          <button
            onClick={() => navigate('/dashboard/list-a-deal')}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-[7px] rounded-lg text-[13px] font-semibold hover:from-emerald-600 hover:to-teal-700 shadow-md transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-[15px] h-[15px]" strokeWidth={1.8} />
            Submit a Deal
          </button>
          <NotificationBell />
          <BurgerMenu />
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden ml-auto p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 bottom-0 z-[99] bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <nav
            className="bg-card border-b border-border shadow-lg py-2 px-3 space-y-0.5"
            onClick={e => e.stopPropagation()}
          >
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? 'bg-accent-light text-primary font-semibold'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                <span>{item.label}</span>
                {item.to === '/dashboard/inbox' && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ml-auto">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
            <div className="border-t border-border mt-2 pt-2 space-y-0.5">
              <button
                onClick={() => { setMobileOpen(false); navigate('/dashboard/list-a-deal'); }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 w-full shadow-md"
              >
                <PlusCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
                <span>Submit a Deal</span>
              </button>
              {isAdmin && (
                <NavLink to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted">
                  <Settings className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  <span>Admin View</span>
                </NavLink>
              )}
              <button onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted w-full">
                <LogOut className="w-[18px] h-[18px]" strokeWidth={1.75} />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}


