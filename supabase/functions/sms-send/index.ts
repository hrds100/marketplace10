// sms-send — sends one SMS via Twilio API and stores in sms_messages
// Called by the app when Hugo replies to a conversation
// Source of truth: supabase/config.toml (verify_jwt = false)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SendRequest {
  to: string;           // E.164 phone number
  body: string;         // message text
  from_number_id?: string; // sms_numbers.id — uses default if not provided
  contact_id?: string;  // sms_contacts.id — looked up by phone if not provided
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { to, body, from_number_id, contact_id } = await req.json() as SendRequest;

    if (!to || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, body' }),
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

    // ---- GET SENDING NUMBER ----
    let fromNumber: string;
    let numberId: string;

    if (from_number_id) {
      const { data: num } = await supabase
        .from('sms_numbers')
        .select('id, phone_number')
        .eq('id', from_number_id)
        .single();

      if (!num) {
        return new Response(
          JSON.stringify({ error: 'Sending number not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      fromNumber = num.phone_number;
      numberId = num.id;
    } else {
      // Use default number
      const { data: defaultNum } = await supabase
        .from('sms_numbers')
        .select('id, phone_number')
        .eq('is_default', true)
        .maybeSingle();

      if (!defaultNum) {
        return new Response(
          JSON.stringify({ error: 'No default sending number configured' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      fromNumber = defaultNum.phone_number;
      numberId = defaultNum.id;
    }

    // ---- RESOLVE CONTACT ----
    let resolvedContactId = contact_id;
    if (!resolvedContactId) {
      const { data: contact } = await supabase
        .from('sms_contacts')
        .select('id')
        .eq('phone_number', to)
        .maybeSingle();

      resolvedContactId = contact?.id || null;
    }

    // ---- SEND VIA TWILIO ----
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/sms-webhook-status`;

    const twilioParams = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: body,
      StatusCallback: statusCallbackUrl,
    });

    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: twilioParams.toString(),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error('Twilio send error:', twilioData);
      return new Response(
        JSON.stringify({
          error: 'Twilio send failed',
          twilio_error: twilioData.message || twilioData.code,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- STORE MESSAGE ----
    const { data: message, error: msgErr } = await supabase
      .from('sms_messages')
      .insert({
        twilio_sid: twilioData.sid,
        from_number: fromNumber,
        to_number: to,
        body: body,
        direction: 'outbound',
        status: twilioData.status || 'queued',
        number_id: numberId,
        contact_id: resolvedContactId,
      })
      .select('id, twilio_sid, status')
      .single();

    if (msgErr) {
      console.error('Error storing message:', msgErr);
      // Message was sent but not stored — log but don't fail
    }

    // ---- UPDATE CONVERSATION ----
    if (resolvedContactId) {
      const preview = body.length > 100 ? body.substring(0, 100) + '...' : body;

      const { data: conv } = await supabase
        .from('sms_conversations')
        .select('id')
        .eq('contact_id', resolvedContactId)
        .eq('number_id', numberId)
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
            last_message_at: new Date().toISOString(),
            last_message_preview: preview,
            unread_count: 0,
          });
      }
    }

    console.log(`Outbound SMS to ${to}: "${body.substring(0, 50)}..." → ${twilioData.sid}`);

    return new Response(
      JSON.stringify({
        status: 'sent',
        message_id: message?.id,
        twilio_sid: twilioData.sid,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('sms-send error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
