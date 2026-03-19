// NFStay White-Label context — provides operator branding to all white-label pages
import { createContext, useContext, useState, useEffect } from 'react';
import type { NfsOperator } from '@/lib/nfstay/types';
import { detectWhiteLabelMode, resolveWhiteLabelOperator, type WhiteLabelMode } from '@/lib/nfstay/white-label';
import { NFS_PLATFORM_DEFAULTS } from '@/lib/nfstay/constants';

interface WhiteLabelContext {
  mode: WhiteLabelMode;
  operator: NfsOperator | null;
  loading: boolean;
  error: string | null;
  isWhiteLabel: boolean;
  isMainSite: boolean;
  /** True when rendering nfstay.app main site with platform defaults (not a real operator) */
  isPlatform: boolean;
}

const defaultContext: WhiteLabelContext = {
  mode: { type: 'dev' },
  operator: null,
  loading: true,
  error: null,
  isWhiteLabel: false,
  isMainSite: false,
  isPlatform: false,
};

export const NfsWhiteLabelContext = createContext<WhiteLabelContext>(defaultContext);

export function useNfsWhiteLabel(): WhiteLabelContext {
  return useContext(NfsWhiteLabelContext);
}

/**
 * Hook that detects white-label mode and resolves the operator.
 * Used by NfsWhiteLabelProvider.
 */
export function useNfsWhiteLabelDetection(): WhiteLabelContext {
  const [mode] = useState<WhiteLabelMode>(() =>
    typeof window !== 'undefined'
      ? detectWhiteLabelMode(window.location.hostname)
      : { type: 'dev' }
  );
  const [operator, setOperator] = useState<NfsOperator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMainSite = mode.type === 'main';
  // Main site also uses white-label layout now (with platform defaults)
  const isWhiteLabel = mode.type === 'subdomain' || mode.type === 'custom' || isMainSite;
  const isPlatform = isMainSite;

  useEffect(() => {
    // Main site → use platform defaults immediately, no DB call
    if (isMainSite) {
      setOperator(NFS_PLATFORM_DEFAULTS as unknown as NfsOperator);
      setLoading(false);
      return;
    }

    if (mode.type !== 'subdomain' && mode.type !== 'custom') {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function resolve() {
      try {
        const op = await resolveWhiteLabelOperator(mode);
        if (cancelled) return;
        if (!op) {
          setError('Operator not found');
        } else {
          setOperator(op);
        }
      } catch {
        if (!cancelled) setError('Failed to load storefront');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [mode, isMainSite]);

  return { mode, operator, loading, error, isWhiteLabel, isMainSite, isPlatform };
}
