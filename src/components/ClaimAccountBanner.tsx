import { useState } from 'react';
import { X, User, Mail, Phone, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  phone: string;
  onClaimed: () => void;
}

export default function ClaimAccountBanner({ phone, onClaimed }: Props) {
  const { user, session } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (dismissed || !user) return null;

  if (done) {
    return (
      <div className="bg-green-50 border-b border-green-100 px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-green-700 font-medium">
          Account claimed! You can now log in anytime at hub.nfstay.com
        </p>
        <button onClick={() => setDismissed(true)} className="text-green-400 hover:text-green-600 ml-4">
          <X className="w-4 h-4" />
        </button>
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
        body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim(), password: password || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.');
        return;
      }

      // Refresh profile in Supabase client
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
    <div className="bg-amber-50 border-b border-amber-100">
      {!expanded ? (
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Claim this account</span>
              {' '}— add your email and name to take full ownership of your property listings.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setExpanded(true)}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-md transition-colors"
            >
              Claim now
            </button>
            <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-amber-900">Claim your account</h3>
            <button onClick={() => setExpanded(false)} className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleClaim} className="space-y-3">
            {/* Phone — read-only, from WhatsApp */}
            <div>
              <label className="text-xs font-medium text-amber-700 flex items-center gap-1.5 mb-1">
                <Phone className="w-3 h-3" /> Phone (verified via WhatsApp)
              </label>
              <input
                type="text"
                value={phone}
                disabled
                className="w-full h-9 px-3 rounded-md border border-amber-200 bg-amber-50 text-sm text-amber-600 cursor-not-allowed"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-amber-700 flex items-center gap-1.5 mb-1">
                  <User className="w-3 h-3" /> Your name
                </label>
                <input
                  type="text"
                  placeholder="John Smith"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-amber-700 flex items-center gap-1.5 mb-1">
                  <Mail className="w-3 h-3" /> Email address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-amber-700 flex items-center gap-1.5 mb-1">
                <Lock className="w-3 h-3" /> Password <span className="font-normal text-amber-500">(optional — to log in later)</span>
              </label>
              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email.trim() || !name.trim()}
              className="w-full h-9 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? 'Claiming…' : 'Claim account'}
            </button>
            <p className="text-xs text-amber-600 text-center">
              Your WhatsApp is already verified. Add a password to log in anytime at hub.nfstay.com.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
