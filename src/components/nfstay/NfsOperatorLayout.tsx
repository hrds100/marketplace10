import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import NfsOperatorGuard from '@/components/nfstay/NfsOperatorGuard';
import NfsOperatorSidebar from '@/components/nfstay/NfsOperatorSidebar';

export default function NfsOperatorLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const marginClass = sidebarCollapsed ? 'md:ml-16' : 'md:ml-56';

  return (
    <NfsOperatorGuard>
      <div
        className="h-screen flex flex-col animate-in fade-in duration-300"
        style={{ background: 'hsl(210 20% 98%)' }}
      >
        {/* Top bar */}
        <header className="h-14 bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-border/30 flex items-center px-5 md:px-8 z-[101] relative flex-shrink-0">
          <Link
            to="/nfstay"
            className="text-[17px] font-extrabold text-foreground tracking-tight hover:opacity-70 transition-opacity"
          >
            NFStay
          </Link>
          <div className="ml-auto">
            <button
              onClick={async () => {
                await signOut();
                navigate('/signup');
              }}
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              title="Sign out"
            >
              <LogOut className="w-[15px] h-[15px]" strokeWidth={1.8} />
            </button>
          </div>
        </header>

        {/* Sidebar + main content */}
        <div className="flex-1 flex overflow-hidden relative">
          <NfsOperatorSidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
          <main
            className={`${marginClass} flex-1 overflow-y-auto transition-all duration-300 ease-out pb-20 md:pb-8`}
          >
            <div className="max-w-[1440px] mx-auto p-6 md:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </NfsOperatorGuard>
  );
}
