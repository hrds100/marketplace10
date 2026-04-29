// Caller — useChannels.
// Joins wk_numbers + wk_channel_credentials so admins can see SMS /
// WhatsApp / email plumbing in one place. `connectUnipile` opens
// Unipile's hosted-auth flow for the chosen provider; the credential
// row appears in `credentials` once Unipile webhooks back.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ChannelKind = 'sms' | 'whatsapp' | 'email';
export type ChannelProvider = 'twilio' | 'wazzup' | 'resend' | 'unipile';
export type UnipileProvider =
  | 'WHATSAPP'
  | 'GMAIL'
  | 'OUTLOOK'
  | 'MAIL'
  | 'LINKEDIN'
  | 'TELEGRAM';

export interface ChannelRow {
  id: string;
  e164: string;
  channel: ChannelKind;
  provider: ChannelProvider;
  externalId: string | null;
  isActive: boolean;
  voiceEnabled: boolean;
  smsEnabled: boolean;
  label: string | null;
  createdAt: string;
}

export interface CredentialRow {
  id: string;
  provider: ChannelProvider;
  label: string;
  meta: Record<string, unknown>;
  lastSeenAt: string | null;
  isConnected: boolean;
}

interface ChannelDbRow {
  id: string;
  e164: string;
  channel: ChannelKind;
  provider: ChannelProvider;
  external_id: string | null;
  is_active: boolean;
  voice_enabled: boolean;
  sms_enabled: boolean;
  label: string | null;
  created_at: string;
}

interface CredentialDbRow {
  id: string;
  provider: ChannelProvider;
  label: string;
  meta: Record<string, unknown>;
  last_seen_at: string | null;
  is_connected: boolean;
}

interface InvokeFn {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { url?: string; error?: string } | null;
    error: { message: string } | null;
  }>;
}

export function useChannels() {
  const [rows, setRows] = useState<ChannelRow[]>([]);
  const [credentials, setCredentials] = useState<CredentialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [nRes, cRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('wk_numbers' as any) as any)
        .select(
          'id, e164, channel, provider, external_id, is_active, voice_enabled, sms_enabled, label, created_at'
        )
        .order('channel', { ascending: true })
        .order('e164', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('wk_channel_credentials' as any) as any)
        .select('id, provider, label, meta, last_seen_at, is_connected'),
    ]);
    if (nRes.error) setError(nRes.error.message);
    setRows(
      ((nRes.data ?? []) as ChannelDbRow[]).map((r) => ({
        id: r.id,
        e164: r.e164,
        channel: r.channel,
        provider: r.provider,
        externalId: r.external_id,
        isActive: r.is_active,
        voiceEnabled: r.voice_enabled,
        smsEnabled: r.sms_enabled,
        label: r.label,
        createdAt: r.created_at,
      }))
    );
    setCredentials(
      ((cRes.data ?? []) as CredentialDbRow[]).map((c) => ({
        id: c.id,
        provider: c.provider,
        label: c.label,
        meta: c.meta,
        lastSeenAt: c.last_seen_at,
        isConnected: c.is_connected,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    const ch = supabase
      .channel(`caller-channels`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_numbers' },
        () => void reload()
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_channel_credentials' },
        () => void reload()
      )
      .subscribe();
    return () => {
      try { void supabase.removeChannel(ch); } catch { /* ignore */ }
    };
  }, [reload]);

  const toggleActive = useCallback(async (id: string, next: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e } = await (supabase.from('wk_numbers' as any) as any)
      .update({ is_active: next })
      .eq('id', id);
    if (e) setError(e.message);
    else void reload();
  }, [reload]);

  const setLabel = useCallback(async (id: string, label: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e } = await (supabase.from('wk_numbers' as any) as any)
      .update({ label })
      .eq('id', id);
    if (e) setError(e.message);
  }, []);

  const connectUnipile = useCallback(
    async (
      provider: UnipileProvider,
      label?: string
    ): Promise<{ url?: string; error?: string }> => {
      try {
        const { data, error: e } = await (
          supabase.functions as unknown as InvokeFn
        ).invoke('unipile-create-link', {
          body: { provider, label: label ?? `Caller ${provider}` },
        });
        if (e) return { error: e.message };
        if (data?.url) {
          window.open(data.url, '_blank', 'noopener,noreferrer');
          return { url: data.url };
        }
        return { error: data?.error ?? 'No URL returned' };
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'crashed' };
      }
    },
    []
  );

  return {
    rows,
    credentials,
    loading,
    error,
    reload,
    toggleActive,
    setLabel,
    connectUnipile,
  };
}
