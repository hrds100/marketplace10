// Standalone layout for the Tinder (BRRRR) workspace — mirrors Smsv2Layout
// for /crm. Topbar + left sidebar + Outlet. Auth gated by ProtectedRoute.

import { Link, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import TinderSidebar from "./TinderSidebar";
import TinderGuard from "./TinderGuard";

export default function TinderLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAdmin } = useAuth();

  return (
    <TinderGuard>
      <div
        data-feature="TINDER__LAYOUT"
        className="h-screen flex flex-col bg-[#F3F3EE]"
      >
        {/* Top bar — slim, brand-only. All nav lives in the sidebar (matches /crm). */}
        <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center px-5 z-[101] flex-shrink-0 gap-3">
          <Link
            to="/tinder"
            className="text-[17px] font-extrabold text-[#1A1A1A] tracking-tight hover:opacity-70 transition-opacity"
          >
            nfstay
          </Link>
          <span className="text-sm font-medium text-[#9CA3AF]">Tinder</span>

          <div className="ml-auto flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="text-[12px] font-medium text-[#9CA3AF] hover:text-[#1A1A1A] px-2 py-1 rounded-lg hover:bg-[#F3F3EE] transition-colors"
              >
                Admin
              </Link>
            )}
            <Link
              to="/crm"
              className="text-[12px] font-medium text-[#9CA3AF] hover:text-[#1A1A1A] px-2 py-1 rounded-lg hover:bg-[#F3F3EE] transition-colors"
            >
              CRM
            </Link>
          </div>
        </header>

        {/* Sidebar + main content */}
        <div className="flex-1 flex overflow-hidden">
          <TinderSidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
          {/* min-h-0 lets flex children shrink; overflow-y-auto provides default
              scroll for pages that don't manage their own. Pages with their
              own h-full + inner overflow (TinderPage, CompsPage, AgentsPage)
              still work because they sit inside this scroll container. */}
          <main className="flex-1 min-h-0 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </TinderGuard>
  );
}
