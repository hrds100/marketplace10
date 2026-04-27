import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  PhoneCall,
  Radio,
  Users,
  Kanban,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Smsv2SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/crm/dashboard', icon: LayoutDashboard, adminOnly: true },
  { label: 'Inbox', path: '/crm/inbox', icon: MessageSquare },
  { label: 'Calls', path: '/crm/calls', icon: PhoneCall },
  { label: 'Dialer', path: '/crm/dialer', icon: Radio },
  { label: 'Contacts', path: '/crm/contacts', icon: Users },
  { label: 'Pipelines', path: '/crm/pipelines', icon: Kanban },
  { label: 'Reports', path: '/crm/reports', icon: BarChart3 },
  { label: 'Settings', path: '/crm/settings', icon: Settings, adminOnly: true },
] as const;

const MOBILE_TAB_ITEMS = NAV_ITEMS.filter(({ label }) =>
  ['Dashboard', 'Inbox', 'Dialer', 'Contacts', 'Pipelines'].includes(label)
);

export default function Smsv2Sidebar({ collapsed, onCollapse }: Smsv2SidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();

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
      data-feature="SMSV2__SIDEBAR"
      className={cn(
        'hidden md:flex flex-col border-r border-[#E5E7EB] bg-white/80 backdrop-blur-xl transition-all duration-300 ease-out flex-shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]/60">
        {!collapsed && (
          <span className="text-sm font-semibold text-[#1A1A1A] tracking-tight">CRM</span>
        )}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-black/[0.04] text-[#6B7280]"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-1">
        {NAV_ITEMS.map(({ label, path, icon: Icon, adminOnly }) => (
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
          <span className="block">NFSTAY CRM</span>
        </div>
      )}
    </aside>
  );
}
