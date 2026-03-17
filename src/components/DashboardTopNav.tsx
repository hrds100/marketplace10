import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Heart, Kanban, GraduationCap, Users,
  PlusCircle, Settings, LogOut, MessageSquare, Menu, X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { to: '/dashboard/deals', icon: LayoutGrid, label: 'Deals' },
  { to: '/dashboard/inbox', icon: MessageSquare, label: 'Inbox' },
  { to: '/dashboard/crm', icon: Kanban, label: 'CRM' },
  { to: '/dashboard/university', icon: GraduationCap, label: 'University' },
  { to: '/dashboard/affiliates', icon: Users, label: 'Affiliates' },
  { to: '/dashboard/favourites', icon: Heart, label: 'Favourites' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
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
    (to === '/dashboard/deals' && (location.pathname === '/dashboard' || location.pathname === '/dashboard/deals-v2'));

  return (
    <>
      <header className="h-14 bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-border/30 flex items-center px-5 md:px-8 z-[100] relative flex-shrink-0">
        {/* Logo */}
        <Link
          to="/dashboard/deals"
          className="text-[17px] font-extrabold text-foreground tracking-tight hover:opacity-70 transition-opacity mr-8 flex-shrink-0"
        >
          NFsTay
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 min-w-0">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`relative flex items-center gap-1.5 px-3 py-[7px] rounded-full text-[13px] font-medium transition-all duration-200 whitespace-nowrap ${
                isActive(item.to)
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
              }`}
            >
              <item.icon className="w-[15px] h-[15px]" strokeWidth={1.8} />
              <span>{item.label}</span>
              {item.to === '/dashboard/inbox' && unreadCount > 0 && (
                <span className={`text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 ${
                  isActive(item.to)
                    ? 'bg-background text-foreground'
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
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              Admin
            </NavLink>
          )}
          <button
            onClick={() => navigate('/dashboard/list-a-deal')}
            className="bg-primary text-primary-foreground px-4 py-[7px] rounded-full text-[13px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <PlusCircle className="w-[15px] h-[15px]" strokeWidth={1.8} />
            Submit a Deal
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            title="Sign out"
          >
            <LogOut className="w-[15px] h-[15px]" strokeWidth={1.8} />
          </button>
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
                    ? 'bg-foreground text-background'
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
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 w-full"
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
