// Standalone layout for the Tinder (BRRRR) workspace — does NOT use
// DashboardLayout. Same pattern as Smsv2Layout for /crm.
//
// Provides:
//   - Auth gate (via ProtectedRoute)
//   - A slim top bar with the four Tinder section tabs
//   - <Outlet /> for the active subroute
//
// Deliberately minimal. The Tinder pages own their own internal layout
// (two-pane lists, kanban, etc.) and take the full viewport below the
// top bar.

import { Outlet, NavLink, Link } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

const TABS = [
  { to: "/tinder",            label: "Review",   end: true  },
  { to: "/tinder/shortlist",  label: "Shortlist", end: false },
  { to: "/tinder/comps",      label: "Comps",     end: false },
  { to: "/tinder/pipeline",   label: "Pipeline",  end: false },
];

export default function TinderLayout() {
  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col bg-white">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-5 z-[101] flex-shrink-0 gap-4">
          <Link
            to="/tinder"
            className="flex items-center"
            style={{ gap: 3 }}
          >
            <div
              style={{
                width: 28, height: 28, border: "1.5px solid #0a0a0a", borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12,
                color: "#0a0a0a", lineHeight: 1,
              }}
            >nf</div>
            <span
              style={{
                fontFamily: "'Sora', sans-serif", fontWeight: 400, fontSize: 18,
                color: "#0a0a0a", letterSpacing: 2, lineHeight: 1,
              }}
            >stay</span>
          </Link>
          <span className="text-sm font-medium text-slate-400">Tinder</span>

          <nav className="ml-6 flex items-center gap-1">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-100 text-emerald-800"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/* Reserved for future actions (e.g. trigger floor-plan refetch) */}
          </div>
        </header>

        {/* Content fills the rest of the viewport */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}
