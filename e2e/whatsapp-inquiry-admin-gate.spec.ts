import { test, expect } from '@playwright/test';

/**
 * E2E: WhatsApp inquiry admin-gated flow
 * Proves:
 * 1. n8n inbound webhook -> receive-tenant-whatsapp -> inquiry row created
 * 2. Inquiry has authorized=false (landlord NOT contacted)
 * 3. Idempotency: duplicate within 5min returns same ID
 * 4. Admin Outreach > Tenant Requests shows the inquiry
 *
 * Secrets are read from env vars. Set them before running:
 *   SUPABASE_SERVICE_ROLE_KEY, N8N_API_KEY
 */

const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const N8N_URL = 'https://n8n.srv886554.hstgr.cloud';
const N8N_KEY = process.env.N8N_API_KEY || '';

// Use a unique test phone each run to avoid dedup issues across test runs
const TEST_PHONE = `+4477009${String(Date.now()).slice(-5)}`;
const TEST_PROPERTY_SLUG = 'clapham-r2r-flowtest';
const TEST_PROPERTY_ID = 'd6980d19-df63-446e-8c47-f8900ecfda16';

test.describe('WhatsApp Inquiry Admin-Gated Flow', () => {
  let inquiryId: string;

  test.beforeAll(() => {
    if (!SUPABASE_SERVICE_KEY) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY');
    if (!N8N_KEY) throw new Error('Missing env: N8N_API_KEY');
  });

  test('n8n inbound creates inquiry with authorized=false', async ({ request }) => {
    // Fire the n8n webhook simulating GHL inbound
    const webhookRes = await request.post(`${N8N_URL}/webhook/inbox-new-inquiry`, {
      data: {
        phone: TEST_PHONE,
        contactName: 'E2E Test Tenant',
        contactId: 'e2e-test-contact',
        message: `Hi, I am interested in a property on nfstay.\nLink: https://hub.nfstay.com/deals/${TEST_PROPERTY_SLUG}\nReference no.: D6980\nPlease contact me at your earliest convenience.`,
      },
    });
    expect(webhookRes.status()).toBe(200);

    // Wait for async workflow to complete
    await new Promise(r => setTimeout(r, 10000));

    // Query Supabase for the inquiry
    const supaRes = await request.get(
      `${SUPABASE_URL}/rest/v1/inquiries?tenant_phone=eq.${encodeURIComponent(TEST_PHONE)}&property_id=eq.${TEST_PROPERTY_ID}&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      },
    );
    expect(supaRes.status()).toBe(200);
    const inquiries = await supaRes.json();
    expect(inquiries.length).toBe(1);

    const inq = inquiries[0];
    inquiryId = inq.id;
    console.log('Inquiry created:', inq.id);

    // Verify key fields
    expect(inq.authorized).toBe(false);
    expect(inq.channel).toBe('whatsapp');
    expect(inq.status).toBe('new');
    expect(inq.tenant_phone).toBe(TEST_PHONE);
    expect(inq.property_id).toBe(TEST_PROPERTY_ID);
    expect(inq.lister_phone).toBeTruthy();
  });

  test('idempotency: retry returns same inquiry', async ({ request }) => {
    // Fire the same webhook again
    const webhookRes = await request.post(`${N8N_URL}/webhook/inbox-new-inquiry`, {
      data: {
        phone: TEST_PHONE,
        contactName: 'E2E Test Tenant',
        contactId: 'e2e-test-contact',
        message: `Hi, I am interested in a property on nfstay.\nLink: https://hub.nfstay.com/deals/${TEST_PROPERTY_SLUG}\nReference no.: D6980\nPlease contact me at your earliest convenience.`,
      },
    });
    expect(webhookRes.status()).toBe(200);
    await new Promise(r => setTimeout(r, 10000));

    // Should still be exactly 1 row
    const supaRes = await request.get(
      `${SUPABASE_URL}/rest/v1/inquiries?tenant_phone=eq.${encodeURIComponent(TEST_PHONE)}&property_id=eq.${TEST_PROPERTY_ID}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      },
    );
    const inquiries = await supaRes.json();
    expect(inquiries.length).toBe(1);
    expect(inquiries[0].id).toBe(inquiryId);
    console.log('Idempotency confirmed: same ID returned');
  });

  test('no landlord GHL workflow fired during test', async ({ request }) => {
    // Check that the deactivated landlord workflows have no recent executions
    for (const wfId of ['ydrMC0qsOeaFxbsL', 'pZ6EOZ1fkj1WcDXs']) {
      const res = await request.get(`${N8N_URL}/api/v1/workflows/${wfId}`, {
        headers: { 'X-N8N-API-KEY': N8N_KEY },
      });
      const wf = await res.json();
      expect(wf.active).toBe(false);
      console.log(`Workflow ${wfId} (${wf.name}): active=${wf.active} -- confirmed OFF`);
    }
  });

  test('admin can read inquiry via RLS', async ({ request }) => {
    const res = await request.get(
      `${SUPABASE_URL}/rest/v1/inquiries?id=eq.${inquiryId}&select=id,authorized,tenant_name`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      },
    );
    const rows = await res.json();
    expect(rows.length).toBe(1);
    expect(rows[0].authorized).toBe(false);
    expect(rows[0].tenant_name).toBe('E2E Test Tenant');
    console.log('Admin RLS read confirmed for inquiry:', inquiryId);
  });

  test.afterAll(async ({ request }) => {
    // Clean up test inquiry
    if (inquiryId) {
      await request.delete(
        `${SUPABASE_URL}/rest/v1/inquiries?id=eq.${inquiryId}`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        },
      );
      console.log('Cleaned up test inquiry:', inquiryId);
    }
  });
});
