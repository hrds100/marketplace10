// Returns the derived offer (calculated or override) for a set of properties.
// Used by /tinder/pipeline Kanban cards and BrrrrCallPanel so the VA always
// sees the same number Hugo can verify on /tinder/comps.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateOffer, type DerivedOffer } from "../lib/offer";
import type { BrrrrComp, BrrrrListing } from "../types";

const t = (name: string) => (supabase.from as any)(name);

/**
 * Bulk variant — fetches listings + comps for many property_ids and returns
 * a map from property_id to derived offer. `overrides` is a map of
 * property_id → brrrr_calls.offer_amount (the manual override, if any).
 */
export function useDerivedOffers(
  property_ids: string[],
  overrides: Record<string, string | null>,
): { offers: Map<string, DerivedOffer>; loading: boolean } {
  const [listings, setListings] = useState<BrrrrListing[]>([]);
  const [comps, setComps] = useState<BrrrrComp[]>([]);
  const [loading, setLoading] = useState(true);
  const key = useMemo(() => property_ids.join(","), [property_ids]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      if (property_ids.length === 0) {
        if (!cancelled) { setListings([]); setComps([]); setLoading(false); }
        return;
      }
      const [{ data: l }, { data: c }] = await Promise.all([
        t("brrrr_listings").select("*").in("property_id", property_ids),
        t("brrrr_comps").select("*").in("property_id", property_ids),
      ]);
      if (cancelled) return;
      setListings(((l as BrrrrListing[] | null) ?? []));
      setComps(((c as BrrrrComp[] | null) ?? []));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const offers = useMemo(() => {
    const listingByPid: Record<string, BrrrrListing> = {};
    listings.forEach((l) => { listingByPid[l.property_id] = l; });
    const compsByPid: Record<string, BrrrrComp[]> = {};
    comps.forEach((c) => { (compsByPid[c.property_id] ??= []).push(c); });
    const m = new Map<string, DerivedOffer>();
    property_ids.forEach((pid) => {
      m.set(pid, calculateOffer(listingByPid[pid] ?? null, compsByPid[pid] ?? [], overrides[pid]));
    });
    return m;
  }, [listings, comps, property_ids, overrides]);

  return { offers, loading };
}

/** Single-property variant — used by BrrrrCallPanel + the pipeline modal. */
export function useDerivedOffer(
  property_id: string | null | undefined,
  override: string | null | undefined,
): { offer: DerivedOffer | null; loading: boolean } {
  const ids = useMemo(() => (property_id ? [property_id] : []), [property_id]);
  const overrides = useMemo(
    () => (property_id ? { [property_id]: override ?? null } : {}),
    [property_id, override]
  );
  const { offers, loading } = useDerivedOffers(ids, overrides);
  return {
    offer: property_id ? offers.get(property_id) ?? null : null,
    loading,
  };
}
