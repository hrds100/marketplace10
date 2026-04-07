// sms-automation-run — flow execution engine for SMS automations
// Called fire-and-forget by sms-webhook-incoming when an inbound message arrives
// Loads active automations, checks triggers, walks the flow graph, executes nodes
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
  data?: {
    label?: string;
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
  }
): Promise<{ shouldStop: boolean; output: Record<string, unknown> }> {
  const { supabase, runId, contactId, fromNumber, toNumber, body, globalPrompt, contactName } = context;
  const nodeType = (node.type || 'DEFAULT').toUpperCase();

  console.log(`Executing node ${node.id} (${nodeType}): ${node.data.name}`);

  switch (nodeType) {
    // ---- DEFAULT: AI response ----
    case 'DEFAULT': {
      const nodePrompt = node.data.prompt || '';
      const systemPrompt = globalPrompt
        ? `${globalPrompt}\n\n${nodePrompt}`
        : nodePrompt || 'You are a helpful SMS assistant. Keep replies concise (under 160 chars if possible).';

      const model = node.data.modelOptions?.model || 'gpt-4o-mini';
      const temperature = node.data.modelOptions?.temperature ?? 0.7;

      // Call sms-ai-respond
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
        }),
      });

      const aiData = await aiRes.json();

      if (!aiRes.ok) {
        console.error('AI respond failed:', aiData);
        return { shouldStop: false, output: { error: aiData.error, status: 'ai_failed' } };
      }

      const reply = aiData.reply;

      // Send the reply via sms-send (unless delay is set)
      if (node.data.delay && node.data.delay > 0) {
        // Schedule for later
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

    // ---- Step 1: Load active automations ----
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

    console.log(`Found ${automations.length} active automation(s)`);

    // ---- Get contact name for personalization ----
    const { data: contactData } = await supabase
      .from('sms_contacts')
      .select('display_name')
      .eq('id', contact_id)
      .maybeSingle();

    const contactName = contactData?.display_name || '';

    const results: Array<{ automation_id: string; status: string; nodes_executed: number }> = [];

    // ---- Process each automation ----
    for (const automation of automations as Automation[]) {
      // Step 2: Check trigger
      if (!matchesTrigger(automation, body)) {
        console.log(`Automation "${automation.name}" — trigger not matched, skipping`);
        continue;
      }

      console.log(`Automation "${automation.name}" — trigger matched`);

      // Validate flow_json
      if (!automation.flow_json?.nodes?.length || !automation.flow_json?.edges) {
        console.log(`Automation "${automation.name}" — no flow nodes, skipping`);
        continue;
      }

      // Step 3: Loop guard — check for recent run on same automation + conversation
      const { data: recentRuns } = await supabase
        .from('sms_automation_runs')
        .select('id')
        .eq('automation_id', automation.id)
        .eq('conversation_id', conversation_id)
        .neq('status', 'loop_blocked')
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

      // Step 4: Create run record
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

      const runId = run.id;
      let nodesExecuted = 0;
      let runStatus = 'completed';
      let runError: string | null = null;

      try {
        // Step 5: Walk the flow graph
        const { nodes, edges, globalPrompt } = automation.flow_json;

        // Find start node
        const startNode = nodes.find((n) => n.data.isStart === true);
        if (!startNode) {
          console.error(`Automation "${automation.name}" — no start node found`);
          runStatus = 'failed';
          runError = 'No start node found in flow';
          continue;
        }

        let currentNode: FlowNode | undefined = startNode;

        // Walk nodes sequentially (max 20 to prevent infinite loops)
        const maxSteps = 20;

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
          });

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

          // Find next node via outgoing edges
          const outgoingEdges = edges.filter((e) => e.source === currentNode!.id);

          if (!outgoingEdges.length) {
            console.log('No outgoing edges, flow complete');
            break;
          }

          // v1: follow the first outgoing edge
          const nextEdge = outgoingEdges[0];
          currentNode = nodes.find((n) => n.id === nextEdge.target);

          if (!currentNode) {
            console.warn(`Target node ${nextEdge.target} not found, flow ends`);
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

      // Step 7: Complete run record
      await supabase
        .from('sms_automation_runs')
        .update({
          status: runStatus,
          completed_at: new Date().toISOString(),
          error: runError,
        })
        .eq('id', runId);

      // Step 8: Update automation stats (read-then-write for increment)
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
