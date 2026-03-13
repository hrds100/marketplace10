import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date();

    // Properties older than 14 days → inactive
    const cutoff14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: expired, error: expErr } = await adminClient
      .from("properties")
      .update({ status: "inactive" })
      .eq("status", "live")
      .lt("created_at", cutoff14)
      .select("id, name");

    // Properties 7-14 days → on-offer
    const cutoff7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: onOffer, error: offerErr } = await adminClient
      .from("properties")
      .update({ status: "on-offer" })
      .eq("status", "live")
      .lt("created_at", cutoff7)
      .gte("created_at", cutoff14)
      .select("id, name");

    return new Response(JSON.stringify({
      success: true,
      timestamp: now.toISOString(),
      expired: expired?.length || 0,
      movedToOffer: onOffer?.length || 0,
      details: { expired, onOffer },
      errors: { expErr: expErr?.message, offerErr: offerErr?.message },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("deal-expiry error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
