// CallerLayout — root layout for /caller/*.
//
// Phase 1 mounts:
//   - CallerGuard       (workspace_role + auth check)
//   - CallerStateProvider (stub root provider; real ones land in Phase 2-3)
//   - CallerSidebar     (left nav)
//   - CallerStatusBar   (top-right presence pill)
//   - <Outlet />        (the active page)
//
// Phase 2 swaps CallerStateProvider for the real provider stack
// (ActiveCallProvider + DialerSessionProvider + CallerStore +
// GlobalToasts + Softphone). See docs/caller/BUILD_PLAN.md.

import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CallerGuard from '../components/CallerGuard';
import CallerSidebar from './CallerSidebar';
import CallerStatusBar from './CallerStatusBar';
import CallerStateProvider from '../store/CallerStateProvider';
import { CallerPad } from '../pages/DialerPage';

export default function CallerLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <CallerGuard>
      <CallerStateProvider>
        <div
          data-feature="CALLER__LAYOUT"
          className="h-screen flex flex-col bg-[#F3F3EE]"
        >
          <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center px-5 z-[101] flex-shrink-0 gap-3">
            <Link
              to="/admin"
              className="text-[17px] font-extrabold text-[#1A1A1A] tracking-tight hover:opacity-70 transition-opacity"
            >
              nfstay
            </Link>
            <span className="text-sm font-medium text-[#9CA3AF]">Caller</span>

            <div className="ml-auto flex items-center gap-3">
              <CallerStatusBar />
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1A1A1A] transition-colors px-3 py-1.5 rounded-lg hover:bg-black/[0.04]"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden">
            <CallerSidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
            <main className="flex-1 overflow-auto flex flex-col">
              <div className="flex-1 overflow-auto">
                <Outlet />
              </div>
            </main>
          </div>

          {/* Global floating pad. Mounted at layout level so the Twilio
              Device, dialer reducer and queue subscriptions persist
              across route navigation. The pad self-renders as either
              the full pad (on /caller/dialer) or an Intercom-style
              icon (on every other /caller/* route). */}
          <CallerPad />
        </div>
      </CallerStateProvider>
    </CallerGuard>
  );
}
