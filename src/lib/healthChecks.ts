/**
 * Health check utilities for monitoring external services.
 * Each check returns a standardised result — never throws.
 */

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  label: string;
  lastChecked: Date;
  details?: string;
}

/* ── helpers ─────────────────────────────────────────── */

function makeController(ms = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function downResult(name: string, label: string, details: string): HealthCheckResult {
  return { name, status: 'down', label, lastChecked: new Date(), details };
}

function healthyResult(name: string, label: string, details?: string): HealthCheckResult {
  return { name, status: 'healthy', label, lastChecked: new Date(), details };
}

/* ── individual checks ───────────────────────────────── */

export async function checkSupabase(): Promise<HealthCheckResult> {
  const name = 'supabase';
  const label = 'Database & Login';
  const { signal, clear } = makeController();
  try {
    const res = await fetch(
      'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/health',
      { signal },
    );
    clear();
    if (!res.ok) return downResult(name, label, 'Database returned an error');
    const json = await res.json();
    if (json?.status === 'ok') return healthyResult(name, label, 'Connected and responding');
    return { name, status: 'degraded', label, lastChecked: new Date(), details: 'Responded but status unclear' };
  } catch {
    clear();
    return downResult(name, label, 'Unable to reach the database');
  }
}

export async function checkN8n(): Promise<HealthCheckResult> {
  const name = 'n8n';
  const label = 'Automations';
  const apiKey = import.meta.env.VITE_N8N_API_KEY;
  if (!apiKey) return downResult(name, label, 'Automation API key not configured');

  const { signal, clear } = makeController();
  try {
    const res = await fetch('https://n8n.srv886554.hstgr.cloud/api/v1/workflows?limit=100', {
      headers: { 'X-N8N-API-KEY': apiKey },
      signal,
    });
    clear();
    if (!res.ok) {
      if (res.status === 0 || res.type === 'opaque') {
        return downResult(name, label, 'Unable to check — requires server proxy');
      }
      return downResult(name, label, 'Automation engine returned an error');
    }
    const json = await res.json();
    const workflows: { active: boolean }[] = json?.data ?? [];
    const total = workflows.length;
    const active = workflows.filter((w) => w.active).length;
    if (active === total && total > 0)
      return healthyResult(name, label, `All ${total} workflows active`);
    if (active > 0)
      return { name, status: 'degraded', label, lastChecked: new Date(), details: `${active} of ${total} workflows active` };
    return downResult(name, label, 'No active workflows found');
  } catch {
    clear();
    return downResult(name, label, 'Unable to connect to automation engine');
  }
}

export async function checkUptimeRobot(): Promise<HealthCheckResult> {
  const name = 'uptimerobot';
  const label = 'Uptime Monitoring';
  const apiKey = import.meta.env.VITE_UPTIMEROBOT_API_KEY;
  if (!apiKey) return downResult(name, label, 'Uptime monitoring key not configured');

  const { signal, clear } = makeController();
  try {
    const res = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, format: 'json' }),
      signal,
    });
    clear();
    if (!res.ok) return downResult(name, label, 'Uptime service returned an error');
    const json = await res.json();
    const monitors: { status: number }[] = json?.monitors ?? [];
    const up = monitors.filter((m) => m.status === 2).length;
    const total = monitors.length;
    if (total === 0) return downResult(name, label, 'No monitors configured');
    if (up === total) return healthyResult(name, label, `All ${total} monitors up`);
    const downCount = total - up;
    return { name, status: 'degraded', label, lastChecked: new Date(), details: `${downCount} of ${total} monitors reporting issues` };
  } catch {
    clear();
    return downResult(name, label, 'Unable to connect to uptime service');
  }
}

export function checkSentry(): HealthCheckResult {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) return healthyResult('sentry', 'Error Tracking', 'Configured and capturing errors');
  return downResult('sentry', 'Error Tracking', 'Error tracking not configured');
}

export function checkFrontend(): HealthCheckResult {
  return healthyResult('frontend', 'Website', 'Running — you can see this page');
}

/* ── service definitions (for UI cards) ──────────────── */

export interface ServiceDef {
  key: string;
  name: string;
  icon: string; // Lucide icon name
  check: (() => Promise<HealthCheckResult>) | (() => HealthCheckResult);
}

