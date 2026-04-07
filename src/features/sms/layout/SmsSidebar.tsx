import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Kanban,
  Users,
  Workflow,
  Megaphone,
  FileText,
  Phone,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface SmsSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const NAV_ITEMS = [
  { label: 'Inbox', path: '/sms/inbox', icon: MessageSquare },
  { label: 'Pipeline', path: '/sms/pipeline', icon: Kanban },
  { label: 'Contacts', path: '/sms/contacts', icon: Users },
  { label: 'Automations', path: '/sms/automations', icon: Workflow },
  { label: 'Campaigns', path: '/sms/campaigns', icon: Megaphone },
  { label: 'Templates', path: '/sms/templates', icon: FileText },
  { label: 'Numbers', path: '/sms/numbers', icon: Phone },
  { label: 'Settings', path: '/sms/settings', icon: Settings },
  { label: 'Dashboard', path: '/sms/dashboard', icon: BarChart3 },
] as const;

const MOBILE_TAB_ITEMS = NAV_ITEMS.filter(({ label }) =>
  ['Inbox', 'Pipeline', 'Contacts', 'Campaigns', 'Dashboard'].includes(label)
);

export default function SmsSidebar({ collapsed, onCollapse }: SmsSidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== '/sms/inbox' && location.pathname.startsWith(path));

  // Mobile bottom tab bar
  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-border/30 flex items-center justify-around px-1 py-1.5 safe-area-pb">
        {MOBILE_TAB_ITEMS.map(({ label, path, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] transition-colors',
              isActive(path)
                ? 'text-primary font-medium'
                : 'text-muted-foreground'
            )}
          >
            <Icon className="w-5 h-5" strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    );
  }

  // Desktop sidebar
  return (
    <aside
      data-feature="SMS__SIDEBAR"
      className={cn(
        'hidden md:flex flex-col border-r border-border/30 bg-white/80 backdrop-blur-xl transition-all duration-300 ease-out flex-shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        {!collapsed && (
          <span className="text-sm font-semibold text-foreground tracking-tight">SMS</span>
        )}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-black/[0.04] text-muted-foreground"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-1">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            title={collapsed ? label : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive(path)
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-black/[0.04] hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
