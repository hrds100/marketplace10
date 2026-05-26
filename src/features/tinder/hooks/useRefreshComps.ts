// Triggers a fresh comps fetch for a single property by invoking the
// brrrr-fetch-property-comps Supabase Edge Function. That function proxies
// to the Flask scraper at 187.124.117.193:5001 (server-to-server, so the
// browser's HTTPS→HTTP mixed-content rule doesn't apply), runs Playwright
// + Land Registry lookup, replaces brrrr_comps for the property with the
// fresh results, and returns when done. Typical wall-clock: 30–90 seconds.

import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SupabaseFunctionsTyped = {
  invoke<TBody, TData = unknown>(
    name: string,
    init: { body: TBody },
  ): Promise<{ data: TData | null; error: { message: string } | null }>;
};

type RefreshResult =
  | { ok: true; property_id: string; count: number }
  | { ok: false; error: string };

export function useRefreshComps() {
  const [busyPid, setBusyPid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (property_id: string): Promise<RefreshResult> => {
    setBusyPid(property_id);
    setError(null);
    try {
      const { data, error: e } = await (supabase.functions as unknown as SupabaseFunctionsTyped).invoke<
        { property_id: string },
        { ok: boolean; property_id?: string; count?: number; error?: string }
      >("brrrr-fetch-property-comps", { body: { property_id } });
      if (e) {
        setError(e.message);
        return { ok: false, error: e.message };
      }
      if (!data?.ok) {
        const msg = data?.error || "Unknown error";
        setError(msg);
        return { ok: false, error: msg };
      }
      return { ok: true, property_id: data.property_id!, count: data.count ?? 0 };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setBusyPid(null);
    }
  }, []);

  return { refresh, busyPid, error, isBusy: (pid: string) => busyPid === pid };
}
