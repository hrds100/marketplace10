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
}

interface AutomationState {
  id: string;
  conversation_id: string;
  automation_id: string;
  current_node_id: string;
  step_number: number;
  context_data: Record<string, unknown>;
  status: 'active' | 'suspended' | 'completed' | 'paused';
  last_message_at: string | null;
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
    contactId: string;
    conversationId: string;
    fromNumber: string;
    toNumber: string;
    body: string;
    globalPrompt: string;
    contactName: string;
    precomputedReply?: string | null;
  }
): Promise<{ shouldStop: boolean; sentMessage: boolean; output: Record<string, unknown> }> {
  const { supabase, contactId, fromNumber, body, globalPrompt, contactName } = context;
  const nodeType = (node.type || 'DEFAULT').toUpperCase();

  console.log(`Executing node ${node.id} (${nodeType}): ${node.data.name}`);

  switch (nodeType) {
    case 'DEFAULT': {
      let reply: string;

      if (context.precomputedReply) {
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
      const sendRes = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          to: fromNumber,
          body: reply,
          contact_id: contactId,
        }),
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
        await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({
            to: fromNumber,
            body: node.data.text,
            contact_id: contactId,
          }),
        });
        console.log(`Stop message sent: "${node.data.text.substring(0, 60)}"`);
      }
      return { shouldStop: true, sentMessage: !!node.data.text, output: { status: 'stopped', text: node.data.text || null } };
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

    const { nodes, edges, globalPrompt } = flowJson;

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
      // No outgoing edges — flow is done
      console.log('No outgoing edges from current node — flow complete');
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

    // Resolve which edge to follow (single = direct, multiple = AI classification)
    let precomputedReply: string | null = null;
    let nextEdge: FlowEdge;

    if (outgoingEdges.length === 1) {
      nextEdge = outgoingEdges[0];
    } else {
      const model = currentNode.data.modelOptions?.model || 'gpt-5.4-mini';
      const temperature = currentNode.data.modelOptions?.temperature ?? 0.7;

      const { edge, reply } = await resolveNextEdge(outgoingEdges, {
        supabase,
        contactId: contact_id,
        body,
        globalPrompt: globalPrompt || '',
        contactName,
        nodePrompt: currentNode.data.prompt || '',
        model,
        temperature,
      });

      nextEdge = edge;
      precomputedReply = reply;
    }

    // ---- STEP 10: Advance to target node and execute ----
    let targetNode = nodes.find((n) => n.id === nextEdge.target);
    if (!targetNode) {
      console.error(`Target node ${nextEdge.target} not found`);
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
    let exitReason: string | null = null;
    const maxSilentSteps = 10; // Max non-message nodes to walk through
    let silentSteps = 0;

    // Walk through non-message nodes (LABEL, MOVE_STAGE, WEBHOOK, FOLLOW_UP)
    // until we hit a message node (DEFAULT, STOP_CONVERSATION) or run out of edges
    while (targetNode && !messageSent && silentSteps < maxSilentSteps) {
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

      const { shouldStop, sentMessage, output } = await executeNode(targetNode, {
        supabase,
        automationId,
        contactId: contact_id,
        conversationId: conversation_id,
        fromNumber: from_number,
        toNumber: to_number,
        body,
        globalPrompt: globalPrompt || '',
        contactName,
        precomputedReply,
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

      if (sentMessage) {
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
    } else {
      // Flow continues — save position and wait for next user message
      if (state) {
        await supabase
          .from('sms_automation_state')
          .update({
            current_node_id: finalNodeId,
            step_number: stepNumber,
            last_message_at: now,
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
            status: 'active',
            last_message_at: now,
          });
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

    const status = flowCompleted ? 'completed' : 'waiting_reply';
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
