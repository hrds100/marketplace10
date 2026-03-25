// n8n-health — v2 with execution monitoring
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

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
}

interface N8nExecution {
  id: string;
  finished: boolean;
  startedAt: string;
  stoppedAt: string | null;
  workflowId: string;
  workflowName: string;
  status: string;
  mode: string;
}

interface ExecutionSummary {
  startedAt: string;
  finishedAt: string | null;
  status: 'success' | 'error' | 'running';
  workflowName: string;
  duration: number | null;
}

function normalizeStatus(status: string): 'success' | 'error' | 'running' {
  if (status === 'success') return 'success';
  if (status === 'running' || status === 'waiting') return 'running';
  return 'error'; // error, crashed, etc.
}

function calcDuration(startedAt: string, stoppedAt: string | null): number | null {
  if (!stoppedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(stoppedAt).getTime();
  if (isNaN(start) || isNaN(end)) return null;
  return Math.round(((end - start) / 1000) * 10) / 10; // 1 decimal place
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

    const n8nHeaders = { 'X-N8N-API-KEY': N8N_API_KEY };

    // Fetch workflows and executions in parallel
    const [workflowsRes, executionsRes] = await Promise.all([
      fetch(`${N8N_BASE_URL}/api/v1/workflows?limit=100`, {
        headers: n8nHeaders,
        signal: controller.signal,
      }),
      fetch(`${N8N_BASE_URL}/api/v1/executions?limit=50&includeData=false`, {
        headers: n8nHeaders,
        signal: controller.signal,
      }).catch(() => null), // Don't break if executions fails
    ]);
    clearTimeout(timeout);

    if (!workflowsRes.ok) {
      return new Response(
        JSON.stringify({ error: 'n8n API returned an error', status: workflowsRes.status }),
        { status: 502, headers },
      );
    }

    const workflowsJson = await workflowsRes.json();
    const workflows = (workflowsJson?.data ?? []).map((w: N8nWorkflow) => ({
      id: w.id,
      name: w.name,
      active: w.active,
    }));

    const total = workflows.length;
    const active = workflows.filter((w: { active: boolean }) => w.active).length;

    // Process executions if available
    let executions: Record<string, ExecutionSummary[]> = {};

    if (executionsRes && executionsRes.ok) {
      try {
        const executionsJson = await executionsRes.json();
        const rawExecutions: N8nExecution[] = executionsJson?.data ?? [];

        // Group by workflowId
        const grouped: Record<string, N8nExecution[]> = {};
        for (const exec of rawExecutions) {
          const wfId = String(exec.workflowId);
          if (!grouped[wfId]) grouped[wfId] = [];
          grouped[wfId].push(exec);
        }

        // Keep last 5 per workflow (already sorted newest-first from n8n)
        for (const [wfId, execs] of Object.entries(grouped)) {
          executions[wfId] = execs.slice(0, 5).map((e) => ({
            startedAt: e.startedAt,
            finishedAt: e.stoppedAt ?? null,
            status: normalizeStatus(e.status),
            workflowName: e.workflowName,
            duration: calcDuration(e.startedAt, e.stoppedAt),
          }));
        }
      } catch {
        // Silently ignore parse errors — return workflows without executions
      }
    }

    return new Response(
      JSON.stringify({ total, active, workflows, executions }),
      { headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Unable to connect to n8n', details: String(err) }),
      { status: 502, headers },
    );
  }
});
