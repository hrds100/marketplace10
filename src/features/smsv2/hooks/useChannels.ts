// useChannels — list paired channels (SMS / WhatsApp / Email) from
// wk_numbers grouped by provider, plus an admin sync action that
// pulls Wazzup24 paired channels into the table via the
// wazzup-sync-channels edge function.
//
// PR 64 (multi-channel PR 5), Hugo 2026-04-27.

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ChannelKind = 'sms' | 'whatsapp' | 'email';
export type ChannelProvider = 'twilio' | 'wazzup' | 'resend';

export interface ChannelRow {
  id: string;
  e164: string;
  channel: ChannelKind;
  provider: ChannelProvider;
  external_id: string | null;
  is_active: boolean;
  voice_enabled: boolean;
  sms_enabled: boolean;
  created_at: string;
}

export interface CredentialRow {
  id: string;
  provider: ChannelProvider;
  label: string;
  meta: Record<string, unknown>;
  last_seen_at: string | null;
  is_connected: boolean;
}

export function useChannels(): {
  rows: ChannelRow[];
  credentials: CredentialRow[];
  loading: boolean;
  error: string | null;
  syncing: boolean;
  reload: () => Promise<void>;
  toggleActive: (id: string, next: boolean) => Promise<void>;
  syncWazzup: () => Promise<{ synced: number; skipped: number; error?: string }>;
} {
  const [rows, setRows] = useState<ChannelRow[]>([]);
  const [credentials, setCredentials] = useState<CredentialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: nRows, error: nErr }, { data: cRows }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_numbers' as any) as any)
          .select(
            'id, e164, channel, provider, external_id, is_active, voice_enabled, sms_enabled, created_at'
          )
          .order('channel', { ascending: true })
          .order('e164', { ascending: true }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_channel_credentials' as any) as any)
          .select('id, provider, label, meta, last_seen_at, is_connected'),
      ]);
      if (nErr) setError(nErr.message);
      else setRows((nRows ?? []) as ChannelRow[]);
      setCredentials((cRows ?? []) as CredentialRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggleActive = useCallback(
    async (id: string, next: boolean) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: e } = await (supabase.from('wk_numbers' as any) as any)
        .update({ is_active: next })
        .eq('id', id);
      if (e) throw new Error(e.message);
      // Optimistic patch + re-pull to be safe (the realtime subscription
      // is not on this table).
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, is_active: next } : r)));
    },
    []
  );

  const syncWazzup = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error: e } = await supabase.functions.invoke(
        'wazzup-sync-channels',
        { body: {} }
      );
      if (e) {
        return { synced: 0, skipped: 0, error: e.message };
      }
      const json = data as { synced_count?: number; skipped_count?: number; error?: string };
      if (json?.error) {
        return { synced: 0, skipped: 0, error: json.error };
      }
      // Re-pull rows now that wk_numbers has new whatsapp entries.
      await reload();
      return {
        synced: json?.synced_count ?? 0,
        skipped: json?.skipped_count ?? 0,
      };
    } catch (e) {
      return {
        synced: 0,
        skipped: 0,
        error: e instanceof Error ? e.message : 'sync failed',
      };
    } finally {
      setSyncing(false);
    }
  }, [reload]);

  return { rows, credentials, loading, error, syncing, reload, toggleActive, syncWazzup };
}
