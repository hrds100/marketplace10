import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE — RECEIVE-TENANT-WHATSAPP EDGE FUNCTION
// Verifies the inbound tenant WhatsApp inquiry path end-to-end:
//   1. Edge function accepts payload and creates inquiry
//   2. Inquiry row has correct fields (authorized=false, channel=whatsapp)
//   3. Cleanup removes the test row
// ═══════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var required for e2e tests');
if (!ANON_KEY) throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY env var required for e2e tests');

const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/receive-tenant-whatsapp`;

// Known test property
const TEST_PROPERTY_ID = '1dc8772a-f69b-41e4-945c-1bd675afff90';
const TEST_PROPERTY_SLUG = 'edgware-r2r-1dc8772a';

let createdInquiryId: string | null = null;

test.afterEach(async () => {
  // Cleanup: delete the test inquiry row
  if (createdInquiryId) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/inquiries?id=eq.${createdInquiryId}`,
      {
        method: 'DELETE',
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      },
    );
    createdInquiryId = null;
  }
});

test('[TENANT-WA-001] Edge function creates inquiry from tenant WhatsApp message', async ({
  request,
}) => {
  const payload = {
    tenant_phone: '+447700900999',
    tenant_name: 'Playwright Test Tenant',
    message_body: `Hi, I am interested in a property on nfstay.\nLink: https://hub.nfstay.com/deals/${TEST_PROPERTY_SLUG}\nRef: ${TEST_PROPERTY_ID.slice(0, 5).toUpperCase()}\nID: ${TEST_PROPERTY_ID}\nPlease contact me at your earliest convenience.`,
    property_ref: TEST_PROPERTY_ID.slice(0, 5),
    property_id: TEST_PROPERTY_ID,
  };

  const res = await request.post(EDGE_FN_URL, {
    data: payload,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.inquiry_id).toBeTruthy();
  expect(body.auto_authorised).toBe(false);

  createdInquiryId = body.inquiry_id;
});

test('[TENANT-WA-002] Created inquiry has correct fields (authorized=false, channel=whatsapp)', async ({
  request,
}) => {
  // Create the inquiry first
  const createRes = await request.post(EDGE_FN_URL, {
    data: {
      tenant_phone: '+447700900888',
      tenant_name: 'Playwright Verify Tenant',
      message_body: `Hi, I am interested in a property on nfstay.\nID: ${TEST_PROPERTY_ID}`,
      property_id: TEST_PROPERTY_ID,
    },
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  const createBody = await createRes.json();
  createdInquiryId = createBody.inquiry_id;

  // Fetch the row from the DB
  const dbRes = await fetch(
    `${SUPABASE_URL}/rest/v1/inquiries?id=eq.${createdInquiryId}&select=id,property_id,tenant_name,tenant_phone,channel,status,authorized,always_authorised,lister_phone,lister_type`,
    {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  );

  const rows = await dbRes.json();
  expect(rows).toHaveLength(1);

  const row = rows[0];
  expect(row.property_id).toBe(TEST_PROPERTY_ID);
  expect(row.tenant_name).toBe('Playwright Verify Tenant');
  expect(row.tenant_phone).toBe('+447700900888');
  expect(row.channel).toBe('whatsapp');
  expect(row.status).toBe('new');
  expect(row.authorized).toBe(false);
  expect(row.always_authorised).toBe(false);
  expect(row.lister_phone).toBeTruthy();
});

test('[TENANT-WA-003] Edge function rejects missing tenant_phone', async ({
  request,
}) => {
  const res = await request.post(EDGE_FN_URL, {
    data: { message_body: 'Hello' },
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error).toContain('Missing tenant_phone');
});

test('[TENANT-WA-004] Edge function returns 404 for unknown property', async ({
  request,
}) => {
  const res = await request.post(EDGE_FN_URL, {
    data: {
      tenant_phone: '+447700900777',
      message_body: 'I want a random property that does not exist',
    },
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  expect(res.status()).toBe(404);
  const body = await res.json();
  expect(body.error).toContain('Could not identify property');
});
