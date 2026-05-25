// Quick "which shortlisted properties have at least one comp row?" lookup —
// used by /tinder/shortlist and elsewhere to gate the Push-to-Pipeline button.
// Hugo's rule: a property only goes to the pipeline once comps have been
// fetched (otherwise the offer amount has no GDV evidence behind it).

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const t = (name: string) => (supabase.from as any)(name);

export function useCompsCoverage() {
  const [pidsWithComps, setPidsWithComps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Pull just the property_id column — there can be many comps per
      // property; we only need to know which property_ids are covered.
      const { data } = await t("brrrr_comps").select("property_id");
      if (cancelled) return;
      const s = new Set<string>();
      ((data ?? []) as { property_id: string }[]).forEach((r) => s.add(r.property_id));
      setPidsWithComps(s);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return {
    pidsWithComps,
    loading,
    hasComps: (property_id: string) => pidsWithComps.has(property_id),
  };
}
