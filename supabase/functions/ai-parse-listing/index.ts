import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_SYSTEM_PROMPT = `You are a property listing parser for nfstay, a UK property marketplace.

Given raw text (usually from a WhatsApp group), extract structured data and return ONLY valid JSON.

If the text contains multiple numbered listings (e.g. "1. ... 2. ..."), return a JSON ARRAY of objects.
If only one listing, return a single JSON object.

Each object must have these fields:

{
  "name": "short title like '2-Bed Flat, Skelton' or 'BRR Opportunity, Skelton'",
  "city": "city or town name - use emoji location pins as hints, recognise ALL UK towns no matter how small",
  "postcode": "full UK postcode if found, else null",
  "bedrooms": number or null,
  "bathrooms": number or null,
  "rent_monthly": number in pounds or null (for rental deals),
  "profit_est": number in pounds or null (monthly profit if mentioned),
  "property_category": "flat" | "house" | "hmo" | null,
  "furnished": true | false | null,
  "garage": true | false | null,
  "description": "professional 60-80 word listing description for the marketplace",
  "features": ["array", "of", "key features"],
  "type": "Flat" | "House" | "HMO" | "Studio" | "Room" | "Bungalow" | null,
  "sa_approved": "yes" | "no" | "awaiting" | null,
  "notes": "any extra info worth keeping",
  "contact_phone": "phone number in +44 format or as written, null if not found",
  "contact_name": "person name if found, null otherwise",
  "deposit": number in pounds or null,
  "sourcing_fee": number in pounds or null,
  "deal_type": "R2R" | "R2SA" | "BRR" | "flip" | "block" | null,
  "listing_type": "rental" | "sale",
  "nightly_rate_projected": number or null (for serviced accommodation),
  "purchase_price": number in pounds or null (for BRR/sale deals),
  "end_value": number in pounds or null (after-refurb/GDV value for BRR deals),
  "refurb_cost": number in pounds or null (refurbishment cost for BRR deals)
}

Rules:
- "K" or "k" suffix means multiply by 1000 (e.g. "50K" = 50000, "1.2K" = 1200, "110k" = 110000)
- Emoji hints: pin/location emoji = city, fire emoji = highlight, bed emoji = bedrooms
- Recognise ALL UK towns and villages no matter how small (Skelton, Redcar, Saltburn, Brotton, etc.)
- If a postcode is present, use it to determine the city/town
- For BRR deals: extract purchase price, end value (GDV/after refurb value), and refurb cost
- Set deal_type to "BRR" if text mentions purchase price, refurb, flip, or buy-refurb-rent
- Set deal_type to "R2SA" if text mentions serviced accommodation, nightly rate, or Airbnb
- Set listing_type to "sale" for BRR/flip deals, "rental" for everything else
- Extract contact phone numbers into contact_phone field (do NOT include in description)
- Do not invent information - if missing, use null
- Keep the description factual, professional, and compelling
- Return ONLY the JSON, no markdown, no explanation`;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { rawText, systemPrompt } = await req.json();

    if (!rawText || typeof rawText !== "string" || rawText.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Raw text is required (minimum 10 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const prompt = systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: rawText },
          ],
          temperature: 0.2,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON", raw: text }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize to array
    const listings = Array.isArray(parsed) ? parsed : [parsed];

    return new Response(JSON.stringify({ listings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-parse-listing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
