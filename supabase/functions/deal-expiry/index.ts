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
      .select("id, name, city, contact_email, submitted_by");

    // Properties 7-14 days → on-offer
    const cutoff7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: onOffer, error: offerErr } = await adminClient
      .from("properties")
      .update({ status: "on-offer" })
      .eq("status", "live")
      .lt("created_at", cutoff7)
      .gte("created_at", cutoff14)
      .select("id, name, city, contact_email, submitted_by");

    // Send expiry emails and in-app notifications (non-blocking)
    const sendNotifications = async (properties: typeof expired, newStatus: string, days: string) => {
      if (!properties?.length) return;
      for (const p of properties) {
        // Email
        if (p.contact_email) {
          try {
            const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
            if (RESEND_API_KEY) {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${RESEND_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "NFsTay <notifications@hub.nfstay.com>",
                  to: p.contact_email,
                  subject: `Your deal has expired — ${p.city}`,
                  html: `<h2>Deal expired</h2><p>Your property "${p.name}" in ${p.city} has been moved to <strong>${newStatus}</strong> after ${days} days.</p><p><a href="https://hub.nfstay.com/dashboard/deals">View on NFsTay →</a></p>`,
                }),
              });
            }
          } catch { /* silent */ }
        }
        // In-app notification
        if (p.submitted_by) {
          try {
            await adminClient.from("notifications").insert({
              user_id: p.submitted_by,
              type: "deal_expired",
              title: "Deal expired",
              body: `Your deal "${p.name}" in ${p.city} has been moved to ${newStatus}.`,
              property_id: p.id,
            });
          } catch { /* silent */ }
        }
      }
    };

    await sendNotifications(expired, "inactive", "14");
    await sendNotifications(onOffer, "on offer", "7");

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
