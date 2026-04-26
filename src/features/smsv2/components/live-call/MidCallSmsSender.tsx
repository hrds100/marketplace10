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
  const { pushToast, columns, patchContact } = useSmsV2();
  const persist = useContactPersistence();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingTpls, setLoadingTpls] = useState(true);

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
    const expanded = tpl.body_md
      .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
      .replace(/\{\{\s*agent_first_name\s*\}\}/gi, agentFirstName);
    setBody(expanded);
  };

  const send = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
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

      // v8 / Phase 4: stage-coupled templates. If the picked template
      // had move_to_stage_id, move the contact to that stage now (post-
      // send so a failing send doesn't move the contact).
      if (selectedTemplate?.move_to_stage_id && targetStage) {
        patchContact(contactId, { pipelineColumnId: targetStage.id });
        try {
          await persist.moveToColumn(contactId, targetStage.id);
          pushToast(`Moved to ${targetStage.name}`, 'success');
        } catch (e) {
          pushToast(
            `Stage move failed: ${e instanceof Error ? e.message : 'unknown'}`,
            'error'
          );
        }
      }
      setBody('');
      setSelectedTemplateId('');
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

  return (
    <div className="border border-[#E5E7EB] rounded-xl p-2.5 bg-white">
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
      {targetStage && (
        <div className="flex items-center gap-1 mb-2 text-[10px] text-[#1E9A80] bg-[#ECFDF5] px-2 py-1 rounded-[6px]">
          <ArrowRight className="w-3 h-3" />
          <span>
            Send will move contact to:{' '}
            <span className="font-semibold">{targetStage.name}</span>
          </span>
        </div>
      )}
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
          disabled={!body.trim() || sending}
          className="bg-[#1E9A80] text-white text-[11px] font-semibold px-3 py-1.5 rounded-[8px] inline-flex items-center gap-1 hover:bg-[#1E9A80]/90 disabled:opacity-50"
        >
          <Send className="w-3 h-3" />
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
