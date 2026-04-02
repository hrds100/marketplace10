import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

/**
 * Handles the return from Hospitable Connect (and future Stripe Connect).
 * Hospitable redirects here with status-based query params:
 *   ?provider=hospitable&status=success&success=connected
 *   ?provider=hospitable&error=auth_failed
 */
export default function NfsOAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const provider = searchParams.get("provider");
  const status = searchParams.get("status");
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  useEffect(() => {
    if (!provider) {
      setErrorMessage("Missing provider in callback URL.");
      setState("error");
      return;
    }

    // Handle error returns from Hospitable
    if (error) {
      const messages: Record<string, string> = {
        auth_failed: "Authorization was denied or failed at Hospitable.",
        state_expired: "The connection request expired. Please try again.",
        no_pending_connection: "No pending connection found. Please start the connect flow again.",
        missing_params: "Missing required parameters from Hospitable.",
      };
      setErrorMessage(messages[error] || `Connection error: ${error}`);
      setState("error");
      return;
    }

    // Handle success
    if (status === "success" || success === "connected") {
      setState("success");
      const timer = setTimeout(() => {
        navigate("/nfstay/settings", { replace: true });
      }, 2500);
      return () => clearTimeout(timer);
    }

    // If we got here with a provider but no clear status, redirect to settings
    const timer = setTimeout(() => {
      navigate("/nfstay/settings", { replace: true });
    }, 2000);
    return () => clearTimeout(timer);
  }, [provider, status, success, error, navigate]);

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <XCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-destructive font-semibold">{errorMessage}</p>
          <button onClick={() => navigate("/nfstay/settings")} className="text-sm text-primary hover:underline">
            Return to settings
          </button>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div data-feature="BOOKING_NFSTAY" className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
          <p className="text-sm font-medium text-green-700">
            Hospitable connected successfully!
          </p>
          <p className="text-xs text-muted-foreground">Redirecting to settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-feature="BOOKING_NFSTAY" className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">
          Connecting {provider}... please wait.
        </p>
      </div>
    </div>
  );
}
