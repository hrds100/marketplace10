import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function NfsAuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase Auth handles the token exchange from the email redirect URL.
    // This page catches the redirect, processes the hash, and sends the user to the app.
    const timer = setTimeout(() => {
      navigate("/nfstay", { replace: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Verifying your email… please wait.</p>
      </div>
    </div>
  );
}
