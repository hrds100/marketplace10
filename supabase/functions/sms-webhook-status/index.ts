// sms-webhook-status — receives delivery status updates from Twilio
// Updates sms_messages.status (sent → delivered / undelivered / failed)
// Source of truth: supabase/config.toml (verify_jwt = false)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Valid Twilio message statuses
const VALID_STATUSES = ['queued', 'sent', 'delivered', 'undelivered', 'failed'];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const messageSid = params.MessageSid || params.SmsSid || '';
    const messageStatus = params.MessageStatus || '';
    const errorCode = params.ErrorCode || null;
    const errorMessage = params.ErrorMessage || null;

    if (!messageSid || !messageStatus) {
      return new Response(
        JSON.stringify({ error: 'Missing MessageSid or MessageStatus' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only process known statuses
    if (!VALID_STATUSES.includes(messageStatus)) {
      console.log(`Ignoring unknown status "${messageStatus}" for ${messageSid}`);
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'unknown status' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Update message status
    const updateData: Record<string, unknown> = { status: messageStatus };
    if (errorCode) updateData.error_code = errorCode;
    if (errorMessage) updateData.error_message = errorMessage;

    const { data: updated, error } = await supabase
      .from('sms_messages')
      .update(updateData)
      .eq('twilio_sid', messageSid)
      .select('id, contact_id')
      .maybeSingle();

    if (error) {
      console.error(`Error updating message ${messageSid}:`, error);
    } else if (!updated) {
      console.warn(`No message found for twilio_sid ${messageSid}`);
    } else {
      console.log(`Status update: ${messageSid} → ${messageStatus}`);

      // ---- SYNC CAMPAIGN RECIPIENT STATUS ----
      // If this message is tied to a campaign, update sms_campaign_recipients too
      const { data: recipient } = await supabase
        .from('sms_campaign_recipients')
        .select('id, campaign_id')
        .eq('message_id', updated.id)
        .maybeSingle();

      if (recipient) {
        await supabase
          .from('sms_campaign_recipients')
          .update({ status: messageStatus })
          .eq('id', recipient.id);

        // Update campaign aggregate counts
        const { data: counts } = await supabase
          .from('sms_campaign_recipients')
          .select('status')
          .eq('campaign_id', recipient.campaign_id);

        if (counts) {
          const delivered = counts.filter((r: { status: string }) => r.status === 'delivered').length;
          const failed = counts.filter((r: { status: string }) => ['failed', 'undelivered'].includes(r.status)).length;

          await supabase
            .from('sms_campaigns')
            .update({ delivered_count: delivered, failed_count: failed })
            .eq('id', recipient.campaign_id);
        }

        console.log(`Campaign recipient ${recipient.id} updated to ${messageStatus}`);
      }
    }

    return new Response(
      JSON.stringify({ status: 'ok' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('sms-webhook-status error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
