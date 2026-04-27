// ContactSmsModal — quick-send dialog from anywhere a contact is listed.
// Originally SMS-only; PR 63 (multi-channel PR 4) adds a channel picker
// so the same modal sends SMS / WhatsApp / Email. The file name stays
// ContactSmsModal for back-compat with the four call-sites that import
// it; the displayed title changes per channel.
//
// Channels:
//   sms       → POST sms-send (legacy fn, takes { to, body })
//   whatsapp  → POST wazzup-send (PR 61, takes { contact_id, body })
//   email     → POST wk-email-send (PR 62, takes { contact_id, subject, body })
//
// Per-channel rules:
//   sms / whatsapp — contact.phone required
//   email          — contact.email required + subject required
//
// Templates filter:
//   Show templates where channel IS NULL (universal) OR channel matches
//   the selected channel. Channel-specific templates are filtered in;
//   universal templates show in every channel.
//
// Hugo 2026-04-30 stage-coupling note: when an SMS template carries a
// move_to_stage_id, sending advances the contact's pipeline column.
// Same behaviour applies for WhatsApp + Email templates.

import { useEffect, useMemo, useState } from 'react';
import { Send, MessageSquare, X, Check, ArrowRight, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSmsV2 } from '../../store/SmsV2Store';
import { useContactPersistence } from '../../hooks/useContactPersistence';
import type { Contact } from '../../types';

type Channel = 'sms' | 'whatsapp' | 'email';

interface Template {
  id: string;
  name: string;
  body_md: string;
  move_to_stage_id: string | null;
  channel: Channel | null;
}

interface SendInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { sid?: string; error?: string; external_id?: string; message_id?: string } | null;
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
  contact: Contact | null;
  onClose: () => void;
  agentFirstName?: string;
}

const CHANNEL_LABEL: Record<Channel, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'Email',
};

