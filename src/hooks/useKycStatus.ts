import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type KycStatus = 'not_started' | 'pending' | 'approved' | 'declined' | 'loading' | 'error';

export function useKycStatus(userId: string | undefined) {
  const [status, setStatus] = useState<KycStatus>('loading');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!userId) {
      setStatus('not_started');
      return;
    }
    try {
      setStatus('loading');
      const { data, error } = await supabase.functions.invoke('inv-kyc-check', {
        body: { user_id: userId },
      });
      if (error) throw error;
      setStatus(data.status || 'not_started');
      setSessionId(data.session_id || null);
    } catch {
      setStatus('error');
    }
  }, [userId]);

  const saveSession = useCallback(async (walletAddress: string, veriffSessionId: string) => {
    if (!userId) return;
    try {
      await supabase.functions.invoke('inv-kyc-save-session', {
        body: { user_id: userId, wallet_address: walletAddress, session_id: veriffSessionId },
      });
      setSessionId(veriffSessionId);
      setStatus('pending');
    } catch {
      // Will be checked again on next status check
    }
  }, [userId]);

  return { status, sessionId, checkStatus, saveSession };
}
