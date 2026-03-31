// nfs-provision-nfstay-subdomain — Add operator hostname to Vercel bookingsite project (SSL + routing)
//
// POST /nfs-provision-nfstay-subdomain (Authorization: Bearer <user JWT>)
// Reads nfs_operators.subdomain for the authenticated user; calls Vercel API to attach `{subdomain}.nfstay.app`.
//
// Secrets (Supabase → Edge Functions): VERCEL_TOKEN, VERCEL_TEAM_ID, VERCEL_BOOKINGSITE_PROJECT_ID
// If unset, returns 200 { skipped: true } so the app does not error in dev.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERCEL_TOKEN = Deno.env.get("VERCEL_TOKEN");
const VERCEL_TEAM_ID = Deno.env.get("VERCEL_TEAM_ID");
const VERCEL_BOOKINGSITE_PROJECT_ID = Deno.env.get("VERCEL_BOOKINGSITE_PROJECT_ID");

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function normalizeSubdomain(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { data: operator, error: opError } = await supabase
    .from("nfs_operators")
    .select("subdomain")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (opError || !operator) {
    return json({ error: "Operator not found" }, 404);
  }

  const slug = normalizeSubdomain(operator.subdomain as string | null);
  if (slug.length < 3) {
    return json({ error: "Subdomain not set or too short" }, 400);
  }

  const hostname = `${slug}.nfstay.app`;

  if (!VERCEL_TOKEN || !VERCEL_TEAM_ID || !VERCEL_BOOKINGSITE_PROJECT_ID) {
    return json({ skipped: true, reason: "vercel_env_not_configured", hostname }, 200);
  }

  const url =
    `https://api.vercel.com/v10/projects/${encodeURIComponent(VERCEL_BOOKINGSITE_PROJECT_ID)}/domains?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: hostname }),
  });

  const vercelBody = await res.json().catch(() => ({})) as {
    error?: { code?: string; message?: string };
  };

  if (res.ok) {
    return json({ ok: true, hostname, vercel: vercelBody }, 200);
  }

  if (res.status === 409) {
    return json({ ok: true, hostname, alreadyExists: true }, 200);
  }

  const msg =
    typeof vercelBody.error?.message === "string"
      ? vercelBody.error.message
      : JSON.stringify(vercelBody);
  if (
    res.status === 400 &&
    /already exists|already been added|duplicate/i.test(msg)
  ) {
    return json({ ok: true, hostname, alreadyExists: true }, 200);
  }

  return json(
    {
      ok: false,
      hostname,
      status: res.status,
      vercelError: vercelBody,
    },
    502,
  );
});
