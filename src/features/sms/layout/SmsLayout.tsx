import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import SmsSidebar from './SmsSidebar';

export default function SmsLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  return (
    <ProtectedRoute>
      <div
        data-feature="SMS__LAYOUT"
        className="h-screen flex flex-col bg-white"
      >
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center px-5 z-[101] flex-shrink-0">
          <Link
            to="/admin"
            className="text-[17px] font-extrabold text-[#1A1A1A] tracking-tight hover:opacity-70 transition-opacity"
          >
            nfstay
          </Link>
          <span className="ml-3 text-sm font-medium text-[#9CA3AF]">
            SMS Inbox
          </span>
          <div className="ml-auto">
            <Link
              to="/admin"
              className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1A1A1A] transition-colors px-3 py-1.5 rounded-lg hover:bg-black/[0.04]"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          </div>
        </header>

        {/* Sidebar + main content — no margin, sidebar is in flex flow */}
        <div className="flex-1 flex overflow-hidden">
          <SmsSidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
          <main className="flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
