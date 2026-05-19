// sms-automation-run — turn-based flow execution engine for SMS automations
// Called fire-and-forget by sms-webhook-incoming when an inbound message arrives.
// Processes ONE turn only: user sends message -> AI sends ONE reply -> waits for next.
// 5-second debounce: sleeps first, then checks if a newer message arrived.
// Source of truth: supabase/config.toml (verify_jwt = false)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Telegram monitoring — both must be set OR notifyTelegram() is a no-op.
// Per-automation opt-in via flow_json.telegramMonitorEnabled.
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const TELEGRAM_MONITOR_CHAT_ID = Deno.env.get('TELEGRAM_MONITOR_CHAT_ID') || '';

const DEBOUNCE_MS = 5_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---- Types ----

interface AutomationRunRequest {
  message_id: string;
  conversation_id: string;
  contact_id: string;
  from_number: string;
  to_number: string;
  body: string;
  number_id?: string;
}

interface FlowNode {
  id: string;
  type: string;
  data: {
    name: string;
    isStart?: boolean;
    prompt?: string;
    text?: string;
    delay?: number;
    steps?: Array<{ id: string; name: string; waitMinutes: number; prompt?: string; text?: string }>;
    assignTo?: string;
    labelId?: string;
    stageId?: string;
    webhookUrl?: string;
    webhookMethod?: string;
    modelOptions?: { temperature: number; model?: string };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  data?: {
    label?: string;
    description?: string;
    conditions?: Array<{
      operator: string;
      field: string;
      conditionOperator: string;
      value: string;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface FlowJson {
  nodes: FlowNode[];
  edges: FlowEdge[];
  globalPrompt?: string;
  globalModel?: string;
  globalTemperature?: number;
  maxRepliesPerLead?: number;
  // Per-automation opt-in: when true, the engine checks every inbound
  // message for positive transfer intent ("call me", "i'm interested",
  // etc.) BEFORE walking the canvas. A positive match pushes the lead
  // straight to the CRM dialer and stops the automation. This is the
  // "any stage if they ask to call" trigger — not global, only on for
  // automations that explicitly enable it.
  transferOnPositiveIntent?: boolean;
  // Dialer routing used by the pre-walk transfer (and as fallback for
  // TRANSFER_TO_DIALER nodes that don't carry their own settings).
  transferDialerCampaignId?: string;
  transferPipelineColumnId?: string;
  transferDialerPriority?: number;
  // Short SMS sent right before the lead is pushed to the CRM dialer
  // on a positive-intent match. Defaults to a warm acknowledgment when
  // omitted; set to "" to suppress.
  transferAckMessage?: string;
  // Per-automation Telegram monitoring. When true, every successful AI
  // reply fires a Q/A snippet to the Supabase secret
  // TELEGRAM_MONITOR_CHAT_ID via TELEGRAM_BOT_TOKEN. Failures are
  // logged but never block the SMS path.
  telegramMonitorEnabled?: boolean;
}

interface AutomationState {
  id: string;
  conversation_id: string;
  automation_id: string;
  current_node_id: string;
  step_number: number;
  context_data: Record<string, unknown>;
  status: 'active' | 'suspended' | 'completed' | 'paused' | 'waiting';
  last_message_at: string | null;
}

function normalizeLabel(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '_');
}

// Substitute supported template variables in a literal SMS body.
// Mirrors the set used by sms-bulk-send so operators can mix templates
// across cold campaigns and automation literal-text nodes:
//   {name}                          -> displayName (defaults to "there")
//   {phone}                         -> phone
//   {company_name} / {company name} -> company (defaults to "")
function substituteTemplate(
  text: string,
  vars: { displayName?: string; phone?: string; company?: string }
): string {
  if (!text) return text;
  let out = text;
  out = out.replace(/\{name\}/gi, vars.displayName?.trim() || 'there');
  out = out.replace(/\{phone\}/gi, vars.phone || '');
  out = out.replace(/\{company[\s_-]?name\}/gi, vars.company?.trim() || '');
  return out;
}

// Detects SOFT rejection / opt-out intent during a conversation —
// "no" / "nope" / "not interested" / "leave me alone" / "this is spam",
// complaint phrases, etc. Soft rejections are STATE-LEVEL: they stop
// THIS automation but don't block future campaigns to the same contact.
// Tuned to avoid false positives on replies that happen to contain "no"
// in another context (e.g. "no problem!").
function isRejection(body: string | null | undefined): boolean {
  const text = (body || '').trim().toLowerCase();
  if (!text) return false;

  // Multi-word rejection phrases — strong signal, length doesn't matter.
  const strongPhrases = [
    'not interested',
    'no thanks',
    'no thank you',
    'remove me',
    'take me off',
    'leave me alone',
    'stop sending',
    'stop messaging',
    'stop contacting',
    "don't contact me",
    "don't text me",
    "don't message me",
    'do not contact me',
    'do not text me',
    'this is spam',
    'this is a scam',
    'fuck off',
    'piss off',
    'go away',
    'not for me',
    'not my thing',
    'unsubscribe me',
    'opt me out',
  ];
  for (const p of strongPhrases) {
    if (text.includes(p)) return true;
  }

  // Standalone short rejection — only matches when the entire message
  // (modulo trailing punctuation) is exactly one of these tokens.
  const clean = text.replace(/[.!?,;]+$/, '');
  const standalone = new Set([
    'no', 'nope', 'nah', 'na',
    'stop', 'cancel', 'end', 'quit',
    'unsubscribe', 'remove',
    'spam', 'scam',
    'leave', 'pass', 'never',
    'no thanks', 'not interested',
  ]);
  if (standalone.has(clean)) return true;

  return false;
}

// Detects POSITIVE transfer intent — contact is clearly asking for a call
// or signalling strong interest. Used by the per-automation
// `transferOnPositiveIntent` flag to short-circuit the canvas walk and
// push the lead to the CRM dialer at ANY stage of the flow. Conservative
// to avoid false positives on neutral phrases.
function isPositiveTransferIntent(body: string | null | undefined): boolean {
  const text = (body || '').trim().toLowerCase();
  if (!text) return false;
  if (isRejection(text)) return false; // rejections always win

  const callPhrases = [
    'call me',
    'ring me',
    'phone me',
    'give me a call',
    'give me a ring',
    'can you call',
    'can we call',
    'can we talk',
    'can we speak',
    'happy to chat',
    'happy to talk',
    'happy to speak',
    'happy to call',
    'lets talk',
    "let's talk",
    'lets chat',
    "let's chat",
    'lets speak',
    "let's speak",
    'when can you call',
    'when can we talk',
    'best to call',
    'better to call',
    'better on the phone',
    'phone is best',
    'call would be',
    'a quick call',
    'quick chat',
    'quick call',
    'call back',
    'callback',
  ];
  for (const p of callPhrases) {
    if (text.includes(p)) return true;
  }

  const strongInterest = [
    "i'm interested",
    'im interested',
    'i am interested',
    'very interested',
    'really interested',
    'sounds great',
    'sounds good',
    'count me in',
    'sign me up',
    'how do i sign up',
    'how do i invest',
    'how do i join',
    'lets do it',
    "let's do it",
    'lets go',
    "let's go",
    'i want in',
    'where do i sign',
  ];
  for (const p of strongInterest) {
    if (text.includes(p)) return true;
  }

  return false;
}

// Find an outgoing edge from a node whose label matches a target ("replied" or "no_reply").
// Used for WAIT_FOR_REPLY branching where edges carry semantic labels.
function findOutgoingEdgeByLabel(
  edges: FlowEdge[],
  sourceNodeId: string,
  targetLabel: string
): FlowEdge | null {
  const target = normalizeLabel(targetLabel);
  const outgoing = edges.filter((e) => e.source === sourceNodeId);
  for (const e of outgoing) {
    const lbl = normalizeLabel(e.data?.label || e.label);
    if (lbl === target) return e;
  }
  if (target === 'replied') {
    for (const e of outgoing) {
      const lbl = normalizeLabel(e.data?.label || e.label);
      if (lbl === 'reply' || lbl === 'response' || lbl === 'yes') return e;
    }
  }
  if (target === 'no_reply') {
    for (const e of outgoing) {
      const lbl = normalizeLabel(e.data?.label || e.label);
      if (lbl === 'no_response' || lbl === 'timeout' || lbl === 'no') return e;
    }
  }
  return null;
}

interface ConversationMessage {
  role: string;
  content: string;
}

// ---- Load conversation history ----

async function loadConversationHistory(
  supabase: ReturnType<typeof createClient>,
  contactId: string,
  limit = 10
): Promise<ConversationMessage[]> {
  const { data: messages, error } = await supabase
    .from('sms_messages')
    .select('direction, body, created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !messages?.length) return [];

  return messages.reverse().map((msg: { direction: string; body: string }) => ({
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.body,
  }));
}

// ---- Push lead to CRM dialer (shared helper) ----
//
// Used by:
//   • TRANSFER_TO_DIALER node case in executeNode (per-node opt-in)
//   • Pre-walk positive-intent detector when flow_json.transferOnPositiveIntent
//     is true (per-automation "any stage if they ask to call" trigger)
//
// Side effects:
//   • Upsert wk_contacts (CRM contact) with is_hot=true and pipeline_column_id
//     set to the configured "New Leads" column (or first column on the
//     pipeline as a fallback).
//   • Backfill the full sms_messages history for this contact into
//     wk_sms_messages so the CRM inbox shows the conversation.
//   • Upsert wk_dialer_queue (status=pending) at the configured priority.
async function pushLeadToCrmDialer(
  supabase: ReturnType<typeof createClient>,
  args: {
    contactId: string;
    fromNumber: string;
    automationId: string;
    nodeId: string;
    priority: number;
    campaignId?: string | null;
    pipelineColumnId?: string | null;
    source: 'transfer_node' | 'positive_intent';
  }
): Promise<{ wkContactId: string | null; campaignId: string | null }> {
  const nowTs = new Date().toISOString();
  const priority = Math.max(1, Math.floor(args.priority || 9999));
  const fromVariants = [
    args.fromNumber,
    args.fromNumber.replace(/^\+/, ''),
    '+' + args.fromNumber.replace(/^\+/, ''),
  ];

  // 1. Get display_name from sms_contacts
  const { data: smsContactRow } = await supabase
    .from('sms_contacts')
    .select('display_name')
    .eq('id', args.contactId)
    .maybeSingle();
  const displayName =
    (smsContactRow as { display_name?: string } | null)?.display_name ||
    args.fromNumber;

  // 2. Resolve pipeline_column_id — explicit on node wins, else first
  //    column on the (only) active pipeline.
  let pipelineColumnId: string | null = args.pipelineColumnId ?? null;
  if (!pipelineColumnId) {
    const { data: firstCol } = await supabase
      .from('wk_pipeline_columns')
      .select('id')
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle();
    pipelineColumnId =
      (firstCol as { id?: string } | null)?.id ?? null;
  }

  // 3. Upsert wk_contacts
  let wkContactId: string | null = null;
  const { data: existingWk } = await supabase
    .from('wk_contacts')
    .select('id, pipeline_column_id')
    .in('phone', fromVariants)
    .limit(1)
    .maybeSingle();

  if (existingWk && (existingWk as { id?: string }).id) {
    // Existing CRM contact.
    // Hugo 2026-05-16:
    //   • If they already have a pipeline stage (e.g. "Proposal Sent" /
    //     "Closed"), DO NOT touch it — preserve their pipeline position.
    //   • If they're in wk_contacts but pipeline_column_id is NULL
    //     (e.g. created by unipile_poll without a stage), assign them
    //     "New Leads" so they show up on the pipeline board.
    // Always flip is_hot=true and bump last_contact_at.
    const existingRow = existingWk as { id: string; pipeline_column_id: string | null };
    wkContactId = existingRow.id;
    const updatePatch: Record<string, unknown> = {
      is_hot: true,
      last_contact_at: nowTs,
      updated_at: nowTs,
    };
    if (!existingRow.pipeline_column_id && pipelineColumnId) {
      updatePatch.pipeline_column_id = pipelineColumnId;
    }
    await supabase.from('wk_contacts').update(updatePatch).eq('id', wkContactId);
  } else {
    const e164 = args.fromNumber.startsWith('+')
      ? args.fromNumber
      : '+' + args.fromNumber;
    const { data: inserted } = await supabase
      .from('wk_contacts')
      .insert({
        name: displayName,
        phone: e164,
        owner_agent_id: null,
        pipeline_column_id: pipelineColumnId,
        is_hot: true,
        custom_fields: {
          source: `sms_automation_${args.source}`,
          automation_id: args.automationId,
          node_id: args.nodeId,
          transferred_at: nowTs,
        },
      })
      .select('id')
      .single();
    wkContactId = (inserted as { id?: string } | null)?.id ?? null;
  }

  // 4. Backfill SMS history → wk_sms_messages so the CRM inbox shows the
  //    conversation that led to the transfer.
  if (wkContactId) {
    const { data: history } = await supabase
      .from('sms_messages')
      .select('id, twilio_sid, from_number, to_number, body, direction, status, media_urls, created_at, channel')
      .eq('contact_id', args.contactId)
      .order('created_at', { ascending: true });

    const historyRows = (history ?? []) as Array<{
      id: string;
      twilio_sid: string | null;
      from_number: string | null;
      to_number: string | null;
      body: string | null;
      direction: string | null;
      status: string | null;
      media_urls: string[] | null;
      created_at: string;
      channel: string | null;
    }>;

    if (historyRows.length) {
      const sids = historyRows.map((m) => m.twilio_sid).filter(Boolean) as string[];
      const { data: alreadyCopied } = sids.length
        ? await supabase
            .from('wk_sms_messages')
            .select('twilio_sid')
            .eq('contact_id', wkContactId)
            .in('twilio_sid', sids)
        : { data: [] };
      const copiedSet = new Set(
        ((alreadyCopied ?? []) as Array<{ twilio_sid: string | null }>)
          .map((r) => r.twilio_sid)
          .filter(Boolean) as string[]
      );

      const toInsert = historyRows
        .filter((m) => !m.twilio_sid || !copiedSet.has(m.twilio_sid))
        .map((m) => ({
          contact_id: wkContactId,
          direction: m.direction || 'inbound',
          body: m.body || '',
          twilio_sid: m.twilio_sid,
          from_e164: m.from_number,
          to_e164: m.to_number,
          media_urls: m.media_urls,
          status: m.status,
          created_at: m.created_at,
          channel: m.channel || 'sms',
        }));

      if (toInsert.length) {
        const { error: copyErr } = await supabase
          .from('wk_sms_messages')
          .insert(toInsert);
        if (copyErr) {
          console.warn(
            `[pushLeadToCrmDialer] message backfill failed (${copyErr.message}) — continuing`
          );
        } else {
          console.log(
            `[pushLeadToCrmDialer] copied ${toInsert.length} message(s) to wk_sms_messages for ${wkContactId}`
          );
        }
      }
    }
  }

  // 5. Upsert wk_dialer_queue at configured priority
  let resolvedCampaignId: string | null = args.campaignId ?? null;
  if (wkContactId) {
    if (!resolvedCampaignId) {
      const { data: defaultCampaign } = await supabase
        .from('wk_dialer_campaigns')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedCampaignId =
        (defaultCampaign as { id?: string } | null)?.id ?? null;
    }
    if (resolvedCampaignId) {
      // No unique constraint exists on (campaign_id, contact_id) so we
      // can't onConflict-upsert. Clear any prior pending row for this
      // contact in this campaign, then insert a fresh one at the
      // configured priority so they land at the top of the queue.
      await supabase
        .from('wk_dialer_queue')
        .delete()
        .eq('campaign_id', resolvedCampaignId)
        .eq('contact_id', wkContactId)
        .eq('status', 'pending');

      const { error: queueErr } = await supabase
        .from('wk_dialer_queue')
        .insert({
          campaign_id: resolvedCampaignId,
          contact_id: wkContactId,
          status: 'pending',
          priority,
          attempts: 0,
          scheduled_for: null,
        });
      if (queueErr) {
        console.error(
          `[pushLeadToCrmDialer] queue insert failed: ${queueErr.message}`
        );
      }
    }
    console.log(
      `[pushLeadToCrmDialer] ${wkContactId} → priority ${priority}, campaign ${resolvedCampaignId}, column ${pipelineColumnId}`
    );
  }

  return { wkContactId, campaignId: resolvedCampaignId };
}

// ---- Pipeline stage auto-bucketing ----
//
// Moves a contact to a named stage within their CURRENT pipeline.
// Designed to keep the /sms/pipeline board in sync with engine events
// (cold SMS sent, brochure sent, transfer to CRM, opt-out) without
// requiring per-automation config.
//
// Rules:
//   • Contact must already have a pipeline_stage_id pointing at a
//     stage that belongs to a pipeline. Otherwise skip — we never
//     auto-assign a pipeline to an unbucketed contact.
//   • Target stage is matched by name within the SAME pipeline. If no
//     stage with that name exists in this pipeline, skip silently
//     (operator hasn't set one up — that's intentional).
//   • By default the move is forward-only by stage position. Closed
//     and rejection paths pass forwardOnly=false because terminal
//     states should win regardless of where the contact currently is.
//   • Never throws — failures are logged. Stage moves are a side
//     effect; they must not break the SMS path.
async function moveContactToStageByName(
  supabase: ReturnType<typeof createClient>,
  contactId: string,
  targetStageName: string,
  options?: { forwardOnly?: boolean }
): Promise<void> {
  const forwardOnly = options?.forwardOnly !== false;
  try {
    const { data: contactRow } = await supabase
      .from('sms_contacts')
      .select('pipeline_stage_id')
      .eq('id', contactId)
      .maybeSingle();
    const currentStageId = (contactRow as { pipeline_stage_id?: string | null } | null)?.pipeline_stage_id;
    if (!currentStageId) return;

    const { data: currentStage } = await supabase
      .from('sms_pipeline_stages')
      .select('id, position, pipeline_id')
      .eq('id', currentStageId)
      .maybeSingle();
    const cur = currentStage as { id: string; position: number; pipeline_id: string } | null;
    if (!cur) return;

    const { data: targetStage } = await supabase
      .from('sms_pipeline_stages')
      .select('id, position')
      .eq('pipeline_id', cur.pipeline_id)
      .eq('name', targetStageName)
      .maybeSingle();
    const target = targetStage as { id: string; position: number } | null;
    if (!target) return;
    if (target.id === cur.id) return;

    if (forwardOnly && target.position <= cur.position) return;

    const { error: upErr } = await supabase
      .from('sms_contacts')
      .update({ pipeline_stage_id: target.id, updated_at: new Date().toISOString() })
      .eq('id', contactId);
    if (upErr) {
      console.warn(`[moveContactToStageByName] update failed: ${upErr.message}`);
    } else {
      console.log(`[moveContactToStageByName] contact ${contactId} -> "${targetStageName}"`);
    }
  } catch (err) {
    console.warn('[moveContactToStageByName] threw:', err);
  }
}

// ---- Telegram monitoring (per-automation Q/A forward) ----
//
// Fires only when:
//   • TELEGRAM_BOT_TOKEN + TELEGRAM_MONITOR_CHAT_ID are set
//   • flow_json.telegramMonitorEnabled is true on this automation
//
// Never throws — Telegram outages must not break SMS delivery. Errors
// are logged and swallowed.
async function notifyTelegram(args: {
  automationName: string;
  contactName: string;
  contactPhone: string;
  inboundBody: string;
  aiReply?: string;       // blank when AI didn't reply (silent actions)
  trigger?: string;       // node action label (e.g. "Moved to CRM Dialer")
}): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_MONITOR_CHAT_ID) return;

  const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Plain text body — readable in Telegram without HTML parsing quirks.
  // The bot/automation name on the first line is so multiple campaigns
  // can share one monitor group. `trigger` is the engine action label
  // (Moved to CRM / Moved to Stop / Labelled X / etc.) so operators can
  // see silent flow changes that didn't produce an AI reply.
  const text =
    `🤖 ${escapeHtml(args.automationName)}\n` +
    `Name: ${escapeHtml(args.contactName || '(no name)')}\n` +
    `Phone: ${escapeHtml(args.contactPhone)}\n\n` +
    `Q: ${escapeHtml(args.inboundBody)}\n` +
    `A: ${escapeHtml(args.aiReply || '')}\n` +
    `trigger: ${escapeHtml(args.trigger || '')}`;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_MONITOR_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.warn(
        `[notifyTelegram] non-200 from Telegram (${res.status}): ${errBody.slice(0, 200)}`
      );
    }
  } catch (err) {
    console.warn('[notifyTelegram] fetch failed:', err);
  }
}

