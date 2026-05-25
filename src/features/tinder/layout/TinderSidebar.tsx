// TinderSidebar — left navigation for /tinder/*.
// Mirrors src/features/smsv2/layout/Smsv2Sidebar.tsx so the visual + UX
// feels identical between /crm and /tinder. Same workspace_role-aware
// admin check, same collapsed/expanded behaviour, same mobile bottom tab.

import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Home,
  Heart,
  Calculator,
  Kanban,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TinderSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const NAV_ITEMS = [
  { label: "Review",    path: "/tinder",            icon: Home,       exact: true  },
  { label: "Shortlist", path: "/tinder/shortlist",  icon: Heart,      exact: false },
  { label: "Comps",     path: "/tinder/comps",      icon: Calculator, exact: false },
  { label: "Pipeline",  path: "/tinder/pipeline",   icon: Kanban,     exact: false },
  { label: "Agents",    path: "/tinder/agents",     icon: Users,      exact: false, adminOnly: true },
] as const;

const MOBILE_TAB_ITEMS = NAV_ITEMS.filter(({ label }) =>
  ["Review", "Shortlist", "Comps", "Pipeline"].includes(label)
);

export default function TinderSidebar({ collapsed, onCollapse }: TinderSidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [workspaceRole, setWorkspaceRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setWorkspaceRole(null); return; }
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("profiles" as any) as any)
        .select("workspace_role")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setWorkspaceRole((data?.workspace_role as string | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  // Same precedence rule as Smsv2Sidebar + AdminOnlyRoute.
  const isAdminOrWorkspaceAdmin =
    workspaceRole === "admin" || (workspaceRole === null && isAdmin);

  const isActive = (path: string, exact: boolean) =>
    exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + "/");

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-[#E5E7EB] flex items-center justify-around px-1 py-1.5">
        {MOBILE_TAB_ITEMS.map(({ label, path, icon: Icon, exact }) => (
          <Link
            key={path}
            to={path}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] transition-colors",
              isActive(path, exact) ? "text-[#1E9A80] font-medium" : "text-[#6B7280]"
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
      data-feature="TINDER__SIDEBAR"
      className={cn(
        "hidden md:flex flex-col border-r border-[#E5E7EB] bg-white/80 backdrop-blur-xl transition-all duration-300 ease-out flex-shrink-0",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]/60">
        {!collapsed && (
          <span className="text-sm font-semibold text-[#1A1A1A] tracking-tight">Tinder</span>
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
          .map(({ label, path, icon: Icon, exact, adminOnly }) => (
            <Link
              key={path}
              to={path}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative",
                isActive(path, exact)
                  ? "bg-[#ECFDF5] text-[#1E9A80] font-medium"
                  : "text-[#6B7280] hover:bg-black/[0.04] hover:text-[#1A1A1A]"
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
          <span className="block">BRRRR pipeline</span>
        </div>
      )}
    </aside>
  );
}
