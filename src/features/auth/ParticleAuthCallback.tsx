// Legacy safety fallback.
//
// The old social-login flow used a redirect to /auth/particle. That flow has
// been replaced by the in-page useConnect() hook in SignIn.tsx / SignUp.tsx.
// If any stale bookmark or cached redirect lands here, we just clear state and
// send the user back to /signin.

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ParticleAuthCallback() {
  useEffect(() => {
    try {
      localStorage.removeItem('particle_intent');
    } catch { /* ignore */ }
    const t = setTimeout(() => { window.location.href = '/signin'; }, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div data-feature="AUTH" className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#00D084]" />
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
