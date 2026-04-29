// CallerSidebar — left navigation for /caller/*.
//
// Mirrors the legacy CRM sidebar order (Dialer → Inbox → Pipelines →
// Contacts → Reports → Leaderboard → Call history). Dashboard and
// Settings are admin-only and hidden from non-admin agents entirely
// (AdminOnlyRoute would block them anyway, but hiding the rows avoids
// clicks that go nowhere).

import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  PhoneCall,
  Radio,
  Users,
  Kanban,
  BarChart3,
  Trophy,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CallerSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/caller/dashboard', icon: LayoutDashboard, adminOnly: true },
  { label: 'Dialer', path: '/caller/dialer', icon: Radio },
  { label: 'Inbox', path: '/caller/inbox', icon: MessageSquare },
  { label: 'Pipelines', path: '/caller/pipelines', icon: Kanban },
  { label: 'Contacts', path: '/caller/contacts', icon: Users },
  { label: 'Reports', path: '/caller/reports', icon: BarChart3 },
  { label: 'Leaderboard', path: '/caller/leaderboard', icon: Trophy },
  { label: 'Call history', path: '/caller/calls', icon: PhoneCall },
  { label: 'Settings', path: '/caller/settings', icon: Settings, adminOnly: true },
] as const;

const MOBILE_TAB_ITEMS = NAV_ITEMS.filter(({ label }) =>
  ['Dialer', 'Inbox', 'Pipelines', 'Contacts', 'Dashboard'].includes(label)
);

export default function CallerSidebar({ collapsed, onCollapse }: CallerSidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [workspaceRole, setWorkspaceRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setWorkspaceRole(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('profiles' as any) as any)
        .select('workspace_role')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setWorkspaceRole((data?.workspace_role as string | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const isAdminOrWorkspaceAdmin =
    workspaceRole === 'admin' || (workspaceRole === null && isAdmin);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-[#E5E7EB] flex items-center justify-around px-1 py-1.5">
        {MOBILE_TAB_ITEMS.map(({ label, path, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] transition-colors',
              isActive(path) ? 'text-[#1E9A80] font-medium' : 'text-[#6B7280]'
            )}
          >
            <Icon className="w-5 h-5" strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <aside
      data-feature="CALLER__SIDEBAR"
      className={cn(
        'hidden md:flex flex-col border-r border-[#E5E7EB] bg-white/80 backdrop-blur-xl transition-all duration-300 ease-out flex-shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]/60">
        {!collapsed && (
          <span className="text-sm font-semibold text-[#1A1A1A] tracking-tight">Caller</span>
        )}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-black/[0.04] text-[#6B7280]"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-1">
        {NAV_ITEMS
          .filter(({ adminOnly }) => !adminOnly || isAdminOrWorkspaceAdmin)
          .map(({ label, path, icon: Icon, adminOnly }) => (
            <Link
              key={path}
              to={path}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative',
                isActive(path)
                  ? 'bg-[#ECFDF5] text-[#1E9A80] font-medium'
                  : 'text-[#6B7280] hover:bg-black/[0.04] hover:text-[#1A1A1A]'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  {adminOnly && (
                    <span className="text-[9px] text-[#9CA3AF] font-medium uppercase">admin</span>
                  )}
                </>
              )}
            </Link>
          ))}
      </nav>

      {!collapsed && (
        <div className="px-4 py-3 border-t border-[#E5E7EB]/60 text-[11px] text-[#9CA3AF]">
          <span className="block">NFSTAY Caller</span>
        </div>
      )}
    </aside>
  );
}
