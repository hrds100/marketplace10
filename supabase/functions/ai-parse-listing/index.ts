import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_SYSTEM_PROMPT = `You are a property listing parser for nfstay, a UK rent-to-rent marketplace.

Given raw text (usually from a WhatsApp group), extract structured data and return ONLY valid JSON with these fields:

{
  "name": "short title like '2-Bed Flat, Worthing'",
  "city": "city name extracted from text or postcode",
  "postcode": "full UK postcode if found, else null",
  "bedrooms": number or null,
  "bathrooms": number or null,
  "rent_monthly": number in pounds or null,
  "property_category": "flat" | "house" | "hmo" | null,
  "furnished": true | false | null,
  "garage": true | false | null,
  "description": "clean 2-3 sentence professional description",
  "features": ["array", "of", "features"],
  "type": "Flat" | "House" | "HMO" | "Studio" | "Room" | null,
  "sa_approved": "yes" | "no" | "awaiting" | null,
  "notes": "any extra info worth keeping"
}

Rules:
- Strip all contact details (DM, phone numbers, email, WhatsApp)
- Strip deposit amounts and procurement/agent fees
- Strip "available now" or availability dates
- Strip all emojis
- Do not invent information - if missing, use null
- Keep the description factual, professional, and short
- Extract the city from the postcode area if not stated explicitly
- Return ONLY the JSON object, no markdown, no explanation`;

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
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

    return new Response(JSON.stringify({ listing: parsed }), {
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
