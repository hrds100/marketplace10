import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // GET ?geo=1 — return visitor's approximate city from request headers
    const url = new URL(req.url);
    if (req.method === 'GET' && url.searchParams.get('geo') === '1') {
      // Vercel/Cloudflare provide geo headers; Supabase edge functions get x-forwarded-for
      const city = req.headers.get('x-vercel-ip-city') ||
                   req.headers.get('cf-ipcity') ||
                   'London';
      const region = req.headers.get('x-vercel-ip-country-region') || '';

      return new Response(
        JSON.stringify({ city: decodeURIComponent(city), region }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST — track an A/B event
    if (req.method === 'POST') {
      const body = await req.json();

      const { visitor_id, variant, event_type, page_url, metadata, timestamp } = body;

      if (!visitor_id || !variant || !event_type) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: visitor_id, variant, event_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase.from('ab_events').insert({
        visitor_id,
        variant,
        event_type,
        page_url: page_url || '/',
        metadata: metadata || {},
        created_at: timestamp || new Date().toISOString(),
      });

      if (error) {
        console.error('ab-track insert error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to track event' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('ab-track error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
