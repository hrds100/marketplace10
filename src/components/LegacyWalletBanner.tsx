// LegacyWalletBanner — shown once to users who have no wallet_address.
// Lets legacy app.nfstay.com users paste their existing wallet address.
// Dismissed permanently via profiles.legacy_wallet_dismissed.

import { useState, useEffect } from 'react';
import { X, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export default function LegacyWalletBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (supabase.from('profiles') as any)
      .select('wallet_address, legacy_wallet_dismissed')
      .eq('id', user.id)
      .single()
      .then(({ data }: { data: Record<string, unknown> | null }) => {
        if (!data) return;
        if (!data.wallet_address && !data.legacy_wallet_dismissed) {
          setVisible(true);
        }
      });
  }, [user?.id]);

  if (!visible || !user) return null;

  async function dismiss() {
    await (supabase.from('profiles') as any)
      .update({ legacy_wallet_dismissed: true })
      .eq('id', user!.id);
    setVisible(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!EVM_ADDRESS_RE.test(address.trim())) {
      setError('Invalid wallet address — must be 0x followed by 40 hex characters.');
      return;
    }
    setSaving(true);
    try {
      const { error: dbError } = await (supabase.from('profiles') as any)
        .update({ wallet_address: address.trim(), legacy_wallet_dismissed: true })
        .eq('id', user!.id);
      if (dbError) {
        setError('Failed to save. Please try again.');
        return;
      }
      setVisible(false);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-100">
      {!expanded ? (
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Did you use app.nfstay.com?</span>
              {' '}Enter your legacy wallet address to keep access to your shares.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setExpanded(true)}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-md transition-colors"
            >
              Migrate wallet
            </button>
            <button onClick={dismiss} className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-amber-900">Migrate your legacy wallet</h3>
            <button onClick={() => setExpanded(false)} className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-amber-700 flex items-center gap-1.5 mb-1">
                <Wallet className="w-3 h-3" /> Your wallet address from app.nfstay.com
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={address}
                onChange={e => { setAddress(e.target.value); setError(''); }}
                className="w-full h-9 px-3 rounded-md border border-amber-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                spellCheck={false}
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !address.trim()}
                className="h-9 px-4 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save wallet'}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="text-xs text-amber-600 hover:text-amber-800 underline"
              >
                I don't have one
              </button>
            </div>
            <p className="text-xs text-amber-600">
              This links your existing on-chain shares and rent history to this account.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
