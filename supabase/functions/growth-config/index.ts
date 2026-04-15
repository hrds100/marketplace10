// growth-config — singleton config for landing A/B router + social proof
//
// GET  — public, returns the row as JSON. Cached 30s.
// POST — requires user JWT. Admin email allowlist. Updates the row.
// OPTIONS — CORS preflight.
//
// verify_jwt is false in config.toml because GET must be callable with no
// auth header. POST does its own admin check via supabase.auth.getUser(jwt).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAILS = new Set([
  'admin@hub.nfstay.com',
  'hugo@nfstay.com',
]);

const ALLOWED_ORIGINS = new Set([
  'https://nfstay.com',
  'https://www.nfstay.com',
  'https://hub.nfstay.com',
  'http://localhost:8080',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:8080',
]);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://nfstay.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

function jsonResponse(body: unknown, status: number, extraHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...extraHeaders, 'Content-Type': 'application/json' },
  });
}

interface GrowthConfigRow {
  id: number;
  ab_enabled: boolean;
  ab_weights: number[];
  social_proof_enabled: boolean;
  social_proof_interval_seconds: number;
  updated_at: string;
  updated_by: string | null;
}

const ALLOWED_INTERVALS = new Set([15, 30, 60, 120, 180]);

interface UpdatePayload {
  ab_enabled?: boolean;
  ab_weights?: number[];
  social_proof_enabled?: boolean;
  social_proof_interval_seconds?: number;
}

function validatePayload(body: unknown): { ok: true; data: UpdatePayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;
  const out: UpdatePayload = {};

  if ('ab_enabled' in b) {
    if (typeof b.ab_enabled !== 'boolean') return { ok: false, error: 'ab_enabled must be boolean' };
    out.ab_enabled = b.ab_enabled;
  }
  if ('ab_weights' in b) {
    const w = b.ab_weights;
    if (!Array.isArray(w) || w.length !== 2 || typeof w[0] !== 'number' || typeof w[1] !== 'number') {
      return { ok: false, error: 'ab_weights must be [number, number]' };
    }
    const sum = w[0] + w[1];
    if (Math.round(sum) !== 100) return { ok: false, error: 'ab_weights must sum to 100' };
    if (w[0] < 0 || w[1] < 0) return { ok: false, error: 'ab_weights must be non-negative' };
    out.ab_weights = [w[0], w[1]];
  }
  if ('social_proof_enabled' in b) {
    if (typeof b.social_proof_enabled !== 'boolean') return { ok: false, error: 'social_proof_enabled must be boolean' };
    out.social_proof_enabled = b.social_proof_enabled;
  }
  if ('social_proof_interval_seconds' in b) {
    const n = b.social_proof_interval_seconds;
    if (typeof n !== 'number' || !ALLOWED_INTERVALS.has(n)) {
      return { ok: false, error: 'social_proof_interval_seconds must be one of 15, 30, 60, 120, 180' };
    }
    out.social_proof_interval_seconds = n;
  }

  if (Object.keys(out).length === 0) {
    return { ok: false, error: 'No valid fields provided' };
  }
  return { ok: true, data: out };
}

serve(async (req: Request) => {
  const cors = corsHeadersFor(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonResponse({ error: 'Server misconfigured' }, 500, cors);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    if (req.method === 'GET') {
      try {
        const { data, error } = await supabase
          .from('growth_config')
          .select('id, ab_enabled, ab_weights, social_proof_enabled, social_proof_interval_seconds, updated_at, updated_by')
          .eq('id', 1)
          .maybeSingle();

        if (error) {
          console.error('growth-config GET error:', error);
          return jsonResponse({ error: 'Failed to load config' }, 500, cors);
        }
        if (!data) {
          return jsonResponse({ error: 'Config row missing' }, 404, cors);
        }
        return jsonResponse(data as GrowthConfigRow, 200, {
          ...cors,
          'Cache-Control': 'public, max-age=30',
        });
      } catch (err) {
        console.error('growth-config GET exception:', err);
        return jsonResponse({ error: 'Internal error' }, 500, cors);
      }
    }

    if (req.method === 'POST') {
      // Require auth header
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : '';
      if (!token) {
        return jsonResponse({ error: 'Missing Authorization header' }, 401, cors);
      }

      // Verify user
      let userEmail = '';
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData?.user) {
          return jsonResponse({ error: 'Invalid session' }, 401, cors);
        }
        userEmail = (userData.user.email || '').toLowerCase();
      } catch (err) {
        console.error('growth-config getUser exception:', err);
        return jsonResponse({ error: 'Auth check failed' }, 401, cors);
      }

      if (!ADMIN_EMAILS.has(userEmail)) {
        return jsonResponse({ error: 'Forbidden' }, 403, cors);
      }

      // Parse + validate body
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400, cors);
      }
      const validated = validatePayload(body);
      if (!validated.ok) {
        return jsonResponse({ error: validated.error }, 400, cors);
      }

      // Update
      try {
        const update = {
          ...validated.data,
          updated_at: new Date().toISOString(),
          updated_by: userEmail,
        };
        const { data, error } = await supabase
          .from('growth_config')
          .update(update)
          .eq('id', 1)
          .select('id, ab_enabled, ab_weights, social_proof_enabled, social_proof_interval_seconds, updated_at, updated_by')
          .maybeSingle();

        if (error) {
          console.error('growth-config UPDATE error:', error);
          return jsonResponse({ error: 'Failed to update config' }, 500, cors);
        }
        if (!data) {
          return jsonResponse({ error: 'Config row missing' }, 404, cors);
        }
        return jsonResponse(data as GrowthConfigRow, 200, cors);
      } catch (err) {
        console.error('growth-config UPDATE exception:', err);
        return jsonResponse({ error: 'Internal error' }, 500, cors);
      }
    }

    return jsonResponse({ error: 'Method not allowed' }, 405, cors);
  } catch (err) {
    console.error('growth-config fatal:', err);
    return jsonResponse({ error: 'Internal error' }, 500, cors);
  }
});
