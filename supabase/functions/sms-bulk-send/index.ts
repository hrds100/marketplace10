// sms-bulk-send — processes a campaign: sends messages to all recipients
// with rate limiting, number rotation, template rotation, batch size, and send speed
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

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return jsonResponse({ error: 'Missing required field: campaign_id' }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ---- LOAD CAMPAIGN ----
    const { data: campaign, error: campErr } = await supabase
      .from('sms_campaigns')
      .select('id, name, message_body, templates, template_rotation, number_ids, rotation, include_opt_out, status, send_speed, batch_size')
      .eq('id', campaign_id)
      .single();

    if (campErr || !campaign) {
      console.error('Campaign not found:', campErr);
      return jsonResponse({ error: 'Campaign not found' }, 404);
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return jsonResponse({ error: `Campaign status is "${campaign.status}", expected "draft" or "scheduled"` }, 422);
    }

    console.log(`Starting campaign "${campaign.name}" (${campaign_id})`);

    // ---- LOAD RECIPIENTS ----
    const { data: recipients, error: recipErr } = await supabase
      .from('sms_campaign_recipients')
      .select('id, contact_id')
      .eq('campaign_id', campaign_id)
      .eq('status', 'pending');

    if (recipErr) {
      console.error('Error loading recipients:', recipErr);
      return jsonResponse({ error: 'Failed to load recipients' }, 500);
    }

    if (!recipients || recipients.length === 0) {
      return jsonResponse({ error: 'No pending recipients found' }, 422);
    }

    console.log(`Found ${recipients.length} pending recipients`);

    // ---- RESOLVE TEMPLATES ----
    const templatePool: string[] = (campaign.templates && campaign.templates.length > 0)
      ? campaign.templates
      : [campaign.message_body];
    const useTemplateRotation = campaign.template_rotation && templatePool.length > 1;

    console.log(`Using ${templatePool.length} template(s), rotation=${useTemplateRotation}`);

    // ---- RESOLVE SEND SPEED ----
    const sendSpeed: { min: number; max: number } = campaign.send_speed ?? { min: 1, max: 1 };
    // Convert seconds to milliseconds
    const delayMinMs = sendSpeed.min * 1000;
    const delayMaxMs = sendSpeed.max * 1000;

    console.log(`Send speed: ${sendSpeed.min}-${sendSpeed.max}s between messages`);

    // ---- RESOLVE BATCH SIZE ----
    const batchSize: number | null = campaign.batch_size ?? null;
    const maxToSend = batchSize ?? recipients.length;

    console.log(`Batch size: ${batchSize ?? 'all'} (will send up to ${maxToSend} messages)`);

    // ---- LOAD SENDING NUMBERS ----
    const numberIds: string[] = campaign.number_ids ?? [];
    if (numberIds.length === 0) {
      return jsonResponse({ error: 'No sending numbers configured for campaign' }, 422);
    }

    const { data: numbers, error: numErr } = await supabase
      .from('sms_numbers')
      .select('id, phone_number, channel')
      .in('id', numberIds);

    if (numErr || !numbers || numbers.length === 0) {
      console.error('Error loading numbers:', numErr);
      return jsonResponse({ error: 'Sending numbers not found' }, 404);
    }

    console.log(`Using ${numbers.length} sending number(s), rotation=${campaign.rotation}`);

    // ---- LOAD OPT-OUTS ----
    const { data: optOuts } = await supabase
      .from('sms_opt_outs')
      .select('phone_number');

    const optOutSet = new Set((optOuts ?? []).map((o: { phone_number: string }) => o.phone_number));

    // ---- UPDATE CAMPAIGN STATUS TO SENDING ----
    await supabase
      .from('sms_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign_id);

    // ---- PROCESS RECIPIENTS ----
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/sms-webhook-status`;

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let numberIndex = 0;
    let templateIndex = 0;
    let batchSentCount = 0;

    // Load existing counts to add to
    const { data: existingCounts } = await supabase
      .from('sms_campaigns')
      .select('sent_count, failed_count, skipped_count')
      .eq('id', campaign_id)
      .single();

    const baseSentCount = existingCounts?.sent_count ?? 0;
    const baseFailedCount = existingCounts?.failed_count ?? 0;
    const baseSkippedCount = existingCounts?.skipped_count ?? 0;

    const recipientsToProcess = recipients.slice(0, maxToSend);

    for (let i = 0; i < recipientsToProcess.length; i++) {
      const recipient = recipientsToProcess[i];

      // Check if campaign was paused (status changed externally)
      if (i > 0 && i % 10 === 0) {
        const { data: statusCheck } = await supabase
          .from('sms_campaigns')
          .select('status')
          .eq('id', campaign_id)
          .single();

        if (statusCheck?.status === 'paused') {
          console.log(`Campaign paused after ${batchSentCount} messages`);
          break;
        }
      }

      try {
        // ---- LOAD CONTACT ----
        const { data: contact } = await supabase
          .from('sms_contacts')
          .select('id, phone_number, display_name')
          .eq('id', recipient.contact_id)
          .single();

        if (!contact) {
          console.error(`Contact not found for recipient ${recipient.id}`);
          await supabase
            .from('sms_campaign_recipients')
            .update({ status: 'failed' })
            .eq('id', recipient.id);
          failedCount++;
          continue;
        }

        // ---- CHECK OPT-OUT ----
        if (optOutSet.has(contact.phone_number)) {
          console.log(`Skipping opted-out contact ${contact.phone_number}`);
          await supabase
            .from('sms_campaign_recipients')
            .update({ status: 'skipped_opt_out' })
            .eq('id', recipient.id);
          skippedCount++;
          await supabase
            .from('sms_campaigns')
            .update({ skipped_count: baseSkippedCount + skippedCount })
            .eq('id', campaign_id);
          continue;
        }

        // ---- SELECT SENDING NUMBER (round-robin or first) ----
        const number = campaign.rotation
          ? numbers[numberIndex % numbers.length]
          : numbers[0];
        numberIndex++;

        // ---- SELECT TEMPLATE (round-robin or first) ----
        const selectedTemplate = useTemplateRotation
          ? templatePool[templateIndex % templatePool.length]
          : templatePool[0];
        templateIndex++;

        // ---- RESOLVE MESSAGE ----
        let messageBody = selectedTemplate;
        messageBody = messageBody.replace(/\{name\}/g, contact.display_name ?? 'there');
        messageBody = messageBody.replace(/\{phone\}/g, contact.phone_number);

        // Append opt-out text if enabled
        if (campaign.include_opt_out) {
          messageBody += '\n\nReply STOP to unsubscribe';
        }

        // ---- SEND VIA TWILIO ----
        const twilioTo = number.channel === 'whatsapp' ? `whatsapp:${contact.phone_number}` : contact.phone_number;
        const twilioFrom = number.channel === 'whatsapp' ? `whatsapp:${number.phone_number}` : number.phone_number;

        const twilioParams = new URLSearchParams({
          To: twilioTo,
          From: twilioFrom,
          Body: messageBody,
          StatusCallback: statusCallbackUrl,
        });

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
          console.error(`Twilio error for ${contact.phone_number}:`, twilioData);
          await supabase
            .from('sms_campaign_recipients')
            .update({ status: 'failed' })
            .eq('id', recipient.id);
          failedCount++;
          await supabase
            .from('sms_campaigns')
            .update({ failed_count: baseFailedCount + failedCount })
            .eq('id', campaign_id);
          continue;
        }

        // ---- STORE MESSAGE ----
        const { data: message } = await supabase
          .from('sms_messages')
          .insert({
            twilio_sid: twilioData.sid,
            from_number: number.phone_number,
            to_number: contact.phone_number,
            body: messageBody,
            direction: 'outbound',
            status: twilioData.status || 'queued',
            number_id: number.id,
            contact_id: contact.id,
            campaign_id: campaign_id,
            channel: number.channel || 'sms',
          })
          .select('id')
          .single();

        // ---- UPDATE RECIPIENT ----
        await supabase
          .from('sms_campaign_recipients')
          .update({
            status: 'sent',
            message_id: message?.id ?? null,
            sent_at: new Date().toISOString(),
          })
          .eq('id', recipient.id);

        sentCount++;
        batchSentCount++;

        // ---- UPDATE CAMPAIGN COUNTS ----
        await supabase
          .from('sms_campaigns')
          .update({ sent_count: baseSentCount + sentCount })
          .eq('id', campaign_id);

        console.log(`[${i + 1}/${recipientsToProcess.length}] Sent to ${contact.phone_number} via ${number.phone_number}`);

        // ---- RATE LIMIT: configurable delay ----
        if (i < recipientsToProcess.length - 1) {
          const delayMs = randomBetween(delayMinMs, delayMaxMs);
          await sleep(delayMs);
        }
      } catch (err) {
        console.error(`Error processing recipient ${recipient.id}:`, err);
        await supabase
          .from('sms_campaign_recipients')
          .update({ status: 'failed' })
          .eq('id', recipient.id);
        failedCount++;
        await supabase
          .from('sms_campaigns')
          .update({ failed_count: baseFailedCount + failedCount })
          .eq('id', campaign_id);
      }
    }

    // ---- DETERMINE FINAL STATUS ----
    // Check if there are still pending recipients (batch mode)
    const { data: remainingRecips } = await supabase
      .from('sms_campaign_recipients')
      .select('id')
      .eq('campaign_id', campaign_id)
      .eq('status', 'pending')
      .limit(1);

    const hasRemaining = remainingRecips && remainingRecips.length > 0;

    // If paused externally, keep paused. If batch mode with remaining, set to paused. Otherwise complete.
    const { data: currentStatus } = await supabase
      .from('sms_campaigns')
      .select('status')
      .eq('id', campaign_id)
      .single();

    let finalStatus = 'complete';
    if (currentStatus?.status === 'paused') {
      finalStatus = 'paused';
    } else if (hasRemaining && batchSize !== null) {
      finalStatus = 'paused';
    }

    await supabase
      .from('sms_campaigns')
      .update({
        status: finalStatus,
        sent_count: baseSentCount + sentCount,
        failed_count: baseFailedCount + failedCount,
        skipped_count: baseSkippedCount + skippedCount,
      })
      .eq('id', campaign_id);

    console.log(`Campaign "${campaign.name}" ${finalStatus}: ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped`);

    return jsonResponse({
      status: finalStatus,
      campaign_id,
      sent_count: sentCount,
      failed_count: failedCount,
      skipped_count: skippedCount,
      batch_sent: batchSentCount,
      has_remaining: hasRemaining,
    });
  } catch (err) {
    console.error('sms-bulk-send error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
