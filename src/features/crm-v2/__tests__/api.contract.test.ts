// crm-v2 api contract tests — pin the SHAPE the dialer expects from
// each edge function. If the server contract changes (e.g. wk-leads-
// next stops returning campaign_id), CI fails here, not at runtime.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const invokeMock = vi.fn();
  return {
    supabase: { functions: { invoke: invokeMock } },
    __invokeMock: invokeMock,
  };
});

import { api } from '../data/api';
import * as supabaseMod from '@/integrations/supabase/client';
const invokeMock = (
  supabaseMod as unknown as { __invokeMock: ReturnType<typeof vi.fn> }
).__invokeMock;

beforeEach(() => {
  invokeMock.mockReset();
});

describe('api.voiceToken', () => {
  it('returns ok=true with the documented shape', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        token: 'jwt.token',
        identity: 'agent-uuid',
        ttl_seconds: 3600,
        extension: '101',
      },
      error: null,
    });
    const res = await api.voiceToken();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.token).toBe('jwt.token');
      expect(res.data.identity).toBe('agent-uuid');
      expect(res.data.ttl_seconds).toBe(3600);
      expect(res.data.extension).toBe('101');
    }
  });

  it('returns ok=false with normalised error when invoke errors', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'unauthorized' },
    });
    const res = await api.voiceToken();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('unauthorized');
  });
});

describe('api.callsCreate', () => {
  it('passes request body through + returns allowed=true response', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        allowed: true,
        call_id: 'call-uuid',
        from_e164: '+447380308316',
        to_e164: '+447800000001',
      },
      error: null,
    });
    const res = await api.callsCreate({
      to_phone: '+447800000001',
      contact_id: 'c1',
      campaign_id: 'camp-1',
    });
    expect(invokeMock).toHaveBeenCalledWith('wk-calls-create', {
      body: {
        to_phone: '+447800000001',
        contact_id: 'c1',
        campaign_id: 'camp-1',
      },
    });
    expect(res.ok).toBe(true);
    if (res.ok && res.data.allowed) {
      expect(res.data.call_id).toBe('call-uuid');
    }
  });

  it('handles allowed=false (spend gate)', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        allowed: false,
        reason: 'spend_limit',
        daily_spend_pence: 1000,
        daily_limit_pence: 1000,
      },
      error: null,
    });
    const res = await api.callsCreate({ to_phone: '+447800000001' });
    expect(res.ok).toBe(true);
    if (res.ok && !res.data.allowed) {
      expect(res.data.reason).toBe('spend_limit');
      expect(res.data.daily_spend_pence).toBe(1000);
    }
  });

  it('extracts the real server error message from a 4xx context body', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response(
          JSON.stringify({ error: 'invalid phone number' }),
          { status: 400 }
        ),
      },
    });
    const res = await api.callsCreate({ to_phone: '!!!' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('400 invalid phone number');
  });
});

describe('api.leadsNext', () => {
  it('returns empty:true shape', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { empty: true },
      error: null,
    });
    const res = await api.leadsNext({ campaign_id: 'c' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.empty).toBe(true);
  });

  it('returns contact + queue shape on a hit', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        contact_id: 'c-2',
        queue_id: 'q-2',
        campaign_id: 'camp-1',
      },
      error: null,
    });
    const res = await api.leadsNext({ campaign_id: 'camp-1' });
    expect(res.ok).toBe(true);
    if (res.ok && !res.data.empty) {
      expect(res.data.contact_id).toBe('c-2');
      expect(res.data.queue_id).toBe('q-2');
      expect(res.data.campaign_id).toBe('camp-1');
    }
  });
});

describe('api.outcomeApply', () => {
  it('passes call_id + contact_id + column_id', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { applied: ['move_pipeline'], column_id: 'col-1' },
      error: null,
    });
    const res = await api.outcomeApply({
      call_id: 'call-1',
      contact_id: 'c-1',
      column_id: 'col-1',
      agent_note: 'hot',
    });
    expect(invokeMock).toHaveBeenCalledWith('wk-outcome-apply', {
      body: {
        call_id: 'call-1',
        contact_id: 'c-1',
        column_id: 'col-1',
        agent_note: 'hot',
      },
    });
    expect(res.ok).toBe(true);
  });
});

describe('api.hangupLeg', () => {
  it('returns ok=true on success shape', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { ok: true, status: 'canceled' },
      error: null,
    });
    const res = await api.hangupLeg({ call_id: 'call-1' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.status).toBe('canceled');
  });

  it('returns ok=true on already_terminal shape', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { ok: true, status: 'completed', already_terminal: true },
      error: null,
    });
    const res = await api.hangupLeg({ call_id: 'call-1' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.already_terminal).toBe(true);
  });

  it('catches thrown errors and returns ok=false', async () => {
    invokeMock.mockRejectedValueOnce(new Error('network'));
    const res = await api.hangupLeg({ call_id: 'call-1' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('network');
  });
});
