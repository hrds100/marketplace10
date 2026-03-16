import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAILS = ['admin@hub.nfstay.com', 'hugo@nfstay.com'];

serve(async (req) => {
  try {
    // Verify caller is admin via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Decode JWT to check email (Supabase sends the user's JWT)
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const email = payload.email || '';

    if (!ADMIN_EMAILS.includes(email)) {
      return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Delete in FK order
    const steps = [
      supabase.from('agreement_acceptances').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('landlord_invites').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('chat_threads').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ];

    for (const step of steps) {
      const { error } = await step;
      if (error) {
        return new Response(JSON.stringify({ error: `Delete failed: ${error.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Reset all tiers to free
    const { error: tierError } = await supabase.from('profiles').update({ tier: 'free' }).neq('id', '00000000-0000-0000-0000-000000000000');
    if (tierError) {
      return new Response(JSON.stringify({ error: `Tier reset failed: ${tierError.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true, message: 'Reset complete. All inbox and tier data cleared.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
