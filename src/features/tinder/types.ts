// TypeScript types for the brrrr_* Supabase tables.
// Schema mirrors TAJU-BUILD-BRIEF.md (Phase 1).

export type BrrrrListing = {
  id: string;
  property_id: string;
  listing_url: string | null;
  price: string | null;
  price_qualifier: string | null;
  address: string | null;
  bedrooms: string | null;
  property_type: string | null;
  search_url: string | null;
  is_auction: string | null;       // "0" | "1"
  is_tenanted: string | null;      // "0" | "1"
  listed_date: string | null;
  days_on_market: string | null;
  floor_area_sqft: string | null;
  floor_area_sqm: string | null;
  scraped_at: string | null;
  created_by: string | null;
  agent_name: string | null;
  agent_phone: string | null;
  agent_branch_url: string | null;
};

export type BrrrrFloorplan = {
  id: string;
  property_id: string;
  image_url: string;
  page_number: number;
  fetched_at: string | null;
};

export type ReviewStatus = "potential" | "skip";

export type BrrrrReview = {
  id: string;
  property_id: string;
  status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

export type CompType =
  | "sale_same"
  | "sale_target"
  | "rent"
  | "sale_same_bed"   // brief variant
  | "sale_target_bed"; // brief variant

export type BrrrrComp = {
  id: string;
  property_id: string;
  comp_type: CompType;
  address: string | null;
  price: string | null;
  bedrooms: string | null;
  property_type: string | null;
  url: string | null;
  date_info: string | null;
  distance_m: string | null;
  distance_label: string | null;
  source: string | null;            // "Land Registry" | "Zoopla" | "Rightmove"
  floor_area_sqm: string | null;
  fetched_at: string | null;
};

export const PIPELINE_STAGES = [
  "to_call",
  "called_no_answer",
  "called_waiting",
  "offer_made",
  "offer_rejected",
  "offer_accepted",
  "viewing_booked",
  "under_offer",
  "exchanged",
  "dead",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABEL: Record<PipelineStage, string> = {
  to_call: "To call",
  called_no_answer: "Called — no answer",
  called_waiting: "Called — waiting",
  offer_made: "Offer made",
  offer_rejected: "Offer rejected",
  offer_accepted: "Offer accepted",
  viewing_booked: "Viewing booked",
  under_offer: "Under offer",
  exchanged: "Exchanged",
  dead: "Dead",
};

export type BrrrrCall = {
  id: string;
  property_id: string;
  stage: PipelineStage;
  offer_amount: string | null;
  agent_name: string | null;
  agent_phone: string | null;
  agent_email: string | null;
  called_by: string | null;
  called_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BrrrrCallAnswer = {
  id: string;
  call_id: string;
  question_key: string;
  answer: string | null;
};

// Joined shapes used by the UI.

export type ListingWithReview = BrrrrListing & {
  review_status: ReviewStatus | null;
};

export type ListingWithFloorplans = BrrrrListing & {
  floorplans: BrrrrFloorplan[];
  review_status: ReviewStatus | null;
};

export type ShortlistRow = BrrrrListing & {
  reviewed_at: string | null;
  has_open_call: boolean;
};

export type PipelineCard = BrrrrCall & {
  listing: BrrrrListing;
};
