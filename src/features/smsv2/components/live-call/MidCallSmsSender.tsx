// MidCallSmsSender — embedded in COL 1 of LiveCallScreen.
//
// Hugo's 2026-04-26 ask: "Mid-call actions (send templated SMS …) need
// to be reachable from the live-call screen". Hugo 2026-04-30 update:
// templates can now carry a target pipeline stage (move_to_stage_id).
// Sending a stage-coupled template moves the contact to that stage.
//
// Reuses the same `sms-send` edge function used on InboxPage so the
// message lands in sms_messages and follows the GHL/Twilio path.
// Merge fields {{first_name}} + {{agent_first_name}} are substituted
// at render time before send.

import { useEffect, useMemo, useState } from 'react';
import { Send, MessageSquare, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSmsV2 } from '../../store/SmsV2Store';
import { useContactPersistence } from '../../hooks/useContactPersistence';
import StageSelector from '../shared/StageSelector';

interface Template {
  id: string;
  name: string;
  body_md: string;
  move_to_stage_id: string | null;
}

interface SmsSendInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { sid?: string; error?: string } | null;
    error: { message: string } | null;
  }>;
}

interface TemplatesTable {
  from: (t: string) => {
    select: (c: string) => {
      order: (
        col: string,
        opts: { ascending: boolean }
      ) => Promise<{ data: Template[] | null; error: { message: string } | null }>;
    };
  };
}

interface Props {
  contactId: string;
  contactName: string;
  contactPhone: string;
  agentFirstName: string;
}

