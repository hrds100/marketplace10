import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import SmsSidebar from './SmsSidebar';

export default function SmsLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const marginClass = sidebarCollapsed ? 'md:ml-16' : 'md:ml-56';

  return (
    <ProtectedRoute>
      <div
        data-feature="SMS__LAYOUT"
        className="h-screen flex flex-col animate-in fade-in duration-300"
        style={{ background: '#F3F3EE' }}
      >
        {/* Top bar */}
        <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-border/30 flex items-center px-5 md:px-8 z-[101] relative flex-shrink-0">
          <Link
            to="/admin"
            className="text-[17px] font-extrabold text-foreground tracking-tight hover:opacity-70 transition-opacity"
          >
            nfstay
          </Link>
          <span className="ml-4 text-sm font-medium text-muted-foreground">
            SMS Inbox
          </span>
          <div className="ml-auto">
            <Link
              to="/admin"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-black/[0.04]"
              title="Back to Admin"
            >
              <ArrowLeft className="w-[15px] h-[15px]" strokeWidth={1.8} />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          </div>
        </header>

        {/* Sidebar + main content */}
        <div className="flex-1 flex overflow-hidden relative">
          <SmsSidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
          <main
            className={`${marginClass} flex-1 overflow-y-auto transition-all duration-300 ease-out pb-20 md:pb-8`}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
