// sms-webhook-incoming — receives inbound SMS from Twilio
// Validates signature, handles opt-outs, stores message, updates conversation
// Source of truth: supabase/config.toml (verify_jwt = false)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!;

const OPT_OUT_KEYWORDS = ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Validate Twilio webhook signature (HMAC-SHA1) using Web Crypto API
async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return signature === expectedSig;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Parse Twilio webhook body (application/x-www-form-urlencoded)
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const from = params.From || '';
    const to = params.To || '';
    const body = params.Body || '';
    const messageSid = params.MessageSid || '';
    const numMedia = parseInt(params.NumMedia || '0', 10);

    if (!from || !messageSid) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: From, MessageSid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate Twilio signature
    const twilioSignature = req.headers.get('x-twilio-signature') || '';
    const webhookUrl = `${SUPABASE_URL}/functions/v1/sms-webhook-incoming`;

    if (TWILIO_AUTH_TOKEN && twilioSignature) {
      const isValid = await validateTwilioSignature(TWILIO_AUTH_TOKEN, twilioSignature, webhookUrl, params);
      if (!isValid) {
        console.error('Invalid Twilio signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ---- OPT-OUT CHECK (runs BEFORE anything else — legal requirement) ----
    const bodyLower = body.trim().toLowerCase();
    if (OPT_OUT_KEYWORDS.includes(bodyLower)) {
      // Insert into opt_outs
      await supabase.from('sms_opt_outs').upsert(
        { phone_number: from, reason: 'keyword_stop' },
        { onConflict: 'phone_number' }
      );

      // Update contact if exists
      await supabase
        .from('sms_contacts')
        .update({ opted_out: true, updated_at: new Date().toISOString() })
        .eq('phone_number', from);

      console.log(`Opt-out processed for ${from}`);

      // Return TwiML response to confirm unsubscribe
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>You have been unsubscribed. You will no longer receive messages from us.</Message></Response>`;
      return new Response(twiml, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    // ---- IDEMPOTENCY CHECK ----
    const { data: existingMsg } = await supabase
      .from('sms_messages')
      .select('id')
      .eq('twilio_sid', messageSid)
      .maybeSingle();

    if (existingMsg) {
      console.log(`Duplicate webhook for ${messageSid}, skipping`);
      return new Response(
        JSON.stringify({ status: 'duplicate', message_id: existingMsg.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- FIND OR CREATE CONTACT ----
    let { data: contact } = await supabase
      .from('sms_contacts')
      .select('id, phone_number, display_name, opted_out')
      .eq('phone_number', from)
      .maybeSingle();

    if (!contact) {
      const { data: newContact, error: contactErr } = await supabase
        .from('sms_contacts')
        .insert({ phone_number: from })
        .select('id, phone_number, display_name, opted_out')
        .single();

      if (contactErr) {
        console.error('Error creating contact:', contactErr);
        return new Response(
          JSON.stringify({ error: 'Failed to create contact' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      contact = newContact;
    }

    // ---- FIND OUR NUMBER ----
    const { data: ourNumber } = await supabase
      .from('sms_numbers')
      .select('id')
      .eq('phone_number', to)
      .maybeSingle();

    const numberId = ourNumber?.id || null;

    // ---- COLLECT MEDIA URLS ----
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const url = params[`MediaUrl${i}`];
      if (url) mediaUrls.push(url);
    }

    // ---- INSERT MESSAGE ----
    const { data: message, error: msgErr } = await supabase
      .from('sms_messages')
      .insert({
        twilio_sid: messageSid,
        from_number: from,
        to_number: to,
        body: body,
        direction: 'inbound',
        status: 'received',
        media_urls: mediaUrls,
        number_id: numberId,
        contact_id: contact.id,
      })
      .select('id')
      .single();

    if (msgErr) {
      console.error('Error inserting message:', msgErr);
      return new Response(
        JSON.stringify({ error: 'Failed to store message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- UPSERT CONVERSATION ----
    const preview = body.length > 100 ? body.substring(0, 100) + '...' : body;

    if (numberId) {
      // Try to update existing conversation
      const { data: existingConv } = await supabase
        .from('sms_conversations')
        .select('id, unread_count')
        .eq('contact_id', contact.id)
        .eq('number_id', numberId)
        .maybeSingle();

      if (existingConv) {
        await supabase
          .from('sms_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: preview,
            unread_count: existingConv.unread_count + 1,
            is_archived: false, // un-archive if they message again
          })
          .eq('id', existingConv.id);
      } else {
        await supabase
          .from('sms_conversations')
          .insert({
            contact_id: contact.id,
            number_id: numberId,
            last_message_at: new Date().toISOString(),
            last_message_preview: preview,
            unread_count: 1,
          });
      }
    }

    console.log(`Inbound SMS from ${from}: "${body.substring(0, 50)}..." → message ${message.id}`);

    // ---- TRIGGER AUTOMATIONS ----
    try {
      const { data: conv } = await supabase
        .from('sms_conversations')
        .select('id')
        .eq('contact_id', contact.id)
        .eq('number_id', numberId)
        .maybeSingle();

      if (conv && message) {
        // Fire and forget — don't block webhook response
        const automationUrl = `${SUPABASE_URL}/functions/v1/sms-automation-run`;
        fetch(automationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({
            message_id: message.id,
            conversation_id: conv.id,
            contact_id: contact.id,
            from_number: from,
            to_number: to,
            body: body,
          }),
        }).catch((err) => console.error('Automation trigger error:', err));
      }
    } catch (automationErr) {
      console.error('Failed to trigger automations:', automationErr);
      // Don't fail the webhook — automation errors are non-fatal
    }

    // Return empty TwiML (no auto-reply — automations handle replies)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });
  } catch (err) {
    console.error('sms-webhook-incoming error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
