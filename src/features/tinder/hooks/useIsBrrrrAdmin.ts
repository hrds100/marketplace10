// Single source of truth for "is the current user a Tinder admin?"
//
// Mirrors the rule in the Supabase wk_is_admin() function and the CRM's
// Smsv2Sidebar workspace-role check: admin = email in the hardcoded admin
// allow-list (handled by useAuth.isAdmin) OR profiles.workspace_role='admin'.
// When workspace_role is explicitly set to 'agent', that wins even if the
// email is in the admin list — same precedence as AdminOnlyRoute / CRM.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const t = (name: string) => (supabase.from as any)(name);

export function useIsBrrrrAdmin(): { isAdmin: boolean; loading: boolean } {
  const { user, isAdmin: emailIsAdmin, loading: authLoading } = useAuth();
  const [workspaceRole, setWorkspaceRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setWorkspaceRole(null); return; }
    let cancelled = false;
    void (async () => {
      const { data } = await t("profiles")
        .select("workspace_role")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setWorkspaceRole((data?.workspace_role as string | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  const loading = authLoading || workspaceRole === undefined;
  // Explicit workspace_role wins. Fall back to email allow-list when role is null.
  const isAdmin = workspaceRole === "admin" || (workspaceRole === null && emailIsAdmin);
  return { isAdmin, loading };
}

/**
 * Returns the user's full role for /tinder access:
 *   - "admin": full access, can manage agents, set offers, delete
 *   - "agent": can swipe, push, dial, fill questionnaire
 *   - "viewer": read-only
 *   - null: not logged in or no role yet
 *
 * Use this in components that need to differentiate agent vs viewer.
 * For the simple admin check, useIsBrrrrAdmin() is enough.
 */
export function useTinderRole(): { role: "admin" | "agent" | "viewer" | null; loading: boolean } {
  const { user, isAdmin: emailIsAdmin, loading: authLoading } = useAuth();
  const [workspaceRole, setWorkspaceRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setWorkspaceRole(null); return; }
    let cancelled = false;
    void (async () => {
      const { data } = await t("profiles")
        .select("workspace_role")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setWorkspaceRole((data?.workspace_role as string | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  const loading = authLoading || workspaceRole === undefined;
  if (!user) return { role: null, loading };
  if (workspaceRole === "admin") return { role: "admin", loading };
  if (workspaceRole === "agent") return { role: "agent", loading };
  if (workspaceRole === "viewer") return { role: "viewer", loading };
  // No explicit role — email allow-list grants admin, anything else is viewer.
  return { role: emailIsAdmin ? "admin" : "viewer", loading };
}
