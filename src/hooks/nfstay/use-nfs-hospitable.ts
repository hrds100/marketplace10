// nfstay Hospitable hooks
// Manages Hospitable connection state, OAuth flow, and sync triggers

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import type { NfsHospitableConnection } from '@/lib/nfstay/types';

// ============================================================================
// useNfsHospitableConnection — Fetch operator's Hospitable connection
// ============================================================================

interface UseNfsHospitableConnectionReturn {
  connection: NfsHospitableConnection | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNfsHospitableConnection(): UseNfsHospitableConnectionReturn {
  const { operator } = useNfsOperator();
  const [connection, setConnection] = useState<NfsHospitableConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!operator?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await (supabase.from('nfs_hospitable_connections') as any)
        .select('*')
        .eq('operator_id', operator.id)
        .maybeSingle();

      if (dbError) {
        setError(dbError.message);
        return;
      }

      setConnection(data as NfsHospitableConnection | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Hospitable connection');
    } finally {
      setLoading(false);
    }
  }, [operator?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { connection, loading, error, refetch: fetch };
}

// ============================================================================
// useNfsHospitableConnect — Connect/disconnect/resync Hospitable
// ============================================================================

interface UseNfsHospitableConnectReturn {
  connecting: boolean;
  disconnecting: boolean;
  syncing: boolean;
  error: string | null;
  initiateConnect: () => Promise<void>;
  disconnect: () => Promise<boolean>;
  triggerResync: () => Promise<boolean>;
}

export function useNfsHospitableConnect(): UseNfsHospitableConnectReturn {
  const { operator } = useNfsOperator();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateConnect = async () => {
    if (!operator?.id || !operator?.profile_id) {
      setError('No operator found');
      return;
    }

    try {
      setConnecting(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nfs-hospitable-oauth?action=authorize&operator_id=${operator.id}&profile_id=${operator.profile_id}`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        setError(err.error || 'Failed to initiate Hospitable connection');
        return;
      }

      const result = await response.json();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Hospitable');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async (): Promise<boolean> => {
    if (!operator?.id) {
      setError('No operator found');
      return false;
    }

    try {
      setDisconnecting(true);
      setError(null);

      const { error: fnError } = await supabase.functions.invoke('nfs-hospitable-oauth', {
        body: { action: 'disconnect', operator_id: operator.id },
      });

      if (fnError) {
        setError(fnError.message);
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Hospitable');
      return false;
    } finally {
      setDisconnecting(false);
    }
  };

  const triggerResync = async (): Promise<boolean> => {
    if (!operator?.id) {
      setError('No operator found');
      return false;
    }

    try {
      setSyncing(true);
      setError(null);

      const { error: fnError } = await supabase.functions.invoke('nfs-hospitable-oauth', {
        body: { action: 'resync', operator_id: operator.id },
      });

      if (fnError) {
        setError(fnError.message);
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger sync');
      return false;
    } finally {
      setSyncing(false);
    }
  };

  return { connecting, disconnecting, syncing, error, initiateConnect, disconnect, triggerResync };
}
