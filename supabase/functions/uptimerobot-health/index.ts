// uptimerobot-health — proxy to avoid CORS issues
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const UPTIMEROBOT_API_KEY = Deno.env.get('UPTIMEROBOT_API_KEY');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (!UPTIMEROBOT_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'UPTIMEROBOT_API_KEY not configured' }),
      { status: 503, headers: CORS_HEADERS },
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: UPTIMEROBOT_API_KEY, format: 'json' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'UptimeRobot API error', status: res.status }),
        { status: 502, headers: CORS_HEADERS },
      );
    }

    const json = await res.json();
    const monitors = (json?.monitors ?? []).map((m: { friendly_name: string; status: number; url: string }) => ({
      name: m.friendly_name,
      status: m.status, // 2=up, 8=seems down, 9=down
      url: m.url,
    }));

    const up = monitors.filter((m: { status: number }) => m.status === 2).length;
    const total = monitors.length;

    return new Response(
      JSON.stringify({ up, total, monitors }),
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Unable to connect to UptimeRobot', details: String(err) }),
      { status: 502, headers: CORS_HEADERS },
    );
  }
});
