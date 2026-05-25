import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BrrrrComp, BrrrrListing } from "../types";

export type ShortlistedSubject = BrrrrListing & { comps: BrrrrComp[] };

const t = (name: string) => (supabase.from as any)(name);

// Fetches every "potential" listing along with its comps in a single round-trip.
export function useShortlistedWithComps() {
  const [subjects, setSubjects] = useState<ShortlistedSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: reviews, error: rErr } = await t("brrrr_reviews")
        .select("property_id")
        .eq("status", "potential");
      if (rErr) throw rErr;
      const pids = ((reviews ?? []) as { property_id: string }[]).map((r) => r.property_id);
      if (pids.length === 0) {
        setSubjects([]);
        return;
      }
      const [{ data: listings, error: lErr }, { data: comps, error: cErr }] = await Promise.all([
        t("brrrr_listings").select("*").in("property_id", pids),
        t("brrrr_comps").select("*").in("property_id", pids),
      ]);
      if (lErr) throw lErr;
      if (cErr) throw cErr;
      const byPid: Record<string, BrrrrComp[]> = {};
      ((comps as BrrrrComp[] | null) ?? []).forEach((c) => {
        (byPid[c.property_id] ??= []).push(c);
      });
      setSubjects(((listings as BrrrrListing[] | null) ?? []).map((l) => ({
        ...l,
        comps: byPid[l.property_id] ?? [],
      })));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { subjects, loading, error, reload: load };
}
