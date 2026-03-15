import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, Heart, Kanban, GraduationCap, Users, PlusCircle, Settings, LogOut, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { to: '/dashboard/deals', icon: LayoutGrid, label: 'Deals' },
  { to: '/dashboard/inbox', icon: MessageSquare, label: 'Inbox' },
  { to: '/dashboard/crm', icon: Kanban, label: 'CRM' },
  { to: '/dashboard/university', icon: GraduationCap, label: 'University ✨' },
  { to: '/dashboard/affiliates', icon: Users, label: 'Affiliates' },
  { to: '/dashboard/list-a-deal', icon: PlusCircle, label: 'List a Deal' },
  { to: '/dashboard/favourites', icon: Heart, label: 'Favourites' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export default function DashboardSidebar({ collapsed: controlledCollapsed, onCollapse }: SidebarProps = {}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = (v: boolean) => { setInternalCollapsed(v); onCollapse?.(v); };
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread thread count + subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('chat_threads')
        .select('id', { count: 'exact', head: true })
        .eq('operator_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();
    const channel = supabase
      .channel('sidebar-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads', filter: `operator_id=eq.${user.id}` }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex fixed left-0 top-0 h-screen bg-card border-r border-border z-[100] flex-col transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
        <div className={`h-[68px] flex items-center border-b border-border ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
          {!collapsed && <Link to="/" className="text-lg font-extrabold text-foreground tracking-tight hover:opacity-75 transition-opacity">NFsTay</Link>}
          <button onClick={() => setCollapsed(!collapsed)} className={`p-1.5 rounded-md hover:bg-secondary transition-colors ${collapsed ? '' : 'ml-auto'}`}>
            {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(item => {
            const isActive = location.pathname === item.to || (item.to === '/dashboard/deals' && location.pathname === '/dashboard');
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-2.5 h-10 rounded-lg transition-all duration-150 ${collapsed ? 'justify-center px-2' : 'px-3'} ${isActive ? 'bg-accent-light text-primary shadow-[inset_3px_0_0] shadow-primary font-semibold' : 'text-sidebar-foreground hover:bg-secondary'}`}
                title={collapsed ? item.label : undefined}
              >
                <div className="relative flex-shrink-0">
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  {item.to === '/dashboard/inbox' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-tight">{item.label}</span>
                    {item.to === '/dashboard/university' && (
                      <span className="text-[9px] font-medium leading-tight" style={{ color: '#1DB954' }}>AI Powered</span>
                    )}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-2 border-t border-border space-y-0.5">
          {isAdmin && (
            <NavLink to="/admin" className={`flex items-center gap-2.5 h-10 rounded-lg transition-colors ${collapsed ? 'justify-center px-2' : 'px-3'} text-muted-foreground hover:bg-secondary`} title={collapsed ? 'Admin' : undefined}>
              <Settings className="w-[18px] h-[18px]" strokeWidth={1.75} />
              {!collapsed && <span className="text-sm font-medium">Admin View</span>}
            </NavLink>
          )}
          <button onClick={handleLogout} className={`flex items-center gap-2.5 h-10 rounded-lg transition-colors w-full ${collapsed ? 'justify-center px-2' : 'px-3'} text-muted-foreground hover:bg-secondary`} title={collapsed ? 'Sign out' : undefined}>
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.75} />
            {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-card border-t border-border z-[110] flex justify-around items-center">
        {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[6]].map(item => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink key={item.to} to={item.to} className="relative flex flex-col items-center gap-0.5">
              <div className="relative">
                <item.icon className={`w-[22px] h-[22px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={1.75} />
                {item.to === '/dashboard/inbox' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
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
