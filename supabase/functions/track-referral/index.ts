import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const event = url.searchParams.get('event') || 'click';

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find affiliate by code
    const { data: affiliate } = await client
      .from('aff_profiles')
      .select('id, user_id, link_clicks, signups')
      .eq('referral_code', code.toUpperCase())
      .single();

    if (!affiliate) {
      return new Response(JSON.stringify({ error: 'Unknown code' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (event === 'click') {
      // Log click
      await client.from('aff_events').insert({
        affiliate_id: affiliate.id,
        event_type: 'click',
        metadata: {
          user_agent: req.headers.get('user-agent') || '',
          timestamp: new Date().toISOString(),
        },
      });
      // Increment counter
      await client
        .from('aff_profiles')
        .update({ link_clicks: (affiliate.link_clicks || 0) + 1 })
        .eq('id', affiliate.id);

    } else if (event === 'signup') {
      const userId = url.searchParams.get('userId');
      const userName = url.searchParams.get('userName');
      const userEmail = url.searchParams.get('userEmail');

      // Log signup event
      await client.from('aff_events').insert({
        affiliate_id: affiliate.id,
        event_type: 'signup',
        referred_user_id: userId || null,
        commission_type: 'referral',
        metadata: {
          user_name: userName || '',
          user_email: userEmail || '',
          timestamp: new Date().toISOString(),
        },
      });
      // Increment counter
      await client
        .from('aff_profiles')
        .update({ signups: (affiliate.signups || 0) + 1 })
        .eq('id', affiliate.id);

      // Notify the agent via email (non-blocking)
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      if (RESEND_API_KEY) {
        // Get agent's email
        const { data: agentProfile } = await client
          .from('profiles')
          .select('email, name')
          .eq('id', affiliate.user_id)
          .single();

        if (agentProfile?.email) {
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'new-referral-agent',
                data: {
                  agentEmail: agentProfile.email,
                  referredName: userName,
                  referredEmail: userEmail,
                  totalSignups: (affiliate.signups || 0) + 1,
                },
              }),
            });
          } catch { /* silent */ }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