export default function MidCallSmsSender({
  contactId,
  contactName,
  contactPhone,
  agentFirstName,
}: Props) {
  const { pushToast, columns, patchContact, contacts } = useSmsV2();
  const currentContact = contacts.find((c) => c.id === contactId);
  const persist = useContactPersistence();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingTpls, setLoadingTpls] = useState(true);
  // PR 16 (Hugo 2026-04-26): "Before send I'm obliged to choose the
  // stage." We deliberately do NOT default this to the contact's
  // current pipelineColumnId — the agent must consciously pick the
  // stage that this SMS is associated with, so the pipeline stays
  // accurate after the send.
  const [pickedStageId, setPickedStageId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as unknown as TemplatesTable)
          .from('wk_sms_templates')
          .select('id, name, body_md, move_to_stage_id')
          .order('name', { ascending: true });
        if (!cancelled && data) setTemplates(data);
      } catch {
        // RLS or table missing — show no templates, free-text still works.
      } finally {
        if (!cancelled) setLoadingTpls(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = useMemo(
    () => contactName.trim().split(/\s+/)[0] ?? '',
    [contactName]
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  const targetStage = useMemo(() => {
    if (!selectedTemplate?.move_to_stage_id) return null;
    return columns.find((c) => c.id === selectedTemplate.move_to_stage_id) ?? null;
  }, [selectedTemplate, columns]);

  const applyTemplate = (id: string) => {
    setSelectedTemplateId(id);
    if (!id) {
      setBody('');
      return;
    }
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    // Templates use {first_name} (single-brace) per the seed. Also
    // accept {{first_name}} for back-compat with hand-written entries.
    const expanded = tpl.body_md
      .replace(/\{\{?\s*first_name\s*\}?\}/gi, firstName)
      .replace(/\{\{?\s*agent_first_name\s*\}?\}/gi, agentFirstName);
    setBody(expanded);
    // If the template carries a stage, pre-pick it. Agent can still
    // change the picked stage before sending.
    if (tpl.move_to_stage_id) {
      setPickedStageId(tpl.move_to_stage_id);
    }
  };

  const send = async () => {
    const trimmed = body.trim();
    // PR 16: stage is a hard prerequisite — the agent must have picked
    // (or confirmed) a stage for this send. UI also disables the Send
    // button when no stage is picked, this is the belt-and-braces.
    if (!trimmed || sending || !pickedStageId) return;
    setSending(true);
    try {
      const { data, error } = await (
        supabase.functions as unknown as SmsSendInvoke
      ).invoke('sms-send', {
        body: { to: contactPhone, body: trimmed },
      });
      if (error || data?.error) {
        pushToast(
          `SMS send failed: ${error?.message ?? data?.error ?? 'unknown'}`,
          'error'
        );
        return;
      }
      pushToast('SMS sent', 'success');

      // PR 16: every send moves the contact to the picked stage. The
      // optimistic store update happens immediately so the pipeline +
      // col-1 meta header reflect the new stage; the persistence layer
      // mirrors it server-side. If persistence fails, the optimistic
      // store update stays — operator can retry server-side via the
      // outcome card.
      const target = columns.find((c) => c.id === pickedStageId);
      if (target && target.id !== currentContact?.pipelineColumnId) {
        patchContact(contactId, { pipelineColumnId: target.id });
        try {
          await persist.moveToColumn(contactId, target.id);
          pushToast(`Moved to ${target.name}`, 'success');
        } catch (e) {
          pushToast(
            `Stage move failed: ${e instanceof Error ? e.message : 'unknown'}`,
            'error'
          );
        }
      }
      setBody('');
      setSelectedTemplateId('');
      setPickedStageId(null);
    } catch (e) {
      pushToast(
        `SMS send crashed: ${e instanceof Error ? e.message : 'unknown'}`,
        'error'
      );
    } finally {
      setSending(false);
    }
  };

  const length = body.length;
  const stageMissing = pickedStageId === null;

  return (
    <div className="border border-[#E5E7EB] rounded-xl p-2.5 bg-white">
      {/* Header — SMS title only. Stage selector moved into the body
          (PR 16) and is now mandatory before send. */}
      <div className="flex items-center gap-1.5 mb-2">
        <MessageSquare className="w-3.5 h-3.5 text-[#1E9A80]" />
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#1A1A1A]">
          Send SMS to {firstName || contactName}
        </span>
      </div>
      <select
        value={selectedTemplateId}
        onChange={(e) => applyTemplate(e.target.value)}
        disabled={loadingTpls || templates.length === 0}
        className="w-full mb-2 px-2 py-1.5 text-[11px] border border-[#E5E5E5] rounded-[8px] bg-white disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
      >
        <option value="">
          {loadingTpls
            ? 'Loading templates…'
            : templates.length === 0
              ? 'No templates yet'
              : 'Insert template…'}
        </option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.move_to_stage_id ? ' →' : ''}
          </option>
        ))}
      </select>
      {/* Stage picker — required before send. Hugo 2026-04-26: "before
          send I'm obliged to choose the stage." We deliberately don't
          default to the contact's current stage — the agent must
          confirm where this SMS is taking the lead. */}
      <div
        className={cn(
          'mb-2 px-2 py-1.5 rounded-[8px] border flex items-center gap-2',
          stageMissing
            ? 'border-[#F59E0B]/60 bg-[#FFFBEB]'
            : 'border-[#1E9A80]/30 bg-[#ECFDF5]/50'
        )}
      >
        <span
          className={cn(
            'text-[10px] uppercase tracking-wide font-bold',
            stageMissing ? 'text-[#B45309]' : 'text-[#1E9A80]'
          )}
        >
          {stageMissing ? 'Pick stage' : 'Stage'}
        </span>
        <StageSelector
          value={pickedStageId ?? undefined}
          onChange={(col) => setPickedStageId(col)}
          size="xs"
        />
        {!stageMissing && targetStage && targetStage.id === pickedStageId && (
          <span className="text-[10px] text-[#1E9A80] inline-flex items-center gap-0.5 ml-auto">
            <ArrowRight className="w-3 h-3" /> from template
          </span>
        )}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Type a message, or pick a template above."
        rows={3}
        className="w-full px-2 py-1.5 text-[12px] border border-[#E5E5E5] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 focus:border-[#1E9A80] resize-none"
      />
      <div className="flex items-center justify-between mt-1.5">
        <span
          className={cn(
            'text-[10px] tabular-nums',
            length > 160 ? 'text-[#F59E0B]' : 'text-[#9CA3AF]'
          )}
        >
          {length}/160
        </span>
        <button
          onClick={() => void send()}
          disabled={!body.trim() || sending || stageMissing}
          title={
            stageMissing
              ? 'Pick a stage before sending — every SMS routes the lead through the pipeline.'
              : undefined
          }
          className="bg-[#1E9A80] text-white text-[11px] font-semibold px-3 py-1.5 rounded-[8px] inline-flex items-center gap-1 hover:bg-[#1E9A80]/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-3 h-3" />
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
