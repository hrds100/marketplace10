import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Smsv2Sidebar from './Smsv2Sidebar';
import Smsv2StatusBar from './Smsv2StatusBar';
import Softphone from '../components/softphone/Softphone';
import { ActiveCallProvider } from '../components/live-call/ActiveCallContext';

export default function Smsv2Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ProtectedRoute>
      <ActiveCallProvider>
        <div
          data-feature="SMSV2__LAYOUT"
          className="h-screen flex flex-col bg-[#F3F3EE]"
        >
          {/* Top bar */}
          <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center px-5 z-[101] flex-shrink-0 gap-3">
            <Link
              to="/admin"
              className="text-[17px] font-extrabold text-[#1A1A1A] tracking-tight hover:opacity-70 transition-opacity"
            >
              nfstay
            </Link>
            <span className="text-sm font-medium text-[#9CA3AF]">Workspace</span>
            <span className="text-[10px] font-semibold tracking-wide text-[#1E9A80] bg-[#ECFDF5] px-1.5 py-0.5 rounded">
              SANDBOX v2
            </span>

            <div className="ml-auto flex items-center gap-3">
              <Smsv2StatusBar />
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1A1A1A] transition-colors px-3 py-1.5 rounded-lg hover:bg-black/[0.04]"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </div>
          </header>

          {/* Sidebar + main */}
          <div className="flex-1 flex overflow-hidden">
            <Smsv2Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>

          {/* Persistent floating softphone */}
          <Softphone />
        </div>
      </ActiveCallProvider>
    </ProtectedRoute>
  );
}