// ---- Resolve edge via AI pathway classification ----

async function resolveNextEdge(
  outgoingEdges: FlowEdge[],
  context: {
    supabase: ReturnType<typeof createClient>;
    contactId: string;
    body: string;
    globalPrompt: string;
    contactName: string;
    nodePrompt: string;
    model: string;
    temperature: number;
  }
): Promise<{ edge: FlowEdge; reply: string | null }> {
  if (outgoingEdges.length === 1) {
    return { edge: outgoingEdges[0], reply: null };
  }

  const pathways = outgoingEdges.map((e) => ({
    edge_id: e.id,
    label: e.data?.label || e.label || `Edge to ${e.target}`,
    description: e.data?.description || undefined,
  }));

  const systemPrompt = context.globalPrompt
    ? `${context.globalPrompt}\n\n${context.nodePrompt}`
    : context.nodePrompt || 'You are a helpful SMS assistant. Keep replies concise (under 160 chars if possible).';

  const conversationHistory = await loadConversationHistory(context.supabase, context.contactId);

  const aiUrl = `${SUPABASE_URL}/functions/v1/sms-ai-respond`;
  const aiRes = await fetch(aiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      system_prompt: systemPrompt,
      user_message: context.body,
      contact_name: context.contactName,
      model: context.model,
      temperature: context.temperature,
      conversation_history: conversationHistory,
      pathways,
    }),
  });

  const aiData = await aiRes.json();

  if (!aiRes.ok) {
    console.error('AI pathway classification failed:', aiData);
    return { edge: outgoingEdges[0], reply: null };
  }

  const chosenEdgeId = aiData.chosen_pathway;
  const reply = aiData.reply || null;
  const chosenEdge = outgoingEdges.find((e) => e.id === chosenEdgeId);

  if (!chosenEdge) {
    console.warn(`Chosen edge "${chosenEdgeId}" not found. Falling back to first.`);
    return { edge: outgoingEdges[0], reply };
  }

  return { edge: chosenEdge, reply };
}

