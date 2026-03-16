#!/usr/bin/env node
/**
 * Import all 12 marketplace10 n8n workflows via the n8n API.
 * Requires: N8N_BASE_URL, N8N_API_KEY
 * Usage: node scripts/import-n8n-workflows.mjs
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.N8N_BASE_URL || 'https://n8n.srv886554.hstgr.cloud';
const apiKey = process.env.N8N_API_KEY;

if (!apiKey) {
  console.error('Set N8N_API_KEY (n8n Settings → API).');
  process.exit(1);
}

const workflowsDir = join(__dirname, '..', 'n8n-workflows');
const files = readdirSync(workflowsDir)
  .filter((f) => f.endsWith('.json'))
  .sort();

if (files.length === 0) {
  console.error('No JSON files in n8n-workflows/');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'X-N8N-API-KEY': apiKey,
};

const base = baseUrl.replace(/\/$/, '');

async function main() {
  const webhookWorkflows = [
    '01-send-otp.json', '02-estimate-profit.json', '03-ghl-webhook.json',
    '05-ai-generate-listing.json', '06-ai-lesson-content.json', '08-new-inquiry-notifications.json',
    '09-csv-bulk-properties.json', '10-signup-welcome-email.json', '11-affiliate-conversion-alerts.json',
  ];
  const created = [];
  for (const file of files) {
    const path = join(workflowsDir, file);
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    const body = {
      name: raw.name,
      nodes: raw.nodes,
      connections: raw.connections || {},
      settings: raw.settings || {},
    };
    try {
      const res = await fetch(`${base}/api/v1/workflows`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${text}`);
      }
      const data = await res.json();
      created.push({ id: data.id, name: data.name, file, isWebhook: webhookWorkflows.includes(file) });
      console.log(`OK ${file} → ${data.name} (id: ${data.id})`);
    } catch (err) {
      console.error(`FAIL ${file}:`, err.message);
    }
  }
  for (const w of created) {
    if (!w.isWebhook) continue;
    try {
      const res = await fetch(`${base}/api/v1/workflows/${w.id}/activate`, { method: 'POST', headers });
      if (res.ok) console.log(`  Activated: ${w.name}`);
      else console.log(`  Activate skipped ${w.name}: ${res.status}`);
    } catch (e) {
      console.log(`  Activate failed ${w.name}:`, e.message);
    }
  }
  console.log('\nDone. Add Supabase/Twilio/OpenAI/Resend credentials in n8n UI for each workflow.');
  console.log('Webhook base:', base + '/webhook');
}

main();
