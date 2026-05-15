// sms-automation-run — turn-based flow execution engine for SMS automations
// Called fire-and-forget by sms-webhook-incoming when an inbound message arrives.
// Processes ONE turn only: user sends message -> AI sends ONE reply -> waits for next.
// 5-second debounce: sleeps first, then checks if a newer message arrived.
// Source of truth: supabase/config.toml (verify_jwt = false)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

// HARD opt-out keywords — TCPA/CTIA legal standards. These are
// CONTACT-level: once any of these comes in, the contact is opted out
// of ALL automations forever. Match only when the entire message is
// one of these tokens (stripped of trailing punctuation).
function isHardOptOut(body: string | null | undefined): boolean {
  const text = (body || '').trim().toLowerCase().replace(/[.!?,;]+$/, '');
  if (!text) return false;
  const HARD = new Set([
    'stop', 'stopall', 'stop all',
    'unsubscribe', 'unsub',
    'cancel', 'end', 'quit',
  ]);
  return HARD.has(text);
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
    automationStateId?: string;
    contactId: string;
    conversationId: string;
    fromNumber: string;
    toNumber: string;
    body: string;
    globalPrompt: string;
    contactName: string;
    precomputedReply?: string | null;
    numberId?: string;
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
        reply = String(node.data.text);
        console.log('Using exact text from node (precomputedReply ignored if set)');
      } else if (context.precomputedReply) {
        reply = context.precomputedReply;
        console.log('Using precomputed reply from pathway classification');
      } else {
        const nodePrompt = node.data.prompt || '';
        const systemPrompt = globalPrompt
          ? `${globalPrompt}\n\n${nodePrompt}`
          : nodePrompt || 'You are a helpful SMS assistant. Keep replies concise (under 160 chars if possible).';

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
      return { shouldStop: false, sentMessage: true, output: { reply, message_id: sendData.message_id, status: 'sent' } };
    }

    case 'STOP_CONVERSATION': {
      if (node.data.text) {
        const sendUrl = `${SUPABASE_URL}/functions/v1/sms-send`;
        const stopPayload: Record<string, string | undefined> = {
          to: fromNumber,
          body: node.data.text,
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
      return { shouldStop: true, sentMessage: false, output: { status: 'transferred', assigned_to: node.data.assignTo } };
    }

    case 'LABEL': {
      if (node.data.labelId) {
        await supabase.from('sms_contact_labels').upsert(
          { contact_id: contactId, label_id: node.data.labelId },
          { onConflict: 'contact_id,label_id' }
        );
        console.log(`Label ${node.data.labelId} added to contact ${contactId}`);
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
      const hardOptOut = isHardOptOut(body);
      console.log(
        `[sms-automation-run] rejection detected: "${body.slice(0, 60)}" — `
        + (hardOptOut ? 'HARD opt-out (contact-level, legal)' : 'soft (state-level only)')
      );

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
      try {
        const { data: autoForStop } = await supabase
          .from('sms_automations')
          .select('flow_json')
          .eq('id', automationId)
          .maybeSingle();
        const fj = (autoForStop as { flow_json?: FlowJson | null } | null)?.flow_json;
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

      // Hugo 2026-05-15: opt-out is per-automation by default. Only HARD
      // keywords (STOP, UNSUBSCRIBE, CANCEL, END, QUIT) flip the contact-
      // level opted_out flag — those are TCPA/CTIA legal opt-outs that
      // must block ALL future automations forever. Soft rejections like
      // "nope" or "not interested" only stop THIS automation; another
      // campaign to the same contact later can still try.
      const contactUpdate: Record<string, unknown> = {
        response_status: 'responded',
        updated_at: nowTs,
      };
      if (hardOptOut) {
        contactUpdate.opted_out = true;
        // Also record in the dedicated opt-outs table for legal audit.
        await supabase.from('sms_opt_outs').upsert(
          { phone_number: from_number, reason: 'keyword_stop' },
          { onConflict: 'phone_number' }
        );
      }
      await supabase
        .from('sms_contacts')
        .update(contactUpdate)
        .eq('id', contact_id);

      // NO goodbye message — opt-out is silent. Contact said no, system
      // stops, no further outbound. Going dark is the intended UX.

      return new Response(
        JSON.stringify({
          status: hardOptOut ? 'opted_out_hard' : 'opted_out_soft',
          contact_opted_out: hardOptOut,
        }),
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

    // ---- STEP 8: Get contact name ----
    const { data: contactData } = await supabase
      .from('sms_contacts')
      .select('display_name')
      .eq('id', contact_id)
      .maybeSingle();

    const contactName = contactData?.display_name || '';

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
        automationStateId: state?.id,
        contactId: contact_id,
        conversationId: conversation_id,
        fromNumber: from_number,
        toNumber: to_number,
        body,
        globalPrompt: globalPrompt || '',
        contactName,
        precomputedReply,
        numberId: requestNumberId,
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
