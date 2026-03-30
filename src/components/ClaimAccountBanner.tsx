import { useState } from 'react';
import { User, Mail, ChevronUp, Sparkles } from 'lucide-react';
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
  const [expanded, setExpanded] = useState(false);

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
    <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-[env(safe-area-inset-bottom)] sm:pb-0">
      <div className="max-w-md mx-auto mb-4">
        {/* Expanded form */}
        <div className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? 'max-h-80 opacity-100 mb-2' : 'max-h-0 opacity-0'}`}>
          <div className="bg-white rounded-xl border shadow-lg p-4" style={{ borderColor: '#E5E7EB' }}>
            <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
              Set your name and email to take full ownership of your listings and log in anytime.
            </p>
            <form onSubmit={handleClaim} className="space-y-2.5">
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                    <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
                      className="w-full h-9 pl-8 pr-3 rounded-lg border text-sm focus:outline-none focus:ring-2" style={{ borderColor: '#E5E7EB', focusRingColor: '#1E9A80' } as any} required />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                    <input type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full h-9 pl-8 pr-3 rounded-lg border text-sm focus:outline-none focus:ring-2" style={{ borderColor: '#E5E7EB' }} required />
                  </div>
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

        {/* Collapsed button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:brightness-[0.96] active:scale-[0.98] claim-glow"
          style={{ backgroundColor: '#1E9A80', boxShadow: 'rgba(30,154,128,0.4) 0 4px 20px' }}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Close
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Claim your account
            </>
          )}
        </button>
      </div>

      {/* Glow animation */}
      {!expanded && (
        <style>{`
          @keyframes claim-pulse {
            0%, 100% { box-shadow: rgba(30,154,128,0.4) 0 4px 20px; }
            50% { box-shadow: rgba(30,154,128,0.6) 0 6px 28px; }
          }
          .claim-glow { animation: claim-pulse 2s ease-in-out infinite; }
        `}</style>
      )}
    </div>
  );
}
