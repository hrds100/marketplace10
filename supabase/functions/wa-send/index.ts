// wa-send — sends a WhatsApp message via Meta Cloud API
// Supports text messages and template messages
// Source of truth: supabase/config.toml (verify_jwt = false)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const META_WHATSAPP_TOKEN = Deno.env.get('META_WHATSAPP_TOKEN')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TemplatePayload {
  name: string;
  language: { code: string };
  components?: unknown[];
}

interface SendRequest {
  to: string;                   // E.164 phone number, e.g. "+447863992555"
  body?: string;                // text message body (required if no template)
  template?: TemplatePayload;   // template message (required if no body)
  phone_number_id: string;      // Meta phone number ID, e.g. "1095314013661574"
  contact_id?: string;          // sms_contacts.id — looked up by phone if not provided
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { to, body, template, phone_number_id, contact_id } = await req.json() as SendRequest;

    if (!to || !phone_number_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, phone_number_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body && !template) {
      return new Response(
        JSON.stringify({ error: 'Either body or template is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ---- CHECK OPT-OUT ----
    const { data: optOut } = await supabase
      .from('sms_opt_outs')
      .select('id')
      .eq('phone_number', to)
      .maybeSingle();

    if (optOut) {
      return new Response(
        JSON.stringify({ error: 'Contact has opted out. Cannot send.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- RESOLVE NUMBER ID (our number row in sms_numbers) ----
    const { data: ourNumber } = await supabase
      .from('sms_numbers')
      .select('id, phone_number')
      .eq('twilio_sid', phone_number_id)
      .eq('channel', 'whatsapp')
      .maybeSingle();

    const numberId = ourNumber?.id || null;
    const fromNumber = ourNumber?.phone_number || '';

    // ---- RESOLVE CONTACT ----
    let resolvedContactId = contact_id || null;
    if (!resolvedContactId) {
      const { data: contact } = await supabase
        .from('sms_contacts')
        .select('id')
        .eq('phone_number', to)
        .maybeSingle();

      resolvedContactId = contact?.id || null;
    }

    // ---- BUILD META API PAYLOAD ----
    // Meta API wants digits only (no + prefix)
    const recipientNumber = to.replace(/^\+/, '');

    let metaPayload: Record<string, unknown>;
    let messageText = '';

    if (template) {
      metaPayload = {
        messaging_product: 'whatsapp',
        to: recipientNumber,
        type: 'template',
        template: template,
      };
      messageText = `[Template: ${template.name}]`;
    } else {
      metaPayload = {
        messaging_product: 'whatsapp',
        to: recipientNumber,
        type: 'text',
        text: { body: body },
      };
      messageText = body!;
    }

    // ---- SEND VIA META CLOUD API ----
    const metaUrl = `https://graph.facebook.com/v25.0/${phone_number_id}/messages`;

    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaPayload),
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      console.error('Meta API send error:', metaData);
      return new Response(
        JSON.stringify({
          error: 'Meta API send failed',
          meta_error: metaData.error?.message || 'Unknown error',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wamid = metaData.messages?.[0]?.id || '';

    // ---- STORE MESSAGE ----
    const { data: message, error: msgErr } = await supabase
      .from('sms_messages')
      .insert({
        twilio_sid: wamid,
        from_number: fromNumber,
        to_number: to,
        body: messageText,
        direction: 'outbound',
        status: 'sent',
        number_id: numberId,
        contact_id: resolvedContactId,
        channel: 'whatsapp',
      })
      .select('id, twilio_sid, status')
      .single();

    if (msgErr) {
      console.error('Error storing message:', msgErr);
      // Message was sent but not stored — log but don't fail
    }

    // ---- UPDATE CONVERSATION ----
    if (resolvedContactId && numberId) {
      const preview = messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;

      const { data: conv } = await supabase
        .from('sms_conversations')
        .select('id')
        .eq('contact_id', resolvedContactId)
        .eq('number_id', numberId)
        .eq('channel', 'whatsapp')
        .maybeSingle();

      if (conv) {
        await supabase
          .from('sms_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: preview,
          })
          .eq('id', conv.id);
      } else {
        await supabase
          .from('sms_conversations')
          .insert({
            contact_id: resolvedContactId,
            number_id: numberId,
            channel: 'whatsapp',
            last_message_at: new Date().toISOString(),
            last_message_preview: preview,
            unread_count: 0,
          });
      }
    }

    console.log(`Outbound WhatsApp to ${to}: "${messageText.substring(0, 50)}..." → ${wamid}`);

    return new Response(
      JSON.stringify({
        status: 'sent',
        message_id: message?.id,
        wamid: wamid,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('wa-send error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
