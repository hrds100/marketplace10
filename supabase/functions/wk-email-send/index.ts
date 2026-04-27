// wk-email-send — outbound CRM email via Resend.
// PR 62 (multi-channel PR 3), Hugo 2026-04-27.
//
// Different from the existing send-email function: that one is a
// templated marketplace notification dispatcher (30+ types, hard-coded
// HTML, gated by user prefs). This one is a free-text agent-typed
// email tied to a wk_contacts row, mirroring wk-sms-send / wazzup-send
// shape so the PR 63 channel-picker just routes by channel.
//
// Body:
//   { contact_id: string, subject: string, body: string,
//     channel_id?: string, html?: string }
//
//   - subject is required (email-only field, not used for sms/whatsapp)
//   - body is plain text; html optional (when both, html wins)
//   - channel_id (optional) — wk_numbers.id where channel='email'.
//     If omitted, picks the first active row.
//
// Flow:
//   1. Verify JWT, look up agent.
//   2. Resolve wk_contact email.
//   3. Resolve a wk_numbers row (channel='email', is_active=true) for
//      the from-address.
//   4. POST to Resend.
//   5. INSERT wk_sms_messages with channel='email', external_id=<id>,
//      subject=<subject>.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
// Defaults to the inbox.nfstay.com subdomain (PR 60 plan: keep
// outbound on the existing nfstay.com domain untouched, and run all
// CRM email — both directions — on a new subdomain).
const DEFAULT_FROM_EMAIL = Deno.env.get('CRM_EMAIL_FROM') ?? 'inbox@inbox.nfstay.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SendBody {
  contact_id: string;
  subject: string;
  body: string;
  html?: string;
  /** Pin a specific wk_numbers row as the from-line. Highest priority. */
  channel_id?: string;
  /** PR 86: campaign-aware resolution — picks from wk_campaign_numbers
   *  (channel='email') for this campaign, same precedence as wk-dialer-start. */
  campaign_id?: string;
}

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const auth = req.headers.get('authorization') ?? '';
    const jwt = auth.replace(/^Bearer\s+/i, '');
    if (!jwt) return json(401, { error: 'Missing bearer token' });

    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: userResp, error: userErr } = await supa.auth.getUser(jwt);
    if (userErr || !userResp?.user) return json(401, { error: 'Invalid token' });
    const agentId = userResp.user.id;

    let payload: SendBody;
    try {
      payload = (await req.json()) as SendBody;
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }

    const contactId = (payload.contact_id ?? '').trim();
    const subject = (payload.subject ?? '').trim();
    const body = (payload.body ?? '').trim();
    if (!contactId) return json(400, { error: 'contact_id required' });
    if (!subject) return json(400, { error: 'subject required for email' });
    if (!body && !payload.html) return json(400, { error: 'body or html required' });

    // 1. Resolve contact's email.
    const { data: contact, error: contactErr } = await supa
      .from('wk_contacts')
      .select('id, email, name')
      .eq('id', contactId)
      .maybeSingle();
    if (contactErr) return json(500, { error: contactErr.message });
    if (!contact) return json(404, { error: 'Contact not found' });

    const toEmail = (contact.email as string | null)?.trim();
    if (!toEmail) return json(400, { error: 'Contact has no email' });

    // 2. Resolve sender row. Precedence (mirrors unipile-send + wk-dialer-start):
    //    1. explicit channel_id
    //    2. campaign_id → first wk_campaign_numbers row whose wk_numbers
    //       row is email + active
    //    3. workspace default — first active email row
    let fromEmail = DEFAULT_FROM_EMAIL;
    let channelRowId: string | null = null;
    let resolvedRow: { id: string; e164: string } | null = null;

    if (payload.channel_id) {
      const { data } = await supa
        .from('wk_numbers')
        .select('id, e164, is_active, channel, provider')
        .eq('id', payload.channel_id)
        .maybeSingle();
      const r = data as { id: string; e164: string; is_active: boolean; channel: string; provider: string } | null;
      if (r && r.channel === 'email' && r.provider === 'resend' && r.is_active) {
        resolvedRow = { id: r.id, e164: r.e164 };
      }
    }

    if (!resolvedRow && payload.campaign_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pinned } = await (supa.from('wk_campaign_numbers' as any) as any)
        .select('priority, number_id, wk_numbers(id, e164, channel, provider, is_active)')
        .eq('campaign_id', payload.campaign_id)
        .order('priority', { ascending: true });
      const rows = (pinned ?? []) as Array<{
        priority: number;
        number_id: string;
        wk_numbers: { id: string; e164: string; channel: string; provider: string; is_active: boolean } | null;
      }>;
      for (const r of rows) {
        const n = r.wk_numbers;
        if (n && n.channel === 'email' && n.provider === 'resend' && n.is_active) {
          resolvedRow = { id: n.id, e164: n.e164 };
          break;
        }
      }
    }

    if (!resolvedRow) {
      const { data } = await supa
        .from('wk_numbers')
        .select('id, e164')
        .eq('channel', 'email')
        .eq('provider', 'resend')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      resolvedRow = (data as { id: string; e164: string } | null) ?? null;
    }

    {
      const row = resolvedRow;
      if (row?.e164) {
        // For email channels, e164 stores the email address itself
        // (column reused; renaming to a generic 'address' is tracked
        // for a later cleanup PR).
        fromEmail = row.e164;
        channelRowId = row.id;
      }
    }

    if (!RESEND_API_KEY) {
      return json(503, { error: 'RESEND_API_KEY not set on edge function secrets' });
    }

    // 3. POST to Resend.
    const finalHtml = payload.html ?? body.replace(/\n/g, '<br/>');
    const rsResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        html: finalHtml,
        text: body || undefined,
      }),
    });
    const rsBody = await rsResp.text();
    if (!rsResp.ok) {
      console.error('[wk-email-send] resend error', rsResp.status, rsBody);
      // 200-with-error so the picker UI surfaces the real reason
      // (Supabase invoke() drops the body on non-2xx).
      let parsedDesc = rsBody.slice(0, 500);
      try {
        const j = JSON.parse(rsBody);
        parsedDesc = j?.message || j?.error || parsedDesc;
      } catch { /* keep raw */ }
      return json(200, {
        error: `Resend ${rsResp.status}: ${parsedDesc}`,
        resend_status: rsResp.status,
        resend_body: rsBody.slice(0, 1000),
      });
    }
    let rsJson: { id?: string } = {};
    try {
      rsJson = JSON.parse(rsBody);
    } catch {
      console.warn('[wk-email-send] could not parse resend response', rsBody.slice(0, 200));
    }

    // 4. Persist outbound row.
    const { data: inserted, error: insErr } = await supa
      .from('wk_sms_messages')
      .insert({
        contact_id: contactId,
        direction: 'outbound',
        channel: 'email',
        body,
        external_id: rsJson.id ?? null,
        subject,
        from_e164: fromEmail,
        to_e164: toEmail,
        status: 'queued',
        created_by: agentId,
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('[wk-email-send] db insert failed (resend sent though)', insErr);
      return json(200, {
        external_id: rsJson.id ?? null,
        warning: 'sent via Resend but local insert failed',
      });
    }

    await supa
      .from('wk_contacts')
      .update({ last_contact_at: new Date().toISOString() })
      .eq('id', contactId);

    return json(200, {
      message_id: inserted?.id,
      external_id: rsJson.id ?? null,
      channel_row_id: channelRowId,
      status: 'queued',
    });
  } catch (e) {
    console.error('[wk-email-send] threw', e);
    return json(500, { error: e instanceof Error ? e.message : 'Internal error' });
  }
});
