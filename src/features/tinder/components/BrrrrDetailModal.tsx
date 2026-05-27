// BrrrrDetailModal — the rich detail view that opens when you click a BRRRR
// contact card on /crm/pipelines (or anywhere else we wire it in later).
//
// Hugo asked for "all info" on a single surface: the property the agent's
// being called about, the floor plan, the comp-derived offer, the comps
// themselves, the questionnaire answers from prior calls, the current
// pipeline stage, and the agent's full BRRRR push history (so you can
// see other properties pushed for the same agent without having to
// open another card).
//
// Read-only by default; the stage selector lets the user nudge the stage
// without dialling, and the questionnaire is editable too (it saves to
// brrrr_call_answers). Plain-old contact edits stay in EditContactModal;
// PipelinesPage routes BRRRR contacts here instead.
//
// Limits & scope:
//   • We pick the "current" property from contact.custom_fields.brrrr by
//     default. If brrrr_history has more, we show a property switcher.
//   • We do not delete or move the contact from this modal — there's no
//     way to escalate to a full "edit contact" view from here. Hugo can
//     drag the kanban card or use /crm/contacts/:id for that.
//   • Floor plan images are served straight from Rightmove CDN URLs that
//     we mirrored into brrrr_floorplans. They may break if Rightmove
//     rotates URLs; we show a graceful fallback.
//
// Limit on scope: the BRRRR-detail panel inherits the BRRRR RLS (campaign
// membership). Admins always see it. Agents removed from the BRRRR
// campaign will get an empty render — which is correct.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Phone, X, MapPin, Banknote, Home, ExternalLink, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type {
  BrrrrCall,
  BrrrrCallAnswer,
  BrrrrComp,
  BrrrrFloorplan,
  BrrrrListing,
  PipelineStage,
} from "../types";
import { PIPELINE_STAGES, STAGE_LABEL } from "../types";
import { filterRent, filterSaleSame, filterSaleTarget, sqmToSqft } from "../lib/gdv";
import { formatGBP } from "../lib/offer";
import { useDerivedOffer } from "../hooks/useDerivedOffer";
import { CompTable } from "./CompTable";
import { FloorPlanViewer } from "./FloorPlanViewer";
import { QuestionnaireForm } from "./QuestionnaireForm";
import { GDVCalculator } from "./GDVCalculator";
import { DealCalculator } from "./DealCalculator";

// supabase.from is typed against generated DB types that don't include the
// brrrr_* tables (those are managed outside the type generator). The (any)
// shim mirrors the pattern used across BrrrrCallPanel + usePipeline.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (name: string) => (supabase.from as any)(name);

type BrrrrHistoryEntry = {
  source?: string;
  brrrr_call_id?: string;
  brrrr_property_id?: string;
  brrrr_address?: string | null;
  pushed_at?: string;
};

type ContactCustomFields = {
  source?: string;
  brrrr?: BrrrrHistoryEntry;
  brrrr_history?: BrrrrHistoryEntry[];
};

type ContactLike = {
  id: string;
  name: string;
  phone: string;
  customFields?: Record<string, unknown> | null;
};

type Props = {
  contact: ContactLike | null;
  onClose: () => void;
  onOpenDialer?: (contactId: string) => void;
};

