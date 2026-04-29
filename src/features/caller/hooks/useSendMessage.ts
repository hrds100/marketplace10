// Caller — useSendMessage.
// Single entry point for outbound messages across SMS / WhatsApp / email.
// Routes to the right edge function:
//   sms       → wk-sms-send
//   whatsapp  → unipile-send
//   email     → wk-email-send
//
// All three accept `contact_id`, `body`, `campaign_id?` (and email also
// takes `subject`). Returns a typed result; the caller surfaces toasts.

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Channel = 'sms' | 'whatsapp' | 'email';

export interface SendInput {
  contactId: string;
  channel: Channel;
  body: string;
  subject?: string;
  campaignId?: string | null;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

interface InvokeFn {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { error?: string } | null;
    error: { message: string; context?: Response } | null;
  }>;
}

const FN_FOR_CHANNEL: Record<Channel, string> = {
  sms: 'wk-sms-send',
  whatsapp: 'unipile-send',
  email: 'wk-email-send',
};

export function useSendMessage() {
  const send = useCallback(async (input: SendInput): Promise<SendResult> => {
    const trimBody = input.body.trim();
    if (!trimBody) return { ok: false, error: 'Message is empty' };
    if (input.channel === 'email' && !(input.subject ?? '').trim()) {
      return { ok: false, error: 'Subject is required for email' };
    }

    const fn = supabase.functions as unknown as InvokeFn;
    const payload: Record<string, unknown> = {
      contact_id: input.contactId,
      body: trimBody,
      campaign_id: input.campaignId ?? undefined,
    };
    if (input.channel === 'email') payload.subject = input.subject?.trim();

    try {
      const { data, error } = await fn.invoke(FN_FOR_CHANNEL[input.channel], {
        body: payload,
      });
      if (error || data?.error) {
        let msg = error?.message ?? data?.error ?? 'unknown error';
        if (error?.context) {
          try {
            const txt = await error.context.clone().text();
            try {
              const parsed = txt ? (JSON.parse(txt) as { error?: string }) : null;
              if (parsed?.error) msg = parsed.error;
            } catch {
              if (txt) msg = txt;
            }
          } catch {
            /* fall through */
          }
        }
        return { ok: false, error: msg };
      }
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'crashed',
      };
    }
  }, []);

  return { send };
}

export const CHANNEL_LIMIT: Record<Channel, number> = {
  sms: 160,
  whatsapp: 4096,
  email: 10_000,
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'Email',
};
