import { test, expect } from '@playwright/test';

/**
 * Verifies the DB default on inquiries.channel prevents NOT NULL crashes
 * when a caller (e.g. n8n webhook) omits the channel field.
 *
 * Uses the Supabase Management API to run a raw SQL insert,
 * simulating an external caller that omits channel.
 */

const SUPABASE_PAT = 'sbp_48874e988ff97d28a75fd06e2d0f618bb83192e0';
const PROJECT_REF = 'asazddtvjvmckouxcmmo';
const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

test('Inquiry insert without channel field defaults to whatsapp (no crash)', async ({ request }) => {
  // 1. Insert a row WITHOUT channel - should default to 'whatsapp'
  const insertRes = await request.post(API_URL, {
    headers: {
      Authorization: `Bearer ${SUPABASE_PAT}`,
      'Content-Type': 'application/json',
    },
    data: {
      query: `
        INSERT INTO public.inquiries (tenant_id, property_id, lister_type, message, status, token)
        VALUES (
          'f3ba9d80-7650-4304-bfc3-0406fbe5d4a3',
          '5fce18a6-2a30-4ad3-a012-fb11a1503db3',
          'landlord',
          'Playwright test - channel default',
          'new',
          'test-channel-default-' || gen_random_uuid()
        )
        RETURNING id, channel
      `,
    },
  });

  expect(insertRes.ok()).toBeTruthy();
  const rows = await insertRes.json();
  expect(rows.length).toBe(1);
  expect(rows[0].channel).toBe('whatsapp');

  // 2. Clean up
  const testId = rows[0].id;
  await request.post(API_URL, {
    headers: {
      Authorization: `Bearer ${SUPABASE_PAT}`,
      'Content-Type': 'application/json',
    },
    data: { query: `DELETE FROM public.inquiries WHERE id = '${testId}'` },
  });
});
