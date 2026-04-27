// wk-diag — read-only diagnostic endpoint.
// Returns recent wk_sms_messages + wk_contacts + wk_numbers state.
// Auth: shared secret in header X-Diag-Key.
//
// Used by /tmp/proof scripts during the PR 52 war-room verification.
// Should be REMOVED in a follow-up cleanup PR.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DIAG_KEY = Deno.env.get('DIAG_SECRET') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-diag-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const sentKey = req.headers.get('x-diag-key') ?? '';
  if (!DIAG_KEY || sentKey !== DIAG_KEY) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const [msgsRes, contactsRes, numbersRes, profilesRes, pubRes] = await Promise.all([
    supa.from('wk_sms_messages')
      .select('id, contact_id, direction, body, from_e164, to_e164, created_at, twilio_sid')
      .order('created_at', { ascending: false })
      .limit(20),
    supa.from('wk_contacts')
      .select('id, name, phone, owner_agent_id, last_contact_at, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supa.from('wk_numbers')
      .select('id, e164, voice_enabled, sms_enabled, created_at')
      .order('created_at', { ascending: true }),
    supa.from('profiles')
      .select('id, email, workspace_role, name')
      .or('email.eq.hugo@nfstay.com,email.eq.admin@hub.nfstay.com,workspace_role.in.(admin,agent,viewer)')
      .limit(20),
    // Realtime publication membership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supa as any).rpc?.('exec_sql', {
      sql: "SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' ORDER BY tablename"
    }) ?? Promise.resolve({ data: null, error: null }),
  ]);

  return new Response(JSON.stringify({
    messages: msgsRes.data ?? msgsRes.error,
    contacts: contactsRes.data ?? contactsRes.error,
    numbers: numbersRes.data ?? numbersRes.error,
    profiles: profilesRes.data ?? profilesRes.error,
    publication_tables: pubRes?.data ?? pubRes?.error ?? null,
  }, null, 2), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
