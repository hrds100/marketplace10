// sms-automation-worker — cron-driven scheduler for SMS automation timeouts.
//
// Called every minute by pg_cron (see 20260514000001_sms_wait_for_reply.sql).
// Picks up `sms_scheduled_tasks` whose `execute_at` has passed and resumes
// the automation flow down the appropriate branch ("No Reply" timeout on a
// WAIT_FOR_REPLY node).
//
// Source of truth: supabase/config.toml (verify_jwt = false; uses
// x-cron-secret header instead).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = 'nfstay-sms-worker-2026-05-14-shared-secret';

const MAX_TASKS_PER_RUN = 25;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ScheduledTask {
  id: string;
  type: string;
  reference_id: string;
  node_id: string | null;
  automation_state_id: string | null;
  branch_label: string | null;
  execute_at: string;
  status: string;
  attempts: number;
}

interface AutomationState {
  id: string;
  conversation_id: string;
  automation_id: string;
  current_node_id: string;
  step_number: number;
  status: string;
}

interface FlowNode {
  id: string;
  type: string;
  data: {
    name?: string;
    isStart?: boolean;
    text?: string;
    prompt?: string;
    labelId?: string;
    [key: string]: unknown;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  data?: {
    label?: string;
    [key: string]: unknown;
  };
}

interface FlowJson {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

function normalizeLabel(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '_');
}

function findOutgoingEdgeByLabel(
  edges: FlowEdge[],
  sourceNodeId: string,
  targetLabel: string
): FlowEdge | null {
  const target = normalizeLabel(targetLabel);
  const outgoing = edges.filter((e) => e.source === sourceNodeId);
  // Exact label match first
  for (const e of outgoing) {
    const lbl = normalizeLabel(e.data?.label || e.label);
    if (lbl === target) return e;
  }
  // Fallback heuristics — "no_reply" should match "no reply", "no response", "timeout"
  if (target === 'no_reply') {
    for (const e of outgoing) {
      const lbl = normalizeLabel(e.data?.label || e.label);
      if (lbl === 'no_response' || lbl === 'timeout' || lbl === 'no_reply_branch') return e;
    }
  }
  if (target === 'replied') {
    for (const e of outgoing) {
      const lbl = normalizeLabel(e.data?.label || e.label);
      if (lbl === 'reply' || lbl === 'response' || lbl === 'yes') return e;
    }
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // ---- Verify cron secret ----
  const incomingSecret = req.headers.get('x-cron-secret');
  if (incomingSecret !== CRON_SECRET) {
    console.warn('sms-automation-worker: invalid cron secret');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const now = new Date().toISOString();

  try {
    // ---- 1. Claim due tasks (atomic-ish via UPDATE ... RETURNING) ----
    const { data: dueTasks, error: dueErr } = await supabase
      .from('sms_scheduled_tasks')
      .select('id, type, reference_id, node_id, automation_state_id, branch_label, execute_at, status, attempts')
      .eq('status', 'pending')
      .in('type', ['wait_for_reply', 'scheduled_delay'])
      .lte('execute_at', now)
      .order('execute_at', { ascending: true })
      .limit(MAX_TASKS_PER_RUN);

    if (dueErr) {
      console.error('sms-automation-worker: failed to fetch tasks', dueErr);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tasks', details: dueErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!dueTasks?.length) {
      return new Response(
        JSON.stringify({ status: 'no_tasks' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`sms-automation-worker: found ${dueTasks.length} due wait_for_reply tasks`);

    let processed = 0;
    let resumed = 0;
    let skipped = 0;
    let failed = 0;

    for (const taskRow of dueTasks as ScheduledTask[]) {
      processed++;

      // Mark as processing so a parallel cron tick doesn't re-grab it.
      const { error: claimErr } = await supabase
        .from('sms_scheduled_tasks')
        .update({ status: 'processing', attempts: taskRow.attempts + 1 })
        .eq('id', taskRow.id)
        .eq('status', 'pending');

      if (claimErr) {
        console.warn(`Task ${taskRow.id} claim failed (likely already claimed):`, claimErr.message);
        continue;
      }

      // ============================================================
      // SCHEDULED_DELAY handler — fire-and-forget drip message.
      // Does NOT touch automation_state. Only sends the target node's
      // text. branch_label stores the target node id (a small hack to
      // avoid another column). Stops early if the contact opted out
      // or the lead has reached a terminal state.
      // ============================================================
      if (taskRow.type === 'scheduled_delay') {
        try {
          const targetNodeId = taskRow.branch_label || '';
          if (!targetNodeId || !taskRow.automation_state_id) {
            console.warn(`[scheduled_delay] task ${taskRow.id} missing target/state — failing`);
            await supabase
              .from('sms_scheduled_tasks')
              .update({ status: 'failed', last_error: 'missing target/state' })
              .eq('id', taskRow.id);
            failed++;
            continue;
          }

          // Load state to read conversation, then load contact + automation flow.
          const { data: stateData } = await supabase
            .from('sms_automation_state')
            .select('id, conversation_id, automation_id, status, exit_reason')
            .eq('id', taskRow.automation_state_id)
            .maybeSingle();
          const state = stateData as { id: string; conversation_id: string; automation_id: string; status: string; exit_reason: string | null } | null;
          if (!state) {
            await supabase
              .from('sms_scheduled_tasks')
              .update({ status: 'failed', last_error: 'state not found' })
              .eq('id', taskRow.id);
            failed++;
            continue;
          }

          // Skip if the lead opted out or reached a terminal state — don't
          // drip on someone who said "stop".
          if (state.status === 'completed' && state.exit_reason === 'stop_node') {
            console.log(`[scheduled_delay] task ${taskRow.id}: lead stopped, skipping drip`);
            await supabase
              .from('sms_scheduled_tasks')
              .update({ status: 'completed', last_error: 'lead stopped' })
              .eq('id', taskRow.id);
            skipped++;
            continue;
          }

          const { data: conv } = await supabase
            .from('sms_conversations')
            .select('id, contact_id, number_id')
            .eq('id', state.conversation_id)
            .maybeSingle();
          const convRow = conv as { id: string; contact_id: string; number_id: string | null } | null;
          if (!convRow) {
            await supabase
              .from('sms_scheduled_tasks')
              .update({ status: 'failed', last_error: 'conversation not found' })
              .eq('id', taskRow.id);
            failed++;
            continue;
          }

          const { data: contactRow } = await supabase
            .from('sms_contacts')
            .select('id, phone_number, opted_out')
            .eq('id', convRow.contact_id)
            .maybeSingle();
          const contact = contactRow as { id: string; phone_number: string; opted_out: boolean } | null;
          if (!contact) {
            await supabase
              .from('sms_scheduled_tasks')
              .update({ status: 'failed', last_error: 'contact not found' })
              .eq('id', taskRow.id);
            failed++;
            continue;
          }
          if (contact.opted_out) {
            console.log(`[scheduled_delay] contact ${contact.id} opted out, skipping drip`);
            await supabase
              .from('sms_scheduled_tasks')
              .update({ status: 'completed', last_error: 'contact opted out' })
              .eq('id', taskRow.id);
            skipped++;
            continue;
          }

          // Load the flow + find the target node.
          const { data: auto } = await supabase
            .from('sms_automations')
            .select('flow_json, is_active')
            .eq('id', state.automation_id)
            .maybeSingle();
          const automation = auto as { flow_json: FlowJson | null; is_active: boolean } | null;
          if (!automation?.is_active || !automation.flow_json) {
            await supabase
              .from('sms_scheduled_tasks')
              .update({ status: 'completed', last_error: 'automation inactive' })
              .eq('id', taskRow.id);
            skipped++;
            continue;
          }

          const targetNode = automation.flow_json.nodes.find((n) => n.id === targetNodeId);
          if (!targetNode) {
            await supabase
              .from('sms_scheduled_tasks')
              .update({ status: 'failed', last_error: 'target node not found' })
              .eq('id', taskRow.id);
            failed++;
            continue;
          }

          const text = (targetNode.data as { text?: string }).text;
          if (!text) {
            console.warn(`[scheduled_delay] target node ${targetNodeId} has no text — drip skipped`);
            await supabase
              .from('sms_scheduled_tasks')
              .update({ status: 'completed', last_error: 'target has no text' })
              .eq('id', taskRow.id);
            skipped++;
            continue;
          }

          // Send via sms-send.
          const sendUrl = `${SUPABASE_URL}/functions/v1/sms-send`;
          const sendPayload: Record<string, string | undefined> = {
            to: contact.phone_number,
            body: text,
            contact_id: contact.id,
          };
          if (convRow.number_id) sendPayload.from_number_id = convRow.number_id;

          const sendRes = await fetch(sendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify(sendPayload),
          });

          if (!sendRes.ok) {
            const errBody = await sendRes.text();
            console.error(`[scheduled_delay] sms-send failed: ${errBody}`);
            await supabase
              .from('sms_scheduled_tasks')
              .update({ status: 'failed', last_error: `sms-send: ${errBody.slice(0, 200)}` })
              .eq('id', taskRow.id);
            failed++;
            continue;
          }

          await supabase
            .from('sms_scheduled_tasks')
            .update({ status: 'completed' })
            .eq('id', taskRow.id);
          resumed++;
          console.log(`[scheduled_delay] task ${taskRow.id}: fired "${text.substring(0, 60)}" to ${contact.phone_number}`);
        } catch (innerErr) {
          console.error(`[scheduled_delay] task ${taskRow.id} threw:`, innerErr);
          await supabase
            .from('sms_scheduled_tasks')
            .update({
              status: 'failed',
              last_error: innerErr instanceof Error ? innerErr.message : String(innerErr),
            })
            .eq('id', taskRow.id);
          failed++;
        }
        continue;
      }

      // ============================================================
      // WAIT_FOR_REPLY handler (existing — unchanged below)
      // ============================================================
      try {
        if (!taskRow.automation_state_id) {
          console.warn(`Task ${taskRow.id} has no automation_state_id, skipping`);
          await supabase
            .from('sms_scheduled_tasks')
            .update({ status: 'failed', last_error: 'no automation_state_id' })
            .eq('id', taskRow.id);
          skipped++;
          continue;
        }

        // ---- 2. Load the state ----
        const { data: stateData } = await supabase
          .from('sms_automation_state')
          .select('id, conversation_id, automation_id, current_node_id, step_number, status')
          .eq('id', taskRow.automation_state_id)
          .maybeSingle();

        const state = stateData as AutomationState | null;

        if (!state) {
          console.warn(`Task ${taskRow.id}: state ${taskRow.automation_state_id} not found`);
          await supabase
            .from('sms_scheduled_tasks')
            .update({ status: 'failed', last_error: 'state not found' })
            .eq('id', taskRow.id);
          skipped++;
          continue;
        }

        // Stale check: if state is no longer waiting (e.g. user replied and we
        // already moved on, or someone took over manually), drop the task.
        if (state.status !== 'waiting') {
          console.log(`Task ${taskRow.id}: state status is "${state.status}", not "waiting" — stale, marking completed`);
          await supabase
            .from('sms_scheduled_tasks')
            .update({ status: 'completed', last_error: `state was ${state.status}` })
            .eq('id', taskRow.id);
          skipped++;
          continue;
        }

        // Stale check: current node moved since the task was scheduled
        if (taskRow.node_id && state.current_node_id !== taskRow.node_id) {
          console.log(`Task ${taskRow.id}: state moved from ${taskRow.node_id} to ${state.current_node_id} — stale`);
          await supabase
            .from('sms_scheduled_tasks')
            .update({ status: 'completed', last_error: 'node moved' })
            .eq('id', taskRow.id);
          skipped++;
          continue;
        }

        // ---- 3. Load the automation flow_json ----
        const { data: automation } = await supabase
          .from('sms_automations')
          .select('id, flow_json, is_active')
          .eq('id', state.automation_id)
          .maybeSingle();

        if (!automation || !automation.is_active) {
          console.log(`Task ${taskRow.id}: automation inactive or missing`);
          await supabase
            .from('sms_scheduled_tasks')
            .update({ status: 'completed', last_error: 'automation inactive' })
            .eq('id', taskRow.id);
          skipped++;
          continue;
        }

        const flowJson = automation.flow_json as FlowJson | null;
        if (!flowJson?.nodes?.length || !flowJson?.edges) {
          console.log(`Task ${taskRow.id}: no flow nodes`);
          await supabase
            .from('sms_scheduled_tasks')
            .update({ status: 'completed', last_error: 'no flow' })
            .eq('id', taskRow.id);
          skipped++;
          continue;
        }

        // ---- 4. Find the WAIT_FOR_REPLY node + its target edge ----
        const branch = taskRow.branch_label || 'no_reply';
        const nextEdge = findOutgoingEdgeByLabel(flowJson.edges, state.current_node_id, branch);

        if (!nextEdge) {
          console.warn(`Task ${taskRow.id}: no edge labelled "${branch}" from ${state.current_node_id} — completing flow`);
          await supabase
            .from('sms_automation_state')
            .update({
              status: 'completed',
              completed_at: now,
              exit_reason: `no_edge_for_${branch}`,
            })
            .eq('id', state.id);

          await supabase
            .from('sms_scheduled_tasks')
            .update({ status: 'completed', last_error: `no edge for ${branch}` })
            .eq('id', taskRow.id);
          resumed++;
          continue;
        }

        // ---- 5. Resume the flow ----
        // Update state: status back to active, point at the next node.
        await supabase
          .from('sms_automation_state')
          .update({
            status: 'active',
            current_node_id: nextEdge.target,
            step_number: state.step_number + 1,
            last_message_at: now,
          })
          .eq('id', state.id);

        // ---- 6. Walk and execute non-message nodes (LABEL, MOVE_STAGE,
        // WEBHOOK, STOP_CONVERSATION) and send messages where applicable.
        // Get the contact + conversation context for sending.
        const { data: conv } = await supabase
          .from('sms_conversations')
          .select('id, contact_id, number_id')
          .eq('id', state.conversation_id)
          .maybeSingle();

        if (!conv) {
          console.warn(`Task ${taskRow.id}: conversation not found`);
          await supabase
            .from('sms_scheduled_tasks')
            .update({ status: 'failed', last_error: 'conversation not found' })
            .eq('id', taskRow.id);
          failed++;
          continue;
        }

        const { data: contact } = await supabase
          .from('sms_contacts')
          .select('id, phone_number, display_name')
          .eq('id', conv.contact_id)
          .maybeSingle();

        if (!contact) {
          console.warn(`Task ${taskRow.id}: contact not found`);
          await supabase
            .from('sms_scheduled_tasks')
            .update({ status: 'failed', last_error: 'contact not found' })
            .eq('id', taskRow.id);
          failed++;
          continue;
        }

        const { data: numberRow } = conv.number_id
          ? await supabase
              .from('sms_numbers')
              .select('phone_number')
              .eq('id', conv.number_id)
              .maybeSingle()
          : { data: null };

        const fromNumber = (numberRow as { phone_number?: string } | null)?.phone_number || '';

        // Walk the flow forward executing silent/message nodes until we
        // either hit another WAIT_FOR_REPLY, send a message, or terminate.
        let cursorNodeId = nextEdge.target;
        let walkSteps = 0;
        const maxWalkSteps = 12;
        let messageSentInWalk = false;
        let flowTerminated = false;
        const enteredViaNoReply = branch === 'no_reply';

        while (walkSteps < maxWalkSteps) {
          walkSteps++;
          const currentNode = flowJson.nodes.find((n) => n.id === cursorNodeId);
          if (!currentNode) {
            console.warn(`Node ${cursorNodeId} not found, stopping walk`);
            break;
          }

          const nodeType = (currentNode.type || 'DEFAULT').toUpperCase();

          // ---- Action: send message via sms-send (uses exact text only on
          //              worker path; AI prompts require inbound context). ----
          if ((nodeType === 'DEFAULT' || nodeType === 'STOP_CONVERSATION') && currentNode.data.text) {
            const sendUrl = `${SUPABASE_URL}/functions/v1/sms-send`;
            const sendPayload: Record<string, string | undefined> = {
              to: contact.phone_number,
              body: String(currentNode.data.text),
              contact_id: contact.id,
            };
            if (conv.number_id) sendPayload.from_number_id = conv.number_id;

            const sendRes = await fetch(sendUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              },
              body: JSON.stringify(sendPayload),
            });

            if (!sendRes.ok) {
              const errBody = await sendRes.text();
              console.error(`sms-send failed in worker walk: ${errBody}`);
            } else {
              messageSentInWalk = true;
              console.log(`Worker sent "${String(currentNode.data.text).substring(0, 60)}" from ${fromNumber} to ${contact.phone_number}`);
            }

            if (nodeType === 'STOP_CONVERSATION') {
              await supabase
                .from('sms_automation_state')
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                  exit_reason: 'stop_node',
                  current_node_id: currentNode.id,
                })
                .eq('id', state.id);
              flowTerminated = true;
              break;
            }
          }

          // ---- Action: LABEL ----
          if (nodeType === 'LABEL' && currentNode.data.labelId) {
            await supabase.from('sms_contact_labels').upsert(
              { contact_id: contact.id, label_id: String(currentNode.data.labelId) },
              { onConflict: 'contact_id,label_id' }
            );
          }

          // ---- Action: MOVE_STAGE ----
          if (nodeType === 'MOVE_STAGE' && currentNode.data.stageId) {
            await supabase
              .from('sms_contacts')
              .update({ pipeline_stage_id: String(currentNode.data.stageId), updated_at: new Date().toISOString() })
              .eq('id', contact.id);
          }

          // ---- Action: TRANSFER ----
          if (nodeType === 'TRANSFER' && currentNode.data.assignTo) {
            await supabase
              .from('sms_contacts')
              .update({ assigned_to: String(currentNode.data.assignTo), updated_at: new Date().toISOString() })
              .eq('id', contact.id);
            await supabase
              .from('sms_automation_state')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                exit_reason: 'transfer',
                current_node_id: currentNode.id,
              })
              .eq('id', state.id);
            flowTerminated = true;
            break;
          }

          // ---- Terminal: STOP_CONVERSATION without text (text-only path was handled above) ----
          if (nodeType === 'STOP_CONVERSATION' && !currentNode.data.text) {
            await supabase
              .from('sms_automation_state')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                exit_reason: 'stop_node',
                current_node_id: currentNode.id,
              })
              .eq('id', state.id);
            flowTerminated = true;
            break;
          }

          // ---- WAIT_FOR_REPLY: schedule new task + park state ----
          if (nodeType === 'WAIT_FOR_REPLY') {
            const waitValue = Number(currentNode.data.waitValue ?? 24);
            const waitUnit = String(currentNode.data.waitUnit ?? 'hours');
            const ms = waitUnit === 'minutes'
              ? waitValue * 60_000
              : waitUnit === 'hours'
                ? waitValue * 3_600_000
                : waitValue * 86_400_000; // days

            await supabase.from('sms_scheduled_tasks').insert({
              type: 'wait_for_reply',
              reference_id: state.conversation_id,
              node_id: currentNode.id,
              automation_state_id: state.id,
              branch_label: 'no_reply',
              execute_at: new Date(Date.now() + ms).toISOString(),
            });

            await supabase
              .from('sms_automation_state')
              .update({
                status: 'waiting',
                current_node_id: currentNode.id,
                last_message_at: new Date().toISOString(),
              })
              .eq('id', state.id);

            console.log(`Worker re-parked state ${state.id} on WAIT_FOR_REPLY ${currentNode.id} for ${waitValue}${waitUnit}`);
            break;
          }

          // ---- Advance to next node ----
          const next = flowJson.edges.find((e) => e.source === cursorNodeId);
          if (!next) {
            // No outgoing edge — flow done
            await supabase
              .from('sms_automation_state')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                exit_reason: 'no_edges',
                current_node_id: currentNode.id,
              })
              .eq('id', state.id);
            flowTerminated = true;
            break;
          }

          // For nodes with multiple outgoing edges (apart from WAIT_FOR_REPLY
          // which we handle above), the worker has no inbound context — take
          // the first edge as a best-effort fallback. AI pathway classification
          // is only used in the real-time engine.
          cursorNodeId = next.target;
        }

        // Update last current_node_id for visibility
        await supabase
          .from('sms_automation_state')
          .update({ current_node_id: cursorNodeId })
          .eq('id', state.id)
          .eq('status', 'active');

        // ---- Auto-label "no_response" when the flow exits on a No Reply
        // path (Hugo approved 2026-05-14). The label is seeded by migration. ----
        if (flowTerminated && enteredViaNoReply) {
          const { data: noRespLabel } = await supabase
            .from('sms_labels')
            .select('id')
            .eq('name', 'no_response')
            .maybeSingle();

          if (noRespLabel) {
            await supabase.from('sms_contact_labels').upsert(
              { contact_id: contact.id, label_id: (noRespLabel as { id: string }).id },
              { onConflict: 'contact_id,label_id' }
            );
            console.log(`Auto-labelled contact ${contact.id} as no_response (terminated via no_reply branch)`);
          }
        }

        // ---- 7. Mark task complete ----
        await supabase
          .from('sms_scheduled_tasks')
          .update({ status: 'completed' })
          .eq('id', taskRow.id);

        resumed++;
        console.log(`Worker resumed state ${state.id} via "${branch}" branch (message_sent=${messageSentInWalk})`);
      } catch (innerErr) {
        console.error(`Worker error on task ${taskRow.id}:`, innerErr);
        await supabase
          .from('sms_scheduled_tasks')
          .update({
            status: 'failed',
            last_error: innerErr instanceof Error ? innerErr.message : String(innerErr),
          })
          .eq('id', taskRow.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        processed,
        resumed,
        skipped,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('sms-automation-worker fatal:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
