// The 19-question VA questionnaire from VA-Call-Guide-BRRRR.md.
// See TAJU-BUILD-BRIEF.md Phase 1 for the question_key list.

export type QuestionType = "text" | "textarea" | "select" | "yesno" | "number";

export type Question = {
  key: string;
  label: string;
  type: QuestionType;
  options?: string[];
  placeholder?: string;
};

export const QUESTIONS: Question[] = [
  { key: "still_available",      label: "Still available?",                      type: "yesno" },
  { key: "kitchen_layout",       label: "Kitchen: separate or open plan?",       type: "select", options: ["separate", "open plan", "unknown"] },
  { key: "kitchen_window",       label: "Kitchen has its own window?",           type: "yesno" },
  { key: "kitchen_size",         label: "Kitchen size (approx sqm or description)", type: "text" },
  { key: "floor_plan_status",    label: "Floor plan",                            type: "select", options: ["on listing", "promised", "not available"] },
  { key: "lease_years",          label: "Years left on lease",                   type: "number" },
  { key: "service_charge",       label: "Annual service charge (£)",             type: "number" },
  { key: "ground_rent",          label: "Annual ground rent (£)",                type: "number" },
  { key: "condition",            label: "Property condition",                    type: "text", placeholder: "e.g. tired, modern, needs full refurb" },
  { key: "time_on_market",       label: "How long on market",                    type: "text" },
  { key: "price_reduced",        label: "Has the price been reduced?",           type: "yesno" },
  { key: "seller_motivation",    label: "Why is the vendor selling?",            type: "textarea" },
  { key: "other_interest",       label: "Other interest or offers?",             type: "textarea" },
  { key: "any_issues",           label: "Any issues with property or building?", type: "textarea" },
  { key: "offer_floated",        label: "Did you float an offer?",               type: "yesno" },
  { key: "offer_amount_floated", label: "If yes, what amount?",                  type: "number" },
  { key: "agent_response",       label: "Agent's response to offer",             type: "textarea" },
  { key: "counter_offer",        label: "Counter-offer or indication?",          type: "text" },
  { key: "callback_date",        label: "When will they get back?",              type: "text" },
];
