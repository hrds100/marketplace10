// Bridge: /tinder/pipeline → /crm/dialer-pro
//
// Phase 1 of the BRRRR ↔ CRM bridge. When the user clicks "Push to CRM dialer"
// on a pipeline card we:
//
//   1. Look up the "BRRRR" dialer campaign (created by the
//      brrrr_create_crm_pipeline_and_campaign migration).
//   2. Upsert a wk_contact by phone, tagging custom_fields so the dialer can
//      recognise this is a BRRRR-origin contact and surface the right
//      questionnaire (Phase 2).
//   3. Drop a wk_dialer_queue row so the contact appears in the BRRRR queue.
//
// The actual Twilio dial happens via the existing /crm/dialer-pro screen.

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { PipelineCard } from "../types";

const t = (name: string) => (supabase.from as any)(name);

export const BRRRR_CAMPAIGN_NAME = "BRRRR";

type PushResult =
  | { ok: true; campaignId: string; contactId: string; queueId: string }
  | { ok: false; error: string };

export function usePushToCrm() {
  const navigate = useNavigate();

  const push = useCallback(async (card: PipelineCard, navigateToDialer = true): Promise<PushResult> => {
    if (!card.agent_phone) {
      return { ok: false, error: "No agent phone — can't push to dialer." };
    }

    // 1. Find the BRRRR campaign. It deliberately has no pipeline_id —
    //    /tinder/pipeline is the source of truth for BRRRR pipeline state
    //    (brrrr_calls.stage). The CRM campaign exists only to give us a
    //    dialer queue to drop contacts into.
    const { data: campaign, error: campErr } = await t("wk_dialer_campaigns")
      .select("id")
      .eq("name", BRRRR_CAMPAIGN_NAME)
      .eq("is_active", true)
      .maybeSingle();
    if (campErr) return { ok: false, error: `Campaign lookup failed: ${campErr.message}` };
    if (!campaign) return { ok: false, error: `BRRRR campaign not found in wk_dialer_campaigns.` };

    // 1b. Pick the agent that should own this contact + queue row.
    //
    //     The dialer-pro RLS on wk_contacts only lets an agent read contacts
    //     they own (owner_agent_id) or are explicitly assigned to via
    //     wk_lead_assignments. If owner_agent_id stays NULL, the queue join
    //     returns null → frontend filters the lead out → "Queue 0" even
    //     though the row is in the table. We learned this the hard way with
    //     Elijah's first 11 BRRRR pushes.
    //
    //     Resolution order:
    //       a) exactly one agent on wk_campaign_agents for BRRRR → use them
    //       b) more than one agent → leave NULL (admin must hand-assign)
    //       c) zero agents → leave NULL and surface a warning
    const { data: campaignAgents } = await t("wk_campaign_agents")
      .select("agent_id")
      .eq("campaign_id", campaign.id);
    const agentIds: string[] = (campaignAgents ?? [])
      .map((r: { agent_id: string | null }) => r.agent_id)
      .filter((id: string | null): id is string => !!id);
    const soleAgentId = agentIds.length === 1 ? agentIds[0] : null;

    const phoneNorm = normalisePhone(card.agent_phone);
    const propertyAddress = card.listing?.address ?? "";

    // 2. Find or create the wk_contact (phone is UNIQUE)
    const { data: existingContact } = await t("wk_contacts")
      .select("id, custom_fields, name, owner_agent_id")
      .eq("phone", phoneNorm)
      .maybeSingle();

    const brrrrTag = {
      source: "brrrr" as const,
      brrrr_call_id: card.id,
      brrrr_property_id: card.property_id,
      brrrr_address: propertyAddress,
      pushed_at: new Date().toISOString(),
    };

    let contactId: string;
    if (existingContact) {
      contactId = existingContact.id;
      // Merge — keep any prior history, store latest BRRRR push in `brrrr` key
      // plus append to `brrrr_history` so multi-property agents don't lose
      // earlier links. Phase 2 will use this to drive the in-call questionnaire
      // for whichever property the VA is calling about.
      const prev = (existingContact.custom_fields ?? {}) as Record<string, any>;
      const history = Array.isArray(prev.brrrr_history) ? prev.brrrr_history : [];
      const nextCustom = {
        ...prev,
        source: prev.source ?? "brrrr",
        brrrr: brrrrTag,
        brrrr_history: [brrrrTag, ...history.filter((h: any) => h?.brrrr_call_id !== card.id)].slice(0, 20),
      };
      // Only stamp owner_agent_id if we have a unique campaign agent AND the
      // contact isn't already owned by someone else — we never want to steal
      // a contact away from an existing CRM owner.
      const ownerPatch =
        soleAgentId && !(existingContact as any).owner_agent_id
          ? { owner_agent_id: soleAgentId }
          : {};
      const { error: upErr } = await t("wk_contacts")
        .update({
          custom_fields: nextCustom,
          name: existingContact.name || (card.agent_name ?? null),
          ...ownerPatch,
        })
        .eq("id", contactId);
      if (upErr) return { ok: false, error: `Contact update failed: ${upErr.message}` };
    } else {
      // New contact, BRRRR-only. pipeline_column_id stays null on purpose so
      // this contact doesn't clutter the existing CRM kanbans — it'll only
      // appear in the BRRRR dialer queue.
      const { data: created, error: insErr } = await t("wk_contacts")
        .insert({
          name: card.agent_name ?? "(unknown agent)",
          phone: phoneNorm,
          // Stamp ownership when there's a clear single owner on the BRRRR
          // campaign. Without this, RLS on wk_contacts hides the contact
          // from the dialer-pro queue join.
          owner_agent_id: soleAgentId,
          custom_fields: {
            source: "brrrr",
            brrrr: brrrrTag,
            brrrr_history: [brrrrTag],
          },
        })
        .select("id")
        .single();
      if (insErr || !created) return { ok: false, error: `Contact insert failed: ${insErr?.message ?? "unknown"}` };
      contactId = created.id;
    }

    // 3. Drop into the dialer queue (pending). Don't reuse an existing pending
    //    row — each push is a discrete intent ("call this agent about THIS
    //    property"), so a new row per push is correct.
    //
    //    Stamp agent_id when there's a single agent on the campaign — the
    //    dialer-pro UI uses this for the "my queue" view. NULL is OK when
    //    multiple agents share the campaign (admin assigns later).
    const { data: queueRow, error: qErr } = await t("wk_dialer_queue")
      .insert({
        campaign_id: campaign.id,
        contact_id: contactId,
        agent_id: soleAgentId,
        status: "pending",
        priority: 0,
      })
      .select("id")
      .single();
    if (qErr || !queueRow) return { ok: false, error: `Queue insert failed: ${qErr?.message ?? "unknown"}` };

    // 4. Also stamp the BRRRR call record so we can show "pushed to dialer" in /tinder
    await t("brrrr_calls")
      .update({ called_at: new Date().toISOString() })
      .eq("id", card.id);

    if (navigateToDialer) {
      navigate(`/crm/dialer-pro?campaign=${campaign.id}`);
    }

    return { ok: true, campaignId: campaign.id, contactId, queueId: queueRow.id };
  }, [navigate]);

  return { push };
}

// Rightmove gives us phones like "01615245506" — keep digits + leading + only,
// drop spaces and dashes. wk_contacts.phone is UNIQUE so consistent format
// matters; existing contacts likely follow the same convention.
function normalisePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}
