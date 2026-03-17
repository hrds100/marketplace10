import { Link, useLocation } from 'react-router-dom';
import { Home, Building2, CalendarDays, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { NFS_ROUTES } from '@/lib/nfstay/constants';

interface NfsOperatorSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: NFS_ROUTES.DASHBOARD, icon: Home },
  { label: 'Properties', path: NFS_ROUTES.PROPERTIES, icon: Building2 },
  { label: 'Reservations', path: NFS_ROUTES.RESERVATIONS, icon: CalendarDays },
  { label: 'Settings', path: NFS_ROUTES.SETTINGS, icon: Settings },
] as const;

export default function NfsOperatorSidebar({ collapsed, onCollapse }: NfsOperatorSidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-border/30 bg-white/80 dark:bg-card/80 backdrop-blur-xl transition-all duration-300 ease-out flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        {!collapsed && (
          <span className="text-sm font-semibold text-foreground tracking-tight">NFStay</span>
        )}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-muted-foreground"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-1">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const isActive = location.pathname === path ||
            (path !== NFS_ROUTES.DASHBOARD && location.pathname.startsWith(path));

          return (
            <Link
              key={path}
              to={path}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
