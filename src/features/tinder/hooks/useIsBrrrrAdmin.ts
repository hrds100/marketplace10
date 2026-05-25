// Mirrors the public.is_brrrr_admin() server-side check.
//
// The brrrr_admins Supabase table is the source of truth for who can set
// offer amounts and delete BRRRR rows. RLS on the underlying tables enforces
// the rule no matter what — this hook is purely a UX mirror so non-admins
// see a disabled input + clear message rather than a cryptic write rejection.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const t = (name: string) => (supabase.from as any)(name);

export function useIsBrrrrAdmin(): { isAdmin: boolean; loading: boolean } {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (!cancelled) { setIsAdmin(false); setLoading(false); } return; }
        // brrrr_admins RLS restricts SELECT to admins themselves, so this
        // either returns one row (you're an admin) or empty (you're not).
        const { data } = await t("brrrr_admins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        setIsAdmin(!!data);
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { isAdmin, loading };
}
