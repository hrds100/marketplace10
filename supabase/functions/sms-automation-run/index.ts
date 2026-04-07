// sms-automation-run — flow execution engine for SMS automations
// Called fire-and-forget by sms-webhook-incoming when an inbound message arrives
// Loads active automations, checks triggers, walks the flow graph, executes nodes
// v2: Smart pathway routing — AI classifies which edge to follow when multiple exist
// Source of truth: supabase/config.toml (verify_jwt = false)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: {
    keywords?: string[];
    numbers?: string[];
    timeRange?: { start: string; end: string };
  };
  flow_json: {
    nodes: FlowNode[];
    edges: FlowEdge[];
    globalPrompt?: string;
  } | null;
  is_active: boolean;
}

interface ConversationMessage {
  role: string;
  content: string;
}

// ---- Trigger matching ----

function matchesTrigger(automation: Automation, body: string): boolean {
  const { trigger_type, trigger_config } = automation;

  switch (trigger_type) {
    case 'new_message':
      return true;

    case 'keyword': {
      if (!trigger_config.keywords?.length) return false;
      const bodyLower = body.toLowerCase();
      return trigger_config.keywords.some((kw) => bodyLower.includes(kw.toLowerCase()));
    }

    case 'time_based': {
      if (!trigger_config.timeRange) return false;
      const { start, end } = trigger_config.timeRange;
      const now = new Date();
      const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
      return currentTime >= start && currentTime <= end;
    }

    default:
      return false;
  }
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

  if (error || !messages?.length) {
    return [];
  }

  // Reverse so oldest is first (chronological order for the AI)
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
  // Single edge — no classification needed
  if (outgoingEdges.length === 1) {
    return { edge: outgoingEdges[0], reply: null };
  }

  // Multiple edges — use AI to classify
  const pathways = outgoingEdges.map((e) => ({
    edge_id: e.id,
    label: e.data?.label || e.label || `Edge to ${e.target}`,
    description: e.data?.description || undefined,
  }));

  const systemPrompt = context.globalPrompt
    ? `${context.globalPrompt}\n\n${context.nodePrompt}`
    : context.nodePrompt || 'You are a helpful SMS assistant. Keep replies concise (under 160 chars if possible).';

  // Load conversation history for context
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
    // Fallback: pick first edge
    return { edge: outgoingEdges[0], reply: null };
  }

  const chosenEdgeId = aiData.chosen_pathway;
  const confidence = aiData.confidence ?? 0;
  const reply = aiData.reply || null;

  if (confidence < 0.5) {
    console.warn(
      `Low confidence pathway classification (${confidence}) for edge "${chosenEdgeId}". Proceeding anyway.`
    );
  }

  const chosenEdge = outgoingEdges.find((e) => e.id === chosenEdgeId);

  if (!chosenEdge) {
    console.warn(`Chosen edge "${chosenEdgeId}" not found in outgoing edges. Falling back to first.`);
    return { edge: outgoingEdges[0], reply };
  }

  console.log(
    `Pathway classified: "${chosenEdge.data?.label || chosenEdge.label || chosenEdge.id}" (confidence=${confidence})`
  );

  return { edge: chosenEdge, reply };
}

// ---- Node execution ----

