// crm-v2 API contract layer — typed wrappers around the 5 edge fns.
//
// This is the ONLY file in the feature that calls
// `supabase.functions.invoke(...)`. Every consumer (hooks, provider,
// tests) goes through these wrappers, so a server-side contract
// change shows up in one place.
//
// Errors are normalised: every fn returns either a typed success
// payload or a `{ error: string }`. Edge function transport errors,
// Supabase auth errors, JSON parse errors all collapse into a single
// string the UI can toast.

import { supabase } from '@/integrations/supabase/client';
import type {
  VoiceTokenResponse,
  CallsCreateRequest,
  CallsCreateResponse,
  LeadsNextRequest,
  LeadsNextResponse,
  OutcomeApplyRequest,
  OutcomeApplyResponse,
  HangupLegRequest,
  HangupLegResponse,
} from './types';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

interface InvokeResult<T> {
  data: T | null;
  error: { message: string; context?: Response } | null;
}

async function unwrap<T>(p: Promise<InvokeResult<T>>): Promise<ApiResult<T>> {
  try {
    const { data, error } = await p;
    if (error) {
      // Try to extract a real server message from the response body
      // (Supabase wraps non-2xx into `error.context: Response`).
      let real = error.message;
      const ctx = error.context;
      if (ctx) {
        try {
          const body = await ctx.clone().text();
          let parsed: { error?: string; reason?: string } | null = null;
          try {
            parsed = body ? JSON.parse(body) : null;
          } catch {
            /* not JSON */
          }
          real = `${ctx.status} ${parsed?.error || parsed?.reason || body || error.message}`.trim();
        } catch {
          /* fall through */
        }
      }
      return { ok: false, error: real };
    }
    if (data === null) {
      return { ok: false, error: 'empty response' };
    }
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'unknown error',
    };
  }
}

const fn = (name: string, body?: Record<string, unknown>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase.functions as any).invoke(name, body !== undefined ? { body } : {});

export const api = {
  voiceToken(): Promise<ApiResult<VoiceTokenResponse>> {
    return unwrap<VoiceTokenResponse>(fn('wk-voice-token'));
  },

  callsCreate(input: CallsCreateRequest): Promise<ApiResult<CallsCreateResponse>> {
    return unwrap<CallsCreateResponse>(fn('wk-calls-create', input as unknown as Record<string, unknown>));
  },

  leadsNext(input: LeadsNextRequest): Promise<ApiResult<LeadsNextResponse>> {
    return unwrap<LeadsNextResponse>(fn('wk-leads-next', input as unknown as Record<string, unknown>));
  },

  outcomeApply(input: OutcomeApplyRequest): Promise<ApiResult<OutcomeApplyResponse>> {
    return unwrap<OutcomeApplyResponse>(fn('wk-outcome-apply', input as unknown as Record<string, unknown>));
  },

  hangupLeg(input: HangupLegRequest): Promise<ApiResult<HangupLegResponse>> {
    return unwrap<HangupLegResponse>(fn('wk-dialer-hangup-leg', input as unknown as Record<string, unknown>));
  },
};

export type Api = typeof api;