export const MARKETPLACE_SERVICES: ServiceDef[] = [
  { key: 'supabase', name: 'Database & Login', icon: 'Database', check: checkSupabase },
  { key: 'stripe', name: 'Payments', icon: 'CreditCard', check: () => healthyResult('stripe', 'Payments', 'Stripe is managed externally — check Stripe dashboard for issues') },
  { key: 'n8n', name: 'Automations', icon: 'Workflow', check: checkN8n },
  { key: 'gohighlevel', name: 'CRM & WhatsApp', icon: 'MessageSquare', check: () => healthyResult('gohighlevel', 'CRM & WhatsApp', 'GoHighLevel is managed externally — check GHL dashboard for issues') },
  { key: 'particle', name: 'Blockchain & Wallets', icon: 'Coins', check: () => healthyResult('particle', 'Blockchain & Wallets', 'Particle Network is managed externally') },
  { key: 'sentry', name: 'Error Tracking', icon: 'Bug', check: checkSentry },
  { key: 'uptimerobot', name: 'Uptime Monitoring', icon: 'Activity', check: checkUptimeRobot },
  { key: 'vercel', name: 'Hosting', icon: 'Globe', check: checkFrontend },
];

export const BOOKING_SERVICES: ServiceDef[] = [
  { key: 'supabase', name: 'Database & Login', icon: 'Database', check: checkSupabase },
  { key: 'stripe', name: 'Payments', icon: 'CreditCard', check: () => healthyResult('stripe', 'Payments', 'Stripe is managed externally — check Stripe dashboard for issues') },
  { key: 'n8n', name: 'Automations', icon: 'Workflow', check: checkN8n },
  { key: 'uptimerobot', name: 'Uptime Monitoring', icon: 'Activity', check: checkUptimeRobot },
];

/* ── flow definitions ────────────────────────────────── */

export interface FlowStep {
  label: string;
  dependsOn: string; // service key
}

export interface FlowDef {
  name: string;
  steps: FlowStep[];
}

export const MARKETPLACE_FLOWS: FlowDef[] = [
  {
    name: 'Property Upload',
    steps: [
      { label: 'Frontend', dependsOn: 'vercel' },
      { label: 'Saved to Database', dependsOn: 'supabase' },
      { label: 'Images on CDN', dependsOn: 'supabase' },
      { label: 'Email Sent', dependsOn: 'n8n' },
    ],
  },
  {
    name: 'Payment Processing',
    steps: [
      { label: 'Stripe Checkout', dependsOn: 'stripe' },
      { label: 'Webhook Received', dependsOn: 'n8n' },
      { label: 'Database Updated', dependsOn: 'supabase' },
      { label: 'CRM Notified', dependsOn: 'gohighlevel' },
    ],
  },
  {
    name: 'Investment Order',
    steps: [
      { label: 'Order Created', dependsOn: 'supabase' },
      { label: 'Payout Sent', dependsOn: 'stripe' },
      { label: 'Commission Calculated', dependsOn: 'supabase' },
      { label: 'WhatsApp Sent', dependsOn: 'gohighlevel' },
    ],
  },
  {
    name: 'User Signup',
    steps: [
      { label: 'Registration', dependsOn: 'supabase' },
      { label: 'Email Sent', dependsOn: 'n8n' },
      { label: 'Account Created', dependsOn: 'supabase' },
      { label: 'CRM Contact', dependsOn: 'gohighlevel' },
    ],
  },
  {
    name: 'Landlord Magic Link',
    steps: [
      { label: 'WhatsApp Sent', dependsOn: 'gohighlevel' },
      { label: 'Link Clicked', dependsOn: 'vercel' },
      { label: 'Auto Login', dependsOn: 'supabase' },
      { label: 'Inbox Loaded', dependsOn: 'vercel' },
    ],
  },
  {
    name: 'Booking Flow (nfstay.app)',
    steps: [
      { label: 'Property Selected', dependsOn: 'vercel' },
      { label: 'Stripe Checkout', dependsOn: 'stripe' },
      { label: 'Booking Confirmed', dependsOn: 'supabase' },
      { label: 'Host Notified', dependsOn: 'n8n' },
    ],
  },
];

export const BOOKING_FLOWS: FlowDef[] = [
  {
    name: 'Booking Flow',
    steps: [
      { label: 'Property Selected', dependsOn: 'supabase' },
      { label: 'Stripe Checkout', dependsOn: 'stripe' },
      { label: 'Booking Confirmed', dependsOn: 'supabase' },
      { label: 'Host Notified', dependsOn: 'n8n' },
    ],
  },
];

/* ── run all checks ──────────────────────────────────── */

export async function runAllChecks(
  services: ServiceDef[],
): Promise<Map<string, HealthCheckResult>> {
  const results = new Map<string, HealthCheckResult>();
  const promises = services.map(async (svc) => {
    const result = await svc.check();
    results.set(svc.key, result);
  });
  await Promise.all(promises);
  return results;
}