// ---- Execute a single node ----

async function executeNode(
  node: FlowNode,
  context: {
    supabase: ReturnType<typeof createClient>;
    automationId: string;
    automationName: string;
    automationStateId?: string;
    contactId: string;
    conversationId: string;
    fromNumber: string;
    toNumber: string;
    body: string;
    globalPrompt: string;
    contactName: string;
    contactCompanyName: string;
    precomputedReply?: string | null;
    numberId?: string;
    telegramMonitorEnabled: boolean;
  }
): Promise<{ shouldStop: boolean; sentMessage: boolean; parkedWaiting?: boolean; output: Record<string, unknown> }> {
  const { supabase, contactId, fromNumber, body, globalPrompt, contactName } = context;
  const nodeType = (node.type || 'DEFAULT').toUpperCase();

  console.log(`Executing node ${node.id} (${nodeType}): ${node.data.name}`);

  switch (nodeType) {
    case 'DEFAULT': {
      let reply: string;

      // Exact text mode WINS. Even if a previous AI classifier handed us
      // a precomputedReply (e.g. Start AI generated "Cheers, sending it
      // over now 👇" while routing to this brochure node), the user
      // configured this node with literal text. That text is what should
      // go out — the classifier's preamble is discarded here.
      if (node.data.text) {
        reply = substituteTemplate(String(node.data.text), {
          displayName: contactName,
          phone: fromNumber,
          company: context.contactCompanyName,
        });
        console.log('Using exact text from node (precomputedReply ignored if set)');
      } else if (context.precomputedReply) {
        reply = context.precomputedReply;
        console.log('Using precomputed reply from pathway classification');
      } else {
        const nodePrompt = node.data.prompt || '';
        // Substitute template variables ({name}, {phone}, {company_name})
        // in the prompt so operators can personalize at the prompt level
        // (e.g. "You are emailing {company_name}...").
        const tmplVars = {
          displayName: contactName,
          phone: fromNumber,
          company: context.contactCompanyName,
        };
        const resolvedGlobalPrompt = substituteTemplate(globalPrompt || '', tmplVars);
        const resolvedNodePrompt = substituteTemplate(nodePrompt, tmplVars);
        const systemPrompt = resolvedGlobalPrompt
          ? `${resolvedGlobalPrompt}\n\n${resolvedNodePrompt}`
          : resolvedNodePrompt || 'You are a helpful SMS assistant. Keep replies concise (under 160 chars if possible).';

        const model = node.data.modelOptions?.model || 'gpt-5.4-mini';
        const temperature = node.data.modelOptions?.temperature ?? 0.7;

        const conversationHistory = await loadConversationHistory(supabase, contactId);

        const aiUrl = `${SUPABASE_URL}/functions/v1/sms-ai-respond`;
        const aiRes = await fetch(aiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({
            system_prompt: systemPrompt,
            user_message: body,
            contact_name: contactName,
            model,
            temperature,
            conversation_history: conversationHistory,
          }),
        });

        const aiData = await aiRes.json();

        if (!aiRes.ok) {
          console.error('AI respond failed:', aiData);
          return { shouldStop: false, sentMessage: false, output: { error: aiData.error, status: 'ai_failed' } };
        }

        reply = aiData.reply;
      }

      // Send immediately (no delay support in turn-based mode — delays handled by follow-up nodes)
      const sendUrl = `${SUPABASE_URL}/functions/v1/sms-send`;
      const sendPayload: Record<string, string | undefined> = {
        to: fromNumber,
        body: reply,
        contact_id: contactId,
      };
      if (context.numberId) sendPayload.from_number_id = context.numberId;

      const sendRes = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify(sendPayload),
      });

      const sendData = await sendRes.json();

      if (!sendRes.ok) {
        console.error('SMS send failed:', sendData);
        return { shouldStop: false, sentMessage: false, output: { error: sendData.error, status: 'send_failed', reply } };
      }

      console.log(`AI reply sent to ${fromNumber}: "${reply.substring(0, 60)}..."`);

      // Telegram monitor — per-automation opt-in. Best-effort, never
      // throws. Skipped automatically when the flag is off or the env
      // vars are missing. AI reply path: A = reply, trigger blank.
      if (context.telegramMonitorEnabled) {
        await notifyTelegram({
          automationName: context.automationName,
          contactName,
          contactPhone: fromNumber,
          inboundBody: body,
          aiReply: reply,
          trigger: '',
        });
      }

      // Pipeline auto-bucket — detect well-known DEFAULT nodes by name
      // and/or content. Brochure must win if both match (it carries the
      // URL signal). Day 2 Check-in is identified purely by node name —
      // any node whose name contains "day 2" / "day2" routes the
      // contact to a "Day2 Sent" column if the pipeline has one.
      const nodeName = String(node.data.name || '').toLowerCase();
      const replyHasBrochure = reply.toLowerCase().includes('nfstay.com/brochure');
      const looksLikeBrochure = nodeName.includes('brochure') || replyHasBrochure;
      const looksLikeDay2 = /\bday\s*2\b/.test(nodeName);

      if (looksLikeBrochure) {
        await moveContactToStageByName(supabase, contactId, 'Brochure Sent');
      } else if (looksLikeDay2) {
        await moveContactToStageByName(supabase, contactId, 'Day2 Sent');
      }

      return { shouldStop: false, sentMessage: true, output: { reply, message_id: sendData.message_id, status: 'sent' } };
    }

    case 'STOP_CONVERSATION': {
      if (node.data.text) {
        const stopText = substituteTemplate(String(node.data.text), {
          displayName: contactName,
          phone: fromNumber,
          company: context.contactCompanyName,
        });
        const sendUrl = `${SUPABASE_URL}/functions/v1/sms-send`;
        const stopPayload: Record<string, string | undefined> = {
          to: fromNumber,
          body: stopText,
          contact_id: contactId,
        };
        if (context.numberId) stopPayload.from_number_id = context.numberId;

        await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify(stopPayload),
        });
        console.log(`Stop message sent: "${node.data.text.substring(0, 60)}"`);
      }
      if (context.telegramMonitorEnabled) {
        await notifyTelegram({
          automationName: context.automationName,
          contactName,
          contactPhone: fromNumber,
          inboundBody: body,
          aiReply: node.data.text || '',
          trigger: 'Moved to Stop',
        });
      }
      // Pipeline auto-bucket: canvas Stop node => Closed (terminal,
      // backward moves allowed).
      await moveContactToStageByName(supabase, contactId, 'Closed', { forwardOnly: false });
      return { shouldStop: true, sentMessage: !!node.data.text, output: { status: 'stopped', text: node.data.text || null } };
    }

    case 'SCHEDULED_DELAY': {
      // Drip node — schedules a "fire after" target message to send after
      // the configured wait, regardless of any reply. The live conversation
      // continues immediately down the "Continue now" edge. Two side effects
      // and one return value:
      //   1. Insert sms_scheduled_tasks row (type='scheduled_delay') so the
      //      cron worker fires the drip target at execute_at.
      //   2. Return the "Continue now" target node id so the caller can
      //      advance the walk to it (we can't change `targetNode` from
      //      inside executeNode, so we communicate via output).
      const waitValue = Number(node.data.waitValue ?? 24);
      const waitUnit = String(node.data.waitUnit ?? 'hours');
      const ms = waitUnit === 'minutes'
        ? waitValue * 60_000
        : waitUnit === 'hours'
          ? waitValue * 3_600_000
          : waitValue * 86_400_000;
      const executeAt = new Date(Date.now() + ms).toISOString();

      console.log(`SCHEDULED_DELAY ${node.id} — will fire "Fire after" target at ${executeAt}`);

      return {
        shouldStop: false,
        sentMessage: false,
        parkedWaiting: false,
        output: {
          status: 'scheduled_delay_armed',
          execute_at: executeAt,
          drip_source_node_id: node.id,
        },
      };
    }

    case 'WAIT_FOR_REPLY': {
      // Parking node. We can't insert the scheduled task here because on
      // a brand-new conversation the state row hasn't been created yet —
      // automationStateId is undefined. The main handler reads
      // output.execute_at + wait_node_id after the walk + state save and
      // inserts the task with the real state.id.
      const waitValue = Number(node.data.waitValue ?? 24);
      const waitUnit = String(node.data.waitUnit ?? 'hours');
      const ms = waitUnit === 'minutes'
        ? waitValue * 60_000
        : waitUnit === 'hours'
          ? waitValue * 3_600_000
          : waitValue * 86_400_000; // days
      const executeAt = new Date(Date.now() + ms).toISOString();

      // Cancel any prior pending task on the same state (re-entry only).
      if (context.automationStateId) {
        await supabase
          .from('sms_scheduled_tasks')
          .update({ status: 'completed', last_error: 'superseded' })
          .eq('automation_state_id', context.automationStateId)
          .eq('status', 'pending')
          .eq('type', 'wait_for_reply');
      }

      console.log(`Parked on WAIT_FOR_REPLY ${node.id}, no_reply branch will fire at ${executeAt}`);
      return {
        shouldStop: false,
        sentMessage: false,
        parkedWaiting: true,
        output: {
          status: 'parked_waiting',
          execute_at: executeAt,
          wait_value: waitValue,
          wait_unit: waitUnit,
          wait_node_id: node.id,
        },
      };
    }

    case 'FOLLOW_UP': {
      const steps = node.data.steps || [];
      for (const step of steps) {
        await supabase.from('sms_scheduled_tasks').insert({
          type: 'delay_node',
          reference_id: context.conversationId,
          node_id: `${node.id}_step_${step.id}`,
          execute_at: new Date(Date.now() + step.waitMinutes * 60 * 1000).toISOString(),
        });
        console.log(`Follow-up step "${step.name}" scheduled in ${step.waitMinutes}min`);
      }
      return { shouldStop: false, sentMessage: false, output: { status: 'scheduled', steps_count: steps.length } };
    }

    case 'TRANSFER': {
      if (node.data.assignTo) {
        await supabase
          .from('sms_contacts')
          .update({ assigned_to: node.data.assignTo, updated_at: new Date().toISOString() })
          .eq('id', contactId);
        console.log(`Contact transferred to ${node.data.assignTo}`);
      }
      if (context.telegramMonitorEnabled) {
        await notifyTelegram({
          automationName: context.automationName,
          contactName,
          contactPhone: fromNumber,
          inboundBody: body,
          aiReply: '',
          trigger: `Transferred to ${node.data.assignTo || 'agent'}`,
        });
      }
      return { shouldStop: true, sentMessage: false, output: { status: 'transferred', assigned_to: node.data.assignTo } };
    }

    case 'TRANSFER_TO_DIALER': {
      const priority = Math.max(1, Math.floor(Number(node.data.dialerPriority ?? 9999)));
      const { wkContactId, campaignId } = await pushLeadToCrmDialer(supabase, {
        contactId,
        fromNumber,
        automationId: context.automationId,
        nodeId: node.id,
        priority,
        campaignId: (node.data.dialerCampaignId as string | undefined) || null,
        pipelineColumnId: (node.data.pipelineColumnId as string | undefined) || null,
        source: 'transfer_node',
      });

      if (context.telegramMonitorEnabled) {
        await notifyTelegram({
          automationName: context.automationName,
          contactName,
          contactPhone: fromNumber,
          inboundBody: body,
          aiReply: '',
          trigger: 'Moved to CRM Dialer',
        });
      }

      // Pipeline auto-bucket: canvas-driven transfer => CRM column.
      await moveContactToStageByName(supabase, contactId, 'Moved CRM');

      return {
        shouldStop: true,
        sentMessage: false,
        output: {
          status: 'transferred_to_dialer',
          wk_contact_id: wkContactId,
          priority,
          campaign_id: campaignId,
        },
      };
    }

    case 'LABEL': {
      if (node.data.labelId) {
        await supabase.from('sms_contact_labels').upsert(
          { contact_id: contactId, label_id: node.data.labelId },
          { onConflict: 'contact_id,label_id' }
        );
        console.log(`Label ${node.data.labelId} added to contact ${contactId}`);
      }
      if (context.telegramMonitorEnabled) {
        // Look up the label name so the trigger line is readable.
        let labelName = node.data.labelId ? String(node.data.labelId) : '(no label)';
        if (node.data.labelId) {
          const { data: lbl } = await supabase
            .from('sms_labels')
            .select('name')
            .eq('id', node.data.labelId)
            .maybeSingle();
          labelName = (lbl as { name?: string } | null)?.name || labelName;
        }
        await notifyTelegram({
          automationName: context.automationName,
          contactName,
          contactPhone: fromNumber,
          inboundBody: body,
          aiReply: '',
          trigger: `Added label "${labelName}"`,
        });
      }
      return { shouldStop: false, sentMessage: false, output: { status: 'labelled', label_id: node.data.labelId } };
    }

    case 'MOVE_STAGE': {
      if (node.data.stageId) {
        await supabase
          .from('sms_contacts')
          .update({ pipeline_stage_id: node.data.stageId, updated_at: new Date().toISOString() })
          .eq('id', contactId);
        console.log(`Contact moved to stage ${node.data.stageId}`);
      }
      if (context.telegramMonitorEnabled) {
        let stageName = node.data.stageId ? String(node.data.stageId) : '(no stage)';
        if (node.data.stageId) {
          const { data: stg } = await supabase
            .from('sms_pipeline_stages')
            .select('name')
            .eq('id', node.data.stageId)
            .maybeSingle();
          stageName = (stg as { name?: string } | null)?.name || stageName;
        }
        await notifyTelegram({
          automationName: context.automationName,
          contactName,
          contactPhone: fromNumber,
          inboundBody: body,
          aiReply: '',
          trigger: `Moved to stage "${stageName}"`,
        });
      }
      return { shouldStop: false, sentMessage: false, output: { status: 'stage_moved', stage_id: node.data.stageId } };
    }

    case 'WEBHOOK': {
      if (node.data.webhookUrl) {
        try {
          const method = (node.data.webhookMethod || 'POST').toUpperCase();
          const webhookRes = await fetch(node.data.webhookUrl, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contact_id: contactId,
              conversation_id: context.conversationId,
              from_number: fromNumber,
              to_number: context.toNumber,
              body,
              automation_id: context.automationId,
              node_id: node.id,
            }),
          });
          const webhookStatus = webhookRes.status;
          console.log(`Webhook ${node.data.webhookUrl} responded ${webhookStatus}`);
          if (context.telegramMonitorEnabled) {
            await notifyTelegram({
              automationName: context.automationName,
              contactName,
              contactPhone: fromNumber,
              inboundBody: body,
              aiReply: '',
              trigger: `Webhook called (${webhookStatus})`,
            });
          }
          return { shouldStop: false, sentMessage: false, output: { status: 'webhook_sent', http_status: webhookStatus } };
        } catch (webhookErr) {
          console.error('Webhook call failed:', webhookErr);
          return { shouldStop: false, sentMessage: false, output: { status: 'webhook_failed', error: String(webhookErr) } };
        }
      }
      return { shouldStop: false, sentMessage: false, output: { status: 'no_webhook_url' } };
    }

    default: {
      console.warn(`Unknown node type: ${nodeType}, skipping`);
      return { shouldStop: false, sentMessage: false, output: { status: 'unknown_type', type: nodeType } };
    }
  }
}

