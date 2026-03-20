import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function NfsOAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const provider = searchParams.get("provider");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  useEffect(() => {
    if (!provider || !code) {
      setError("Missing provider or authorization code.");
      return;
    }

    // In production, this would call the relevant edge function:
    // - nfs-stripe-connect-oauth for provider=stripe
    // - nfs-hospitable-oauth for provider=hospitable
    const timer = setTimeout(() => {
      navigate("/nfstay/settings", { replace: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, [provider, code, state, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-destructive font-semibold">{error}</p>
          <button onClick={() => navigate("/nfstay/settings")} className="text-sm text-primary hover:underline">
            Return to settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">
          Connecting {provider}… please wait.
        </p>
      </div>
    </div>
  );
}