async function executeNode(
  node: FlowNode,
  context: {
    supabase: ReturnType<typeof createClient>;
    runId: string;
    automationId: string;
    contactId: string;
    conversationId: string;
    fromNumber: string;
    toNumber: string;
    body: string;
    globalPrompt: string;
    contactName: string;
    precomputedReply?: string | null; // reply already generated during pathway classification
  }
): Promise<{ shouldStop: boolean; output: Record<string, unknown> }> {
  const { supabase, runId, contactId, fromNumber, toNumber, body, globalPrompt, contactName } = context;
  const nodeType = (node.type || 'DEFAULT').toUpperCase();

  console.log(`Executing node ${node.id} (${nodeType}): ${node.data.name}`);

  switch (nodeType) {
    // ---- DEFAULT: AI response ----
    case 'DEFAULT': {
      let reply: string;

      // If we already have a reply from pathway classification, use it
      if (context.precomputedReply) {
        reply = context.precomputedReply;
        console.log('Using precomputed reply from pathway classification');
      } else {
        // Generate a new reply
        const nodePrompt = node.data.prompt || '';
        const systemPrompt = globalPrompt
          ? `${globalPrompt}\n\n${nodePrompt}`
          : nodePrompt || 'You are a helpful SMS assistant. Keep replies concise (under 160 chars if possible).';

        const model = node.data.modelOptions?.model || 'gpt-4o-mini';
        const temperature = node.data.modelOptions?.temperature ?? 0.7;

        // Load conversation history
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
          return { shouldStop: false, output: { error: aiData.error, status: 'ai_failed' } };
        }

        reply = aiData.reply;
      }

      // Send the reply via sms-send (unless delay is set)
      if (node.data.delay && node.data.delay > 0) {
        await supabase.from('sms_scheduled_tasks').insert({
          type: 'delay_node',
          reference_id: context.conversationId,
          node_id: node.id,
          execute_at: new Date(Date.now() + node.data.delay * 60 * 1000).toISOString(),
        });
        console.log(`Scheduled AI reply with ${node.data.delay}min delay`);
        return { shouldStop: false, output: { scheduled: true, delay: node.data.delay, reply } };
      }

      // Send immediately
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
        return { shouldStop: false, output: { error: sendData.error, status: 'send_failed', reply } };
      }

      console.log(`AI reply sent to ${fromNumber}: "${reply.substring(0, 60)}..."`);
      return { shouldStop: false, output: { reply, message_id: sendData.message_id, status: 'sent' } };
    }

    // ---- STOP_CONVERSATION ----
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
      return { shouldStop: true, output: { status: 'stopped', text: node.data.text || null } };
    }

    // ---- FOLLOW_UP ----
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
      return { shouldStop: false, output: { status: 'scheduled', steps_count: steps.length } };
    }

    // ---- TRANSFER ----
    case 'TRANSFER': {
      if (node.data.assignTo) {
        await supabase
          .from('sms_contacts')
          .update({ assigned_to: node.data.assignTo, updated_at: new Date().toISOString() })
          .eq('id', contactId);
        console.log(`Contact transferred to ${node.data.assignTo}`);
      }
      return { shouldStop: true, output: { status: 'transferred', assigned_to: node.data.assignTo } };
    }

    // ---- LABEL ----
    case 'LABEL': {
      if (node.data.labelId) {
        await supabase.from('sms_contact_labels').upsert(
          { contact_id: contactId, label_id: node.data.labelId },
          { onConflict: 'contact_id,label_id' }
        );
        console.log(`Label ${node.data.labelId} added to contact ${contactId}`);
      }
      return { shouldStop: false, output: { status: 'labelled', label_id: node.data.labelId } };
    }

    // ---- MOVE_STAGE ----
    case 'MOVE_STAGE': {
      if (node.data.stageId) {
        await supabase
          .from('sms_contacts')
          .update({ pipeline_stage_id: node.data.stageId, updated_at: new Date().toISOString() })
          .eq('id', contactId);
        console.log(`Contact moved to stage ${node.data.stageId}`);
      }
      return { shouldStop: false, output: { status: 'stage_moved', stage_id: node.data.stageId } };
    }

    // ---- WEBHOOK ----
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
              to_number: toNumber,
              body,
              automation_id: context.automationId,
              node_id: node.id,
            }),
          });
          const webhookStatus = webhookRes.status;
          console.log(`Webhook ${node.data.webhookUrl} responded ${webhookStatus}`);
          return { shouldStop: false, output: { status: 'webhook_sent', http_status: webhookStatus } };
        } catch (webhookErr) {
          console.error('Webhook call failed:', webhookErr);
          return { shouldStop: false, output: { status: 'webhook_failed', error: String(webhookErr) } };
        }
      }
      return { shouldStop: false, output: { status: 'no_webhook_url' } };
    }

    default: {
      console.warn(`Unknown node type: ${nodeType}, skipping`);
      return { shouldStop: false, output: { status: 'unknown_type', type: nodeType } };
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ---- Step 1: Check for campaign-linked automation first ----
    let targetAutomation: Automation | null = null;

    const { data: campaignLink } = await supabase
      .from('sms_campaign_recipients')
      .select('campaign_id')
      .eq('contact_id', contact_id)
      .limit(10);

    if (campaignLink?.length) {
      const campaignIds = campaignLink.map((r: { campaign_id: string }) => r.campaign_id);

      const { data: linkedCampaign } = await supabase
        .from('sms_campaigns')
        .select('automation_id')
        .in('id', campaignIds)
        .not('automation_id', 'is', null)
        .in('status', ['sending', 'complete', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (linkedCampaign?.automation_id) {
        const { data: auto } = await supabase
          .from('sms_automations')
          .select('id, name, trigger_type, trigger_config, flow_json, is_active')
          .eq('id', linkedCampaign.automation_id)
          .eq('is_active', true)
          .maybeSingle();

        if (auto) {
          targetAutomation = auto as Automation;
          console.log(`Campaign-linked automation found: "${targetAutomation.name}"`);
        }
      }
    }

    // ---- Step 2: Check for active run with current_node_id (re-entry) ----
    let resumeRun: { id: string; current_node_id: string; automation_id: string } | null = null;

    const { data: activeRun } = await supabase
      .from('sms_automation_runs')
      .select('id, current_node_id, automation_id')
      .eq('conversation_id', conversation_id)
      .eq('status', 'waiting_reply')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeRun?.current_node_id) {
      resumeRun = activeRun as { id: string; current_node_id: string; automation_id: string };
      console.log(`Resuming run ${resumeRun.id} from node ${resumeRun.current_node_id}`);
    }

    // ---- Step 3: Load automations (if no campaign-linked or resume) ----
    let automationsToProcess: Automation[] = [];

    if (resumeRun) {
      // Load the automation for the resume run
      const { data: auto } = await supabase
        .from('sms_automations')
        .select('id, name, trigger_type, trigger_config, flow_json, is_active')
        .eq('id', resumeRun.automation_id)
        .maybeSingle();

      if (auto) {
        automationsToProcess = [auto as Automation];
      }
    } else if (targetAutomation) {
      automationsToProcess = [targetAutomation];
    } else {
      // Fallback: load all active automations and match triggers
      const { data: automations, error: autoErr } = await supabase
        .from('sms_automations')
        .select('id, name, trigger_type, trigger_config, flow_json, is_active')
        .eq('is_active', true);

      if (autoErr) {
        console.error('Failed to load automations:', autoErr);
        return new Response(
          JSON.stringify({ error: 'Failed to load automations' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!automations?.length) {
        console.log('No active automations found');
        return new Response(
          JSON.stringify({ status: 'no_automations' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      automationsToProcess = automations as Automation[];
    }

    console.log(`Processing ${automationsToProcess.length} automation(s)`);

    // ---- Get contact name for personalization ----
    const { data: contactData } = await supabase
      .from('sms_contacts')
      .select('display_name')
      .eq('id', contact_id)
      .maybeSingle();

    const contactName = contactData?.display_name || '';

    const results: Array<{ automation_id: string; status: string; nodes_executed: number }> = [];

    // ---- Process each automation ----
    for (const automation of automationsToProcess) {
      // Skip trigger matching for resume runs and campaign-linked
      if (!resumeRun && !targetAutomation && !matchesTrigger(automation, body)) {
        console.log(`Automation "${automation.name}" — trigger not matched, skipping`);
        continue;
      }

      console.log(`Automation "${automation.name}" — processing`);

      // Validate flow_json
      if (!automation.flow_json?.nodes?.length || !automation.flow_json?.edges) {
        console.log(`Automation "${automation.name}" — no flow nodes, skipping`);
        continue;
      }

      // Loop guard — skip for resume runs (they already have a run)
      if (!resumeRun) {
        const { data: recentRuns } = await supabase
          .from('sms_automation_runs')
          .select('id')
          .eq('automation_id', automation.id)
          .eq('conversation_id', conversation_id)
          .neq('status', 'loop_blocked')
          .neq('status', 'waiting_reply')
          .gte('created_at', new Date(Date.now() - 60_000).toISOString());

        if (recentRuns?.length) {
          console.log(`Automation "${automation.name}" — loop guard triggered, blocking`);
          await supabase.from('sms_automation_runs').insert({
            automation_id: automation.id,
            conversation_id,
            message_id,
            status: 'loop_blocked',
          });
          results.push({ automation_id: automation.id, status: 'loop_blocked', nodes_executed: 0 });
          continue;
        }
      }

      // Create or resume run record
      let runId: string;

      if (resumeRun && resumeRun.automation_id === automation.id) {
        runId = resumeRun.id;
        await supabase
          .from('sms_automation_runs')
          .update({ status: 'running', message_id })
          .eq('id', runId);
      } else {
        const { data: run, error: runErr } = await supabase
          .from('sms_automation_runs')
          .insert({
            automation_id: automation.id,
            conversation_id,
            message_id,
            status: 'running',
          })
          .select('id')
          .single();

        if (runErr || !run) {
          console.error(`Failed to create run for "${automation.name}":`, runErr);
          continue;
        }
        runId = run.id;
      }

      let nodesExecuted = 0;
      let runStatus = 'completed';
      let runError: string | null = null;

      try {
        const { nodes, edges, globalPrompt } = automation.flow_json;

        // Find start node — or resume node
        let currentNode: FlowNode | undefined;

        if (resumeRun && resumeRun.automation_id === automation.id) {
          currentNode = nodes.find((n) => n.id === resumeRun.current_node_id);
          if (!currentNode) {
            console.error(`Resume node ${resumeRun.current_node_id} not found, falling back to start`);
            currentNode = nodes.find((n) => n.data.isStart === true);
          }
        } else {
          currentNode = nodes.find((n) => n.data.isStart === true);
        }

        if (!currentNode) {
          console.error(`Automation "${automation.name}" — no start node found`);
          runStatus = 'failed';
          runError = 'No start node found in flow';
          continue;
        }

        // Walk nodes sequentially (max 20 to prevent infinite loops)
        const maxSteps = 20;
        // Track if the AI reply was already generated during pathway classification
        let precomputedReply: string | null = null;

        while (currentNode && nodesExecuted < maxSteps) {
          nodesExecuted++;

          // Log step start
          const { data: stepRun } = await supabase
            .from('sms_automation_step_runs')
            .insert({
              run_id: runId,
              node_id: currentNode.id,
              node_type: currentNode.type || 'DEFAULT',
              status: 'running',
              input_data: { body, from_number, node_data: currentNode.data },
            })
            .select('id')
            .single();

          // Execute node
          const { shouldStop, output } = await executeNode(currentNode, {
            supabase,
            runId,
            automationId: automation.id,
            contactId: contact_id,
            conversationId: conversation_id,
            fromNumber: from_number,
            toNumber: to_number,
            body,
            globalPrompt: globalPrompt || '',
            contactName,
            precomputedReply,
          });

          // Clear precomputed reply after use
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

          // Stop if node says so
          if (shouldStop) {
            console.log(`Node ${currentNode.id} requested stop`);
            break;
          }

          // Find next node via outgoing edges — SMART ROUTING
          const outgoingEdges = edges.filter((e) => e.source === currentNode!.id);

          if (!outgoingEdges.length) {
            console.log('No outgoing edges, flow complete');
            break;
          }

          if (outgoingEdges.length === 1) {
            // Single edge — follow it directly
            const nextEdge = outgoingEdges[0];
            currentNode = nodes.find((n) => n.id === nextEdge.target);
          } else {
            // Multiple edges — use AI pathway classification
            console.log(
              `Node ${currentNode.id} has ${outgoingEdges.length} outgoing edges — classifying pathway`
            );

            const model = currentNode.data.modelOptions?.model || 'gpt-4o-mini';
            const temperature = currentNode.data.modelOptions?.temperature ?? 0.7;

            const { edge: chosenEdge, reply } = await resolveNextEdge(outgoingEdges, {
              supabase,
              contactId: contact_id,
              body,
              globalPrompt: globalPrompt || '',
              contactName,
              nodePrompt: currentNode.data.prompt || '',
              model,
              temperature,
            });

            // If the AI generated a reply during classification, carry it forward
            // so the next DEFAULT node can use it instead of calling AI again
            precomputedReply = reply;

            currentNode = nodes.find((n) => n.id === chosenEdge.target);

            if (currentNode) {
              console.log(
                `Pathway resolved → node ${currentNode.id} (${currentNode.data.name})`
              );
            }
          }

          if (!currentNode) {
            console.warn('Target node not found, flow ends');
            break;
          }

          // Check if next node is a DEFAULT node that expects a user reply
          // If so, pause the run and wait for re-entry
          const nextNodeType = (currentNode.type || 'DEFAULT').toUpperCase();
          if (nextNodeType === 'DEFAULT' && !precomputedReply) {
            // The next node needs user input — save position and wait
            runStatus = 'waiting_reply';
            await supabase
              .from('sms_automation_runs')
              .update({ current_node_id: currentNode.id, status: 'waiting_reply' })
              .eq('id', runId);
            console.log(`Pausing at node ${currentNode.id}, waiting for contact reply`);
            break;
          }
        }

        if (nodesExecuted >= maxSteps) {
          console.warn(`Automation "${automation.name}" hit max steps limit (${maxSteps})`);
          runError = `Hit max steps limit (${maxSteps})`;
        }
      } catch (flowErr) {
        console.error(`Flow execution error for "${automation.name}":`, flowErr);
        runStatus = 'failed';
        runError = String(flowErr);
      }

      // Complete run record (unless waiting for reply)
      if (runStatus !== 'waiting_reply') {
        await supabase
          .from('sms_automation_runs')
          .update({
            status: runStatus,
            completed_at: new Date().toISOString(),
            current_node_id: null,
            error: runError,
          })
          .eq('id', runId);
      }

      // Update automation stats
      const { data: currentAuto } = await supabase
        .from('sms_automations')
        .select('run_count')
        .eq('id', automation.id)
        .single();

      await supabase
        .from('sms_automations')
        .update({
          last_run_at: new Date().toISOString(),
          run_count: ((currentAuto?.run_count || 0) + 1),
        })
        .eq('id', automation.id);

      results.push({ automation_id: automation.id, status: runStatus, nodes_executed: nodesExecuted });
      console.log(`Automation "${automation.name}" ${runStatus}: ${nodesExecuted} nodes executed`);
    }

    return new Response(
      JSON.stringify({ status: 'ok', automations_processed: results.length, results }),
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
