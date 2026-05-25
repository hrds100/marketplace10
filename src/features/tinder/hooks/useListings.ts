// Data hooks for the Tinder feature.
//
// brrrr_* tables aren't in the generated Supabase types yet, so we cast
// `supabase.from(...)` to `any` — same pattern used elsewhere in the repo
// (e.g. DashboardLayout for `profiles`, inquiries, etc.). Regenerate the
// types once the schema stabilises to get real type checking back.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  BrrrrFloorplan,
  BrrrrListing,
  BrrrrReview,
  ListingWithFloorplans,
  ReviewStatus,
} from "../types";

type ReviewMap = Record<string, ReviewStatus>;

const t = (name: string) => (supabase.from as any)(name);

export function useListings() {
  const [listings, setListings] = useState<BrrrrListing[]>([]);
  const [floorplans, setFloorplans] = useState<Record<string, BrrrrFloorplan[]>>({});
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: l, error: lErr },
        { data: f, error: fErr },
        { data: r, error: rErr },
      ] = await Promise.all([
        t("brrrr_listings").select("*").neq("is_tenanted", "1").order("scraped_at", { ascending: false }),
        t("brrrr_floorplans").select("*").order("page_number", { ascending: true }),
        t("brrrr_reviews").select("*"),
      ]);
      if (lErr) throw lErr;
      if (fErr) throw fErr;
      if (rErr) throw rErr;
      const fpByPid: Record<string, BrrrrFloorplan[]> = {};
      ((f as BrrrrFloorplan[] | null) ?? []).forEach((row) => {
        (fpByPid[row.property_id] ??= []).push(row);
      });
      const reviewMap: ReviewMap = {};
      ((r as BrrrrReview[] | null) ?? []).forEach((row) => { reviewMap[row.property_id] = row.status; });
      setListings(((l as BrrrrListing[] | null) ?? []));
      setFloorplans(fpByPid);
      setReviews(reviewMap);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const combined: ListingWithFloorplans[] = listings.map((l) => ({
    ...l,
    floorplans: floorplans[l.property_id] ?? [],
    review_status: reviews[l.property_id] ?? null,
  }));

  const saveReview = useCallback(
    async (property_id: string, status: ReviewStatus) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        property_id,
        status,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      };
      const { error: e } = await t("brrrr_reviews").upsert(payload, { onConflict: "property_id" });
      if (e) throw e;
      setReviews((prev) => ({ ...prev, [property_id]: status }));
    },
    []
  );

  return { listings: combined, loading, error, reload: load, saveReview };
}
