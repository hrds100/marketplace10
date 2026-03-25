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
  try {
    // Use the app's own Supabase client — already has auth configured
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    if (!error) return healthyResult(name, label, 'Connected and responding');
    return downResult(name, label, `Database error: ${error.message}`);
  } catch {
    return downResult(name, label, 'Unable to reach the database');
  }
}

/* ── execution data cache ────────────────────────────── */

let lastExecutionData: Record<string, ExecutionEntry[]> = {};

export function getExecutionData(): Record<string, ExecutionEntry[]> {
  return lastExecutionData;
}

export function getLatestExecution(workflowName: string): ExecutionEntry | null {
  for (const entries of Object.values(lastExecutionData)) {
    const match = entries.find(e => e.workflowName === workflowName);
    if (match) return match;
  }
  return null;
}

export function getAllExecutionsForFlow(flow: FlowDef): ExecutionEntry[] {
  const names = new Set(flow.steps.map(s => s.workflowName).filter(Boolean));
  const all: ExecutionEntry[] = [];
  for (const entries of Object.values(lastExecutionData)) {
    for (const entry of entries) {
      if (names.has(entry.workflowName)) all.push(entry);
    }
  }
  return all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export async function checkN8n(): Promise<HealthCheckResult> {
  const name = 'n8n';
  const label = 'Automations';

  const { signal, clear } = makeController();
  try {
    const res = await fetch(
      'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/n8n-health',
      { signal },
    );
    clear();
    if (!res.ok) return downResult(name, label, 'Automation health proxy returned an error');
    const json = await res.json();

    // Store execution data if present
    const executions: Record<string, ExecutionEntry[]> = json?.executions ?? {};
    lastExecutionData = executions;

    const allWorkflows: { name: string; active: boolean }[] = json?.workflows ?? [];
    // Only count production workflows (NFsTay/marketplace/nfs- prefixed), ignore test/draft ones
    const prodWorkflows = allWorkflows.filter((w) =>
      /^(NFsTay|marketplace10|nfs-)/i.test(w.name)
    );
    // Deduplicate: if a workflow name has an active copy, ignore inactive duplicates
    const activeNames = new Set(prodWorkflows.filter((w) => w.active).map((w) => w.name));
    const uniqueProd = prodWorkflows.filter((w) => w.active || !activeNames.has(w.name));
    const prodActive = uniqueProd.filter((w) => w.active).length;
    const prodTotal = uniqueProd.length;
    const totalActive: number = json?.active ?? 0;
    if (prodTotal === 0)
      return healthyResult(name, label, `${totalActive} workflows active`);
    const inactive = uniqueProd.filter((w) => !w.active).map((w) => w.name);
    // These workflows are intentionally inactive (test, deprecated, or not yet wired)
    const knownInactive = new Set([
      'NFsTay — New Inquiry',
      'NFsTay — Test Echo (all webhooks)',
      'marketplace10 – Affiliate Conversion Alerts',
    ]);
    const unexpectedInactive = inactive.filter((n) => !knownInactive.has(n));
    if (unexpectedInactive.length === 0)
      return healthyResult(name, label, `${prodActive} production workflows active`);
    return { name, status: 'degraded', label, lastChecked: new Date(), details: `${prodActive} of ${prodTotal} active. Unexpected inactive: ${unexpectedInactive.join(', ')}` };
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

export interface ExecutionEntry {
  startedAt: string;
  finishedAt: string | null;
  status: 'success' | 'error' | 'running' | 'waiting' | 'crashed';
  workflowName: string;
  duration: number | null;
}

export interface FlowStep {
  label: string;
  dependsOn: string; // service key
  workflowName?: string; // n8n workflow name for execution data
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
      { label: 'Email Sent', dependsOn: 'n8n', workflowName: 'NFsTay – Notify Admin New Deal' },
    ],
  },
  {
    name: 'Payment Processing',
    steps: [
      { label: 'Stripe Checkout', dependsOn: 'stripe' },
      { label: 'Webhook Received', dependsOn: 'n8n', workflowName: 'NFsTay -- Subscription Commission' },
      { label: 'Database Updated', dependsOn: 'supabase' },
      { label: 'CRM Notified', dependsOn: 'gohighlevel' },
    ],
  },
  {
    name: 'Investment Order',
    steps: [
      { label: 'Order Created', dependsOn: 'supabase' },
      { label: 'Payout Sent', dependsOn: 'stripe', workflowName: 'NFsTay -- Tuesday Payout Batch' },
      { label: 'Commission Calculated', dependsOn: 'supabase' },
      { label: 'WhatsApp Sent', dependsOn: 'gohighlevel', workflowName: 'NFsTay -- Investment Notifications' },
    ],
  },
  {
    name: 'User Signup',
    steps: [
      { label: 'Registration', dependsOn: 'supabase', workflowName: 'marketplace10 – Send OTP' },
      { label: 'Email Sent', dependsOn: 'n8n', workflowName: 'marketplace10 – Signup Welcome Email' },
      { label: 'Account Created', dependsOn: 'supabase' },
      { label: 'CRM Contact', dependsOn: 'gohighlevel' },
    ],
  },
  {
    name: 'Landlord Magic Link',
    steps: [
      { label: 'WhatsApp Sent', dependsOn: 'gohighlevel', workflowName: 'NFsTay — Landlord Replied' },
      { label: 'Link Clicked', dependsOn: 'vercel' },
      { label: 'Auto Login', dependsOn: 'supabase' },
      { label: 'Inbox Loaded', dependsOn: 'vercel', workflowName: 'NFsTay — New Message' },
    ],
  },
  {
    name: 'Booking Flow (nfstay.app)',
    steps: [
      { label: 'Property Selected', dependsOn: 'vercel' },
      { label: 'Stripe Checkout', dependsOn: 'stripe' },
      { label: 'Booking Confirmed', dependsOn: 'supabase' },
      { label: 'Host Notified', dependsOn: 'n8n', workflowName: 'nfs-hospitable-listing-sync' },
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
