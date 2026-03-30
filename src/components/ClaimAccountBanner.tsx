import { useState, useEffect, useRef } from 'react';
import { User, Mail, Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  phone: string;
  onClaimed: () => void;
}

export default function ClaimAccountBanner({ phone, onClaimed }: Props) {
  const { user, session } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const lastScrollY = useRef(0);

  // Smart scroll: hide when scrolling down, show when scrolling up
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      if (y > lastScrollY.current + 30) setMinimised(true);
      else if (y < lastScrollY.current - 10) setMinimised(false);
      lastScrollY.current = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!user) return null;

  if (done) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-[env(safe-area-inset-bottom)] sm:pb-0">
        <div className="max-w-md mx-auto mb-4 rounded-xl bg-white border px-4 py-3 shadow-lg" style={{ borderColor: '#1E9A80' }}>
          <p className="text-sm font-medium text-center" style={{ color: '#1E9A80' }}>
            Account claimed! You can now log in anytime at hub.nfstay.com
          </p>
        </div>
      </div>
    );
  }

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/claim-landlord-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      await supabase.auth.refreshSession();
      setDone(true);
      onClaimed();
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 px-3 pb-[env(safe-area-inset-bottom)] sm:pb-0 transition-transform duration-300 ease-out"
      style={{ transform: minimised ? 'translateY(calc(100% - 44px))' : 'translateY(0)' }}
    >
      <div className="max-w-md mx-auto mb-3">
        {/* Peek tab when minimised - always visible */}
        <div
          className="flex items-center justify-center gap-2 py-2.5 rounded-t-xl cursor-pointer"
          style={{ backgroundColor: '#1E9A80' }}
          onClick={() => setMinimised(!minimised)}
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="text-xs font-semibold text-white">Claim your account</span>
        </div>

        {/* Form body */}
        <div className="bg-white rounded-b-xl border-x border-b shadow-lg px-4 pt-3 pb-4" style={{ borderColor: '#E5E7EB' }}>
          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
            Set your name and email to own your listings and log in anytime.
          </p>
          <form onSubmit={handleClaim} className="space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#1E9A80]" style={{ borderColor: '#E5E7EB' }} required />
              </div>
              <div className="relative flex-1">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                <input type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#1E9A80]" style={{ borderColor: '#E5E7EB' }} required />
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading || !email.trim() || !name.trim()}
              className="w-full h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:brightness-[0.96]"
              style={{ backgroundColor: '#1E9A80' }}>
              {loading ? 'Claiming...' : 'Claim account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