export default function BrrrrDetailModal({ contact, onClose, onOpenDialer }: Props) {
  const cf = (contact?.customFields ?? {}) as ContactCustomFields;
  const history: BrrrrHistoryEntry[] = useMemo(() => {
    const list = Array.isArray(cf.brrrr_history) ? cf.brrrr_history : (cf.brrrr ? [cf.brrrr] : []);
    return list.filter((h): h is BrrrrHistoryEntry => !!h?.brrrr_property_id);
  }, [cf]);

  // Default selection: current brrrr tag, falling back to first history entry.
  const initialPid = cf.brrrr?.brrrr_property_id ?? history[0]?.brrrr_property_id ?? null;
  const [selectedPid, setSelectedPid] = useState<string | null>(initialPid);
  useEffect(() => { setSelectedPid(initialPid); }, [initialPid]);

  const selectedHistory = useMemo(
    () => history.find((h) => h.brrrr_property_id === selectedPid) ?? null,
    [history, selectedPid]
  );

  if (!contact) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-white">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold flex-shrink-0">
            {contact.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wide font-bold text-emerald-700">BRRRR lead</div>
            <div className="text-base font-bold text-slate-800 truncate">{contact.name}</div>
            <div className="text-xs text-slate-500 tabular-nums">{contact.phone}</div>
          </div>
          {onOpenDialer && (
            <button
              onClick={() => onOpenDialer(contact.id)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
              title="Open in dialer-pro"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-500"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Property switcher (only if agent has multiple BRRRR pushes) */}
        {history.length > 1 && (
          <div className="px-5 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] uppercase tracking-wide font-bold text-slate-500 shrink-0">
              {history.length} properties
            </span>
            {history.map((h, idx) => {
              const isCurrent = h.brrrr_property_id === selectedPid;
              return (
                <button
                  key={h.brrrr_property_id || idx}
                  onClick={() => setSelectedPid(h.brrrr_property_id ?? null)}
                  className={`shrink-0 text-[11px] px-2 py-1 rounded transition ${
                    isCurrent
                      ? "bg-emerald-500 text-white font-semibold"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                  title={h.brrrr_address ?? h.brrrr_property_id}
                >
                  <span className="font-mono">{h.brrrr_property_id}</span>
                  {h.brrrr_address && (
                    <span className="ml-1.5 hidden md:inline">{truncate(h.brrrr_address, 40)}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Body — scrolls */}
        <div className="flex-1 overflow-y-auto">
          {selectedPid ? (
            <PropertyDetail propertyId={selectedPid} historyEntry={selectedHistory} contactId={contact.id} />
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
              No BRRRR property linked to this contact. (custom_fields.brrrr is missing.)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

// One property's full detail. Re-mounts cleanly when selectedPid changes.
function PropertyDetail({
  propertyId,
  historyEntry,
  contactId,
}: {
  propertyId: string;
  historyEntry: BrrrrHistoryEntry | null;
  contactId: string;
}) {
  const [listing, setListing] = useState<BrrrrListing | null>(null);
  const [floorplans, setFloorplans] = useState<BrrrrFloorplan[]>([]);
  const [comps, setComps] = useState<BrrrrComp[]>([]);
  const [call, setCall] = useState<BrrrrCall | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [stageBusy, setStageBusy] = useState(false);
  // GDV flows from the GDV calculator into the Deal calculator below it.
  const [gdv, setGdv] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Pull everything for this property in parallel.
      const [listingRes, fpRes, compsRes, callRes] = await Promise.all([
        t("brrrr_listings").select("*").eq("property_id", propertyId).maybeSingle(),
        t("brrrr_floorplans").select("*").eq("property_id", propertyId).order("page_number"),
        t("brrrr_comps").select("*").eq("property_id", propertyId),
        t("brrrr_calls").select("*").eq("property_id", propertyId).maybeSingle(),
      ]);

      setListing((listingRes.data as BrrrrListing | null) ?? null);
      // Filter out the no-floorplan sentinel rows (image_url === "" /
      // page_number === 0) so the viewer doesn't try to render a blank img.
      const fpRows = ((fpRes.data as BrrrrFloorplan[] | null) ?? []).filter(
        (fp) => fp.image_url && fp.image_url.length > 0,
      );
      setFloorplans(fpRows);
      setComps((compsRes.data as BrrrrComp[] | null) ?? []);
      const c = (callRes.data as BrrrrCall | null) ?? null;
      setCall(c);

      // Questionnaire answers for the latest call.
      if (c?.id) {
        const { data: ans } = await t("brrrr_call_answers")
          .select("*")
          .eq("call_id", c.id);
        const map: Record<string, string> = {};
        ((ans as BrrrrCallAnswer[] | null) ?? []).forEach((a) => {
          map[a.question_key] = a.answer ?? "";
        });
        setAnswers(map);
      } else {
        setAnswers({});
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { void load(); }, [load]);

  const override = call?.offer_amount ?? null;
  const { offer } = useDerivedOffer(propertyId, override);

  const sqft = useMemo(() => {
    if (!listing) return null;
    const raw = parseFloat(listing.floor_area_sqft ?? "");
    if (raw && raw >= 100) return Math.round(raw);
    const sqm = parseFloat(listing.floor_area_sqm ?? "");
    if (sqm && sqm > 0) return Math.round(sqmToSqft(sqm));
    return null;
  }, [listing]);

  const targetComps = useMemo(() => filterSaleTarget(comps), [comps]);
  const sameComps = useMemo(() => filterSaleSame(comps), [comps]);
  const rentComps = useMemo(() => filterRent(comps), [comps]);

  const applyStage = useCallback(async (stage: PipelineStage) => {
    if (!call?.id) return;
    setStageBusy(true);
    const { error } = await t("brrrr_calls").update({ stage, updated_at: new Date().toISOString() }).eq("id", call.id);
    if (!error) setCall({ ...call, stage });

    // Also move the kanban card to the matching pipeline column so the
    // /crm/pipelines board reflects the new stage immediately. Without
    // this, brrrr_calls.stage advances but the card stays put on whatever
    // column it was last dragged to (Hugo hit this 2026-05-28).
    try {
      const { data: pipeline } = await t("wk_pipelines")
        .select("id").eq("name", "BRRRR").maybeSingle();
      const pipelineId = pipeline?.id as string | undefined;
      if (pipelineId) {
        const { data: col } = await t("wk_pipeline_columns")
          .select("id")
          .eq("pipeline_id", pipelineId)
          .eq("name", STAGE_LABEL[stage])
          .maybeSingle();
        if (col?.id) {
          await t("wk_contacts").update({ pipeline_column_id: col.id }).eq("id", contactId);
        }
      }
    } catch (_) { /* swallow — stage change still succeeded */ }

    setStageBusy(false);
  }, [call, contactId]);

  // Upsert brrrr_call_answers for the current call. Used by the
  // questionnaire's autosave (blur) AND the explicit Save button. Same
  // mechanic as useCallAnswers.saveAnswers in usePipeline.ts.
  const saveAnswers = useCallback(async (next: Record<string, string>) => {
    if (!call?.id) return;
    const rows = Object.entries(next).map(([question_key, answer]) => ({
      call_id: call.id, question_key, answer,
    }));
    if (rows.length === 0) return;
    await t("brrrr_call_answers").upsert(rows, { onConflict: "call_id,question_key" });
    setAnswers(next);
  }, [call]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">Loading property details…</div>
    );
  }

  if (!listing) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 text-sm">No listing record on Supabase for property {propertyId}.</p>
        <p className="text-slate-400 text-xs mt-2">It may have been cleaned up. Re-promote from the scraper /floorplans page to restore.</p>
      </div>
    );
  }

  const priceLine = [listing.price_qualifier, listing.price].filter(Boolean).join(" ").trim();

  return (
    <div className="p-5 space-y-5">
      {/* Property surface */}
      <section>
        <div className="flex items-start gap-3">
          <Home className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-slate-800">{priceLine || "Price unknown"}</div>
            <div className="text-sm text-slate-600 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {listing.address || historyEntry?.brrrr_address || "Address unknown"}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              <span>{listing.bedrooms || "?"} bed {listing.property_type || ""}</span>
              {sqft && <span>{sqft} sqft</span>}
              {listing.days_on_market && (
                <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {listing.days_on_market} days on market</span>
              )}
              {listing.is_auction === "1" && <span className="text-amber-700 font-medium">AUCTION</span>}
              {listing.is_tenanted === "1" && <span className="text-rose-700 font-medium">TENANTED</span>}
              {listing.listing_url && (
                <a
                  href={listing.listing_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                >
                  Rightmove <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* What to offer */}
      <section className={`rounded-lg border-2 p-4 ${
        offer?.source === "override" ? "border-violet-200 bg-violet-50"
        : offer?.source === "calculated" ? "border-emerald-200 bg-emerald-50"
        : offer?.source === "approximate" ? "border-blue-200 bg-blue-50"
        : "border-amber-200 bg-amber-50"
      }`}>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide font-bold text-slate-600">
          <Banknote className="w-4 h-4" />
          What to offer
          {offer?.source === "override" && <span className="text-violet-700 normal-case">· Hugo override</span>}
          {offer?.source === "calculated" && <span className="text-emerald-700 normal-case">· auto from GDV</span>}
          {offer?.source === "approximate" && <span className="text-blue-700 normal-case">· approximate (no subject sqft)</span>}
          {offer?.source === "unavailable" && <span className="text-amber-700 normal-case">· can't calculate</span>}
        </div>
        <div className={`text-3xl font-bold mt-1 ${
          offer?.source === "override" ? "text-violet-800"
          : offer?.source === "calculated" ? "text-emerald-700"
          : offer?.source === "approximate" ? "text-blue-700"
          : "text-amber-800"
        }`}>
          {offer?.amount != null ? formatGBP(offer.amount) : "—"}
        </div>
        <div className="text-xs text-slate-600 mt-1">{offer?.reason ?? ""}</div>
      </section>

      {/* Stage selector */}
      {call && (
        <section>
          <div className="text-[11px] uppercase tracking-wide font-bold text-slate-500 mb-2">
            Pipeline stage <span className="font-normal normal-case text-slate-400">— click to update</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PIPELINE_STAGES.map((stage) => {
              const isCurrent = call.stage === stage;
              return (
                <button
                  key={stage}
                  onClick={() => applyStage(stage)}
                  disabled={stageBusy || isCurrent}
                  className={`text-[11px] font-medium px-2.5 py-1.5 rounded transition disabled:opacity-50 ${
                    isCurrent
                      ? "bg-emerald-600 text-white ring-2 ring-emerald-300 ring-offset-1"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  title={isCurrent ? "Current stage" : `Set to ${STAGE_LABEL[stage]}`}
                >
                  {STAGE_LABEL[stage]}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Floor plan (full width on its own) */}
      <section>
        <div className="text-[11px] uppercase tracking-wide font-bold text-slate-500 mb-2">
          Floor plan {floorplans.length > 1 && <span className="font-normal normal-case text-slate-400">— {floorplans.length} pages</span>}
        </div>
        <div className="h-[320px] rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
          <FloorPlanViewer floorplans={floorplans} />
        </div>
      </section>

      {/* Questionnaire — all 19 questions, editable, autosaves on blur.
          Same form the in-call BrrrrCallPanel uses, so the VA can fill or
          edit answers whether they're on a call or reviewing later from
          the pipeline kanban. */}
      <section>
        <div className="text-[11px] uppercase tracking-wide font-bold text-slate-500 mb-2">
          Questionnaire <span className="font-normal normal-case text-slate-400">— typing autosaves on blur</span>
        </div>
        {call ? (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
            <QuestionnaireForm
              initialAnswers={answers}
              onSave={async (ans) => { await saveAnswers(ans); }}
              onAutoSave={saveAnswers}
            />
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">No call record yet — promote this property first.</div>
        )}
      </section>

      {/* Comps */}
      <section className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-[11px] uppercase tracking-wide font-bold text-slate-500 mb-2">
              Target-bed sold comps (BRRRR target)
            </h4>
            <CompTable comps={targetComps} kind="sale" emptyText="No target-bed sold comps yet." />
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-wide font-bold text-slate-500 mb-2">
              Same-bed sold comps
            </h4>
            <CompTable comps={sameComps} kind="sale" emptyText="No same-bed sold comps." />
          </div>
        </div>
        <div>
          <h4 className="text-[11px] uppercase tracking-wide font-bold text-slate-500 mb-2">
            Rental comps
          </h4>
          <CompTable comps={rentComps} kind="rent" emptyText="No rental comps." />
        </div>
      </section>

      {/* GDV + Deal calculator — same math the scraper's /comps page shows.
          Gives the VA the offer range (£/sqft × sqft × 70%-75%) plus the
          BRRRR refi math (cash needed, JV gap, refi scenarios, monthly
          profit) without leaving the dialer. The GDV flows from the
          calculator into the deal calculator via the `gdv` state above. */}
      <section className="space-y-4">
        <GDVCalculator
          subject={listing}
          targetComps={targetComps}
          onGdvChange={setGdv}
        />
        <DealCalculator
          subject={listing}
          rentComps={rentComps}
          gdv={gdv}
        />
      </section>

      {/* Push history mini-line */}
      {historyEntry?.pushed_at && (
        <div className="text-[11px] text-slate-400 text-right">
          Pushed to pipeline {new Date(historyEntry.pushed_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
