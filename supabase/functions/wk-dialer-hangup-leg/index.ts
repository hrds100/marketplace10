// wk-dialer-hangup-leg — manually cancel a single ringing/connected leg.
// PR 89, Hugo 2026-04-27.
//
// Body: { call_id: string }  -- wk_calls.id (NOT the Twilio SID)
//
// Flow:
//   1. Verify JWT, look up agent.
//   2. Load wk_calls row, confirm it belongs to this agent.
//   3. POST to Twilio /Calls/{sid}.json with Status=canceled (or
//      completed if already in_progress).
//   4. UPDATE wk_calls.status = 'canceled', ended_at = now().
//
// Hugo's complaint: "the hang-up button on the parallel dialer board
// does nothing." Fixed.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Body {
  call_id?: string;
}

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const auth = req.headers.get('authorization') ?? '';
    const jwt = auth.replace(/^Bearer\s+/i, '');
    if (!jwt) return json(401, { error: 'Missing bearer token' });

    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: userResp, error: userErr } = await supa.auth.getUser(jwt);
    if (userErr || !userResp?.user) return json(401, { error: 'Invalid token' });
    const agentId = userResp.user.id;

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }

    const callId = (body.call_id ?? '').trim();
    if (!callId) return json(400, { error: 'call_id required' });

    // Look up the call row.
    const { data: call, error: callErr } = await supa
      .from('wk_calls')
      .select('id, agent_id, twilio_call_sid, status')
      .eq('id', callId)
      .maybeSingle();
    if (callErr) return json(500, { error: callErr.message });
    if (!call) return json(404, { error: 'Call not found' });

    const row = call as { id: string; agent_id: string | null; twilio_call_sid: string | null; status: string };
    if (row.agent_id && row.agent_id !== agentId) {
      return json(403, { error: 'Not your call' });
    }

    // Already terminal? No-op success.
    const TERMINAL = new Set([
      'completed', 'canceled', 'failed', 'no_answer',
      'busy', 'missed', 'voicemail',
    ]);
    if (TERMINAL.has(row.status)) {
      return json(200, { status: row.status, already_terminal: true });
    }

    // POST to Twilio to cancel/complete the call.
    if (row.twilio_call_sid && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      // For a still-ringing leg, "canceled" is the right Twilio verb.
      // For an already-connected leg, you'd want "completed". Twilio
      // accepts both for an in-flight call; pick canceled-first since
      // that's what cancels a ringing leg without billing it.
      const tw = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${row.twilio_call_sid}.json`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            Status: row.status === 'in_progress' ? 'completed' : 'canceled',
          }).toString(),
        }
      );
      if (!tw.ok) {
        const errText = await tw.text().catch(() => '');
        console.warn('[wk-dialer-hangup-leg] twilio said', tw.status, errText);
        // Continue anyway — best-effort. Update local row so UI updates.
      }
    }

    const { error: updErr } = await supa
      .from('wk_calls')
      .update({
        status: 'canceled',
        ended_at: new Date().toISOString(),
      })
      .eq('id', callId);
    if (updErr) return json(500, { error: updErr.message });

    return json(200, { status: 'canceled' });
  } catch (e) {
    console.error('[wk-dialer-hangup-leg] threw', e);
    return json(500, { error: e instanceof Error ? e.message : 'Internal error' });
  }
});
