import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Building2, Plus, LogOut } from 'lucide-react';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export default function PropertyCrmLayout() {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Override the shared useAuth.signOut() — it hardcodes a redirect to
  // /signin, but staff who logged in via /properties/login should bounce
  // back there, not into the tenant marketplace sign-in.
  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/properties/login';
  }

  return (
    <div className="min-h-screen flex bg-[#F3F3EE]">
      {/* Sidebar */}
      <aside className="w-[260px] shrink-0 bg-white border-r border-[#E5E7EB] flex flex-col">
        <div className="px-5 py-5 border-b border-[#E5E7EB]">
          <button
            onClick={() => navigate('/properties')}
            className="flex items-center gap-2 text-left w-full"
          >
            <div className="w-8 h-8 rounded-[8px] bg-[#1E9A80] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-[14px] font-bold text-[#0A0A0A] leading-tight">Property CRM</div>
              <div className="text-[11px] text-[#6B7280]">Operations</div>
            </div>
          </button>
        </div>

        <div className="px-3 py-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
              Workspaces
            </span>
            <button
              onClick={() => navigate('/properties')}
              className="text-[#1E9A80] hover:text-[#168f74]"
              aria-label="Create workspace"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {isLoading && (
            <div className="px-2 text-[12px] text-[#6B7280]">Loading…</div>
          )}

          {!isLoading && workspaces.length === 0 && (
            <div className="px-2 text-[12px] text-[#9CA3AF]">No workspaces yet</div>
          )}

          <ul className="space-y-1">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <NavLink
                  to={`/properties/${ws.id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-2 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#ECFDF5] text-[#1E9A80]'
                        : 'text-[#1A1A1A] hover:bg-[#F3F3EE]'
                    }`
                  }
                >
                  <span className="truncate">{ws.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-3 py-3 border-t border-[#E5E7EB]">
          <div className="px-2 py-2 text-[11px] text-[#6B7280] truncate">{user?.email}</div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-2 py-1.5 rounded-[8px] text-[12px] text-[#6B7280] hover:bg-[#F3F3EE] w-full"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