export default function ContactSmsModal({
  contact,
  onClose,
  agentFirstName,
}: Props) {
  const { pushToast, columns, patchContact } = useSmsV2();
  const persist = useContactPersistence();
  const [channel, setChannel] = useState<Channel>('sms');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingTpls, setLoadingTpls] = useState(true);
  const [recentSendCount, setRecentSendCount] = useState(0);
  const [showSentBanner, setShowSentBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as unknown as TemplatesTable)
          .from('wk_sms_templates')
          .select('id, name, body_md, move_to_stage_id, channel')
          .order('name', { ascending: true });
        if (!cancelled && data) setTemplates(data);
      } catch {
        // RLS / missing column — render with no templates.
      } finally {
        if (!cancelled) setLoadingTpls(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset state when modal opens for a different contact OR channel changes.
  useEffect(() => {
    if (contact) {
      setSelectedTemplateId('');
      setBody('');
      setSubject('');
      setRecentSendCount(0);
      setShowSentBanner(false);
    }
  }, [contact]);

  useEffect(() => {
    setSelectedTemplateId('');
    setBody('');
    if (channel !== 'email') setSubject('');
  }, [channel]);

  const firstName = useMemo(
    () => (contact?.name ?? '').trim().split(/\s+/)[0] ?? '',
    [contact]
  );

  // Templates visible for the current channel: universal (channel=null) +
  // channel-specific (channel === current).
  const filteredTemplates = useMemo(
    () => templates.filter((t) => t.channel == null || t.channel === channel),
    [templates, channel]
  );

  const selectedTemplate = useMemo(
    () => filteredTemplates.find((t) => t.id === selectedTemplateId) ?? null,
    [filteredTemplates, selectedTemplateId]
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
    const tpl = filteredTemplates.find((t) => t.id === id);
    if (!tpl) return;
    const expanded = tpl.body_md
      .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
      .replace(/\{\{\s*agent_first_name\s*\}\}/gi, agentFirstName ?? '');
    setBody(expanded);
    setShowSentBanner(false);
  };

  // Channel-aware preflight checks.
  const channelDisabledReason = useMemo<string | null>(() => {
    if (!contact) return null;
    if (channel === 'sms' && !contact.phone) return 'Contact has no phone number';
    if (channel === 'whatsapp' && !contact.phone) {
      return 'Contact has no phone number for WhatsApp';
    }
    if (channel === 'email' && !contact.email) return 'Contact has no email address';
    return null;
  }, [contact, channel]);

  const isSendDisabled =
    !body.trim() ||
    sending ||
    !!channelDisabledReason ||
    (channel === 'email' && !subject.trim());

  const send = async () => {
    if (!contact || isSendDisabled) return;
    setSending(true);
    try {
      const fn = supabase.functions as unknown as SendInvoke;
      const trimBody = body.trim();
      const trimSubject = subject.trim();

      let resp: Awaited<ReturnType<SendInvoke['invoke']>>;
      if (channel === 'sms') {
        resp = await fn.invoke('sms-send', {
          body: { to: contact.phone, body: trimBody },
        });
      } else if (channel === 'whatsapp') {
        resp = await fn.invoke('wazzup-send', {
          body: { contact_id: contact.id, body: trimBody },
        });
      } else {
        resp = await fn.invoke('wk-email-send', {
          body: { contact_id: contact.id, subject: trimSubject, body: trimBody },
        });
      }
      const { data, error } = resp;
      if (error || data?.error) {
        pushToast(
          `${CHANNEL_LABEL[channel]} send failed: ${error?.message ?? data?.error ?? 'unknown'}`,
          'error'
        );
        return;
      }
      pushToast(`${CHANNEL_LABEL[channel]} sent`, 'success');

      // Stage-coupled templates apply to all channels.
      if (selectedTemplate?.move_to_stage_id && targetStage && contact.id) {
        patchContact(contact.id, { pipelineColumnId: targetStage.id });
        try {
          await persist.moveToColumn(contact.id, targetStage.id);
          pushToast(`Moved to ${targetStage.name}`, 'success');
        } catch (e) {
          pushToast(
            `Stage move failed: ${e instanceof Error ? e.message : 'unknown'}`,
            'error'
          );
        }
      }

      setBody('');
      if (channel === 'email') setSubject('');
      setSelectedTemplateId('');
      setRecentSendCount((n) => n + 1);
      setShowSentBanner(true);
      setTimeout(() => setShowSentBanner(false), 4000);
    } catch (e) {
      pushToast(
        `${CHANNEL_LABEL[channel]} send crashed: ${e instanceof Error ? e.message : 'unknown'}`,
        'error'
      );
    } finally {
      setSending(false);
    }
  };

  if (!contact) return null;

  const length = body.length;
  const charLimit = channel === 'sms' ? 160 : channel === 'whatsapp' ? 4096 : 10000;
  const channelIcon =
    channel === 'email' ? Mail : channel === 'whatsapp' ? MessageSquare : Phone;
  const ChannelIcon = channelIcon;

  const recipientLabel =
    channel === 'email' ? contact.email ?? '(no email)' : contact.phone;

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center p-6"
      onClick={onClose}
      data-testid="contact-sms-modal"
    >
      <div
        className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl w-full max-w-[560px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChannelIcon className="w-4 h-4 text-[#1E9A80]" />
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">
              {CHANNEL_LABEL[channel]} to {firstName || contact.name}
            </h2>
            <span className="text-[11px] text-[#9CA3AF] tabular-nums ml-1">
              {recipientLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#F3F3EE] text-[#6B7280] hover:text-[#1A1A1A]"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-4 space-y-3">
          {/* Channel picker — segmented radio. */}
          <div
            role="radiogroup"
            aria-label="Channel"
            className="inline-flex p-0.5 bg-[#F3F3EE] rounded-[10px] border border-[#E5E5E5] gap-0.5"
            data-testid="contact-sms-modal-channel-picker"
          >
            {(['sms', 'whatsapp', 'email'] as const).map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={channel === c}
                onClick={() => setChannel(c)}
                className={cn(
                  'px-3 py-1 text-[12px] font-medium rounded-[8px] transition-colors',
                  channel === c
                    ? 'bg-white text-[#1E9A80] shadow-sm'
                    : 'text-[#6B7280] hover:text-[#1A1A1A]'
                )}
                data-testid={`channel-radio-${c}`}
                type="button"
              >
                {CHANNEL_LABEL[c]}
              </button>
            ))}
          </div>

          {channelDisabledReason && (
            <div
              className="text-[12px] text-[#F59E0B] bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-[10px] px-3 py-2"
              role="alert"
            >
              {channelDisabledReason}
            </div>
          )}

          {showSentBanner && (
            <div
              className="flex items-center gap-2 bg-[#ECFDF5] border border-[#1E9A80]/40 rounded-[10px] px-3 py-2 text-[12px] text-[#1E9A80]"
              role="status"
            >
              <Check className="w-4 h-4" />
              <span>
                {CHANNEL_LABEL[channel]} sent
                {recentSendCount > 1 ? ` · ${recentSendCount} this session` : ''}
              </span>
            </div>
          )}

          <select
            value={selectedTemplateId}
            onChange={(e) => applyTemplate(e.target.value)}
            disabled={loadingTpls || filteredTemplates.length === 0}
            className="w-full px-2 py-1.5 text-[12px] border border-[#E5E5E5] rounded-[10px] bg-white disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
          >
            <option value="">
              {loadingTpls
                ? 'Loading templates…'
                : filteredTemplates.length === 0
                  ? `No ${CHANNEL_LABEL[channel]} templates yet`
                  : 'Insert template…'}
            </option>
            {filteredTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.move_to_stage_id ? ' →' : ''}
                {t.channel ? ` · ${CHANNEL_LABEL[t.channel]}` : ''}
              </option>
            ))}
          </select>
          {targetStage && (
            <div className="flex items-center gap-1 text-[11px] text-[#1E9A80] bg-[#ECFDF5] px-2 py-1 rounded-[6px]">
              <ArrowRight className="w-3 h-3" />
              <span>
                Send will move contact to:{' '}
                <span className="font-semibold">{targetStage.name}</span>
              </span>
            </div>
          )}

          {channel === 'email' && (
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-3 py-2 text-[13px] border border-[#E5E5E5] rounded-[10px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 focus:border-[#1E9A80]"
              data-testid="contact-sms-modal-subject"
            />
          )}

          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (showSentBanner) setShowSentBanner(false);
            }}
            placeholder={
              channel === 'email'
                ? 'Type the email body…'
                : 'Type a message, or pick a template above.'
            }
            rows={channel === 'email' ? 8 : 5}
            className="w-full px-3 py-2 text-[13px] border border-[#E5E5E5] rounded-[10px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 focus:border-[#1E9A80] resize-none"
            data-testid="contact-sms-modal-body"
          />

          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-[10px] tabular-nums',
                length > charLimit ? 'text-[#F59E0B]' : 'text-[#9CA3AF]'
              )}
            >
              {length}/{charLimit}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="text-[12px] text-[#6B7280] px-3 py-1.5 rounded-[10px] hover:bg-[#F3F3EE]"
              >
                Done
              </button>
              <button
                onClick={() => void send()}
                disabled={isSendDisabled}
                className="bg-[#1E9A80] text-white text-[12px] font-semibold px-4 py-1.5 rounded-[10px] inline-flex items-center gap-1 hover:bg-[#1E9A80]/90 disabled:opacity-50"
                data-testid="contact-sms-modal-send"
              >
                <Send className="w-3 h-3" />
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
