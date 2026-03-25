import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const N8N_API_KEY = Deno.env.get('N8N_API_KEY');
const N8N_BASE_URL = 'https://n8n.srv886554.hstgr.cloud';

const ALLOWED_ORIGINS = [
  'https://hub.nfstay.com',
  'https://nfstay.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

serve(async (req) => {
  const headers = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (!N8N_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'N8N_API_KEY not configured' }),
      { status: 503, headers },
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows?limit=100`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'n8n API returned an error', status: res.status }),
        { status: 502, headers },
      );
    }

    const json = await res.json();
    const workflows = (json?.data ?? []).map((w: { name: string; active: boolean }) => ({
      name: w.name,
      active: w.active,
    }));

    const total = workflows.length;
    const active = workflows.filter((w: { active: boolean }) => w.active).length;

    return new Response(
      JSON.stringify({ total, active, workflows }),
      { headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Unable to connect to n8n', details: String(err) }),
      { status: 502, headers },
    );
  }
});
