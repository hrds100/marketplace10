import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BrrrrCall, BrrrrCallAnswer, BrrrrListing, PipelineCard, PipelineStage } from "../types";

const t = (name: string) => (supabase.from as any)(name);

export function usePipeline() {
  const [cards, setCards] = useState<PipelineCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: calls, error: cErr } = await t("brrrr_calls")
        .select("*")
        .order("updated_at", { ascending: false });
      if (cErr) throw cErr;
      const pids = ((calls as BrrrrCall[] | null) ?? []).map((c) => c.property_id);
      const { data: listings, error: lErr } = pids.length
        ? await t("brrrr_listings").select("*").in("property_id", pids)
        : { data: [], error: null };
      if (lErr) throw lErr;
      const listingByPid: Record<string, BrrrrListing> = {};
      ((listings as BrrrrListing[] | null) ?? []).forEach((l) => { listingByPid[l.property_id] = l; });
      setCards(((calls as BrrrrCall[] | null) ?? []).map((c) => ({
        ...c,
        listing: listingByPid[c.property_id],
      })).filter((c) => !!c.listing));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pushToPipeline = useCallback(async (property_id: string, offer_amount: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    // Pre-fill agent details from the listing so the VA doesn't retype them.
    const { data: listing } = await t("brrrr_listings")
      .select("agent_name, agent_phone")
      .eq("property_id", property_id)
      .maybeSingle();
    const typedListing = (listing ?? null) as { agent_name?: string | null; agent_phone?: string | null } | null;
    const { data, error: e } = await t("brrrr_calls")
      .insert({
        property_id,
        stage: "to_call" as PipelineStage,
        offer_amount,
        agent_name: typedListing?.agent_name ?? null,
        agent_phone: typedListing?.agent_phone ?? null,
        called_by: user?.id ?? null,
      })
      .select()
      .single();
    if (e) throw e;
    await load();
    return data as BrrrrCall;
  }, [load]);

  const updateCall = useCallback(async (id: string, patch: Partial<BrrrrCall>) => {
    const { error: e } = await t("brrrr_calls").update(patch).eq("id", id);
    if (e) throw e;
    await load();
  }, [load]);

  const setStage = useCallback(async (id: string, stage: PipelineStage) => {
    await updateCall(id, { stage });
  }, [updateCall]);

  return { cards, loading, error, reload: load, pushToPipeline, updateCall, setStage };
}

export function useCallAnswers(call_id: string | null) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!call_id) { setAnswers({}); return; }
    setLoading(true);
    const { data } = await t("brrrr_call_answers")
      .select("*")
      .eq("call_id", call_id);
    const m: Record<string, string> = {};
    ((data as BrrrrCallAnswer[] | null) ?? []).forEach((a) => {
      m[a.question_key] = a.answer ?? "";
    });
    setAnswers(m);
    setLoading(false);
  }, [call_id]);

  useEffect(() => { load(); }, [load]);

  const saveAnswers = useCallback(async (next: Record<string, string>) => {
    if (!call_id) return;
    const rows = Object.entries(next).map(([question_key, answer]) => ({
      call_id, question_key, answer,
    }));
    if (rows.length === 0) return;
    const { error: e } = await t("brrrr_call_answers")
      .upsert(rows, { onConflict: "call_id,question_key" });
    if (e) throw e;
    setAnswers(next);
  }, [call_id]);

  return { answers, loading, reload: load, saveAnswers };
}
