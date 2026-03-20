import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { NfsLogo } from "@/components/nfstay/NfsLogo";
import { Button } from "@/components/ui/button";

export default function NfsVerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <NfsLogo className="justify-center text-2xl mb-4" />
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Check your inbox</h1>
        <p className="text-sm text-muted-foreground">We sent a verification link to your email address. Click the link to verify and get started.</p>
        <Button variant="outline" className="rounded-xl">Resend email</Button>
        <p className="text-sm text-muted-foreground">
          Wrong email? <Link to="/signup" className="text-primary font-medium hover:underline">Sign up again</Link>
        </p>
      </div>
    </div>
  );
}
