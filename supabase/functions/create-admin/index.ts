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

    // Create admin user
    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email: "admin@nfstay.co.uk",
      password: "adminpass123",
      email_confirm: true,
      user_metadata: { name: "nfstay Admin" },
    });

    if (userError) {
      // User might already exist
      if (userError.message.includes("already been registered")) {
        // Get user by email
        const { data: { users } } = await adminClient.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email === "admin@nfstay.co.uk");
        if (existingUser) {
          // Ensure admin role exists
          const { error: roleError } = await adminClient.from("user_roles").upsert(
            { user_id: existingUser.id, role: "admin" },
            { onConflict: "user_id,role" }
          );
          return new Response(JSON.stringify({ 
            success: true, 
            message: "Admin user already exists, role ensured",
            userId: existingUser.id,
            roleError: roleError?.message 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      throw userError;
    }

    const userId = userData.user!.id;

    // Assign admin role
    await adminClient.from("user_roles").upsert(
      { user_id: userId, role: "admin" },
      { onConflict: "user_id,role" }
    );

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-admin error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