// ---- Main handler ----

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const {
      message_id,
      conversation_id,
      contact_id,
      from_number,
      to_number,
      body,
      number_id: requestNumberId,
    } = (await req.json()) as AutomationRunRequest;

    if (!message_id || !conversation_id || !contact_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message_id, conversation_id, contact_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- STEP 1: DEBOUNCE — sleep 5 seconds ----
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ---- STEP 2: Check if this is still the latest inbound message ----
    const { data: latestMsg } = await supabase
      .from('sms_messages')
      .select('id')
      .eq('contact_id', contact_id)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestMsg && latestMsg.id !== message_id) {
      console.log(`Newer message exists (${latestMsg.id}), skipping this invocation for ${message_id}`);
      return new Response(
        JSON.stringify({ status: 'skipped_newer_message' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- STEP 3: Check if conversation has automation enabled ----
    const { data: conv } = await supabase
      .from('sms_conversations')
      .select('id, automation_id, automation_enabled')
      .eq('id', conversation_id)
      .maybeSingle();

    if (!conv) {
      console.log('Conversation not found');
      return new Response(
        JSON.stringify({ status: 'conversation_not_found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!conv.automation_enabled || !conv.automation_id) {
      console.log('Automation not enabled for this conversation');
      return new Response(
        JSON.stringify({ status: 'automation_disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const automationId = conv.automation_id;


    // ---- GLOBAL OPT-OUT SAFETY NET (Hugo 2026-05-15) ----
    // If the contact says no/nope/not interested/stop/spam/etc. at ANY
    // point in the flow, kill all future outreach immediately:
    //   • cancel any pending scheduled tasks (waits, drips)
    //   • mark state completed with exit_reason='opted_out'
    //   • mark contact.opted_out=true so future campaigns skip them
    //   • send a polite goodbye, then exit
    // This catches mid-flow rejections that the Trigger AI can't see
    // (e.g. when the lead is parked at AI Reply and changes their mind).
    if (isRejection(body)) {
      // Hugo 2026-05-15: ALL rejections are per-automation, including STOP.
      // No contact-level opt-out. Each new campaign / automation to this
      // contact starts fresh, regardless of how they rejected prior flows.
      // (See README — this is a non-standard choice that diverges from
      // TCPA/CTIA "STOP = universal" guidance. Operator-approved.)
      console.log(`[sms-automation-run] rejection detected: "${body.slice(0, 60)}" — state-level opt-out only`);

      // Load existing state (if any) so we can scope task cancellation.
      const { data: rejStateRow } = await supabase
        .from('sms_automation_state')
        .select('id, status, exit_reason')
        .eq('conversation_id', conversation_id)
        .eq('automation_id', automationId)
        .maybeSingle();
      const rejState = rejStateRow as { id: string; status: string; exit_reason: string | null } | null;

      // Skip if we've already opted them out — don't double-send goodbye.
      if (rejState && rejState.status === 'completed' && rejState.exit_reason === 'opted_out') {
        return new Response(
          JSON.stringify({ status: 'already_opted_out' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find a STOP_CONVERSATION node in the flow so the lead visibly lands
      // at the Stop card on the canvas. Prefer one wired to a "Not
      // interested" edge from the start node (semantic match). Otherwise
      // fall back to any STOP_CONVERSATION node; if none exists, use the
      // synthetic 'opt_out' marker so the column at least carries meaning.
      let stopNodeId = 'opt_out';
      let rejAutomationName = '(unnamed)';
      let rejTelegramEnabled = false;
      try {
        const { data: autoForStop } = await supabase
          .from('sms_automations')
          .select('name, flow_json')
          .eq('id', automationId)
          .maybeSingle();
        const aForStop = autoForStop as { name?: string; flow_json?: FlowJson | null } | null;
        rejAutomationName = aForStop?.name || '(unnamed)';
        rejTelegramEnabled = aForStop?.flow_json?.telegramMonitorEnabled === true;
        const fj = aForStop?.flow_json;
        if (fj?.nodes?.length) {
          const startNode = fj.nodes.find((n) => n.data?.isStart === true);
          const notInterestedEdge = startNode
            ? fj.edges?.find((e) =>
                e.source === startNode.id
                && normalizeLabel(e.data?.label || e.label).includes('not_interested'))
            : null;
          let preferredTargetId: string | null = notInterestedEdge?.target ?? null;
          if (preferredTargetId) {
            const preferredNode = fj.nodes.find((n) =>
              n.id === preferredTargetId
              && (n.type || '').toUpperCase() === 'STOP_CONVERSATION');
            if (preferredNode) stopNodeId = preferredNode.id;
          }
          if (stopNodeId === 'opt_out') {
            // Fall back to any STOP_CONVERSATION node.
            const anyStop = fj.nodes.find((n) =>
              (n.type || '').toUpperCase() === 'STOP_CONVERSATION');
            if (anyStop) stopNodeId = anyStop.id;
          }
        }
      } catch (lookupErr) {
        console.warn('[sms-automation-run] stop-node lookup failed (continuing with opt_out marker):', lookupErr);
      }

      const nowTs = new Date().toISOString();

      if (rejState) {
        await supabase
          .from('sms_scheduled_tasks')
          .update({ status: 'completed', last_error: 'contact opted out' })
          .eq('automation_state_id', rejState.id)
          .eq('status', 'pending');

        await supabase
          .from('sms_automation_state')
          .update({
            status: 'completed',
            current_node_id: stopNodeId,
            completed_at: nowTs,
            last_message_at: nowTs,
            exit_reason: 'opted_out',
          })
          .eq('id', rejState.id);
      } else {
        // No state yet (first inbound is the rejection). Record a completed
        // state so the canvas + dashboards reflect the opt-out.
        await supabase
          .from('sms_automation_state')
          .insert({
            conversation_id,
            automation_id: automationId,
            current_node_id: stopNodeId,
            step_number: 1,
            status: 'completed',
            completed_at: nowTs,
            last_message_at: nowTs,
            exit_reason: 'opted_out',
          });
      }

      // Mark contact as responded (so we know they engaged) but do NOT
      // set opted_out — Hugo wants new automations to be unblocked.
      await supabase
        .from('sms_contacts')
        .update({ response_status: 'responded', updated_at: nowTs })
        .eq('id', contact_id);

      // NO goodbye message — opt-out is silent. Contact said no, this
      // automation stops, no further outbound from this flow.

      // Telegram monitor: opt-outs are silent on the SMS side but Hugo
      // wants visibility on the trigger so the team knows when leads
      // bail. A: stays blank, trigger names the action.
      if (rejTelegramEnabled) {
        const { data: contactRow } = await supabase
          .from('sms_contacts')
          .select('display_name')
          .eq('id', contact_id)
          .maybeSingle();
        const cn = (contactRow as { display_name?: string } | null)?.display_name || '';
        await notifyTelegram({
          automationName: rejAutomationName,
          contactName: cn,
          contactPhone: from_number,
          inboundBody: body,
          aiReply: '',
          trigger: 'Moved to Stop (opt-out)',
        });
      }

      // Pipeline auto-bucket: opt-outs are terminal, so allow backward
      // moves too. Lands the contact on the "Closed" column of their
      // current pipeline (if a column with that name exists).
      await moveContactToStageByName(supabase, contact_id, 'Closed', { forwardOnly: false });

      return new Response(
        JSON.stringify({ status: 'opted_out_state_only', contact_opted_out: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- STEP 4: Load automation state ----
    const { data: stateRow } = await supabase
      .from('sms_automation_state')
      .select('id, conversation_id, automation_id, current_node_id, step_number, context_data, status, last_message_at')
      .eq('conversation_id', conversation_id)
      .eq('automation_id', automationId)
      .maybeSingle();

    const state = stateRow as AutomationState | null;

    if (state && state.status === 'completed') {
      console.log('Automation already completed for this conversation');
      return new Response(
        JSON.stringify({ status: 'already_completed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (state && state.status === 'suspended') {
      console.log('Automation suspended (human took over)');
      return new Response(
        JSON.stringify({ status: 'suspended' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (state && state.status === 'paused') {
      console.log('Automation paused by user');
      return new Response(
        JSON.stringify({ status: 'paused' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- INTERCEPT: state is parked on a WAIT_FOR_REPLY node ----
    // Inbound message just arrived. Cancel the pending "no_reply" timeout and
    // flip status back to 'active' so the rest of the engine takes the
    // "Replied" branch below.
    const wasWaitingForReply = state?.status === 'waiting';
    if (wasWaitingForReply && state) {
      await supabase
        .from('sms_scheduled_tasks')
        .update({ status: 'completed', last_error: 'reply_received' })
        .eq('automation_state_id', state.id)
        .eq('status', 'pending')
        .eq('type', 'wait_for_reply');

      await supabase
        .from('sms_automation_state')
        .update({ status: 'active' })
        .eq('id', state.id);

      console.log(`State ${state.id} unparked: reply received during WAIT_FOR_REPLY`);
    }

    // ---- STEP 5: Load automation flow_json ----
    const { data: automation } = await supabase
      .from('sms_automations')
      .select('id, name, flow_json, is_active')
      .eq('id', automationId)
      .maybeSingle();

    if (!automation || !automation.is_active) {
      console.log('Automation not found or inactive');
      return new Response(
        JSON.stringify({ status: 'automation_inactive' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const flowJson = automation.flow_json as FlowJson | null;
    if (!flowJson?.nodes?.length || !flowJson?.edges) {
      console.log('Automation has no flow nodes');
      return new Response(
        JSON.stringify({ status: 'no_flow' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { nodes, edges, globalPrompt, globalModel, globalTemperature, maxRepliesPerLead } = flowJson;
    const effectiveMaxReplies = maxRepliesPerLead ?? 50;

    // ---- POSITIVE-INTENT TRANSFER (per-automation opt-in) ----
    // If the automation has transferOnPositiveIntent=true and the inbound
    // message matches the positive-intent detector ("call me", "i'm
    // interested", etc.), push the lead to the CRM dialer immediately and
    // complete the automation. This is the "any stage if they ask to call"
    // trigger Hugo asked for — opt-in per automation so campaigns that
    // shouldn't escalate to CRM don't.
    if (flowJson.transferOnPositiveIntent === true && isPositiveTransferIntent(body)) {
      console.log(
        `[sms-automation-run] positive intent detected ("${body.slice(0, 60)}") — pushing to CRM dialer`
      );

      const priority = Math.max(
        1,
        Math.floor(Number(flowJson.transferDialerPriority ?? 9999))
      );
      const { wkContactId, campaignId } = await pushLeadToCrmDialer(supabase, {
        contactId: contact_id,
        fromNumber: from_number,
        automationId,
        nodeId: state?.current_node_id || 'positive_intent_prewalk',
        priority,
        campaignId: flowJson.transferDialerCampaignId ?? null,
        pipelineColumnId: flowJson.transferPipelineColumnId ?? null,
        source: 'positive_intent',
      });

      // Send a brief acknowledgment so the lead knows a call is coming.
      // Operator-configurable via flow_json.transferAckMessage; falls back
      // to a warm default. Skipped if explicitly set to empty string.
      const ackTemplate =
        flowJson.transferAckMessage !== undefined
          ? flowJson.transferAckMessage
          : "Sure — I'll get one of our team to give you a quick call shortly 👍";
      if (ackTemplate && ackTemplate.trim().length > 0) {
        try {
          const sendUrl = `${SUPABASE_URL}/functions/v1/sms-send`;
          const ackPayload: Record<string, string | undefined> = {
            to: from_number,
            body: ackTemplate,
            contact_id,
          };
          if (requestNumberId) ackPayload.from_number_id = requestNumberId;
          const ackRes = await fetch(sendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify(ackPayload),
          });
          if (!ackRes.ok) {
            const ackData = await ackRes.json().catch(() => ({}));
            console.error(
              `[sms-automation-run] positive-intent ack send failed: ${JSON.stringify(ackData)}`
            );
          } else {
            console.log(
              `[sms-automation-run] positive-intent ack sent to ${from_number}`
            );
            // Telegram monitor — pre-walk transfer fires both A (the ack
            // SMS) and trigger (the CRM move) so operators see the full
            // Q/A pair plus the destination.
            if (flowJson.telegramMonitorEnabled === true) {
              const { data: smsContactRow } = await supabase
                .from('sms_contacts')
                .select('display_name')
                .eq('id', contact_id)
                .maybeSingle();
              const contactName =
                (smsContactRow as { display_name?: string } | null)?.display_name || '';
              await notifyTelegram({
                automationName: automation.name || '(unnamed)',
                contactName,
                contactPhone: from_number,
                inboundBody: body,
                aiReply: ackTemplate,
                trigger: 'Moved to CRM Dialer',
              });
            }
          }
        } catch (ackErr) {
          console.error('[sms-automation-run] positive-intent ack threw:', ackErr);
        }
      }

      // Pipeline auto-bucket: positive intent => CRM column.
      await moveContactToStageByName(supabase, contact_id, 'Moved CRM');

      const nowTs = new Date().toISOString();

      if (state) {
        // Cancel any pending scheduled tasks (waits / drips) for this state.
        await supabase
          .from('sms_scheduled_tasks')
          .update({ status: 'completed', last_error: 'positive_intent_transfer' })
          .eq('automation_state_id', state.id)
          .eq('status', 'pending');

        await supabase
          .from('sms_automation_state')
          .update({
            status: 'completed',
            completed_at: nowTs,
            last_message_at: nowTs,
            exit_reason: 'positive_intent_transfer',
          })
          .eq('id', state.id);
      } else {
        await supabase.from('sms_automation_state').insert({
          conversation_id,
          automation_id: automationId,
          current_node_id: 'positive_intent_prewalk',
          step_number: 1,
          status: 'completed',
          completed_at: nowTs,
          last_message_at: nowTs,
          exit_reason: 'positive_intent_transfer',
        });
      }

      return new Response(
        JSON.stringify({
          status: 'transferred_on_positive_intent',
          wk_contact_id: wkContactId,
          campaign_id: campaignId,
          priority,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- STEP 5b: Reply limit check ----
    if (state && state.step_number >= effectiveMaxReplies) {
      console.log(`Reply limit reached (${state.step_number}/${effectiveMaxReplies}) — completing automation`);
      await supabase
        .from('sms_automation_state')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          exit_reason: 'reply_limit_reached',
        })
        .eq('id', state.id);

      return new Response(
        JSON.stringify({ status: 'reply_limit_reached', step_number: state.step_number, max_replies: effectiveMaxReplies }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- STEP 6: Find current node ----
    let currentNodeId: string;

    if (state) {
      // Existing state — continue from current node
      currentNodeId = state.current_node_id;
    } else {
      // New conversation — find start node
      const startNode = nodes.find((n) => n.data.isStart === true);
      if (!startNode) {
        console.error('No start node found in flow');
        return new Response(
          JSON.stringify({ status: 'no_start_node' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      currentNodeId = startNode.id;
    }

    // ---- STEP 7: Check for manual reply (human takeover) ----
    if (state?.last_message_at) {
      const { data: manualReplies } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('contact_id', contact_id)
        .eq('direction', 'outbound')
        .gt('created_at', state.last_message_at)
        .limit(1);

      // Check if there's a manual outbound that's NOT from the automation
      // (automation messages will have the same timestamp window, but manual ones are newer)
      if (manualReplies?.length) {
        console.log('Manual reply detected — suspending automation');
        await supabase
          .from('sms_automation_state')
          .update({
            status: 'suspended',
            exit_reason: 'manual_takeover',
          })
          .eq('id', state.id);

        return new Response(
          JSON.stringify({ status: 'manual_takeover' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ---- STEP 8: Get contact name + company ----
    const { data: contactData } = await supabase
      .from('sms_contacts')
      .select('display_name, company_name')
      .eq('id', contact_id)
      .maybeSingle();

    const contactName = (contactData as { display_name?: string | null } | null)?.display_name || '';
    const contactCompanyName = (contactData as { company_name?: string | null } | null)?.company_name || '';

    // ---- STEP 9: Evaluate outgoing edges from current node ----
    const currentNode = nodes.find((n) => n.id === currentNodeId);
    if (!currentNode) {
      console.error(`Current node ${currentNodeId} not found in flow`);
      return new Response(
        JSON.stringify({ status: 'node_not_found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const outgoingEdges = edges.filter((e) => e.source === currentNodeId);

    if (!outgoingEdges.length) {
      const currentNodeType = (currentNode.type || 'DEFAULT').toUpperCase();
      const startNode = nodes.find((n) => n.data.isStart === true);

      if (currentNodeType === 'DEFAULT' && currentNode.data.isStart && startNode) {
        // Start node with no outgoing edges: respond with AI and stay parked.
        console.log('Start node with no edges — responding with AI and staying at start');
        // Fall through to execute the start node directly (handled below)
      } else if (currentNodeType === 'DEFAULT') {
        // Mid-flow AI Response node with no outgoing edges — this is a
        // chat parking spot. Each future inbound triggers another AI
        // reply from this same node. Fall through to execute it.
        console.log(`Mid-flow DEFAULT node ${currentNodeId} with no outgoing edges — chat parking spot, generating AI reply`);
      } else {
        // Terminal action node (STOP/TRANSFER/etc.) without edges — flow done.
        console.log(`No outgoing edges from ${currentNodeType} node — flow complete`);
        if (state) {
          await supabase
            .from('sms_automation_state')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              exit_reason: 'no_edges',
            })
            .eq('id', state.id);
        }
        return new Response(
          JSON.stringify({ status: 'flow_complete' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Resolve which edge to follow (single = direct, multiple = AI classification)
    let precomputedReply: string | null = null;
    let targetNode: FlowNode | null = null;

    // Use global model/temperature as defaults, allow node-level overrides
    const effectiveModel = (currentNode.data.useGlobalSettings !== false && globalModel)
      ? globalModel
      : (currentNode.data.modelOptions?.model || globalModel || 'gpt-5.4-mini');
    const effectiveTemperature = (currentNode.data.useGlobalSettings !== false && globalTemperature !== undefined)
      ? globalTemperature
      : (currentNode.data.modelOptions?.temperature ?? globalTemperature ?? 0.7);

    if (outgoingEdges.length === 0) {
      // No edges — execute current node directly (start node loop-back case)
      targetNode = currentNode;
    } else if (wasWaitingForReply) {
      // Reply just landed on a WAIT_FOR_REPLY node. Pick the "Replied" edge
      // deterministically by label — no AI classification needed.
      const repliedEdge = findOutgoingEdgeByLabel(outgoingEdges, currentNodeId, 'replied');
      if (repliedEdge) {
        targetNode = nodes.find((n) => n.id === repliedEdge.target) || null;
        console.log(`WAIT_FOR_REPLY ${currentNodeId} reply → edge "${repliedEdge.data?.label || repliedEdge.label}" → ${repliedEdge.target}`);
      } else {
        // No "Replied" edge defined — fall back to first non-"no_reply" edge,
        // or first edge as last resort.
        const nonNoReply = outgoingEdges.find(
          (e) => normalizeLabel(e.data?.label || e.label) !== 'no_reply'
        );
        targetNode = nodes.find((n) => n.id === (nonNoReply?.target || outgoingEdges[0].target)) || null;
        console.warn(`No "Replied" edge from ${currentNodeId} — falling back to ${targetNode?.id}`);
      }
    } else if (outgoingEdges.length === 1) {
      targetNode = nodes.find((n) => n.id === outgoingEdges[0].target) || null;
    } else {
      const { edge, reply } = await resolveNextEdge(outgoingEdges, {
        supabase,
        contactId: contact_id,
        body,
        globalPrompt: globalPrompt || '',
        contactName,
        nodePrompt: currentNode.data.prompt || '',
        model: effectiveModel,
        temperature: effectiveTemperature,
      });

      targetNode = nodes.find((n) => n.id === edge.target) || null;
      precomputedReply = reply;
    }

    // ---- STEP 10: Advance to target node and execute ----
    if (!targetNode) {
      console.error('Target node not found');
      return new Response(
        JSON.stringify({ status: 'target_not_found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create run record for logging
    const { data: run } = await supabase
      .from('sms_automation_runs')
      .insert({
        automation_id: automationId,
        conversation_id,
        message_id,
        status: 'running',
      })
      .select('id')
      .single();

    const runId = run?.id || 'unknown';

    let messageSent = false;
    let finalNodeId = targetNode.id;
    let flowCompleted = false;
    let flowParkedWaiting = false;
    let pendingWaitTask: { execute_at: string; node_id: string } | null = null;
    // SCHEDULED_DELAY drip tasks accumulate during the walk and are inserted
    // after the state row is finalized so we have a valid state.id to link to.
    const pendingDripTasks: Array<{ execute_at: string; source_node_id: string; target_node_id: string }> = [];
    // Tracks whether ANY message-sending happened during this turn. Used to
    // prevent firing a 2nd AI reply when the walk transitions from a sender
    // node (e.g. brochure) through a drip into an AI chat node — the AI
    // chat node is meant for future inbounds, not the current turn.
    let alreadySentThisTurn = false;
    let exitReason: string | null = null;
    const maxSilentSteps = 10; // Max non-message nodes to walk through
    let silentSteps = 0;

    // Walk through non-message nodes (LABEL, MOVE_STAGE, WEBHOOK, FOLLOW_UP)
    // until we hit a message node (DEFAULT, STOP_CONVERSATION) or run out of edges
    while (targetNode && !messageSent && silentSteps < maxSilentSteps) {
      // GUARD: if we've already sent a message this turn AND the next
      // target is a message-capable DEFAULT node (i.e. an AI Reply or
      // exact-text send), park here without executing. The current
      // inbound was already handled upstream. The AI Reply / next-send
      // belongs to a FUTURE inbound.
      const targetType = (targetNode.type || '').toUpperCase();
      if (alreadySentThisTurn && targetType === 'DEFAULT') {
        console.log(`[walk] alreadySentThisTurn — parking at ${targetNode.id} without executing`);
        finalNodeId = targetNode.id;
        messageSent = true;
        break;
      }

      // Log step
      const { data: stepRun } = await supabase
        .from('sms_automation_step_runs')
        .insert({
          run_id: runId,
          node_id: targetNode.id,
          node_type: targetNode.type || 'DEFAULT',
          status: 'running',
          input_data: { body, from_number, node_data: targetNode.data },
        })
        .select('id')
        .single();

      const { shouldStop, sentMessage, parkedWaiting, output } = await executeNode(targetNode, {
        supabase,
        automationId,
        automationName: automation.name || '(unnamed)',
        automationStateId: state?.id,
        contactId: contact_id,
        conversationId: conversation_id,
        fromNumber: from_number,
        toNumber: to_number,
        body,
        globalPrompt: globalPrompt || '',
        contactName,
        contactCompanyName,
        precomputedReply,
        numberId: requestNumberId,
        telegramMonitorEnabled: flowJson.telegramMonitorEnabled === true,
      });

      // Clear precomputed reply after first use
      precomputedReply = null;

      // Log step completion
      if (stepRun) {
        await supabase
          .from('sms_automation_step_runs')
          .update({
            status: output.error ? 'failed' : 'completed',
            output_data: output,
            error: output.error ? String(output.error) : null,
          })
          .eq('id', stepRun.id);
      }

      finalNodeId = targetNode.id;

      if (parkedWaiting) {
        flowParkedWaiting = true;
        // finalNodeId is the WAIT_FOR_REPLY node itself — state.current_node_id
        // must point here so the next inbound knows to take the "Replied" edge.
        // Capture the scheduled-task data so we can insert it AFTER the state
        // row is created (state.id might not exist yet on first inbound).
        const executeAt = (output as { execute_at?: string }).execute_at;
        const waitNodeId = (output as { wait_node_id?: string }).wait_node_id;
        if (executeAt && waitNodeId) {
          pendingWaitTask = { execute_at: executeAt, node_id: waitNodeId };
        }
        break;
      }

      // SCHEDULED_DELAY: fire-and-forget the "Fire after" target as a future
      // task, then continue the walk down the "Continue now" branch.
      if ((output as { status?: string }).status === 'scheduled_delay_armed') {
        const executeAt = (output as { execute_at?: string }).execute_at;
        const sourceNodeId = (output as { drip_source_node_id?: string }).drip_source_node_id;
        if (executeAt && sourceNodeId) {
          // Find "Fire after" edge (sourceHandle='fire_after' OR label match)
          const dripEdges = edges.filter((e) => e.source === sourceNodeId);
          const fireAfterEdge = dripEdges.find(
            (e) => (e as { sourceHandle?: string }).sourceHandle === 'fire_after',
          ) || dripEdges.find(
            (e) => normalizeLabel(e.data?.label || e.label) === 'fire_after',
          );
          const continueEdge = dripEdges.find(
            (e) => (e as { sourceHandle?: string }).sourceHandle === 'continue_now',
          ) || dripEdges.find(
            (e) => normalizeLabel(e.data?.label || e.label) === 'continue_now',
          );

          if (fireAfterEdge?.target) {
            pendingDripTasks.push({
              execute_at: executeAt,
              source_node_id: sourceNodeId,
              target_node_id: fireAfterEdge.target,
            });
            console.log(`[scheduled_delay] queued drip → ${fireAfterEdge.target} at ${executeAt}`);
          } else {
            console.warn(`[scheduled_delay] ${sourceNodeId} has no "Fire after" edge — drip skipped`);
          }

          if (continueEdge?.target) {
            const continueNode = nodes.find((n) => n.id === continueEdge.target);
            if (continueNode) {
              targetNode = continueNode;
              finalNodeId = continueNode.id;
              continue;
            }
          }
          // No continue_now edge — flow ends here (lead just waits for drip).
          flowCompleted = false;
          break;
        }
      }

      if (sentMessage) {
        alreadySentThisTurn = true;
        // Chain into a wait/drip node if it's the very next node, so the
        // timer starts immediately rather than waiting for another inbound.
        const nextEdges = edges.filter((e) => e.source === targetNode!.id);
        if (nextEdges.length === 1) {
          const nextNode = nodes.find((n) => n.id === nextEdges[0].target);
          const nextType = (nextNode?.type || '').toUpperCase();
          if (nextNode && (nextType === 'WAIT_FOR_REPLY' || nextType === 'SCHEDULED_DELAY')) {
            // Don't set messageSent — the walk continues into the wait node.
            targetNode = nextNode;
            finalNodeId = nextNode.id;
            continue;
          }
        }
        messageSent = true;
        break;
      }

      if (shouldStop) {
        flowCompleted = true;
        exitReason = 'stop_node';
        break;
      }

      // This was a silent node (LABEL, MOVE_STAGE, etc.) — advance to next
      silentSteps++;
      const nextEdges = edges.filter((e) => e.source === targetNode!.id);

      if (!nextEdges.length) {
        // Loop-back logic: action nodes without outgoing edges return to start node
        const currentNodeType = (targetNode!.type || 'DEFAULT').toUpperCase();
        const loopBackTypes = ['LABEL', 'MOVE_STAGE', 'FOLLOW_UP', 'WEBHOOK'];
        const startNode = nodes.find((n) => n.data.isStart === true);

        if (loopBackTypes.includes(currentNodeType) && startNode) {
          console.log(`No outgoing edges from ${currentNodeType} node — looping back to start node ${startNode.id}`);
          finalNodeId = startNode.id;
          // Don't complete — just park at the start node and wait for next message
          break;
        }

        // DEFAULT (AI Response) nodes with no outgoing edges are
        // chat-parking spots — they handle each future inbound by
        // generating another AI reply. NEVER mark the flow complete
        // here. Even if executeNode just failed (AI/send error), we
        // want to stay parked so the next inbound retries.
        if (currentNodeType === 'DEFAULT') {
          console.log(`DEFAULT node ${targetNode!.id} has no outgoing edges — parking here as chat handler`);
          finalNodeId = targetNode!.id;
          break;
        }

        flowCompleted = true;
        exitReason = 'no_edges';
        break;
      }

      // For silent nodes, just take the first edge (no AI classification needed)
      const nextSilentEdge = nextEdges[0];
      targetNode = nodes.find((n) => n.id === nextSilentEdge.target) || null;
    }

    // ---- STEP 11: Update state ----
    const stepNumber = state ? state.step_number + 1 : 1;
    const now = new Date().toISOString();

    if (flowCompleted) {
      // Flow is done
      if (state) {
        await supabase
          .from('sms_automation_state')
          .update({
            current_node_id: finalNodeId,
            step_number: stepNumber,
            status: 'completed',
            completed_at: now,
            last_message_at: now,
            exit_reason: exitReason,
          })
          .eq('id', state.id);
      } else {
        await supabase
          .from('sms_automation_state')
          .insert({
            conversation_id,
            automation_id: automationId,
            current_node_id: finalNodeId,
            step_number: stepNumber,
            status: 'completed',
            completed_at: now,
            last_message_at: now,
            exit_reason: exitReason,
          });
      }
    } else if (flowParkedWaiting) {
      // Parked on a WAIT_FOR_REPLY node. Worker will resume on timeout;
      // inbound message will resume via the "Replied" branch (intercepted above).
      let parkedStateId: string | null = null;
      if (state) {
        await supabase
          .from('sms_automation_state')
          .update({
            current_node_id: finalNodeId,
            step_number: stepNumber,
            status: 'waiting',
            last_message_at: now,
          })
          .eq('id', state.id);
        parkedStateId = state.id;
      } else {
        const { data: inserted } = await supabase
          .from('sms_automation_state')
          .insert({
            conversation_id,
            automation_id: automationId,
            current_node_id: finalNodeId,
            step_number: stepNumber,
            status: 'waiting',
            last_message_at: now,
          })
          .select('id')
          .single();
        parkedStateId = (inserted as { id?: string } | null)?.id ?? null;
      }

      // Insert any drip tasks accumulated during the walk (SCHEDULED_DELAY
      // nodes fire-and-forget a future message regardless of conversation
      // state — they live alongside the parked WAIT_FOR_REPLY task, not
      // dependent on it).
      if (parkedStateId && pendingDripTasks.length > 0) {
        for (const dt of pendingDripTasks) {
          const { error: dErr } = await supabase
            .from('sms_scheduled_tasks')
            .insert({
              type: 'scheduled_delay',
              reference_id: conversation_id,
              node_id: dt.source_node_id,
              automation_state_id: parkedStateId,
              branch_label: dt.target_node_id, // stash target id here
              execute_at: dt.execute_at,
            });
          if (dErr) console.error('[sms-automation-run] drip task insert failed', dErr);
        }
      }

      // Now that the state row exists, schedule the "no_reply" task that
      // sms-automation-worker will pick up when the timeout elapses. This
      // is what fires the No Reply branch.
      if (parkedStateId && pendingWaitTask) {
        const { error: taskErr } = await supabase
          .from('sms_scheduled_tasks')
          .insert({
            type: 'wait_for_reply',
            reference_id: conversation_id,
            node_id: pendingWaitTask.node_id,
            automation_state_id: parkedStateId,
            branch_label: 'no_reply',
            execute_at: pendingWaitTask.execute_at,
          });
        if (taskErr) {
          console.error('[sms-automation-run] failed to insert wait_for_reply task', taskErr);
        } else {
          console.log(`[sms-automation-run] scheduled no_reply task for state ${parkedStateId} at ${pendingWaitTask.execute_at}`);
        }
      } else if (flowParkedWaiting && !pendingWaitTask) {
        console.warn('[sms-automation-run] flow parked waiting but pendingWaitTask was empty — No Reply branch will NEVER fire');
      }
    } else {
      // Flow continues — save position and wait for next user message
      let activeStateId: string | null = null;
      if (state) {
        await supabase
          .from('sms_automation_state')
          .update({
            current_node_id: finalNodeId,
            step_number: stepNumber,
            last_message_at: now,
          })
          .eq('id', state.id);
        activeStateId = state.id;
      } else {
        const { data: inserted } = await supabase
          .from('sms_automation_state')
          .insert({
            conversation_id,
            automation_id: automationId,
            current_node_id: finalNodeId,
            step_number: stepNumber,
            status: 'active',
            last_message_at: now,
          })
          .select('id')
          .single();
        activeStateId = (inserted as { id?: string } | null)?.id ?? null;
      }

      // Insert any drip tasks accumulated during this run. Drip tasks
      // are fire-and-forget — they run independently of the live state.
      if (activeStateId && pendingDripTasks.length > 0) {
        for (const dt of pendingDripTasks) {
          const { error: dErr } = await supabase
            .from('sms_scheduled_tasks')
            .insert({
              type: 'scheduled_delay',
              reference_id: conversation_id,
              node_id: dt.source_node_id,
              automation_state_id: activeStateId,
              branch_label: dt.target_node_id, // stash target node id here
              execute_at: dt.execute_at,
            });
          if (dErr) console.error('[sms-automation-run] drip task insert failed', dErr);
        }
      }
    }

    // ---- STEP 12: Complete run record ----
    await supabase
      .from('sms_automation_runs')
      .update({
        status: flowCompleted ? 'completed' : 'waiting_reply',
        completed_at: flowCompleted ? now : null,
        current_node_id: flowCompleted ? null : finalNodeId,
      })
      .eq('id', runId);

    // Update automation stats
    const { data: currentAuto } = await supabase
      .from('sms_automations')
      .select('run_count')
      .eq('id', automationId)
      .single();

    await supabase
      .from('sms_automations')
      .update({
        last_run_at: now,
        run_count: ((currentAuto?.run_count || 0) + 1),
      })
      .eq('id', automationId);

    const status = flowCompleted
      ? 'completed'
      : flowParkedWaiting
        ? 'parked_waiting'
        : 'waiting_reply';
    console.log(`Turn-based run complete: ${status}, node=${finalNodeId}, message_sent=${messageSent}`);

    return new Response(
      JSON.stringify({
        status,
        node_id: finalNodeId,
        message_sent: messageSent,
        step_number: stepNumber,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('sms-automation-run error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
