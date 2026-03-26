import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthBridgePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const redirectTo = searchParams.get("redirect") || "/dashboard/deals";

    if (!accessToken || !refreshToken) {
      setStatus("Invalid link. Redirecting...");
      setTimeout(() => navigate("/signin", { replace: true }), 2000);
      return;
    }

    (async () => {
      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        navigate(redirectTo, { replace: true });
      } catch {
        setStatus("Authentication failed. Redirecting...");
        setTimeout(() => navigate("/signin", { replace: true }), 2000);
      }
    })();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f3f3ee" }}>
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E9A80] mx-auto" />
        <p className="text-sm text-[#6B7280]">{status}</p>
      </div>
    </div>
  );
}
